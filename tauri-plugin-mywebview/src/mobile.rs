use serde::de::DeserializeOwned;
use tauri::{
    plugin::{PluginApi, PluginHandle},
    AppHandle, Runtime,
};

use crate::models::*;

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_mywebview);

// initializes the Kotlin or Swift plugin classes
pub fn init<R: Runtime, C: DeserializeOwned>(
    _app: &AppHandle<R>,
    api: PluginApi<R, C>,
) -> crate::Result<Mywebview<R>> {
    #[cfg(target_os = "android")]
    let handle = api.register_android_plugin("wuji.plugin.mywebview", "WebviewPlugin")?;
    #[cfg(target_os = "ios")]
    let handle = api.register_ios_plugin(init_plugin_mywebview)?;
    Ok(Mywebview(handle))
}

/// Access to the mywebview APIs.
pub struct Mywebview<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> Mywebview<R> {
    pub fn ping(&self, payload: PingRequest) -> crate::Result<PingResponse> {
        self.0
            .run_mobile_plugin("ping", payload)
            .map_err(Into::into)
    }

    pub async fn fetch(&self, payload: FetchRequest) -> crate::Result<FetchResponse> {
        self.0
            .run_mobile_plugin("fetch", payload)
            .map_err(Into::into)
    }
}
