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
