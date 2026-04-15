use super::utils::{map_to_header_map, normalize_url, set_collection_item_mtime};
use crate::download_manager::error::{Error, Result};
use crate::download_manager::task::{Category, TaskStatus};
use crate::download_manager::DownloadManager;
use tauri::{AppHandle, Emitter, Runtime};
use tokio::fs;

fn get_temp_dir(save_path: &std::path::Path) -> Result<std::path::PathBuf> {
    // 这里的 save_path 对于合集任务通常是一个目录 (Comic/Music) 或者一个文件 (Book)
    // 我们统一在它的父目录下 (如果是文件) 或其内部 (如果是目录) 创建 .tmp_ 文件夹
    let (parent, folder_name) = if save_path.is_file() || save_path.to_string_lossy().contains('.')
    {
        (
            save_path
                .parent()
                .ok_or_else(|| Error::Other("无效的任务路径".into()))?,
            save_path.file_name().unwrap_or_default().to_string_lossy(),
        )
    } else {
        (
            save_path,
            save_path.file_name().unwrap_or_default().to_string_lossy(),
        )
    };

    Ok(parent.join(format!(".tmp_{}", folder_name)))
}

fn get_collection_item_filename(title: &str, category: &Category, index: u32) -> String {
    if title.is_empty() {
        return match category {
            Category::Music => format!("{:03}.mp3", index + 1),
            _ => format!("{:05}.jpg", index + 1),
        };
    }

    let title_lower = title.to_lowercase();
    let has_ext = match category {
        Category::Music => [
            ".mp3", ".wav", ".flac", ".m4a", ".ogg", ".aac", ".mka", ".dsf", ".dff",
        ]
        .iter()
        .any(|ext| title_lower.ends_with(ext)),
        Category::Image | Category::Comic => [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"]
            .iter()
            .any(|ext| title_lower.ends_with(ext)),
        Category::Video => [
            ".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm", ".ts",
        ]
        .iter()
        .any(|ext| title_lower.ends_with(ext)),
        _ => title.contains('.'),
    };

    if !has_ext {
        match category {
            Category::Music => format!("{}.mp3", title),
            Category::Image | Category::Comic => format!("{}.jpg", title),
            Category::Video => format!("{}.mp4", title),
            Category::Book => {
                let sanitized_title =
                    title.replace(|c: char| !c.is_alphanumeric() && c != '_' && c != '-', "_");
                format!("{:04}.{}.txt", index + 1, sanitized_title)
            }
        }
    } else {
        title.to_string()
    }
}

pub async fn append_collection_chunk<R: Runtime>(
    app: AppHandle<R>,
    manager: DownloadManager,
    task_id: String,
    index: u32,
    title: String,
    data: Vec<u8>,
) -> Result<()> {
    let now = std::time::Instant::now();

    // 1. 获取任务信息以确定存储路径和类别
    let (save_path, category, should_update, newly_added) = {
        let mut inner = manager.lock().await;
        let should_update = inner
            .last_update_times
            .get(&task_id)
            .map(|last| now.duration_since(*last).as_millis() > 500)
            .unwrap_or(true);

        let task = inner.get_task_mut(&task_id).ok_or_else(|| {
            log::warn!("[Backend] Task {} not found", task_id);
            Error::TaskNotFound(task_id.clone())
        })?;

        // 更新状态和已下载大小
        // 约定：index >= 1,000,000 的块不计入 completed_chunks（用于漫画图片等静默下载）
        let is_silent = index >= 1_000_000;
        let is_new = if is_silent {
            !task.completed_chunks.contains(&index)
        } else {
            task.completed_chunks.insert(index)
        };

        let mut newly_added = false;
        if is_new {
            task.downloaded_size += data.len() as u64;
            newly_added = true;
        }

        if task.status == TaskStatus::Pending {
            task.status = TaskStatus::Downloading;
        }

        (
            task.save_path.clone(),
            task.category.clone(),
            should_update,
            newly_added,
        )
    };

    // 如果是重复块，对于 Book 类型直接返回，防止内容重复追加
    if category == Category::Book && !newly_added {
        return Ok(());
    }

    // 2. 实时保存
    match category {
        Category::Image | Category::Comic | Category::Music => {
            // 漫画图片块 (index >= 1,000_000) 保存到临时目录，其他保存到目的目录
            let base_path = if category == Category::Comic && index >= 1_000_000 {
                get_temp_dir(&save_path)?
            } else {
                save_path.clone()
            };

            if !base_path.exists() {
                fs::create_dir_all(&base_path).await?;
            }

            let file_name = get_collection_item_filename(&title, &category, index);

            let final_path = base_path.join(&file_name);
            if let Some(parent) = final_path.parent() {
                if !parent.exists() {
                    fs::create_dir_all(parent).await?;
                }
            }
            fs::write(final_path.clone(), &data).await?;
            set_collection_item_mtime(&final_path, index);
            log::info!(
                "[Backend] Saved collection item {} to {:?} for {}",
                file_name,
                base_path,
                task_id
            );
        }
        _ => {
            // 所有非直接落盘的类型（如 Book, Video, 以及其他）统一使用 temp mode
            let temp_dir = get_temp_dir(&save_path)?;
            if !temp_dir.exists() {
                fs::create_dir_all(&temp_dir).await?;
            }
            let chunk_file = temp_dir.join(format!("{:06}.chunk", index));
            fs::write(chunk_file, &data).await?;
            log::info!("[Backend] Saved temp chunk {} for {}", index, task_id);
        }
    }

    // 3. 更新 UI 和保存元数据
    if should_update {
        let mut inner = manager.lock().await;
        if let Some(task) = inner.get_task_mut(&task_id) {
            let task_clone = task.clone();
            inner.save_tasks();
            inner.last_update_times.insert(task_id, now);
            app.emit("download-progress", task_clone)?;
        }
    }

    Ok(())
}

pub async fn download_remote_chunk<R: Runtime>(
    app: AppHandle<R>,
    manager: DownloadManager,
    task_id: String,
    index: u32,
    title: String,
    url: String,
    headers: std::collections::HashMap<String, String>,
) -> Result<()> {
    // 1. 预检查：如果文件已存在且属于实时落盘类别，直接跳过下载
    let (save_path, category, client) = {
        let inner = manager.lock().await;
        let task = inner
            .tasks
            .get(&task_id)
            .ok_or_else(|| Error::TaskNotFound(task_id.clone()))?;
        (
            task.save_path.clone(),
            task.category.clone(),
            inner.shared_client.clone(),
        )
    };

    if category == Category::Comic && index >= 1_000_000 {
        // ... (keep comic logic)
        let parts: Vec<&str> = title.split('/').collect();
        if parts.len() >= 2 {
            let chapter_name = parts[0];
            let cbz_path = save_path.join(format!("{}.cbz", chapter_name));
            if cbz_path.exists() {
                log::info!(
                    "[Backend] CBZ already exists for chapter {}, skipping.",
                    chapter_name
                );
                return Ok(());
            }
        }
        let temp_dir = get_temp_dir(&save_path)?;
        let file_name = get_collection_item_filename(&title, &category, index);
        let temp_path = temp_dir.join(file_name);
        if temp_path.exists() {
            log::info!(
                "[Backend] Temp file already exists for {} item {}, skipping.",
                task_id,
                index
            );
            return Ok(());
        }
    } else if matches!(
        category,
        Category::Image | Category::Music | Category::Video
    ) {
        let file_name = get_collection_item_filename(&title, &category, index);
        let final_path = save_path.join(file_name);
        if final_path.exists() {
            log::info!(
                "[Backend] File already exists for {} item {}, skipping.",
                task_id,
                index
            );
            let mut inner = manager.lock().await;
            if let Some(task) = inner.get_task_mut(&task_id) {
                task.completed_chunks.insert(index);
                let task_clone = task.clone();
                inner.save_tasks();
                let _ = app.emit("download-progress", task_clone);
            }
            return Ok(());
        }
    }

    let mut retry_count = 0;
    let max_retries = 3;
    let mut last_error = None;

    while retry_count <= max_retries {
        if retry_count > 0 {
            tokio::time::sleep(std::time::Duration::from_millis(1000 * retry_count as u64)).await;
        }

        log::info!(
            "[Backend] Downloading chunk {} for {} (attempt {})",
            index,
            task_id,
            retry_count + 1
        );

        match download_remote_chunk_streaming(
            &app, &manager, &task_id, index, &client, &url, &headers,
        )
        .await
        {
            Ok(data) => {
                // appende_collection_chunk 依然需要更新逻辑，但由于我们已经在 streaming 阶段更新了下载大小，
                // 这里的 data 我们只用于落盘，不再重复计算 downloaded_size。
                return save_collection_chunk_data(app, manager, task_id, index, title, data).await;
            }
            Err(e) => {
                log::warn!("[Backend] Download failed: {}", e);
                last_error = Some(e);
                retry_count += 1;
            }
        }
    }

    Err(last_error
        .unwrap_or_else(|| Error::Other("Unknown error during remote chunk retry".to_string())))
}

async fn download_remote_chunk_streaming<R: Runtime>(
    app: &AppHandle<R>,
    manager: &DownloadManager,
    task_id: &str,
    index: u32,
    client: &reqwest::Client,
    url: &str,
    headers: &std::collections::HashMap<String, String>,
) -> Result<Vec<u8>> {
    let mut response = client
        .get(normalize_url(url))
        .headers(map_to_header_map(headers, Some(url)))
        .send()
        .await?;

    if !response.status().is_success() {
        return Err(Error::Other(format!("HTTP Error: {}", response.status())));
    }

    let total_sub_size = response.content_length();
    let mut bytes_received_in_this_attempt = 0;

    let res = async {
        let mut inner_data = Vec::new();
        while let Some(chunk_res) = response.chunk().await.map_err(Error::Network)? {
            let chunk = chunk_res;
            inner_data.extend_from_slice(&chunk);

            let mut inner = manager.lock().await;
            let now = std::time::Instant::now();
            let should_emit = inner
                .last_update_times
                .get(task_id)
                .map(|t| now.duration_since(*t).as_millis() > 500)
                .unwrap_or(true);

            if let Some(task) = inner.get_task_mut(task_id) {
                let amt = chunk.len() as u64;
                task.downloaded_size += amt;
                bytes_received_in_this_attempt += amt;

                // 更新该分片的进度
                if let Some(total) = total_sub_size {
                    if total > 0 {
                        let progress = inner_data.len() as f64 / total as f64;
                        task.chunk_progress.insert(index, progress);
                    }
                } else {
                    task.chunk_progress.insert(index, 0.1);
                }

                if should_emit {
                    let task_clone = task.clone();
                    inner.last_update_times.insert(task_id.to_string(), now);
                    let _ = app.emit("download-progress", task_clone);
                }
            }
        }
        Ok::<Vec<u8>, Error>(inner_data)
    }
    .await;

    if let Err(_e) = &res {
        // 失败回滚：从已下载大小中减去本次下载尝试中增加的部分
        let mut inner = manager.lock().await;
        if let Some(task) = inner.get_task_mut(task_id) {
            task.downloaded_size = task
                .downloaded_size
                .saturating_sub(bytes_received_in_this_attempt);
            // 进度清空
            task.chunk_progress.remove(&index);
        }
        return Err(res.unwrap_err());
    }

    Ok(res.unwrap())
}

pub async fn save_collection_chunk_data<R: Runtime>(
    app: AppHandle<R>,
    manager: DownloadManager,
    task_id: String,
    index: u32,
    title: String,
    data: Vec<u8>,
) -> Result<()> {
    // 这个函数类似于 append_collection_chunk，但其假设 downloaded_size 已经在流式下载阶段更新过了
    let (save_path, category) = {
        let mut inner = manager.lock().await;
        let task = inner
            .get_task_mut(&task_id)
            .ok_or_else(|| Error::TaskNotFound(task_id.clone()))?;

        let is_silent = index >= 1_000_000;
        if !is_silent {
            task.completed_chunks.insert(index);
        }

        if task.status == TaskStatus::Pending {
            task.status = TaskStatus::Downloading;
        }

        (task.save_path.clone(), task.category.clone())
    };

    // 保存文件逻辑 (与原来的 append_collection_chunk 相同)
    match category {
        Category::Image | Category::Comic | Category::Music => {
            let base_path = if category == Category::Comic && index >= 1_000_000 {
                get_temp_dir(&save_path)?
            } else {
                save_path.clone()
            };
            if !base_path.exists() {
                fs::create_dir_all(&base_path).await?;
            }
            let file_name = get_collection_item_filename(&title, &category, index);
            let final_path = base_path.join(&file_name);
            if let Some(parent) = final_path.parent() {
                if !parent.exists() {
                    fs::create_dir_all(parent).await?;
                }
            }
            fs::write(final_path.clone(), &data).await?;
            set_collection_item_mtime(&final_path, index);
        }
        _ => {
            let temp_dir = get_temp_dir(&save_path)?;
            if !temp_dir.exists() {
                fs::create_dir_all(&temp_dir).await?;
            }
            let chunk_file = temp_dir.join(format!("{:06}.chunk", index));
            fs::write(chunk_file, &data).await?;
        }
    }

    // 最终 Emit 一次
    let mut inner = manager.lock().await;
    if let Some(task) = inner.get_task_mut(&task_id) {
        let task_clone = task.clone();
        inner.save_tasks();
        app.emit("download-progress", task_clone)?;
    }
    Ok(())
}

pub async fn finalize_collection_download<R: Runtime>(
    app: AppHandle<R>,
    manager: DownloadManager,
    task_id: String,
) -> Result<()> {
    log::info!("[Backend] finalize_collection_download: {}", task_id);

    let (save_path, category) = {
        let inner = manager.lock().await;
        let task = inner
            .tasks
            .get(&task_id)
            .ok_or_else(|| Error::TaskNotFound(task_id.clone()))?;
        (task.save_path.clone(), task.category.clone())
    };

    let temp_dir = get_temp_dir(&save_path)?;
    // Book 类型需要合并分片
    if category == Category::Book && temp_dir.exists() {
        log::info!("[Backend] Merging Book chapters for: {}", task_id);
        if let Some(parent) = save_path.parent() {
            let _ = fs::create_dir_all(parent).await;
        }

        {
            use tokio::io::AsyncWriteExt;
            let mut out_file = fs::File::create(&save_path).await?;
            let mut entries = vec![];
            let mut dir = fs::read_dir(&temp_dir).await?;
            while let Some(entry) = dir.next_entry().await? {
                let path = entry.path();
                if path.extension().map_or(false, |e| e == "chunk") {
                    entries.push(path);
                }
            }
            // 按文件名排序 (000000.chunk, 000001.chunk ...)
            entries.sort();
            for path in entries {
                let content = fs::read(path).await?;
                out_file.write_all(&content).await?;
                out_file.write_all(b"\n\n").await?;
            }
        }
    }

    let mut inner = manager.lock().await;
    let task = inner
        .get_task_mut(&task_id)
        .ok_or_else(|| Error::TaskNotFound(task_id.clone()))?;

    task.status = TaskStatus::Completed;
    task.chunk_progress.clear();
    if task.total_size == 0 {
        task.total_size = task.downloaded_size;
    }
    let task_clone = task.clone();
    inner.save_tasks();
    inner.last_update_times.remove(&task_id);
    drop(inner);

    // 清理临时目录
    if temp_dir.exists() {
        let mut retry = 0;
        while retry < 3 {
            if let Ok(_) = fs::remove_dir_all(&temp_dir).await {
                log::info!("[Backend] Temp dir removed: {:?}", temp_dir);
                break;
            }
            log::warn!(
                "[Backend] Failed to remove temp dir, retrying... ({}/3)",
                retry + 1
            );
            tokio::time::sleep(std::time::Duration::from_millis(200)).await;
            retry += 1;
        }
    }

    app.emit("download-progress", task_clone.clone())?;

    // 发送完成通知
    #[cfg(target_os = "android")]
    {
        let inner = manager.lock().await;
        inner.send_notification(&app, "下载已完成", &task_clone.title);
    }
    #[cfg(not(target_os = "android"))]
    app.emit(
        "showSuccessToast",
        format!("下载已完成: {}", task_clone.title),
    )
    .unwrap_or_default();

    log::info!("[Backend] Task {} finalized successfully", task_id);

    Ok(())
}

pub async fn package_to_cbz<R: Runtime>(
    _app: AppHandle<R>,
    manager: DownloadManager,
    task_id: String,
    subdir_name: String,
) -> Result<()> {
    let (save_path, category) = {
        let inner = manager.lock().await;
        let task = inner
            .tasks
            .get(&task_id)
            .ok_or_else(|| Error::TaskNotFound(task_id.clone()))?;
        (task.save_path.clone(), task.category.clone())
    };

    if category != Category::Comic {
        return Err(Error::Other("只有漫画任务支持打包为 CBZ".into()));
    }

    let temp_dir = get_temp_dir(&save_path)?;
    let src_dir = temp_dir.join(&subdir_name);
    let target_file = save_path.join(format!("{}.cbz", subdir_name));

    log::info!(
        "[Backend] Packaging CBZ: src={:?}, target={:?}",
        src_dir,
        target_file
    );

    if !src_dir.exists() {
        log::error!(
            "[Backend] Package failed: source directory {:?} does not exist",
            src_dir
        );
        return Err(Error::Other(format!("源目录 {} 不存在", subdir_name)));
    }

    // 确保目标文件的父目录存在
    if let Some(parent) = target_file.parent() {
        if !parent.exists() {
            log::info!("[Backend] Creating target parent directory: {:?}", parent);
            fs::create_dir_all(parent).await?;
        }
    }

    // 转换为阻塞任务进行压缩处理（因为 zip 库通常是同步的）
    tokio::task::spawn_blocking(move || -> Result<()> {
        use std::io::{Read, Write};
        use zip::write::SimpleFileOptions;

        let file = std::fs::File::create(&target_file)?;
        let mut zip = zip::ZipWriter::new(file);
        let options =
            SimpleFileOptions::default().compression_method(zip::CompressionMethod::Stored); // 漫画通常不压缩以提高加载速度

        let mut paths = std::fs::read_dir(&src_dir)?
            .filter_map(|res| res.ok())
            .collect::<Vec<_>>();

        // 排序确保顺序正确
        paths.sort_by_key(|p| p.file_name());

        let mut buffer = Vec::new();

        for entry in paths {
            let path = entry.path();
            if path.is_file() {
                let name = path.file_name().unwrap().to_string_lossy();
                log::info!("[Backend] Zipping file: {}", name);
                zip.start_file(name, options)?;
                let mut f = std::fs::File::open(path)?;
                f.read_to_end(&mut buffer)?;
                zip.write_all(&buffer)?;
                buffer.clear();
            }
        }

        zip.finish()?;
        log::info!("[Backend] CBZ created successfully: {:?}", target_file);

        // 打包成功后删除原始文件夹
        log::info!("[Backend] Removing source directory: {:?}", src_dir);
        let _ = std::fs::remove_dir_all(src_dir);

        Ok(())
    })
    .await
    .map_err(|e| {
        log::error!("[Backend] Zip Task Error: {}", e);
        Error::Other(e.to_string())
    })?
}
