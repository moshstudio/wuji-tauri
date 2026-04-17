use crate::download_manager::engine::utils::{map_to_header_map, normalize_url};
use crate::download_manager::error::{Error, Result};
use crate::download_manager::task::TaskStatus;
use crate::download_manager::DownloadManager;
use m3u8_rs::Playlist;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager, Runtime};
use tokio::fs::{self, OpenOptions};
use tokio::io::AsyncWriteExt;
use url::Url;

use aes::cipher::{
    block_padding::{NoPadding, Pkcs7},
    BlockDecryptMut, KeyIvInit,
};
type Aes128CbcDec = cbc::Decryptor<aes::Aes128>;

fn parse_hex_iv(iv_str: &str) -> Vec<u8> {
    let clean_iv = iv_str.trim_start_matches("0x").trim_start_matches("0X");
    let mut iv = vec![0u8; 16];
    let bytes = (0..clean_iv.len())
        .step_by(2)
        .filter_map(|i| {
            if i + 2 <= clean_iv.len() {
                u8::from_str_radix(&clean_iv[i..i + 2], 16).ok()
            } else {
                u8::from_str_radix(&clean_iv[i..i + 1], 16)
                    .ok()
                    .map(|v| v << 4)
            }
        })
        .collect::<Vec<u8>>();

    for (i, &b) in bytes.iter().enumerate() {
        if i < 16 {
            iv[i] = b;
        }
    }
    iv
}

fn decrypt_segment(data: &[u8], key: &[u8], iv: &[u8]) -> Result<Vec<u8>> {
    if data.is_empty() {
        return Ok(Vec::new());
    }

    let mut buf = data.to_vec();
    if buf.len() % 16 != 0 {
        log::warn!("[M3U8] Segment size {} is not a multiple of 16", buf.len());
        // 如果不是 16 的倍数，CBC 解密肯定会失败，通常这是下载损坏或非加密流
        return Ok(buf);
    }

    let decryptor = Aes128CbcDec::new(key.into(), iv.into());
    match decryptor.decrypt_padded_mut::<Pkcs7>(&mut buf) {
        Ok(decrypted) => Ok(decrypted.to_vec()),
        Err(_) => {
            // 回退到 NoPadding
            let decryptor = Aes128CbcDec::new(key.into(), iv.into());
            let mut buf_none = data.to_vec();
            match decryptor.decrypt_padded_mut::<NoPadding>(&mut buf_none) {
                Ok(decrypted) => {
                    log::warn!("[M3U8] PKCS7 unpad failed, using NoPadding fallback");
                    Ok(decrypted.to_vec())
                }
                Err(e) => Err(Error::Other(format!("解密失败: {}", e))),
            }
        }
    }
}

