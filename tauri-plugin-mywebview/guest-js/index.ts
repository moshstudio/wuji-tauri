import { invoke } from '@tauri-apps/api/core'

export async function ping(value: string): Promise<string | null> {
  return await invoke<{value?: string}>('plugin:mywebview|ping', {
    payload: {
      value,
    },
  }).then((r) => (r.value ? r.value : null));
}
export async function fetchWebview(url: string): Promise<string | null> {
  return await invoke<{ value?: string }>('plugin:mywebview|fetch', {
    payload: {
      url: url,
      useSavedCookie: true,
    },
  }).then((r) => (r.value ? r.value : null));
}
