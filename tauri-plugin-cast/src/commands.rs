use tauri::{command, AppHandle, Runtime};

use crate::models::*;
use crate::CastExt;
use crate::Result;

#[command]
pub(crate) async fn discover_devices<R: Runtime>(
    app: AppHandle<R>,
    payload: DiscoverDevicesRequest,
) -> Result<DiscoverDevicesResponse> {
    app.cast().discover_devices(payload)
}

#[command]
pub(crate) async fn cast_media<R: Runtime>(
    app: AppHandle<R>,
    payload: CastMediaRequest,
) -> Result<CastMediaResponse> {
    app.cast().cast_media(payload)
}

#[command]
pub(crate) async fn cast_control<R: Runtime>(
    app: AppHandle<R>,
    payload: CastControlRequest,
) -> Result<CastControlResponse> {
    app.cast().cast_control(payload)
}

#[command]
pub(crate) async fn get_cast_state<R: Runtime>(app: AppHandle<R>) -> Result<CastStateResponse> {
    app.cast().get_cast_state()
}

#[command]
pub(crate) async fn stop_cast<R: Runtime>(app: AppHandle<R>) -> Result<StopCastResponse> {
    app.cast().stop_cast()
}

#[command]
pub(crate) async fn get_lan_ip<R: Runtime>(app: AppHandle<R>) -> Result<LanIpResponse> {
    app.cast().get_lan_ip()
}
