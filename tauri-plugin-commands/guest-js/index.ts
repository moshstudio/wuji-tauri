import { invoke } from '@tauri-apps/api/core';

export async function exit_app(): Promise<void> {
  return await invoke<void>('plugin:commands|exit_app');
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

export async function get_system_font_scale(): Promise<Number> {
  return await invoke<{ value?: Number }>(
    'plugin:commands|get_system_font_scale',
    {
      payload: {},
    }
  ).then((r) => Number(r.value));
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
