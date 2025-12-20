import { enable, disable, isEnabled } from '@tauri-apps/plugin-autostart';

/**
 * 启用开机自启
 */
export async function enableAutostart(): Promise<void> {
  try {
    await enable();
  } catch (error) {
    console.error('启用开机自启失败:', error);
    throw error;
  }
}

/**
 * 禁用开机自启
 */
export async function disableAutostart(): Promise<void> {
  try {
    await disable();
  } catch (error) {
    console.error('禁用开机自启失败:', error);
    throw error;
  }
}

/**
 * 检查开机自启是否已启用
 */
export async function checkAutostartEnabled(): Promise<boolean> {
  try {
    return await isEnabled();
  } catch (error) {
    console.error('检查开机自启状态失败:', error);
    return false;
  }
}

/**
 * 设置开机自启状态
 */
export async function setAutostartEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    await enableAutostart();
  } else {
    await disableAutostart();
  }
}
