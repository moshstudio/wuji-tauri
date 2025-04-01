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
            commands::set_playlist,
            commands::update_playlist_order,
            commands::play_target_music,
            commands::update_music_item,
            commands::play,
            commands::pause,
            commands::stop,
            commands::set_volume,
            commands::seek_to,
            commands::set_play_mode,
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
