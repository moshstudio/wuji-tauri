import { Channel, invoke } from '@tauri-apps/api/core';
import { BaseDirectory } from '@tauri-apps/plugin-fs';
import imageCompression from 'browser-image-compression';

export interface Proxy {
  /**
   * Proxy all traffic to the passed URL.
   */
  all?: string | ProxyConfig;
  /**
   * Proxy all HTTP traffic to the passed URL.
   */
  http?: string | ProxyConfig;
  /**
   * Proxy all HTTPS traffic to the passed URL.
   */
  https?: string | ProxyConfig;
}

export interface ProxyConfig {
  /**
   * The URL of the proxy server.
   */
  url: string;
  /**
   * Set the `Proxy-Authorization` header using Basic auth.
   */
  basicAuth?: {
    username: string;
    password: string;
  };
  /**
   * A configuration for filtering out requests that shouldn't be proxied.
   * Entries are expected to be comma-separated (whitespace between entries is ignored)
   */
  noProxy?: string;
}

export interface ClientOptions {
  /**
   * Defines the maximum number of redirects the client should follow.
   * If set to 0, no redirects will be followed.
   */
  maxRedirections?: number;
  /** Timeout in milliseconds */
  connectTimeout?: number;
  /**
   * Configuration of a proxy that a Client should pass requests to.
   */
  proxy?: Proxy;

  /**
   * 是否验证证书
   */
  verify?: boolean;

  noProxy?: boolean;
}

export interface ClientConfig {
  method: string;
  url: string;
  headers: Array<[string, string]>;
  data?: Array<number> | null;
  maxRedirections?: number | null;
  connectTimeout?: number | null;
  proxy?: Proxy | null;
  verify?: boolean | null;
  noProxy?: boolean | null;
}

const ERROR_REQUEST_CANCELLED = 'Request canceled';

async function formatClientConfig(
  input: URL | Request | string,
  init?: RequestInit & ClientOptions,
): Promise<ClientConfig> {
  const signal = init?.signal;
  if (signal?.aborted) {
    throw new Error(ERROR_REQUEST_CANCELLED);
  }
  const maxRedirections = init?.maxRedirections;
  const connectTimeout = init?.connectTimeout;
  const proxy = init?.proxy;

  // Remove these fields before creating the request
  if (init) {
    delete init.maxRedirections;
    delete init.connectTimeout;
    delete init.proxy;
  }

  const headers = init?.headers
    ? init.headers instanceof Headers
      ? init.headers
      : new Headers(init.headers)
    : new Headers();

  const req = new Request(input, init);
  const buffer = await req.arrayBuffer();
  const data =
    buffer.byteLength !== 0 ? Array.from(new Uint8Array(buffer)) : null;

  // append new headers created by the browser `Request` implementation,
  // if not already declared by the caller of this function
  for (const [key, value] of req.headers) {
    if (!headers.get(key)) {
      headers.set(key, value);
    }
  }
  if (!headers.has('user-agent') && !headers.has('User-Agent')) {
    // const randomIndex = Math.floor(Math.random() * STATIC_CHROME_AGENTS.length);
    let ua = navigator.userAgent;
    if (!ua.includes('Edg')) {
      // 使用edge ua
      ua =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 Edg/135.0.0.0';
    }
    headers.set('user-agent', ua);
    // navigator.userAgent
  }

  const headersArray =
    headers instanceof Headers
      ? Array.from(headers.entries())
      : Array.isArray(headers)
        ? headers
        : Object.entries(headers);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const mappedHeaders: Array<[string, string]> = headersArray.map(
    ([name, val]) => [
      name,
      // we need to ensure we have all header values as strings

      typeof val === 'string' ? val : (val as any).toString(),
    ],
  );

  // abort early here if needed
  if (signal?.aborted) {
    throw new Error(ERROR_REQUEST_CANCELLED);
  }
  return {
    method: req.method,
    url: req.url,
    headers: mappedHeaders,
    data,
    maxRedirections,
    connectTimeout,
    proxy,
    verify: init?.verify,
    noProxy: init?.noProxy,
  };
}

