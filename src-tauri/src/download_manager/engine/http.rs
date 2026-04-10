use std::sync::Arc;
use tokio::fs::{self, OpenOptions};
use tokio::io::{AsyncSeekExt, AsyncWriteExt};
use tauri::{AppHandle, Emitter, Runtime};
use futures_util::StreamExt;
use crate::download_manager::task::TaskStatus;
use crate::download_manager::DownloadManager;
use crate::download_manager::error::{Result, Error};
use super::utils::{map_to_header_map, normalize_url};

pub async fn start_http_download<R: Runtime>(
    app: AppHandle<R>,
    manager: DownloadManager,
    task_id: String,
) -> Result<()> {
    let res = do_start_http_download(app.clone(), manager.clone(), task_id.clone()).await;
    
    if let Err(e) = res {
        let mut inner = manager.lock().await;
        let _ = inner.update_task_status(&task_id, TaskStatus::Error(e.to_string()));
        if let Some(task) = inner.tasks.get(&task_id) {
             let _ = app.emit("download-progress", task.clone());
        }
        return Err(e);
    }
    Ok(())
}

async fn do_start_http_download<R: Runtime>(
    app: AppHandle<R>,
    manager: DownloadManager,
    task_id: String,
) -> Result<()> {
    let (url, headers, save_path, downloaded_size, mut total) = {
        let mut inner = manager.lock().await;

        if inner.active_workers.contains_key(&task_id) {
            if let Some(task) = inner.tasks.get(&task_id) {
                if task.status == TaskStatus::Downloading {
                    return Ok(());
                }
            }
        }

        let task = inner.get_task_mut(&task_id).ok_or_else(|| Error::TaskNotFound(task_id.clone()))?;
        task.status = TaskStatus::Downloading;
        let task_clone = task.clone();
        let _ = app.emit("download-progress", task_clone);
        
        (
            normalize_url(&task.url),
            task.headers.clone(),
            task.save_path.clone(),
            task.downloaded_size,
            task.total_size,
        )
    };

    let client = {
        let inner = manager.lock().await;
        inner.shared_client.clone()
    };

    if total == 0 {
        total = get_content_length(&client, &url).await.unwrap_or(0);
        if total > 0 {
            let mut inner = manager.lock().await;
            if let Some(task) = inner.get_task_mut(&task_id) {
                task.total_size = total;
                inner.save_tasks();
            }
        }
    }

    if let Some(parent) = save_path.parent() {
        fs::create_dir_all(parent).await?;
    }
    
    {
        let file = std::fs::OpenOptions::new()
            .write(true)
            .create(true)
            .open(&save_path)?;
        if total > 0 {
            file.set_len(total)?;
        }
    }

    if total == 0 {
        return stream_download(app, manager, task_id, url, &headers, client, save_path).await;
    }

    let chunk_size = 10 * 1024 * 1024;
    let mut chunks = Vec::new();
    let mut current_pos = downloaded_size;
    
    while current_pos < total {
        let end = (current_pos + chunk_size).min(total) - 1;
        chunks.push((current_pos, end));
        current_pos = end + 1;
    }

    let semaphore = Arc::new(tokio::sync::Semaphore::new(4));
    let mut stream = futures_util::stream::iter(chunks).map(|(start, end)| {
        let sem = semaphore.clone();
        let url = url.clone();
        let headers = headers.clone();
        let path = save_path.clone();
        let manager = manager.clone();
        let app = app.clone();
        let task_id = task_id.clone();
        let client = client.clone();

        async move {
            let _permit = sem.acquire().await.unwrap();
            let mut retry_count = 0;
            let max_retries = 3;
            let mut last_error = None;

            while retry_count <= max_retries {
                if retry_count > 0 {
                    tokio::time::sleep(std::time::Duration::from_millis(1000 * retry_count as u64)).await;
                }

                match download_chunk_segment(&client, &app, &manager, &task_id, &url, &headers, &path, start, end).await {
                    Ok(_) => return Ok(()),
                    Err(e) => {
                        log::warn!("Download chunk {}-{} failed (attempt {}): {}", start, end, retry_count + 1, e);
                        last_error = Some(e);
                        retry_count += 1;
                    }
                }
            }
            Err(last_error.unwrap_or_else(|| Error::Other("Unknown error during chunk retry".to_string())))
        }
    }).buffer_unordered(4);

    while let Some(result) = stream.next().await {
        result?;
    }

    finalize_task(&app, &manager, &task_id).await
}

