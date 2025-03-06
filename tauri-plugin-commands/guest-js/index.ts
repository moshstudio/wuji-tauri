import { invoke } from '@tauri-apps/api/core';

export async function exit_app(): Promise<void> {
  return await invoke<void>('plugin:commands|exit_app');
}

export async function set_status_bar(color: string): Promise<boolean | null> {
  return await invoke<{ res?: string }>('plugin:commands|set_status_bar', {
    payload: {
      value: color,
    },
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
