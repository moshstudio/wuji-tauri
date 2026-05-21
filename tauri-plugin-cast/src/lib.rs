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
use desktop::Cast;
#[cfg(mobile)]
use mobile::Cast;

pub trait CastExt<R: Runtime> {
    fn cast(&self) -> &Cast<R>;
}

impl<R: Runtime, T: Manager<R>> CastExt<R> for T {
    fn cast(&self) -> &Cast<R> {
        self.state::<Cast<R>>().inner()
    }
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("cast")
        .invoke_handler(tauri::generate_handler![
            commands::discover_devices,
            commands::cast_media,
            commands::cast_control,
            commands::get_cast_state,
            commands::stop_cast,
            commands::get_lan_ip,
        ])
        .setup(|app, api| {
            #[cfg(mobile)]
            let cast = mobile::init(app, api)?;
            #[cfg(desktop)]
            let cast = desktop::init(app, api)?;
            app.manage(cast);
            Ok(())
        })
        .build()
}
