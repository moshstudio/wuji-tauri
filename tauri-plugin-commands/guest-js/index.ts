import { invoke } from '@tauri-apps/api/core';

export async function exit_app(): Promise<void> {
  return await invoke<void>('plugin:commands|exit_app');
}

export async function return_to_home(): Promise<void> {
  return await invoke<void>('plugin:commands|return_to_home');
}

export async function set_status_bar(
  bg: string,
  text?: 'dark' | 'light'
): Promise<boolean | null> {
  return await invoke<{ res?: string }>('plugin:commands|set_status_bar', {
    payload: {
      bg: bg,
      text: text,
    },
  }).then((r) => (r.res === 'true' ? true : false));
}

export async function hide_status_bar(
  hide: boolean = true
): Promise<boolean | null> {
  return await invoke<{ res?: string }>('plugin:commands|hide_status_bar', {
    payload: { hide: hide },
  }).then((r) => (r.res === 'true' ? true : false));
}

export async function get_system_font_scale(): Promise<number> {
  return await invoke<{ value?: number }>(
    'plugin:commands|get_system_font_scale',
    {
      payload: {},
    }
  ).then((r) => Number(r.value));
}

export async function get_screen_orientation(): Promise<
  'landscape' | 'portrait' | 'auto'
> {
  return await invoke<{ value?: 'landscape' | 'portrait' | 'auto' }>(
    'plugin:commands|get_screen_orientation',
    {
      payload: {},
    }
  ).then((r) => r.value || 'auto'); // 如果r.value为undefined，返回默认值'auto'
}
export async function set_screen_orientation(
  orientation: 'landscape' | 'portrait' | 'auto'
): Promise<boolean | null> {
  return await invoke<{ res?: string }>(
    'plugin:commands|set_screen_orientation',
    {
      payload: {
        orientation: orientation,
      },
    }
  ).then((r) => (r.res === 'true' ? true : false));
}

export async function get_brightness(): Promise<number> {
  return await invoke<{ value?: number }>('plugin:commands|get_brightness', {
    payload: {},
  }).then((r) => Number(r.value));
}

export async function get_system_brightness(): Promise<number> {
  return await invoke<{ value?: number }>(
    'plugin:commands|get_system_brightness',
    {
      payload: {},
    }
  ).then((r) => Number(r.value));
}

export async function set_brightness(value: number): Promise<Boolean | null> {
  return await invoke<{ value?: boolean }>('plugin:commands|set_brightness', {
    payload: {
      brightness: value,
    },
  }).then((r) => (r.value ? r.value : null));
}

export async function get_volume(): Promise<number> {
  return await invoke<{ value?: number }>('plugin:commands|get_volume', {
    payload: {},
  }).then((r) => Number(r.value));
}

export async function set_volume(value: number): Promise<Boolean | null> {
  return await invoke<{ value?: boolean }>('plugin:commands|set_volume', {
    payload: {
      volume: value,
    },
  }).then((r) => (r.value ? r.value : null));
}

export async function get_device_id(): Promise<string> {
  return await invoke<{ value?: String }>('plugin:commands|get_device_id', {
    payload: {},
  }).then((r) => String(r.value));
}