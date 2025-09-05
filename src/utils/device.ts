import { get_device_id } from 'tauri-plugin-commands-api';

export async function getDeviceId() {
  const deviceInfo = await get_device_id();
  return deviceInfo;
}
