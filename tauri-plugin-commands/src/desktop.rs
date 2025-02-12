use serde::de::DeserializeOwned;
use tauri::{plugin::PluginApi, AppHandle, Runtime};

use crate::models::*;

pub fn init<R: Runtime, C: DeserializeOwned>(
    app: &AppHandle<R>,
    _api: PluginApi<R, C>,
) -> crate::Result<Commands<R>> {
    Ok(Commands(app.clone()))
}

/// Access to the commands APIs.
pub struct Commands<R: Runtime>(AppHandle<R>);

impl<R: Runtime> Commands<R> {
    pub fn exit_app(&self) -> crate::Result<()> {
        Ok(())
    }
    pub fn set_status_bar(
        &self,
        payload: SetStatusBarRequest,
    ) -> crate::Result<SetStatusBarResponse> {
        Ok(SetStatusBarResponse { res: Some(true) })
    }
}
