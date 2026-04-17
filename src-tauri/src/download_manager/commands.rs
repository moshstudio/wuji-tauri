use crate::download_manager::task::{Category, DownloadTask, TaskStatus};
use crate::download_manager::{
    error::{Error, Result},
    DownloadManager,
};
use tauri::{AppHandle, Emitter, Manager, Runtime, State};

#[tauri::command]
pub async fn get_tasks(manager: State<'_, DownloadManager>) -> Result<Vec<DownloadTask>> {
    let inner = manager.lock().await;
    Ok(inner.tasks.values().cloned().collect())
}

#[tauri::command]
pub async fn get_download_dir(manager: State<'_, DownloadManager>) -> Result<String> {
    let inner = manager.lock().await;
    Ok(inner.downloads_dir.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn set_download_dir(manager: State<'_, DownloadManager>, path: String) -> Result<()> {
    let mut inner = manager.lock().await;
    inner.set_download_dir(std::path::PathBuf::from(path))
}

#[tauri::command]
pub async fn add_task<R: Runtime>(
    app: AppHandle<R>,
    manager: State<'_, DownloadManager>,
    id: String,
    source_id: String,
    title: String,
    url: String,
    save_path: String,
    category: Category,
    headers: std::collections::HashMap<String, String>,
    extra: std::collections::HashMap<String, String>,
    total_chunks: u32,
    reset: Option<bool>,
) -> Result<()> {
    let mut inner = manager.lock().await;

    // 如果是相对路径，解析到默认下载目录
    let mut final_path = std::path::PathBuf::from(&save_path);
    if final_path.is_relative() {
        final_path = inner.downloads_dir.join(&save_path);
    }

    if let Some(task) = inner.get_task_mut(&id) {
        log::info!(
            "Updating existing task: {} (total_chunks: {}, reset: {:?})",
            id,
            total_chunks,
            reset
        );

        if reset.unwrap_or(false) {
            task.status = TaskStatus::Pending;
            task.downloaded_size = 0;
            task.total_size = 0;
            task.completed_chunks.clear();
            task.chunk_progress.clear();

            // 物理重置文件
            if final_path.exists() {
                if final_path.is_dir() {
                    let _ = std::fs::remove_dir_all(&final_path);
                } else {
                    let _ = std::fs::remove_file(&final_path);
                }
            }
            // 清理可能的临时目录
            if let Some(parent) = final_path.parent() {
                let file_name = final_path.file_name().unwrap_or_default().to_string_lossy();
                let temp_dir = parent.join(format!(".tmp_{}", file_name));
                if temp_dir.exists() {
                    let _ = std::fs::remove_dir_all(temp_dir);
                }
            }
        }
        task.title = title;
        task.url = url;
        task.save_path = final_path;
        task.category = category;
        task.headers = headers;
        task.extra = extra;
        if total_chunks > 0 {
            task.total_chunks = total_chunks;
        }

        let task_clone = task.clone();
        inner.save_tasks();
        let _ = app.emit("download-progress", task_clone);
    } else {
        log::info!("Creating new task: {} (title: {})", id, title);

        // 如果是强制重置模式，说明前端已经弹窗确认过了，我们在这里检查并删除已存在的同名文件
        if reset.unwrap_or(false) {
            if final_path.exists() {
                if final_path.is_dir() {
                    let _ = std::fs::remove_dir_all(&final_path);
                } else {
                    let _ = std::fs::remove_file(&final_path);
                }
            }
            if let Some(parent) = final_path.parent() {
                let file_name = final_path.file_name().unwrap_or_default().to_string_lossy();
                let temp_dir = parent.join(format!(".tmp_{}", file_name));
                if temp_dir.exists() {
                    let _ = std::fs::remove_dir_all(temp_dir);
                }
            }
        }

        let mut task = DownloadTask::new(
            id, source_id, title, url, final_path, category, headers, extra,
        );
        task.total_chunks = total_chunks;
        inner.add_task(task);
    }
    Ok(())
}

#[tauri::command]
pub async fn append_collection_chunk<R: Runtime>(
    app: AppHandle<R>,
    manager: State<'_, DownloadManager>,
    task_id: String,
    index: u32,
    title: String,
    data: Vec<u8>,
) -> Result<()> {
    crate::download_manager::engine::append_collection_chunk(
        app,
        manager.inner().clone(),
        task_id,
        index,
        title,
        data,
    )
    .await
}

#[tauri::command]
pub async fn download_remote_chunk<R: Runtime>(
    app: AppHandle<R>,
    manager: State<'_, DownloadManager>,
    task_id: String,
    index: u32,
    title: String,
    url: String,
    headers: std::collections::HashMap<String, String>,
) -> Result<()> {
    log::info!(
        "Invoking download_remote_chunk for task: {}, index: {}, url: {}",
        task_id,
        index,
        url
    );
    crate::download_manager::engine::download_remote_chunk(
        app,
        manager.inner().clone(),
        task_id,
        index,
        title,
        url,
        headers,
    )
    .await
}

#[tauri::command]
pub async fn finalize_collection_download<R: Runtime>(
    app: AppHandle<R>,
    manager: State<'_, DownloadManager>,
    task_id: String,
) -> Result<()> {
    crate::download_manager::engine::finalize_collection_download(
        app,
        manager.inner().clone(),
        task_id,
    )
    .await
}

#[tauri::command]
pub async fn package_to_cbz<R: Runtime>(
    app: AppHandle<R>,
    manager: State<'_, DownloadManager>,
    task_id: String,
    subdir_name: String,
) -> Result<()> {
    crate::download_manager::engine::package_to_cbz(
        app,
        manager.inner().clone(),
        task_id,
        subdir_name,
    )
    .await
}

#[tauri::command]
pub async fn download_m3u8_chunk<R: Runtime>(
    app: AppHandle<R>,
    manager: State<'_, DownloadManager>,
    task_id: String,
    index: u32,
    url: String,
    save_path: String,
    headers: std::collections::HashMap<String, String>,
) -> Result<()> {
    log::info!(
        "[Backend] download_m3u8_chunk: {} (index: {})",
        task_id,
        index
    );

    let manager_clone = manager.inner().clone();
    let app_clone = app.clone();
    let task_id_clone = task_id.clone();

    let (tx, rx) = tokio::sync::oneshot::channel();

    let handle = tokio::spawn(async move {
        let res = crate::download_manager::engine::m3u8::download_m3u8_to_path(
            app_clone,
            manager_clone,
            task_id_clone,
            url,
            headers,
            std::path::PathBuf::from(save_path),
            true, // is_collection_chunk
            index,
        )
        .await;
        let _ = tx.send(res);
    });

    {
        let mut inner = manager.lock().await;
        // 使用任务ID + 索引作为唯一标识，防止覆盖其他分片的句柄
        let worker_key = format!("{}_chunk_{}", task_id, index);
        inner.active_workers.insert(worker_key, handle);
    }

    // 等待 oneshot channel 的结果
    let res = rx
        .await
        .map_err(|_| Error::Other("下载任务被中断或发生崩溃".into()))?;

    // 清理活跃状态
    {
        let mut inner = manager.lock().await;
        let worker_key = format!("{}_chunk_{}", task_id, index);
        inner.active_workers.remove(&worker_key);
    }

    res
}

#[tauri::command]
pub async fn update_task_downloaded_size<R: Runtime>(
    app: AppHandle<R>,
    manager: State<'_, DownloadManager>,
    id: String,
    size: u64,
) -> Result<()> {
    let mut inner = manager.lock().await;
    if let Some(task) = inner.get_task_mut(&id) {
        task.downloaded_size += size;
        let task_clone = task.clone();
        inner.save_tasks();
        let _ = app.emit("download-progress", task_clone);
    }
    Ok(())
}

#[tauri::command]
pub async fn mark_chunk_completed<R: Runtime>(
    app: AppHandle<R>,
    manager: State<'_, DownloadManager>,
    task_id: String,
    index: u32,
) -> Result<()> {
    let mut inner = manager.lock().await;
    if let Some(task) = inner.get_task_mut(&task_id) {
        if task.completed_chunks.insert(index) {
            let task_clone = task.clone();
            inner.save_tasks();
            let _ = app.emit("download-progress", task_clone);
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn pause_task<R: Runtime>(
    app: AppHandle<R>,
    manager: State<'_, DownloadManager>,
    id: String,
) -> Result<()> {
    let mut inner = manager.lock().await;

    // 停止主任务 worker
    if let Some(handle) = inner.active_workers.remove(&id) {
        handle.abort();
    }

    // 停止所有子分片 worker (针对合集任务)
    let keys_to_stop: Vec<String> = inner
        .active_workers
        .keys()
        .filter(|k| k.starts_with(&format!("{}_chunk_", id)))
        .cloned()
        .collect();

    for key in keys_to_stop {
        if let Some(handle) = inner.active_workers.remove(&key) {
            handle.abort();
        }
    }

    inner.update_task_status(&id, TaskStatus::Paused)?;
    if let Some(task) = inner.tasks.get(&id) {
        let _ = app.emit("download-progress", task.clone());
    }
    Ok(())
}

#[tauri::command]
pub async fn resume_task<R: Runtime>(
    app: AppHandle<R>,
    manager: State<'_, DownloadManager>,
    id: String,
) -> Result<()> {
    log::info!("Resume command received for task: {}", id);
    let (category, url, is_collection, save_path) = {
        let mut inner = manager.lock().await;
        if let Some(handle) = inner.active_workers.get(&id) {
            if !handle.is_finished() {
                log::info!("Task {} is already active, skipping", id);
                return Ok(());
            } else {
                // 如果已完成（不论成功失败），移除旧句柄以便重新开始
                inner.active_workers.remove(&id);
            }
        }
        let task = inner.get_task_mut(&id).ok_or_else(|| {
            log::warn!("Task {} not found during resume", id);
            crate::download_manager::error::Error::TaskNotFound(id.clone())
        })?;
        (
            task.category.clone(),
            task.url.clone(),
            task.total_chunks > 0,
            task.save_path.clone(),
        )
    };

    // 针对合集任务，恢复前先进行物理校验
    if is_collection {
        let mut inner = manager.lock().await;
        if let Some(task) = inner.get_task_mut(&id) {
            let mut validated_completed = std::collections::HashSet::new();

            for &index in &task.completed_chunks {
                // 暂时只针对 Image/Music/Video/Comic 进行物理存在校准
                if matches!(
                    task.category,
                    Category::Image | Category::Music | Category::Video | Category::Comic
                ) {
                    // 约定：漫画如果是 index >= 1_000_000，暂不校准（太碎了）
                    if index >= 1_000_000 {
                        validated_completed.insert(index);
                        continue;
                    }

                    // TODO: 这里需要根据 category 和 title 推算文件名
                    // 但由于 title 在 completed_chunks 中没有存储，我们只能暂时基于 index 或者跳过详细校验
                    // 为了效率，如果文件夹还在，我们暂时信任 metadata，除非整个文件夹被删了
                    if !save_path.exists() {
                        continue;
                    }
                }
                validated_completed.insert(index);
            }

            // 如果文件夹都不存了，重置所有进度
            if !save_path.exists() && !matches!(task.category, Category::Book) {
                task.completed_chunks.clear();
                task.downloaded_size = 0;
            } else {
                task.completed_chunks = validated_completed;
            }
            inner.save_tasks();
        }
    }

    if !is_collection
        && matches!(
            category,
            Category::Video | Category::Music | Category::Image
        )
    {
        let is_m3u8 = url.to_lowercase().contains(".m3u8");
        log::info!(
            "Starting background {} download engine for task: {}",
            if is_m3u8 { "M3U8" } else { "HTTP" },
            id
        );
        let manager_clone = manager.inner().clone();
        let app_clone = app.clone();
        let id_clone = id.clone();

        let handle = tokio::spawn(async move {
            if is_m3u8 {
                let _ = crate::download_manager::engine::m3u8::start_m3u8_download(
                    app_clone,
                    manager_clone,
                    id_clone,
                )
                .await;
            } else {
                let _ = crate::download_manager::engine::start_http_download(
                    app_clone,
                    manager_clone,
                    id_clone,
                )
                .await;
            }
        });

        let mut inner = manager.lock().await;
        let _ = inner.update_task_status(&id, TaskStatus::Downloading)?;

        if let Some(task) = inner.tasks.get(&id) {
            let _ = app.emit("download-progress", task.clone());
        }

        inner.active_workers.insert(id, handle);
    } else {
        log::info!("Task {} set to Downloading status", id);
        let mut inner = manager.lock().await;
        let _ = inner.update_task_status(&id, TaskStatus::Downloading)?;
        if let Some(task) = inner.tasks.get(&id) {
            let _ = app.emit("download-progress", task.clone());
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn remove_task<R: Runtime>(
    app: AppHandle<R>,
    manager: State<'_, DownloadManager>,
    id: String,
    delete_file: bool,
) -> Result<()> {
    let task = {
        let mut inner = manager.lock().await;
        inner.remove_task(&id)
    };

    if let Some(task) = task {
        // 1. 清理临时文件夹 (.tmp_ 开头的)
        let temp_dir = if let Some(parent) = task.save_path.parent() {
            let file_name = task
                .save_path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy();
            parent.join(format!(".tmp_{}", file_name))
        } else {
            app.path().app_data_dir().unwrap().join("temp").join(&id)
        };

        if temp_dir.exists() {
            let _ = std::fs::remove_dir_all(temp_dir);
        }

        // 2. 如果用户要求删除物理文件
        if delete_file {
            if task.save_path.exists() {
                if task.save_path.is_dir() {
                    let _ = std::fs::remove_dir_all(&task.save_path);
                } else {
                    let _ = std::fs::remove_file(&task.save_path);
                }
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn mark_task_error<R: Runtime>(
    app: AppHandle<R>,
    manager: State<'_, DownloadManager>,
    id: String,
    error: String,
) -> Result<()> {
    let mut inner = manager.lock().await;
    inner.update_task_status(&id, TaskStatus::Error(error))?;
    if let Some(task) = inner.tasks.get(&id) {
        let _ = app.emit("download-progress", task.clone());
    }
    Ok(())
}

#[tauri::command]
pub async fn show_in_folder<R: Runtime>(
    app: AppHandle<R>,
    manager: State<'_, DownloadManager>,
    id: String,
) -> Result<()> {
    let path: std::path::PathBuf = {
        let inner = manager.lock().await;
        let task = inner
            .tasks
            .get(&id)
            .ok_or_else(|| crate::download_manager::error::Error::TaskNotFound(id.clone()))?;
        task.save_path.clone()
    };

    let folder = if path.is_dir() {
        path
    } else {
        path.parent()
            .map(|p| p.to_path_buf())
            .unwrap_or(path.clone())
    };

    if !folder.exists() {
        return Err(crate::download_manager::error::Error::Other(
            "文件夹尚不存在".into(),
        ));
    }

    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("explorer").arg(folder).spawn();
    }

    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open").arg(folder).spawn();
    }

    #[cfg(target_os = "linux")]
    {
        let _ = std::process::Command::new("xdg-open").arg(folder).spawn();
    }

    #[cfg(any(target_os = "android", target_os = "ios"))]
    {
        use tauri_plugin_opener::OpenerExt;
        let _ = app
            .opener()
            .open_path(folder.to_string_lossy(), None::<String>);
    }

    let _ = app;
    Ok(())
}

#[tauri::command]
pub async fn check_task_file_exist(
    manager: State<'_, DownloadManager>,
    id: String,
) -> Result<bool> {
    let inner = manager.lock().await;
    if let Some(task) = inner.tasks.get(&id) {
        Ok(task.save_path.exists())
    } else {
        Ok(false)
    }
}
#[tauri::command]
pub async fn check_path_exists(manager: State<'_, DownloadManager>, path: String) -> Result<bool> {
    let inner = manager.lock().await;
    let mut final_path = std::path::PathBuf::from(&path);
    if final_path.is_relative() {
        final_path = inner.downloads_dir.join(&path);
    }
    Ok(final_path.exists())
}
