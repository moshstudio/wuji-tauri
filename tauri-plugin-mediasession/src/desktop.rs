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
    pub fn set_metadata(&self, payload: PlayMusicItemRequest) -> crate::Result<BooleanResponse> {
        Ok(BooleanResponse { value: Some(true) })
    }
    pub fn set_playback_state(
        &self,
        payload: PlaybackStateRequest,
    ) -> crate::Result<BooleanResponse> {
        Ok(BooleanResponse { value: Some(true) })
    }
    pub fn set_position_state(&self, payload: PositionStateRequest) -> crate::Result<BooleanResponse> {
        Ok(BooleanResponse { value: Some(true) })
    }
}
