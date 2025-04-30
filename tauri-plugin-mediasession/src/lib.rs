use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
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
use desktop::Mediasession;
#[cfg(mobile)]
use mobile::Mediasession;

/// Extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the mediasession APIs.
pub trait MediasessionExt<R: Runtime> {
    fn mediasession(&self) -> &Mediasession<R>;
}

impl<R: Runtime, T: Manager<R>> crate::MediasessionExt<R> for T {
    fn mediasession(&self) -> &Mediasession<R> {
        self.state::<Mediasession<R>>().inner()
    }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("mediasession")
        .invoke_handler(tauri::generate_handler![
            commands::set_metadata,
            commands::set_playback_state,
            commands::set_position_state,
        ])
        .setup(|app, api| {
            #[cfg(mobile)]
            let mediasession = mobile::init(app, api)?;
            #[cfg(desktop)]
            let mediasession = desktop::init(app, api)?;
            app.manage(mediasession);
            Ok(())
        })
        .build()
}
