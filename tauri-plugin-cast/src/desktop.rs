use serde::de::DeserializeOwned;
use tauri::{plugin::PluginApi, AppHandle, Runtime};

use crate::models::*;

pub fn init<R: Runtime, C: DeserializeOwned>(
    app: &AppHandle<R>,
    _api: PluginApi<R, C>,
) -> crate::Result<Cast<R>> {
    Ok(Cast(app.clone()))
}

pub struct Cast<R: Runtime>(AppHandle<R>);

impl<R: Runtime> Cast<R> {
    pub fn discover_devices(
        &self,
        _payload: DiscoverDevicesRequest,
    ) -> crate::Result<DiscoverDevicesResponse> {
        Ok(DiscoverDevicesResponse {
            devices: vec![],
            lan_ip: None,
            error: Some("DLNA 投屏仅支持 Android".into()),
        })
    }

    pub fn cast_media(&self, _payload: CastMediaRequest) -> crate::Result<CastMediaResponse> {
        Err(crate::Error::Message(
            "DLNA cast is only available on Android".into(),
        ))
    }

    pub fn cast_control(&self, _payload: CastControlRequest) -> crate::Result<CastControlResponse> {
        Ok(CastControlResponse { success: false })
    }

    pub fn get_cast_state(&self) -> crate::Result<CastStateResponse> {
        Ok(CastStateResponse::default())
    }

    pub fn stop_cast(&self) -> crate::Result<StopCastResponse> {
        Ok(StopCastResponse { success: true })
    }

    pub fn get_lan_ip(&self) -> crate::Result<LanIpResponse> {
        Ok(LanIpResponse { ip: None })
    }
}
