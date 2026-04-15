use super::utils::{map_to_header_map, normalize_url};
use crate::download_manager::error::{Error, Result};
use crate::download_manager::task::TaskStatus;
use crate::download_manager::DownloadManager;

use std::sync::Arc;
use tauri::{AppHandle, Emitter, Runtime};
use tokio::fs::{self, OpenOptions};
use tokio::io::{AsyncSeekExt, AsyncWriteExt};

pub async fn start_http_download<R: Runtime>(
    app: AppHandle<R>,
    manager: DownloadManager,
    task_id: String,
) -> Result<()> {
    let res = do_start_http_download(app.clone(), manager.clone(), task_id.clone()).await;

    if let Err(e) = res {
        let mut inner = manager.lock().await;
        let _ = inner.update_task_status(&task_id, TaskStatus::Error(e.to_user_message()));
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

        let task = inner
            .get_task_mut(&task_id)
            .ok_or_else(|| Error::TaskNotFound(task_id.clone()))?;

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
        total = get_content_length(&client, &url, &headers)
            .await
            .unwrap_or(0);
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

    stream_download(
        app,
        manager,
        task_id,
        url,
        &headers,
        client,
        save_path,
        downloaded_size,
    )
    .await
}

async fn get_content_length(
    client: &reqwest::Client,
    url: &str,
    headers: &std::collections::HashMap<String, String>,
) -> Option<u64> {
    if let Ok(res) = client
        .head(normalize_url(url))
        .headers(map_to_header_map(headers, Some(url)))
        .send()
        .await
    {
        if let Some(len) = res.content_length() {
            return Some(len);
        }
    }

    if let Ok(res) = client
        .get(normalize_url(url))
        .headers(map_to_header_map(headers, Some(url)))
        .header("Range", "bytes=0-0")
        .send()
        .await
    {
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
    mut downloaded: u64,
) -> Result<()> {
    if downloaded > 0 {
        if !save_path.exists() {
            downloaded = 0;
            let mut inner = manager.lock().await;
            if let Some(task) = inner.get_task_mut(&task_id) {
                task.downloaded_size = 0;
            }
        } else if let Ok(meta) = std::fs::metadata(&save_path) {
            // 以磁盘实际大小为准进行校准，防止进度虚高或不同步
            downloaded = meta.len();
            let mut inner = manager.lock().await;
            if let Some(task) = inner.get_task_mut(&task_id) {
                task.downloaded_size = downloaded;
            }
        }
    }

    let mut req = client
        .get(&url)
        .headers(map_to_header_map(headers, Some(&url)));
    if downloaded > 0 {
        req = req.header("Range", format!("bytes={}-", downloaded));
    }

    let mut res = req.send().await?;
    if !res.status().is_success() && res.status() != http::StatusCode::PARTIAL_CONTENT {
        return Err(Error::Network(res.error_for_status().unwrap_err()));
    }

    let mut file = OpenOptions::new()
        .write(true)
        .create(true)
        .open(&save_path)
        .await?;

    if downloaded > 0 {
        file.seek(std::io::SeekFrom::Start(downloaded)).await?;
    } else {
        // truncate if starting from scratch
        file.set_len(0).await?;
    }

    let mut bytes_since_last_emit = 0;

    while let Some(chunk) = res.chunk().await? {
        file.write_all(&chunk).await?;
        bytes_since_last_emit += chunk.len() as u64;

        let now = std::time::Instant::now();
        let mut inner = manager.lock().await;

        let should_update = inner
            .last_update_times
            .get(&task_id)
            .map(|last| now.duration_since(*last).as_millis() > 500)
            .unwrap_or(true);

        if let Some(task) = inner.get_task_mut(&task_id) {
            task.downloaded_size += bytes_since_last_emit;
            bytes_since_last_emit = 0;

            if task.total_size == 0 {
                if let Some(len) = res.content_length() {
                    task.total_size = len + downloaded;
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

async fn finalize_task<R: Runtime>(
    app: &AppHandle<R>,
    manager: &DownloadManager,
    task_id: &str,
) -> Result<()> {
    let mut inner = manager.lock().await;
    let task = inner
        .get_task_mut(task_id)
        .ok_or_else(|| Error::TaskNotFound(task_id.to_string()))?;
    task.status = TaskStatus::Completed;
    if task.total_size == 0 {
        task.total_size = task.downloaded_size;
    }
    let task_clone = task.clone();
    inner.save_tasks();
    let _ = app.emit("download-progress", task_clone.clone());
    inner.send_notification(app, "文件下载完成", &task_clone.title);
    Ok(())
}
