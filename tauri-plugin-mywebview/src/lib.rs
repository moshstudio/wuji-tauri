use tauri::{
    plugin::{Builder, TauriPlugin},
    Listener, Manager, RunEvent, Runtime,
};

pub use models::*;

#[cfg(desktop)]
mod desktop;
#[cfg(mobile)]
mod mobile;

mod commands;
mod error;
mod models;

pub use error::{Error, Result};

#[cfg(desktop)]
use desktop::Mywebview;
#[cfg(mobile)]
use mobile::Mywebview;

/// Extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the mywebview APIs.
pub trait MywebviewExt<R: Runtime> {
    fn mywebview(&self) -> &Mywebview<R>;
}

impl<R: Runtime, T: Manager<R>> crate::MywebviewExt<R> for T {
    fn mywebview(&self) -> &Mywebview<R> {
        self.state::<Mywebview<R>>().inner()
    }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("mywebview")
        .invoke_handler(tauri::generate_handler![commands::ping, commands::fetch])
        .setup(|app, api| {
            #[cfg(mobile)]
            let mywebview = mobile::init(app, api)?;
            #[cfg(desktop)]
            let mywebview = desktop::init(app, api)?;
            app.manage(mywebview);
            Ok(())
        })
        .on_event(|app_handle, event| {
            match event {
                RunEvent::ExitRequested { .. } => {
                    #[cfg(desktop)]
                    {
                        let handle = app_handle.clone();
                        tauri::async_runtime::spawn(async move {
                            let _ = desktop::cleanup_all_scrap_sessions(&handle).await;
                        });
                    }
                }
                // 添加窗口事件处理
                RunEvent::WindowEvent {
                    label,
                    event: tauri::WindowEvent::CloseRequested { api, .. },
                    ..
                } => {
                    if label == "main" {
                        #[cfg(desktop)]
                        {
                            let handle = app_handle.clone();
                            tauri::async_runtime::spawn(async move {
                                let _ = desktop::cleanup_all_scrap_sessions(&handle).await;
                            });
                        }
                    }
                }
                _ => {}
            }
        })
        .build()
}
