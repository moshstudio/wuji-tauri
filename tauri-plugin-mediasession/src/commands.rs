use tauri::{command, AppHandle, Runtime};

use crate::models::*;
use crate::MediasessionExt;
use crate::Result;


#[command]
pub(crate) async fn set_playlist<R: Runtime>(
    app: AppHandle<R>,
    payload: SetPlaylistRequest,
) -> Result<BooleanResponse> {
    app.mediasession().set_playlist(payload)
}

#[command]
pub(crate) async fn update_playlist_order<R: Runtime>(
    app: AppHandle<R>,
    payload: UpdatePlaylistOrderRequest,
) -> Result<BooleanResponse> {
    app.mediasession().update_playlist_order(payload)
}

#[tauri::command]
pub(crate) async fn play_target_music<R: Runtime>(
    app: AppHandle<R>,
    payload: PlayMusicItem,
) -> Result<BooleanResponse> {
    app.mediasession().play_target_music(payload)
}

#[command]
pub(crate) async fn update_music_item<R: Runtime>(
    app: AppHandle<R>,
    payload: UpdateMusicItemRequest,
) -> Result<BooleanResponse> {
    app.mediasession().update_music_item(payload)
}

#[command]
pub(crate) async fn play<R: Runtime>(
    app: AppHandle<R>,
    payload: PlayRequest,
) -> Result<BooleanResponse> {
    app.mediasession().play(payload)
}

#[command]
pub(crate) async fn pause<R: Runtime>(
    app: AppHandle<R>,
    payload: PauseRequest,
) -> Result<BooleanResponse> {
    app.mediasession().pause(payload)
}

#[command]
pub(crate) async fn stop<R: Runtime>(
    app: AppHandle<R>,
    payload: StopRequest,
) -> Result<BooleanResponse> {
    app.mediasession().stop(payload)
}

#[command]
pub(crate) async fn set_volume<R: Runtime>(
    app: AppHandle<R>,
    payload: SetVolumeRequest,
) -> Result<BooleanResponse> {
    app.mediasession().set_volume(payload)
}

#[command]
pub(crate) async fn seek_to<R: Runtime>(
    app: AppHandle<R>,
    payload: SeekToRequest,
) -> Result<BooleanResponse> {
    app.mediasession().seek_to(payload)
}

#[command]
pub(crate) async fn set_play_mode<R: Runtime>(
    app: AppHandle<R>,
    payload: PlayModeRequest,
) -> Result<BooleanResponse> {
    app.mediasession().set_play_mode(payload)
}