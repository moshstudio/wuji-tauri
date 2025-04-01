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
    pub fn set_playlist(&self, payload: SetPlaylistRequest) -> crate::Result<BooleanResponse> {
        self.0
            .run_mobile_plugin("setPlaylist", payload)
            .map_err(Into::into)
    }

    pub fn update_playlist_order(
        &self,
        payload: UpdatePlaylistOrderRequest,
    ) -> crate::Result<BooleanResponse> {
        self.0
            .run_mobile_plugin("updatePlaylistOrder", payload)
            .map_err(Into::into)
    }

    pub fn play_target_music(&self, payload: PlayMusicItem) -> crate::Result<BooleanResponse> {
        self.0
            .run_mobile_plugin("playTargetMusic", payload)
            .map_err(Into::into)
    }

    pub fn update_music_item(
        &self,
        payload: UpdateMusicItemRequest,
    ) -> crate::Result<BooleanResponse> {
        self.0
            .run_mobile_plugin("updateMusicItem", payload)
            .map_err(Into::into)
    }

    pub fn play(&self, payload: PlayRequest) -> crate::Result<BooleanResponse> {
        self.0
            .run_mobile_plugin("play", payload)
            .map_err(Into::into)
    }
    pub fn pause(&self, payload: PauseRequest) -> crate::Result<BooleanResponse> {
        self.0
            .run_mobile_plugin("pause", payload)
            .map_err(Into::into)
    }
    pub fn stop(&self, payload: StopRequest) -> crate::Result<BooleanResponse> {
        self.0
            .run_mobile_plugin("stop", payload)
            .map_err(Into::into)
    }
    pub fn set_volume(&self, payload: SetVolumeRequest) -> crate::Result<BooleanResponse> {
        self.0
            .run_mobile_plugin("setVolume", payload)
            .map_err(Into::into)
    }
    pub fn seek_to(&self, payload: SeekToRequest) -> crate::Result<BooleanResponse> {
        self.0
            .run_mobile_plugin("seekTo", payload)
            .map_err(Into::into)
    }
    pub fn set_play_mode(&self, payload: PlayModeRequest) -> crate::Result<BooleanResponse> {
        self.0
            .run_mobile_plugin("setPlayMode", payload)
            .map_err(Into::into)
    }
}
