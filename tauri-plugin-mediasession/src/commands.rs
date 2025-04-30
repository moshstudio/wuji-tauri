use tauri::{command, AppHandle, Runtime};

use crate::models::*;
use crate::MediasessionExt;
use crate::Result;

#[command]
pub(crate) async fn set_metadata<R: Runtime>(
    app: AppHandle<R>,
    payload: PlayMusicItemRequest,
) -> Result<BooleanResponse> {
    app.mediasession().set_metadata(payload)
}

#[command]
pub(crate) async fn set_playback_state<R: Runtime>(
    app: AppHandle<R>,
    payload: PlaybackStateRequest,
) -> Result<BooleanResponse> {
    app.mediasession().set_playback_state(payload)
}

#[command]
pub(crate) async fn set_position_state<R: Runtime>(
    app: AppHandle<R>,
    payload: PositionStateRequest,
) -> Result<BooleanResponse> {
    app.mediasession().set_position_state(payload)
}
