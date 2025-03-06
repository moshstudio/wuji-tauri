use serde::de::DeserializeOwned;
use tauri::{plugin::PluginApi, AppHandle, Runtime};

use crate::models::*;

pub fn init<R: Runtime, C: DeserializeOwned>(
    app: &AppHandle<R>,
    _api: PluginApi<R, C>,
) -> crate::Result<Mediasession<R>> {
    Ok(Mediasession(app.clone()))
}

/// Access to the mediasession APIs.
pub struct Mediasession<R: Runtime>(AppHandle<R>);

impl<R: Runtime> Mediasession<R> {
    pub fn set_playlist(&self, payload: SetPlaylistRequest) -> crate::Result<BooleanResponse> {
        Ok(BooleanResponse { value: Some(true) })
    }
    pub fn update_playlist_order(&self, payload: UpdatePlaylistOrderRequest) -> crate::Result<BooleanResponse> {
        Ok(BooleanResponse { value: Some(true) })
    }
    pub fn play_target_music(&self, payload: PlayMusicItem) -> crate::Result<BooleanResponse> {
        Ok(BooleanResponse { value: Some(true) })
    }
    pub fn update_music_item(&self, payload: UpdateMusicItemRequest) -> crate::Result<BooleanResponse> {
        Ok(BooleanResponse { value: Some(true) })
    }
    pub fn play(&self, payload: PlayRequest) -> crate::Result<BooleanResponse> {
        Ok(BooleanResponse { value: Some(true) })
    }
    pub fn pause(&self, payload: PauseRequest) -> crate::Result<BooleanResponse> {
        Ok(BooleanResponse { value: Some(true) })
    }
    pub fn stop(&self, payload: StopRequest) -> crate::Result<BooleanResponse> {
        Ok(BooleanResponse { value: Some(true) })
    }
    pub fn set_volume(&self, payload: SetVolumeRequest) -> crate::Result<BooleanResponse> {
        Ok(BooleanResponse { value: Some(true) })
    }
    pub fn seek_to(&self, payload: SeekToRequest) -> crate::Result<BooleanResponse> {
        Ok(BooleanResponse { value: Some(true) })
    }
}
