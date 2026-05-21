import { invoke } from '@tauri-apps/api/core';
import type {
  CastControlAction,
  CastMediaResult,
  CastState,
  DiscoverDevicesResult,
} from './types';

export type {
  CastControlAction,
  CastDevice,
  CastMediaResult,
  CastState,
  DiscoverDevicesResult,
} from './types';

function normalizeDevices(value: unknown): DiscoverDevicesResult['devices'] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => {
    const raw = item as Record<string, unknown>;
    return {
      id: String(raw.id ?? ''),
      name: String(raw.name ?? '未知设备'),
      address: String(raw.address ?? ''),
      isTv: !!(raw.isTv ?? raw.isTV ?? raw.is_tv),
    };
  }).filter(d => d.id.length > 0);
}

export async function discoverDevices(timeoutMs = 10000): Promise<DiscoverDevicesResult> {
  const res = await invoke<DiscoverDevicesResult | null>(
    'plugin:cast|discover_devices',
    { payload: { timeoutMs } },
  );
  return {
    devices: normalizeDevices(res?.devices),
    lanIp: res?.lanIp ?? null,
    error: res?.error,
  };
}

export async function castMedia(
  deviceId: string,
  url: string,
  title?: string,
  deviceAddress?: string,
): Promise<CastMediaResult> {
  const res = await invoke<CastMediaResult>('plugin:cast|cast_media', {
    payload: { deviceId, url, title, deviceAddress },
  });
  return {
    success: !!res.success,
    error: res.error,
  };
}

export async function castControl(
  action: CastControlAction,
  value?: number,
): Promise<boolean> {
  const res = await invoke<{ success: boolean }>('plugin:cast|cast_control', {
    payload: { action, value },
  });
  return !!res.success;
}

export async function getCastState(): Promise<CastState> {
  return await invoke<CastState>('plugin:cast|get_cast_state');
}

export async function stopCast(): Promise<boolean> {
  const res = await invoke<{ success: boolean }>('plugin:cast|stop_cast');
  return !!res.success;
}

export async function getLanIp(): Promise<string | null> {
  const res = await invoke<{ ip?: string | null }>('plugin:cast|get_lan_ip');
  return res.ip ?? null;
}
