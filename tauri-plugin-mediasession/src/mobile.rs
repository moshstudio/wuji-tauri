use serde::de::DeserializeOwned;
use tauri::{
    plugin::{PluginApi, PluginHandle},
    AppHandle, Runtime,
};

use crate::models::*;

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_mediasession);

// initializes the Kotlin or Swift plugin classes
pub fn init<R: Runtime, C: DeserializeOwned>(
    _app: &AppHandle<R>,
    api: PluginApi<R, C>,
) -> crate::Result<Mediasession<R>> {
    #[cfg(target_os = "android")]
    let handle = api.register_android_plugin("tauri.plugin.mediasession", "MediaSessionPlugin")?;
    #[cfg(target_os = "ios")]
    let handle = api.register_ios_plugin(init_plugin_mediasession)?;
    Ok(Mediasession(handle))
}

/// Access to the mediasession APIs.
pub struct Mediasession<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> Mediasession<R> {
    pub fn set_metadata(&self, payload: PlayMusicItemRequest) -> crate::Result<BooleanResponse> {
        self.0
            .run_mobile_plugin("setMetadata", payload)
            .map_err(Into::into)
    }
    pub fn set_playback_state(
        &self,
        payload: PlaybackStateRequest,
    ) -> crate::Result<BooleanResponse> {
        self.0
            .run_mobile_plugin("setPlaybackState", payload)
            .map_err(Into::into)
    }
    pub fn set_position_state(
        &self,
        payload: PositionStateRequest,
    ) -> crate::Result<BooleanResponse> {
        self.0
            .run_mobile_plugin("setPositionState", payload)
            .map_err(Into::into)
    }
}
