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
use desktop::Commands;
#[cfg(mobile)]
use mobile::Commands;

/// Extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the commands APIs.
pub trait CommandsExt<R: Runtime> {
    fn commands(&self) -> &Commands<R>;
}

impl<R: Runtime, T: Manager<R>> crate::CommandsExt<R> for T {
    fn commands(&self) -> &Commands<R> {
        self.state::<Commands<R>>().inner()
    }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("commands")
        .invoke_handler(tauri::generate_handler![
            commands::exit_app,
            commands::return_to_home,
            commands::set_status_bar,
            commands::hide_status_bar,
            commands::get_system_font_scale,
            commands::get_screen_orientation,
            commands::set_screen_orientation,
            commands::get_brightness,
            commands::get_system_brightness,
            commands::set_brightness,
            commands::get_volume,
            commands::set_volume,
            commands::get_device_id,
            commands::save_file,
            commands::vibrate,
            commands::vibrate_pattern,
            commands::vibrate_predefined,
        ])
        .setup(|app, api| {
            #[cfg(mobile)]
            let commands = mobile::init(app, api)?;
            #[cfg(desktop)]
            let commands = desktop::init(app, api)?;
            app.manage(commands);
            Ok(())
        })
        .build()
}
