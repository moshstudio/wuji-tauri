use serde::de::DeserializeOwned;
use tauri::{plugin::PluginApi, utils::acl::Number, AppHandle, Runtime};

use crate::models::*;

pub fn init<R: Runtime, C: DeserializeOwned>(
    app: &AppHandle<R>,
    _api: PluginApi<R, C>,
) -> crate::Result<Commands<R>> {
    Ok(Commands(app.clone()))
}

/// Access to the commands APIs.
pub struct Commands<R: Runtime>(AppHandle<R>);

impl<R: Runtime> Commands<R> {
    pub fn exit_app(&self) -> crate::Result<()> {
        Ok(())
    }
    pub fn return_to_home(&self) -> crate::Result<()> {
        Ok(())
    }
    pub fn set_status_bar(
        &self,
        payload: SetStatusBarRequest,
    ) -> crate::Result<SetStatusBarResponse> {
        Ok(SetStatusBarResponse { res: Some(true) })
    }
    pub fn hide_status_bar(&self, payload: HideStatusBarRequest) -> crate::Result<BoolResponse> {
        Ok(BoolResponse { res: Some(true) })
    }
    pub fn get_system_font_scale(&self, payload: EmptyRequest) -> crate::Result<NumberResponse> {
        Ok(NumberResponse { value: 1.0 })
    }
    pub fn get_screen_orientation(
        &self,
        payload: EmptyRequest,
    ) -> crate::Result<GetScreenOrientationResponse> {
        Ok(GetScreenOrientationResponse {
            orientation: "".to_string(),
        })
    }
    pub fn set_screen_orientation(
        &self,
        payload: SetScreenOrientationRequest,
    ) -> crate::Result<BoolResponse> {
        Ok(BoolResponse { res: Some(true) })
    }
    pub fn get_brightness(&self, payload: EmptyRequest) -> crate::Result<NumberResponse> {
        Ok(NumberResponse { value: 1.0 })
    }
    pub fn get_system_brightness(&self, payload: EmptyRequest) -> crate::Result<NumberResponse> {
        Ok(NumberResponse { value: 1.0 })
    }
    pub fn set_brightness(&self, payload: SetBrightnessRequest) -> crate::Result<BoolResponse> {
        Ok(BoolResponse { res: Some(true) })
    }
    pub fn get_volume(&self, payload: EmptyRequest) -> crate::Result<NumberResponse> {
        Ok(NumberResponse { value: 1.0 })
    }
    pub fn set_volume(&self, payload: SetVolumeRequest) -> crate::Result<BoolResponse> {
        Ok(BoolResponse { res: Some(true) })
    }
    pub fn get_device_id(&self, payload: EmptyRequest) -> crate::Result<StringResponse> {
        use winreg::enums::HKEY_LOCAL_MACHINE;
        use winreg::RegKey;

        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
        let subkey = hklm
            .open_subkey("SOFTWARE\\Microsoft\\Cryptography")
            .map_err(crate::Error::from)?;

        let machine_guid: String = subkey
            .get_value("MachineGuid")
            .map_err(crate::Error::from)?;

        Ok(StringResponse {
            value: machine_guid,
        })
    }
    pub fn save_file(&self, payload: SaveFileRequest) -> crate::Result<BoolResponse> {
        Ok(BoolResponse { res: Some(true) })
    }
    pub fn vibrate(&self, payload: VibrateRequest) -> crate::Result<BoolResponse> {
        Ok(BoolResponse { res: Some(true) })
    }

    pub fn vibrate_pattern(&self, payload: VibratePatternRequest) -> crate::Result<BoolResponse> {
        Ok(BoolResponse { res: Some(true) })
    }

    pub fn vibrate_predefined(
        &self,
        payload: VibratePredefinedRequest,
    ) -> crate::Result<BoolResponse> {
        Ok(BoolResponse { res: Some(true) })
    }
}
