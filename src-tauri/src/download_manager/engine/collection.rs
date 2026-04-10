use tokio::fs;
use tokio::io::AsyncWriteExt;
use tauri::{AppHandle, Emitter, Runtime, Manager};
use crate::download_manager::task::{TaskStatus, Category};
use crate::download_manager::DownloadManager;
use crate::download_manager::error::{Result, Error};
use super::utils::{map_to_header_map, normalize_url};

fn get_temp_dir<R: tauri::Runtime>(app: &tauri::AppHandle<R>, task_id: &str) -> Result<std::path::PathBuf> {
    // 简单清洗，确保作为目录名是合法的
    let safe_id = task_id.replace(|c: char| !c.is_alphanumeric() && c != '_' && c != '-', "_");
    Ok(app.path().app_data_dir().map_err(Error::Tauri)?.join("temp").join(safe_id))
}

pub async fn append_collection_chunk<R: Runtime>(
    app: AppHandle<R>,
    manager: DownloadManager,
    task_id: String,
    index: u32,
    data: Vec<u8>,
) -> Result<()> {
    let now = std::time::Instant::now();
    let mut inner = manager.lock().await;

    let should_update = inner.last_update_times.get(&task_id)
        .map(|last| now.duration_since(*last).as_millis() > 500)
        .unwrap_or(true);

    let task = inner.get_task_mut(&task_id).ok_or_else(|| Error::TaskNotFound(task_id.clone()))?;

    let temp_dir = get_temp_dir(&app, &task_id)?;
    if !temp_dir.exists() {
        fs::create_dir_all(&temp_dir).await?;
    }

    let chunk_file = temp_dir.join(format!("{:06}.chunk", index));
    fs::write(chunk_file, &data).await?;

    task.completed_chunks.insert(index);
    task.downloaded_size += data.len() as u64;

    // 如果任务处于等待状态，自动切换到下载中
    if task.status == TaskStatus::Pending {
        task.status = TaskStatus::Downloading;
    }
    
    let is_last_chunk = task.total_chunks > 0 && task.completed_chunks.len() as u32 == task.total_chunks;
    
    if should_update || is_last_chunk {
        let task_clone = task.clone();
        inner.save_tasks();
        inner.last_update_times.insert(task_id, now);
        app.emit("download-progress", task_clone)?;
    }
    
    Ok(())
}

pub async fn download_remote_chunk<R: Runtime>(
    app: AppHandle<R>,
    manager: DownloadManager,
    task_id: String,
    index: u32,
    url: String,
    headers: std::collections::HashMap<String, String>,
) -> Result<()> {
    let client = {
        let inner = manager.lock().await;
        inner.shared_client.clone()
    };
        
    let mut retry_count = 0;
    let max_retries = 3;
    let mut last_error = None;

    while retry_count <= max_retries {
        if retry_count > 0 {
            tokio::time::sleep(std::time::Duration::from_millis(1000 * retry_count as u64)).await;
        }

        match do_download_remote_chunk(&client, &url, &headers).await {
            Ok(data) => return append_collection_chunk(app, manager, task_id, index, data).await,
            Err(e) => {
                log::warn!("Download remote chunk {} failed (attempt {}): {}", index, retry_count + 1, e);
                last_error = Some(e);
                retry_count += 1;
            }
        }
    }
    
    Err(last_error.unwrap_or_else(|| Error::Other("Unknown error during remote chunk retry".to_string())))
}

async fn do_download_remote_chunk(
    client: &reqwest::Client,
    url: &str,
    headers: &std::collections::HashMap<String, String>,
) -> Result<Vec<u8>> {
    let response = client.get(normalize_url(url))
        .headers(map_to_header_map(headers))
        .send().await?;
    if !response.status().is_success() {
        return Err(Error::Network(response.error_for_status().unwrap_err()));
    }

    let data = response.bytes().await?.to_vec();
    Ok(data)
}

pub async fn finalize_collection_download<R: Runtime>(
    app: AppHandle<R>,
    manager: DownloadManager,
    task_id: String,
) -> Result<()> {
    let mut inner = manager.lock().await;
    let task = inner.get_task_mut(&task_id).ok_or_else(|| Error::TaskNotFound(task_id.clone()))?;

    let temp_dir = get_temp_dir(&app, &task_id)?;
    if !temp_dir.exists() {
        return Ok(());
    }

    if let Some(parent) = task.save_path.parent() {
        fs::create_dir_all(parent).await?;
    }

    match task.category {
        Category::Book | Category::Video => {
            let mut final_file = fs::File::create(&task.save_path).await?;
            for i in 0..task.total_chunks {
                let chunk_path = temp_dir.join(format!("{:06}.chunk", i));
                if chunk_path.exists() {
                    let content = fs::read(&chunk_path).await?;
                    final_file.write_all(&content).await?;
                }
            }
        }
        Category::Comic | Category::Image => {
            if !task.save_path.exists() {
                fs::create_dir_all(&task.save_path).await?;
            }
            // 查找 temp_dir 下所有的 chunk 文件并保存
            // 这样即使 index 不是连续的也能工作
            let mut entries = fs::read_dir(&temp_dir).await?;
            let mut chunk_files = Vec::new();
            while let Ok(Some(entry)) = entries.next_entry().await {
                let path = entry.path();
                if path.extension().map_or(false, |ext| ext == "chunk") {
                    if let Some(name) = path.file_stem().and_then(|s| s.to_str()) {
                        if let Ok(index) = name.parse::<u32>() {
                            chunk_files.push((index, path));
                        }
                    }
                }
            }
            chunk_files.sort_by_key(|a| a.0);

            for (i, (_index, path)) in chunk_files.into_iter().enumerate() {
                let final_chunk_path = task.save_path.join(format!("{:03}.jpg", i));
                fs::copy(&path, &final_chunk_path).await?;
            }
        }
        _ => {}
    }

    task.status = TaskStatus::Completed;
    let task_clone = task.clone();
    inner.save_tasks();
    inner.last_update_times.remove(&task_id); // 清理缓存时间
    drop(inner);
    
    let _ = fs::remove_dir_all(temp_dir).await;
    app.emit("download-progress", task_clone)?;
    
    Ok(())
}
