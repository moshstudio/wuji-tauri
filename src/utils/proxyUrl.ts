import { invoke } from '@tauri-apps/api/core';

export async function getProxyServerUrl(
  url: string,
  headers?: Record<string, string>
): Promise<string | null> {
  return await invoke('plugin:proxy-plugin|get_proxy_url', {
    originalUrl: url,
    headers: headers || {},
  });
}
