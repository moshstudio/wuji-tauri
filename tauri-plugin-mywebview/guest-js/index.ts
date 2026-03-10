import { invoke } from '@tauri-apps/api/core'

/** 嗅探到的单条资源 */
export interface SniffedResource {
  /** 资源 URL */
  url: string;
  /** 资源类型: "video" | "audio" | "image" | "xhr" | "fetch" | "other" */
  resourceType: string;
  /** 请求方法（XHR/Fetch 才有） */
  method?: string;
  /** Content-Type 响应头 */
  contentType?: string;
  /** 资源大小（字节） */
  size?: number;
  /** 请求发送的数据（针对 xhr/fetch） */
  requestData?: string;
  /** 响应内容（截断处理，针对 xhr/fetch） */
  responseBody?: string;
}

export interface FetchWebviewResult {
  content: string;
  url: string;
  cookie: string;
  title: string;
  /** 页面中嗅探到的媒体/网络请求资源列表 */
  resources: SniffedResource[];
}

export async function ping(value: string): Promise<string | null> {
  return await invoke<{value?: string}>('plugin:mywebview|ping', {
    payload: {
      value,
    },
  }).then((r) => (r.value ? r.value : null));
}

export type SniffedResourceType = 'video' | 'audio' | 'image' | 'xhr' | 'fetch' | 'other';

export async function fetchWebview(
  url: string,
  options?: {
    timeout?: number;
    waitForResources?: SniffedResourceType | SniffedResourceType[];
    useSavedCookie?: boolean;
  }
): Promise<FetchWebviewResult | null> {
  const waitForResources = Array.isArray(options?.waitForResources)
    ? options.waitForResources.join(',')
    : options?.waitForResources;

  return await invoke<FetchWebviewResult>('plugin:mywebview|fetch', {
    payload: {
      url: url,
      useSavedCookie: options?.useSavedCookie ?? true,
      timeout: options?.timeout,
      waitForResources: waitForResources,
    },
  }).then((r) => (r ? r : null));
}