pub async fn start_m3u8_download<R: Runtime>(
    app: AppHandle<R>,
    manager: DownloadManager,
    task_id: String,
) -> Result<()> {
    let (url, headers, save_path) = {
        let mut inner = manager.lock().await;
        let task = inner
            .get_task_mut(&task_id)
            .ok_or_else(|| Error::TaskNotFound(task_id.clone()))?;

        // 边界情况：基于物理临时文件夹校准已下载大小
        let temp_dir = if let Some(parent) = task.save_path.parent() {
            let file_name = task
                .save_path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy();
            parent.join(format!(".tmp_{}", file_name))
        } else {
            app.path()
                .app_data_dir()
                .unwrap()
                .join("temp")
                .join(&task_id)
        };

        if !temp_dir.exists() {
            task.downloaded_size = 0;
            task.completed_chunks.clear();
        } else {
            // 扫描临时目录，重新计算已下载大小（仅统计已完成的 .ts 分片）
            let mut physical_size = 0;
            task.completed_chunks.clear();
            if let Ok(mut entries) = std::fs::read_dir(&temp_dir) {
                while let Some(Ok(entry)) = entries.next() {
                    let path = entry.path();
                    if path.is_file() && path.extension().map_or(false, |e| e == "ts") {
                        if let Ok(meta) = entry.metadata() {
                            physical_size += meta.len();
                            if let Some(file_stem) = path.file_stem() {
                                if let Ok(idx) = file_stem.to_string_lossy().parse::<u32>() {
                                    task.completed_chunks.insert(idx);
                                }
                            }
                        }
                    }
                }
            }
            task.downloaded_size = physical_size;

            // 如果已知部分大小且有总分片数，可以尝试预估总大小，使进度条更稳
            if task.total_chunks > 0 && task.completed_chunks.len() > 0 {
                let avg_size = physical_size / task.completed_chunks.len() as u64;
                task.total_size = avg_size * task.total_chunks as u64;
            }
        }

        task.status = TaskStatus::Downloading;
        let task_clone = task.clone();
        let _ = app.emit("download-progress", task_clone);

        (
            normalize_url(&task.url),
            task.headers.clone(),
            task.save_path.clone(),
        )
    };

    let res = download_m3u8_to_path(
        app.clone(),
        manager.clone(),
        task_id.clone(),
        url,
        headers,
        std::path::PathBuf::from(save_path),
        false,
        0, // 单任务默认 chunk_index 为 0
    )
    .await;

    if let Err(e) = res {
        log::error!("[M3U8] Download failed: {}", e);
        let mut inner = manager.lock().await;
        let _ = inner.update_task_status(&task_id, TaskStatus::Error(e.to_user_message()));
        if let Some(task) = inner.tasks.get(&task_id) {
            let _ = app.emit("download-progress", task.clone());
        }
        return Err(e);
    }

    // 标记完成
    {
        let mut inner = manager.lock().await;
        if let Some(task) = inner.get_task_mut(&task_id) {
            task.status = TaskStatus::Completed;
            task.chunk_progress.clear();
            if task.total_size == 0 {
                task.total_size = task.downloaded_size;
            }
            let task_clone = task.clone();
            inner.save_tasks();
            let _ = app.emit("download-progress", task_clone.clone());
            inner.send_notification(&app, "视频下载完成", &task_clone.title);
        }
    }

    Ok(())
}

