use crate::download_manager::task::{Category, DownloadTask, TaskStatus};
use crate::download_manager::{error::Result, DownloadManager};
use tauri::{AppHandle, Emitter, Runtime, State};

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
pub async fn set_download_dir(
    manager: State<'_, DownloadManager>,
    path: String,
) -> Result<()> {
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
    total_chunks: u32,
) -> Result<()> {
    let mut inner = manager.lock().await;

    // 如果是相对路径，解析到默认下载目录
    let mut final_path = std::path::PathBuf::from(&save_path);
    if final_path.is_relative() {
        final_path = inner.downloads_dir.join(&save_path);
    }

    if let Some(task) = inner.get_task_mut(&id) {
        // 更新现有任务的元数据，不重置状态和已下载数据
        task.title = title;
        task.url = url;
        task.save_path = final_path;
        task.category = category;
        task.headers = headers;
        task.total_chunks = total_chunks;
        
        let task_clone = task.clone();
        inner.save_tasks();
        let _ = app.emit("download-progress", task_clone);
    } else {
        // 创建新任务
        let mut task = DownloadTask::new(id, source_id, title, url, final_path, category, headers);
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
    _title: String,
    data: Vec<u8>,
) -> Result<()> {
    crate::download_manager::engine::append_collection_chunk(
        app,
        manager.inner().clone(),
        task_id,
        index,
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
    url: String,
    headers: std::collections::HashMap<String, String>,
) -> Result<()> {
    crate::download_manager::engine::download_remote_chunk(
        app,
        manager.inner().clone(),
        task_id,
        index,
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
pub async fn pause_task<R: Runtime>(
    app: AppHandle<R>,
    manager: State<'_, DownloadManager>,
    id: String,
) -> Result<()> {
    let mut inner = manager.lock().await;
    if let Some(handle) = inner.active_workers.remove(&id) {
        handle.abort();
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
    let (category, is_collection) = {
        let mut inner = manager.lock().await;
        // 如果任务已经在下载，直接返回
        if inner.active_workers.contains_key(&id) {
            return Ok(());
        }
        let task = inner
            .get_task_mut(&id)
            .ok_or_else(|| crate::download_manager::error::Error::TaskNotFound(id.clone()))?;
        (task.category.clone(), task.total_chunks > 0)
    };

    // 对于单文件 (视频、音乐、单张图片)，启动后端自动下载引擎
    if !is_collection && matches!(
        category,
        Category::Video | Category::Music | Category::Image
    ) {
        let manager_clone = manager.inner().clone();
        let app_clone = app.clone();
        let id_clone = id.clone();

        let handle = tokio::spawn(async move {
            let _ = crate::download_manager::engine::start_http_download(
                app_clone,
                manager_clone,
                id_clone,
            )
            .await;
        });

        let mut inner = manager.lock().await;
        let _ = inner.update_task_status(&id, TaskStatus::Downloading)?;
        
        if let Some(task) = inner.tasks.get(&id) {
            let _ = app.emit("download-progress", task.clone());
        }
        
        inner.active_workers.insert(id, handle);
    } else {
        // 对于小说/漫画/或图集，通常由前端主动管理 chunk，这里仅将状态改为下载中
        let mut inner = manager.lock().await;
        let _ = inner.update_task_status(&id, TaskStatus::Downloading)?;
        if let Some(task) = inner.tasks.get(&id) {
            let _ = app.emit("download-progress", task.clone());
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn remove_task(manager: State<'_, DownloadManager>, id: String) -> Result<()> {
    let mut inner = manager.lock().await;
    inner.remove_task(&id);
    Ok(())
}