async function _fetch(
  input: URL | Request | string,
  init?: RequestInit & ClientOptions,
): Promise<Response> {
  const clientConfig = await formatClientConfig(input, init);

  const rid = await invoke<number>('plugin:fetch-plugin|fetch', {
    clientConfig,
  });

  const abort = () => invoke('plugin:fetch-plugin|fetch_cancel', { rid });

  // abort early here if needed
  if (init?.signal?.aborted) {
    // we don't care about the result of this proimse
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    abort();
    throw new Error(ERROR_REQUEST_CANCELLED);
  }

  init?.signal?.addEventListener('abort', () => void abort());

  interface FetchSendResponse {
    status: number;
    statusText: string;
    headers: [[string, string]];
    url: string;
    rid: number;
  }

  const {
    status,
    statusText,
    url,
    headers: responseHeaders,
    rid: responseRid,
  } = await invoke<FetchSendResponse>('plugin:fetch-plugin|fetch_send', {
    rid,
  });

  // no body for 101, 103, 204, 205 and 304
  // see https://fetch.spec.whatwg.org/#null-body-status
  const readableStreamBody = [101, 103, 204, 205, 304].includes(status)
    ? null
    : new ReadableStream({
        start: (controller) => {
          const streamChannel = new Channel<ArrayBuffer | number[]>();
          streamChannel.onmessage = (res: ArrayBuffer | number[]) => {
            // close early if aborted
            if (init?.signal?.aborted) {
              controller.error(ERROR_REQUEST_CANCELLED);
              return;
            }

            const resUint8 = new Uint8Array(res);
            const lastByte = resUint8[resUint8.byteLength - 1];
            const actualRes = resUint8.slice(0, resUint8.byteLength - 1);

            // close when the signal to close (last byte is 1) is sent from the IPC.
            if (lastByte == 1) {
              controller.close();
              return;
            }

            controller.enqueue(actualRes);
          };

          // run a non-blocking body stream fetch
          invoke('plugin:fetch-plugin|fetch_read_body', {
            rid: responseRid,
            streamChannel,
          }).catch((e) => {
            controller.error(e);
          });
        },
      });

  const res = new Response(readableStreamBody, {
    status,
    statusText,
  });

  // url and headers are read only properties
  // but seems like we can set them like this
  //
  // we define theme like this, because using `Response`
  // constructor, it removes url and some headers
  // like `set-cookie` headers
  Object.defineProperty(res, 'url', { value: url });
  Object.defineProperty(res, 'headers', {
    value: new Headers(responseHeaders),
  });

  return res;
}

export async function fetch(
  input: URL | Request | string,
  init?: RequestInit & ClientOptions,
): Promise<Response> {
  try {
    let response = await _fetch(input, init);
    if (response.status === 302) {
      if (Array.from(response.headers.keys()).includes('location')) {
        response = await fetch(response.headers.get('location')!, {
          verify: false,
        });
      }
    }
    return response;
  } catch (error) {
    console.error('fetch error:', error);
    return Response.error();
  }
}

export async function cachedFetch(
  input: URL | Request | string,
  init?: RequestInit & ClientOptions,
  imageAndCompress = false,
): Promise<Response> {
  if (!input.toString().length) {
    return Response.error();
  }
  if ('caches' in window) {
    const cacheKey = input.toString() + imageAndCompress.toString();
    const cache = await caches.open('wuji-cache');

    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }
    let response = await fetch(input, init);

    if (response.ok) {
      if (imageAndCompress) {
        const blob = await response.blob();
        if (blob.size === 0) {
          return response;
        }
        const file = new File([blob], 'image.png', {
          type: blob.type || 'image/png',
        });
        try {
          const compressedFile = await imageCompression(file, {
            maxSizeMB: 1, // 最大文件大小（MB）
            maxWidthOrHeight: 1024, // 最大宽/高
            useWebWorker: true, // 多线程加速
            fileType: 'image/webp', // 可选转 WebP
          });
          response = new Response(compressedFile);
          cache.put(cacheKey, response.clone());
        } catch (error) {
          console.error('LoadImage压缩错误:', cacheKey, error);
          return new Response(blob);
        }
      } else {
        cache.put(cacheKey, response.clone());
      }
    }
    return response;
  } else {
    const response = await fetch(input, init);
    return response;
  }
}

export async function fetchAndSave(
  input: URL | Request | string,
  init?: RequestInit &
    ClientOptions & { baseDir?: BaseDirectory; path?: string },
): Promise<boolean> {
  const clientConfig = await formatClientConfig(input, init);
  const clientConfigWithSave = {
    baseDir: init?.baseDir,
    path: init?.path,
    ...clientConfig,
  };
  return await invoke('plugin:fetch-plugin|fetch_and_save', {
    clientConfigWithSave,
  });
}
export default fetch;
