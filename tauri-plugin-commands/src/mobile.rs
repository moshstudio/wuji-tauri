use serde::de::DeserializeOwned;
use tauri::{
    plugin::{PluginApi, PluginHandle},
    AppHandle, Runtime,
};

use crate::models::*;

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_commands);

// initializes the Kotlin or Swift plugin classes
pub fn init<R: Runtime, C: DeserializeOwned>(
    _app: &AppHandle<R>,
    api: PluginApi<R, C>,
) -> crate::Result<Commands<R>> {
    #[cfg(target_os = "android")]
    let handle = api.register_android_plugin("tauri.plugin.commands", "CommandsPlugin")?;
    #[cfg(target_os = "ios")]
    let handle = api.register_ios_plugin(init_plugin_commands)?;
    Ok(Commands(handle))
}

/// Access to the commands APIs.
pub struct Commands<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> Commands<R> {
    pub fn exit_app(&self) -> crate::Result<()> {
        self.0.run_mobile_plugin("exitApp", ()).map_err(Into::into)
    }
    pub fn set_status_bar(
        &self,
        payload: SetStatusBarRequest,
    ) -> crate::Result<SetStatusBarResponse> {
        self.0
            .run_mobile_plugin("setStatusBar", payload)
            .map_err(Into::into)
    }
    pub fn hide_status_bar(&self, payload: HideStatusBarRequest) -> crate::Result<BoolResponse> {
        self.0
            .run_mobile_plugin("hideStatusBar", payload)
            .map_err(Into::into)
    }
    pub fn get_system_font_scale(&self, payload: EmptyRequest) -> crate::Result<NumberResponse> {
        self.0
            .run_mobile_plugin("getSystemFontScale", payload)
            .map_err(Into::into)
    }
    pub fn set_screen_orientation(
        &self,
        payload: SetScreenOrientationRequest,
    ) -> crate::Result<BoolResponse> {
        self.0
            .run_mobile_plugin("setScreenOrientation", payload)
            .map_err(Into::into)
    }
}