async fn download_chunk_segment<R: Runtime>(
    client: &reqwest::Client,
    app: &AppHandle<R>,
    manager: &DownloadManager,
    task_id: &str,
    url: &str,
    headers: &std::collections::HashMap<String, String>,
    path: &std::path::PathBuf,
    start: u64,
    end: u64,
) -> Result<()> {
    let mut res = client.get(url)
        .headers(map_to_header_map(headers))
        .header("Range", format!("bytes={}-{}", start, end))
        .send().await?;

    if !res.status().is_success() && res.status() != http::StatusCode::PARTIAL_CONTENT {
        return Err(Error::Network(res.error_for_status().unwrap_err()));
    }

    let mut file = OpenOptions::new().write(true).open(path).await?;
    file.seek(std::io::SeekFrom::Start(start)).await?;

    let mut bytes_since_last_emit = 0;

    while let Some(chunk) = res.chunk().await? {
        file.write_all(&chunk).await?;
        bytes_since_last_emit += chunk.len() as u64;
        
        let now = std::time::Instant::now();
        let mut inner = manager.lock().await;
        
        // 1. 先检查频率限制
        let should_update = inner.last_update_times.get(task_id)
            .map(|last| now.duration_since(*last).as_millis() > 500)
            .unwrap_or(true);

        // 2. 更新内存中的下载进度
        if let Some(task) = inner.get_task_mut(task_id) {
            task.downloaded_size += bytes_since_last_emit;
            bytes_since_last_emit = 0;

            if should_update {
                let task_clone = task.clone();
                inner.last_update_times.insert(task_id.to_string(), now);
                let _ = app.emit("download-progress", task_clone);
            }
        }
    }

    if bytes_since_last_emit > 0 {
        let mut inner = manager.lock().await;
        if let Some(task) = inner.get_task_mut(task_id) {
            task.downloaded_size += bytes_since_last_emit;
            let _ = app.emit("download-progress", task.clone());
        }
    }

    Ok(())
}

async fn get_content_length(client: &reqwest::Client, url: &str) -> Option<u64> {
    if let Ok(res) = client.head(url).send().await {
        if let Some(len) = res.content_length() {
            return Some(len);
        }
    }

    if let Ok(res) = client.get(url).header("Range", "bytes=0-0").send().await {
        if let Some(content_range) = res.headers().get("Content-Range") {
            if let Ok(range_str) = content_range.to_str() {
                if let Some(slash_pos) = range_str.rfind('/') {
                    return range_str[slash_pos + 1..].parse::<u64>().ok();
                }
            }
        }
        if res.status().is_success() {
            return res.content_length();
        }
    }
    None
}

async fn stream_download<R: Runtime>(
    app: AppHandle<R>,
    manager: DownloadManager,
    task_id: String,
    url: String,
    headers: &std::collections::HashMap<String, String>,
    client: reqwest::Client,
    save_path: std::path::PathBuf,
) -> Result<()> {
    let mut res = client.get(&url)
        .headers(map_to_header_map(headers))
        .send().await?;
    if !res.status().is_success() {
         return Err(Error::Network(res.error_for_status().unwrap_err()));
    }

    let mut file = fs::File::create(&save_path).await?;
    let mut bytes_since_last_emit = 0;

    while let Some(chunk) = res.chunk().await? {
        file.write_all(&chunk).await?;
        bytes_since_last_emit += chunk.len() as u64;

        let now = std::time::Instant::now();
        let mut inner = manager.lock().await;

        let should_update = inner.last_update_times.get(&task_id)
            .map(|last| now.duration_since(*last).as_millis() > 500)
            .unwrap_or(true);

        if let Some(task) = inner.get_task_mut(&task_id) {
            task.downloaded_size += bytes_since_last_emit;
            bytes_since_last_emit = 0;

            if task.total_size == 0 {
                if let Some(len) = res.content_length() {
                    task.total_size = len;
                }
            }

            if should_update {
                let task_clone = task.clone();
                inner.last_update_times.insert(task_id.clone(), now);
                let _ = app.emit("download-progress", task_clone);
            }
        }
    }

    if bytes_since_last_emit > 0 {
        let mut inner = manager.lock().await;
        if let Some(task) = inner.get_task_mut(&task_id) {
            task.downloaded_size += bytes_since_last_emit;
            let _ = app.emit("download-progress", task.clone());
        }
    }
    finalize_task(&app, &manager, &task_id).await
}

async fn finalize_task<R: Runtime>(app: &AppHandle<R>, manager: &DownloadManager, task_id: &str) -> Result<()> {
    let mut inner = manager.lock().await;
    let task = inner.get_task_mut(task_id).ok_or_else(|| Error::TaskNotFound(task_id.to_string()))?;
    task.status = TaskStatus::Completed;
    let task_clone = task.clone();
    inner.save_tasks();
    let _ = app.emit("download-progress", task_clone);
    Ok(())
}
