import { invoke } from '@tauri-apps/api/core'

export interface FetchWebviewResult {
  content: string;
  url: string;
  cookie: string;
  title: string;
}

export async function ping(value: string): Promise<string | null> {
  return await invoke<{value?: string}>('plugin:mywebview|ping', {
    payload: {
      value,
    },
  }).then((r) => (r.value ? r.value : null));
}
export async function fetchWebview(url: string): Promise<FetchWebviewResult | null> {
  return await invoke<FetchWebviewResult>('plugin:mywebview|fetch', {
    payload: {
      url: url,
      useSavedCookie: true,
    },
  }).then((r) => (r ? r : null));
}
