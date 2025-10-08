import { invoke } from '@tauri-apps/api/core';

export async function getProxyUrl(
  url: string,
  headers?: Record<string, string>,
): Promise<string | null> {
  return await invoke('plugin:proxy-plugin|get_proxy_url', {
    originalUrl: url,
    headers: headers || {},
  });
}

export async function getM3u8ProxyUrl(
  url: string,
  headers?: Record<string, string>,
): Promise<string | null> {
  return await invoke('plugin:proxy-plugin|get_m3u8_url', {
    originalUrl: url,
    headers: headers || {},
  });
}

export async function getFileProxyUrl(
  filename: string,
  baseDir: Record<string, string>,
): Promise<string | null> {
  return await invoke('plugin:proxy-plugin|get_file_url', {
    filename,
    baseDir,
  });
}
