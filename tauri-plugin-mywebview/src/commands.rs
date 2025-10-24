use tauri::{command, AppHandle, Runtime};

use crate::models::*;
use crate::MywebviewExt;
use crate::Result;

#[command]
pub(crate) async fn ping<R: Runtime>(
    app: AppHandle<R>,
    payload: PingRequest,
) -> Result<PingResponse> {
    app.mywebview().ping(payload)
}

#[command]
pub(crate) async fn fetch<R: Runtime>(
    app: AppHandle<R>,
    payload: FetchRequest,
) -> Result<FetchResponse> {
    dbg!(&payload);
    app.mywebview().fetch(payload).await
}
