use tauri::{command, AppHandle, Runtime};

use crate::models::*;
use crate::CommandsExt;
use crate::Result;

#[command]
pub(crate) async fn exit_app<R: Runtime>(app: AppHandle<R>) -> Result<()> {
    app.commands().exit_app()
}

#[command]
pub(crate) async fn set_status_bar<R: Runtime>(
    app: AppHandle<R>,
    payload: SetStatusBarRequest,
) -> Result<SetStatusBarResponse> {
    app.commands().set_status_bar(payload)
}

#[command]
pub(crate) async fn hide_status_bar<R: Runtime>(
    app: AppHandle<R>,
    payload: HideStatusBarRequest,
) -> Result<BoolResponse> {
    app.commands().hide_status_bar(payload)
}

#[tauri::command]
pub(crate) async fn get_system_font_scale<R: Runtime>(
    app: AppHandle<R>,
    payload: EmptyRequest,
) -> Result<NumberResponse> {
    app.commands().get_system_font_scale(payload)
}

#[command]
pub(crate) async fn set_screen_orientation<R: Runtime>(
    app: AppHandle<R>,
    payload: SetScreenOrientationRequest,
) -> Result<BoolResponse> {
    app.commands().set_screen_orientation(payload)
}