pub async fn download_m3u8_to_path<R: Runtime>(
    app: AppHandle<R>,
    manager: DownloadManager,
    task_id: String,
    url: String,
    headers: std::collections::HashMap<String, String>,
    save_path_buf: std::path::PathBuf,
    is_collection_chunk: bool,
    chunk_index: u32,
) -> Result<()> {
    let client = {
        let inner = manager.lock().await;
        inner.shared_client.clone()
    };

    // 1. 下载并解析 M3U8 文件
    let response = client
        .get(&url)
        .headers(map_to_header_map(&headers, Some(&url)))
        .send()
        .await?;

    if !response.status().is_success() {
        return Err(Error::Other(format!(
            "获取 M3U8 列表失败 (HTTP {}): {}",
            response.status(),
            url
        )));
    }

    let text = response.text().await?;
    let playlist = m3u8_rs::parse_playlist_res(text.as_bytes())
        .map_err(|_| Error::Other("解析 M3U8 失败".to_string()))?;

    let mut media_url = url.clone();
    let media_playlist = match playlist {
        Playlist::MasterPlaylist(master) => {
            // 选择带宽最高的变体
            let variant = master
                .variants
                .iter()
                .max_by_key(|v| v.bandwidth)
                .ok_or_else(|| Error::Other("未找到可用的视频变体".to_string()))?;

            let variant_url = Url::parse(&url)
                .map_err(|_| Error::Other("基础 URL 无效".to_string()))?
                .join(&variant.uri)
                .map_err(|_| Error::Other("变体 URL 无效".to_string()))?;

            log::info!("[M3U8] Selected variant: {}", variant_url);
            media_url = variant_url.to_string();
            let response = client
                .get(variant_url.as_str())
                .headers(map_to_header_map(&headers, Some(variant_url.as_str())))
                .send()
                .await?;

            if !response.status().is_success() {
                return Err(Error::Other(format!(
                    "无法获取二级媒体列表 (HTTP {}): {}",
                    response.status(),
                    variant_url
                )));
            }

            let res = response.text().await?;
            match m3u8_rs::parse_playlist_res(res.as_bytes()) {
                Ok(Playlist::MediaPlaylist(pl)) => pl,
                _ => return Err(Error::Other("解析二级媒体列表失败".to_string())),
            }
        }
        Playlist::MediaPlaylist(pl) => pl,
    };

    let segments = media_playlist.segments;
    let total_segments = segments.len();

    if total_segments == 0 {
        return Err(Error::Other("M3U8 列表中没有分片".to_string()));
    }

    log::info!("[M3U8] Total segments found: {}", total_segments);

    // 1.5 处理加密信息 (AES-128)
    let mut keys_data: std::collections::HashMap<String, Vec<u8>> =
        std::collections::HashMap::new();
    let mut segment_key_infos = Vec::new();
    let mut current_key_uri = None;
    let mut active_key_data = None;
    let mut current_explicit_iv = None;

    let base_url =
        Url::parse(&media_url).map_err(|_| Error::Other("解析基础 URL 失败".to_string()))?;

    for (i, segment) in segments.iter().enumerate() {
        if let Some(key) = &segment.key {
            match key.method {
                m3u8_rs::KeyMethod::AES128 => {
                    if let Some(uri) = &key.uri {
                        let absolute_key_uri = base_url
                            .join(uri)
                            .map_err(|_| Error::Other("无效的 Key URL".into()))?;
                        let key_url_str = absolute_key_uri.to_string();

                        if current_key_uri.as_ref() != Some(&key_url_str) {
                            if let Some(cached_key) = keys_data.get(&key_url_str) {
                                active_key_data = Some(cached_key.clone());
                            } else {
                                log::info!("[M3U8] Fetching decryption key: {}", key_url_str);
                                let response = client
                                    .get(&key_url_str)
                                    .headers(map_to_header_map(&headers, Some(&key_url_str)))
                                    .send()
                                    .await?;
                                if !response.status().is_success() {
                                    return Err(Error::Other(format!(
                                        "获取解密密钥失败 (HTTP {}): {}",
                                        response.status(),
                                        key_url_str
                                    )));
                                }
                                let kd = response.bytes().await?;
                                if kd.len() != 16 {
                                    return Err(Error::Other(format!(
                                        "无效的密钥长度: {}",
                                        kd.len()
                                    )));
                                }
                                keys_data.insert(key_url_str.clone(), kd.to_vec());
                                active_key_data = Some(kd.to_vec());
                            }
                            current_key_uri = Some(key_url_str);
                        }
                    }

                    current_explicit_iv = key.iv.as_ref().map(|s| parse_hex_iv(s));
                }
                m3u8_rs::KeyMethod::None => {
                    active_key_data = None;
                    current_explicit_iv = None;
                    current_key_uri = None;
                }
                _ => {
                    active_key_data = None;
                    current_explicit_iv = None;
                }
            }
        }

        let final_iv = if active_key_data.is_some() {
            if let Some(iv) = &current_explicit_iv {
                Some(iv.clone())
            } else {
                let mut iv = vec![0u8; 16];
                let seq = (media_playlist.media_sequence + i as u64).to_be_bytes();
                iv[8..16].copy_from_slice(&seq);
                Some(iv)
            }
        } else {
            None
        };

        segment_key_infos.push((active_key_data.clone(), final_iv));
    }

    // 更新任务的总分片数 (仅限单任务模式)
    if !is_collection_chunk {
        let mut inner = manager.lock().await;
        let task_clone = if let Some(task) = inner.get_task_mut(&task_id) {
            task.total_chunks = total_segments as u32;
            Some(task.clone())
        } else {
            None
        };

        inner.save_tasks();

        if let Some(tc) = task_clone {
            let _ = app.emit("download-progress", tc);
        }
    }

    // 2. 创建临时目录存放分片
    let temp_dir = if let Some(parent) = save_path_buf.parent() {
        let file_name = save_path_buf
            .file_name()
            .unwrap_or_default()
            .to_string_lossy();
        parent.join(format!(".tmp_{}", file_name))
    } else {
        app.path()
            .app_data_dir()
            .unwrap()
            .join("temp")
            .join(&task_id)
    };

    if !temp_dir.exists() {
        fs::create_dir_all(&temp_dir).await?;
    }

    // 3. 并行下载分片
    let semaphore = Arc::new(tokio::sync::Semaphore::new(5));
    let mut segment_futures = Vec::new();

    // 统计初始已存在的分片数，用于恢复下载时的进度计算
    let mut initial_completed = 0;
    for i in 0..total_segments {
        let temp_file = temp_dir.join(format!("{:06}.ts", i));
        if temp_file.exists() {
            initial_completed += 1;
        }
    }
    let completed_segments_count = Arc::new(std::sync::atomic::AtomicU32::new(initial_completed));

    for (i, segment) in segments.iter().enumerate() {
        let segment_url = base_url
            .join(&segment.uri)
            .map_err(|_| Error::Other(format!("解析分片 URL 失败: {}", segment.uri)))?;

        let client = client.clone();
        let headers = headers.clone();
        let temp_dir = temp_dir.clone();
        let app = app.clone();
        let manager = manager.clone();
        let task_id = task_id.clone();
        let semaphore = semaphore.clone();
        let completed_segments_count = completed_segments_count.clone();

        segment_futures.push(tokio::spawn(async move {
            let _permit = semaphore.acquire().await.unwrap();
            let temp_file = temp_dir.join(format!("{:06}.ts", i));
            let temp_file_dl = temp_dir.join(format!("{:06}.ts.dl", i));

            if !temp_file.exists() {
                let mut retry_count = 0;
                let max_retries = 5;
                let mut success = false;

                while retry_count <= max_retries {
                    let mut bytes_in_this_attempt = 0;
                    let download_res = async {
                        let mut resp = client
                            .get(segment_url.as_str())
                            .headers(map_to_header_map(&headers, Some(segment_url.as_str())))
                            .send()
                            .await?;

                        if resp.status().is_success() {
                            let total_seg_size = resp.content_length();
                            let mut seg_data_len = 0;
                            let mut file = OpenOptions::new()
                                .write(true)
                                .create(true)
                                .truncate(true)
                                .open(&temp_file_dl)
                                .await?;

                            while let Some(chunk) = resp.chunk().await? {
                                file.write_all(&chunk).await?;
                                seg_data_len += chunk.len();

                                let mut inner = manager.lock().await;
                                let now = std::time::Instant::now();
                                let should_emit = inner
                                    .last_update_times
                                    .get(&task_id)
                                    .map(|t| now.duration_since(*t).as_millis() > 500)
                                    .unwrap_or(true);

                                if let Some(task) = inner.get_task_mut(&task_id) {
                                    // 给合集中的小分片也要检查主任务状态，如果已暂停则终止线程
                                    if !matches!(task.status, TaskStatus::Downloading) {
                                        return Err(Error::TaskStopped);
                                    }

                                    let amt = chunk.len() as u64;
                                    task.downloaded_size += amt;
                                    bytes_in_this_attempt += amt;

                                    // 平滑进度更新
                                    if let Some(total) = total_seg_size {
                                        if total > 0 {
                                            let p = seg_data_len as f64 / total as f64;
                                            if !is_collection_chunk {
                                                task.chunk_progress.insert(i as u32, p);
                                            }
                                        }
                                    }

                                    if should_emit {
                                        let task_clone = task.clone();
                                        inner.last_update_times.insert(task_id.clone(), now);
                                        let _ = app.emit("download-progress", task_clone);
                                    }
                                }
                            }
                            file.flush().await?;
                            Ok::<(), Error>(())
                        } else {
                            Err(Error::Other(format!("HTTP {}", resp.status())))
                        }
                    }
                    .await;

                    if download_res.is_ok() {
                        let _ = fs::rename(&temp_file_dl, &temp_file).await;
                        success = true;
                        break;
                    } else {
                        let err = download_res.unwrap_err();
                        // 如果是人为暂停引发的停止，直接退出不再重试
                        if matches!(err, Error::TaskStopped) {
                            // 失败回滚当前尝试的下载量
                            let mut inner = manager.lock().await;
                            if let Some(task) = inner.get_task_mut(&task_id) {
                                task.downloaded_size =
                                    task.downloaded_size.saturating_sub(bytes_in_this_attempt);
                                if !is_collection_chunk {
                                    task.chunk_progress.remove(&(i as u32));
                                }
                            }
                            return Err(err);
                        }

                        // 失败回滚当前尝试的下载量
                        let mut inner = manager.lock().await;
                        if let Some(task) = inner.get_task_mut(&task_id) {
                            task.downloaded_size =
                                task.downloaded_size.saturating_sub(bytes_in_this_attempt);
                            if !is_collection_chunk {
                                task.chunk_progress.remove(&(i as u32));
                            }
                        }
                        log::warn!(
                            "[M3U8] Segment {} download failed (attempt {}): {:?}",
                            i,
                            retry_count,
                            err
                        );
                    }

                    retry_count += 1;
                    tokio::time::sleep(std::time::Duration::from_millis(1000 * retry_count as u64))
                        .await;
                }

                if !success {
                    return Err(Error::Other(format!("分片 {} 下载失败", i)));
                }
            }

            // 更新完成状态
            {
                let count =
                    completed_segments_count.fetch_add(1, std::sync::atomic::Ordering::SeqCst) + 1;
                let mut inner = manager.lock().await;
                let now = std::time::Instant::now();
                let should_emit = inner
                    .last_update_times
                    .get(&task_id)
                    .map(|t| now.duration_since(*t).as_millis() > 500)
                    .unwrap_or(true);

                let mut task_to_emit = None;
                if let Some(task) = inner.get_task_mut(&task_id) {
                    if !is_collection_chunk {
                        task.completed_chunks.insert(i as u32);
                        task.chunk_progress.remove(&(i as u32));

                        // 动态更新总大小估算
                        if task.total_chunks > 0 {
                            let completed_len = task.completed_chunks.len() as u64;
                            if completed_len > 0 {
                                let avg_size = task.downloaded_size / completed_len;
                                task.total_size = avg_size * task.total_chunks as u64;
                            }
                        }

                        if should_emit || count == total_segments as u32 {
                            task_to_emit = Some(task.clone());
                        }
                    } else {
                        // 更新合集任务中该剧集的进度
                        let progress = count as f64 / total_segments as f64;
                        task.chunk_progress.insert(chunk_index, progress);
                        if should_emit {
                            task_to_emit = Some(task.clone());
                        }
                    }
                }

                if let Some(task_clone) = task_to_emit {
                    inner.last_update_times.insert(task_id.clone(), now);
                    let _ = app.emit("download-progress", task_clone);
                }
            }

            Ok(())
        }));
    }

    for result in futures_util::future::join_all(segment_futures).await {
        result.map_err(|e| Error::Other(format!("线程执行失败: {}", e)))??;
    }

    // 4. 合并分片 (并执行解密)
    log::info!("[M3U8] All segments downloaded. Starting merger & decryption...");
    if let Some(parent) = save_path_buf.parent() {
        fs::create_dir_all(parent).await?;
    }

    {
        let mut out_file: fs::File = OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .open(&save_path_buf)
            .await?;

        for i in 0..total_segments {
            let temp_file = temp_dir.join(format!("{:06}.ts", i));
            let mut content = fs::read(&temp_file).await?;

            // 执行解密逻辑
            let (key_data, iv_data) = &segment_key_infos[i];
            if let (Some(kd), Some(iv)) = (key_data, iv_data) {
                content = decrypt_segment(&content, kd, iv)?;
            }

            out_file.write_all(&content).await?;
        }
    }

    // 5. 完成清理
    let mut retry = 0;
    while retry < 3 {
        if let Ok(_) = fs::remove_dir_all(&temp_dir).await {
            log::info!("[M3U8] Temp dir removed: {:?}", temp_dir);
            break;
        }
        log::warn!(
            "[M3U8] Failed to remove temp dir, retrying... ({}/3)",
            retry + 1
        );
        tokio::time::sleep(std::time::Duration::from_millis(200)).await;
        retry += 1;
    }

    if is_collection_chunk {
        crate::download_manager::engine::utils::set_collection_item_mtime(
            &save_path_buf,
            chunk_index,
        );
    }

    log::info!("[M3U8] Video merged and saved to: {:?}", save_path_buf);
    Ok(())
}
