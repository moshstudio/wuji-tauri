use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{
    plugin::{Builder, TauriPlugin},
    AppHandle, Manager, Runtime,
};
use tauri_plugin_notification::NotificationExt;
use tokio::sync::Mutex;

mod commands;
pub mod engine;
pub mod error;
pub mod task;

use crate::download_manager::error::{Error, Result};
use crate::download_manager::task::{DownloadTask, TaskStatus};

pub struct DownloadManagerInner {
    pub tasks: HashMap<String, DownloadTask>,
    pub save_dir: PathBuf,
    pub downloads_dir: PathBuf,
    pub active_workers: HashMap<String, tokio::task::JoinHandle<()>>,
    pub shared_client: reqwest::Client,
    pub last_update_times: HashMap<String, std::time::Instant>,
}

impl DownloadManagerInner {
    pub fn new(app_data_dir: PathBuf, default_downloads_dir: PathBuf) -> Self {
        let save_dir = app_data_dir.join("tasks_info");
        if !save_dir.exists() {
            fs::create_dir_all(&save_dir).unwrap();
        }

        let shared_client = reqwest::Client::builder()
            .connect_timeout(std::time::Duration::from_secs(15))
            .timeout(std::time::Duration::from_secs(60))
            .pool_max_idle_per_host(5)
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());

        let mut manager = Self {
            tasks: HashMap::new(),
            save_dir,
            downloads_dir: default_downloads_dir,
            active_workers: HashMap::new(),
            shared_client,
            last_update_times: HashMap::new(),
        };

        manager.load_tasks();

        // 确保下载目录存在
        if !manager.downloads_dir.exists() {
            let _ = fs::create_dir_all(&manager.downloads_dir);
        }

        manager
    }

    pub fn set_download_dir(&mut self, path: PathBuf) -> Result<()> {
        #[cfg(target_os = "android")]
        return Err(Error::PathError("安卓端不支持修改下载目录".to_string()));

        if !path.exists() {
            fs::create_dir_all(&path)?;
        }
        self.downloads_dir = path;
        Ok(())
    }

    fn load_tasks(&mut self) {
        let tasks_file = self.save_dir.join("tasks.json");
        if tasks_file.exists() {
            if let Ok(content) = fs::read_to_string(tasks_file) {
                if let Ok(tasks) = serde_json::from_str::<HashMap<String, DownloadTask>>(&content) {
                    self.tasks = tasks;
                    for task in self.tasks.values_mut() {
                        if task.status == TaskStatus::Downloading {
                            task.status = TaskStatus::Paused;
                        }
                    }
                }
            }
        }
    }

    pub fn save_tasks(&self) {
        let tasks_file = self.save_dir.join("tasks.json");
        if let Ok(content) = serde_json::to_string_pretty(&self.tasks) {
            let _ = fs::write(tasks_file, content);
        }
    }

    pub fn add_task(&mut self, task: DownloadTask) {
        self.tasks.insert(task.id.clone(), task);
        self.save_tasks();
    }

    pub fn get_task_mut(&mut self, id: &str) -> Option<&mut DownloadTask> {
        self.tasks.get_mut(id)
    }

    pub fn update_task_status(&mut self, id: &str, status: TaskStatus) -> Result<()> {
        if let Some(task) = self.tasks.get_mut(id) {
            task.status = status;
            self.save_tasks();
            Ok(())
        } else {
            Err(Error::TaskNotFound(id.to_string()))
        }
    }

    /// 中止主任务及合集子分片 worker（M3U8 内部分片 spawn 需配合任务状态检查）
    pub fn stop_task_workers(&mut self, id: &str) {
        if let Some(handle) = self.active_workers.remove(id) {
            handle.abort();
        }
        let chunk_keys: Vec<String> = self
            .active_workers
            .keys()
            .filter(|k| k.starts_with(&format!("{}_chunk_", id)))
            .cloned()
            .collect();
        for key in chunk_keys {
            if let Some(handle) = self.active_workers.remove(&key) {
                handle.abort();
            }
        }
    }

    pub fn remove_task(&mut self, id: &str) -> Option<DownloadTask> {
        self.stop_task_workers(id);
        let task = self.tasks.remove(id);
        self.save_tasks();
        task
    }

    pub fn send_notification<R: Runtime>(&self, app: &AppHandle<R>, title: &str, body: &str) {
        let _ = app.notification().builder().title(title).body(body).show();
    }
}

pub type DownloadManager = Arc<Mutex<DownloadManagerInner>>;

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("download-manager")
        .setup(|app, _| {
            // 获取 App Data 目录
            let app_data_dir = app.path().app_data_dir().unwrap_or_else(|_| {
                #[cfg(windows)]
                {
                    std::env::var("APPDATA")
                        .map(PathBuf::from)
                        .map(|p| p.join("com.wuji-app.app"))
                        .unwrap_or_else(|_| PathBuf::from("./data"))
                }
                #[cfg(not(windows))]
                PathBuf::from("./data")
            });

            // 优先获取系统下载目录
            let downloads_dir = {
                #[cfg(target_os = "android")]
                {
                    // 尝试系统公共下载目录
                    let public_download = std::path::PathBuf::from("/storage/emulated/0/Download");
                    if public_download.exists() {
                        public_download
                    } else {
                        // 回退到应用私有下载目录
                        app.path()
                            .download_dir()
                            .unwrap_or_else(|_| app_data_dir.join("downloads"))
                    }
                }
                #[cfg(not(target_os = "android"))]
                {
                    app.path().download_dir().unwrap_or_else(|_| {
                        // 如果获取不到下载文件夹，回退到桌面 (Windows 特色)
                        #[cfg(windows)]
                        {
                            if let Ok(profile) = std::env::var("USERPROFILE") {
                                let p = std::path::PathBuf::from(profile).join("Desktop");
                                if p.exists() {
                                    return p;
                                }
                            }
                        }
                        app_data_dir.join("downloads")
                    })
                }
            };

            let manager = Arc::new(Mutex::new(DownloadManagerInner::new(
                app_data_dir,
                downloads_dir,
            )));
            app.manage(manager);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_tasks,
            commands::add_task,
            commands::get_download_dir,
            commands::set_download_dir,
            commands::append_collection_chunk,
            commands::download_remote_chunk,
            commands::finalize_collection_download,
            commands::pause_task,
            commands::resume_task,
            commands::remove_task,
            commands::mark_task_error,
            commands::check_task_file_exist,
            commands::check_path_exists,
            commands::show_in_folder,
            commands::package_to_cbz,
            commands::mark_chunk_completed,
            commands::update_task_downloaded_size,
            commands::download_m3u8_chunk,
        ])
        .build()
}
