use serde::de::DeserializeOwned;
use tauri::{
    plugin::{PluginApi, PluginHandle},
    AppHandle, Runtime,
};

use crate::models::*;

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_cast);

pub fn init<R: Runtime, C: DeserializeOwned>(
    _app: &AppHandle<R>,
    api: PluginApi<R, C>,
) -> crate::Result<Cast<R>> {
    #[cfg(target_os = "android")]
    let handle = api.register_android_plugin("tauri.plugin.cast", "CastPlugin")?;
    #[cfg(target_os = "ios")]
    let handle = api.register_ios_plugin(init_plugin_cast)?;
    Ok(Cast(handle))
}

pub struct Cast<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> Cast<R> {
    pub fn discover_devices(
        &self,
        payload: DiscoverDevicesRequest,
    ) -> crate::Result<DiscoverDevicesResponse> {
        self.0
            .run_mobile_plugin("discoverDevices", payload)
            .map_err(Into::into)
    }

    pub fn cast_media(&self, payload: CastMediaRequest) -> crate::Result<CastMediaResponse> {
        self.0
            .run_mobile_plugin("castMedia", payload)
            .map_err(Into::into)
    }

    pub fn cast_control(&self, payload: CastControlRequest) -> crate::Result<CastControlResponse> {
        self.0
            .run_mobile_plugin("castControl", payload)
            .map_err(Into::into)
    }

    pub fn get_cast_state(&self) -> crate::Result<CastStateResponse> {
        self.0
            .run_mobile_plugin("getCastState", ())
            .map_err(Into::into)
    }

    pub fn stop_cast(&self) -> crate::Result<StopCastResponse> {
        self.0
            .run_mobile_plugin("stopCast", ())
            .map_err(Into::into)
    }

    pub fn get_lan_ip(&self) -> crate::Result<LanIpResponse> {
        self.0
            .run_mobile_plugin("getLanIp", ())
            .map_err(Into::into)
    }
}
