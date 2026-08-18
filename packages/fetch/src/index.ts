import type { BaseDirectory } from '@tauri-apps/plugin-fs';
import { Channel, invoke } from '@tauri-apps/api/core';
import imageCompression from 'browser-image-compression';
import imageCompressionCode from './assets/browser-image-compression.js?raw';

const blob = new Blob([imageCompressionCode], {
  type: 'application/javascript',
});
const imageCompressionUrl = URL.createObjectURL(blob);

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
const WUJI_CACHE_FRAGMENT = '#wuji-cache=';
const WUJI_CACHE_FP_HEADER = 'x-wuji-cache-fp';

/** 从原始 headers 取出指定头（绕过 Headers 对 Cookie 等禁止头的丢弃） */
function extractRawHeader(
  headers: HeadersInit | undefined,
  name: string,
): string | undefined {
  if (!headers) {
    return undefined;
  }
  const lower = name.toLowerCase();
  if (headers instanceof Headers) {
    return headers.get(name) ?? undefined;
  }
  if (Array.isArray(headers)) {
    for (const [key, value] of headers) {
      if (String(key).toLowerCase() === lower) {
        return String(value);
      }
    }
    return undefined;
  }
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lower && value != null) {
      return String(value);
    }
  }
  return undefined;
}

/** 将 HeadersInit 规范化为稳定字符串（用于缓存 fingerprint） */
function serializeHeaders(headers?: HeadersInit): string {
  if (!headers) {
    return '';
  }
  const normalized = new Headers(headers);
  const entries: [string, string][] = [];
  normalized.forEach((value, name) => {
    entries.push([name.toLowerCase(), value]);
  });
  entries.sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(entries);
}

/** 汇总会影响响应内容的请求参数 */
function buildCacheFingerprint(
  input: URL | Request | string,
  init?: RequestInit & ClientOptions,
  imageAndCompress = false,
): string {
  const method
    = init?.method ?? (input instanceof Request ? input.method : 'GET');
  const headers
    = init?.headers ?? (input instanceof Request ? input.headers : undefined);

  return JSON.stringify({
    method: method.toUpperCase(),
    headers: serializeHeaders(headers),
    maxRedirections: init?.maxRedirections ?? null,
    connectTimeout: init?.connectTimeout ?? null,
    verify: init?.verify ?? null,
    noProxy: init?.noProxy ?? null,
    compress: imageAndCompress,
  });
}

async function hashString(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  if (globalThis.crypto?.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash) ^ text.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

/** 每个资源 URL 固定一个 cache key（仅区分是否压缩） */
function buildCacheStorageKey(url: string, imageAndCompress: boolean): string {
  return `${url}${WUJI_CACHE_FRAGMENT}${imageAndCompress ? '1' : '0'}`;
}

async function buildCacheFingerprintHash(
  input: URL | Request | string,
  init?: RequestInit & ClientOptions,
  imageAndCompress = false,
): Promise<string> {
  const fingerprint = buildCacheFingerprint(input, init, imageAndCompress);
  const hash = await hashString(fingerprint);
  return hash.slice(0, 16);
}

function withCacheFingerprint(response: Response, fingerprint: string): Response {
  const headers = new Headers(response.headers);
  headers.set(WUJI_CACHE_FP_HEADER, fingerprint);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/** 直接删除已知的旧版 cache key（无需遍历 cache） */
async function deleteLegacyCacheKeys(cache: Cache, url: string): Promise<void> {
  await Promise.all([
    cache.delete(`${url}true`),
    cache.delete(`${url}false`),
  ]);
}

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
  const verify = init?.verify;
  const noProxy = init?.noProxy;

  if (init) {
    delete init.maxRedirections;
    delete init.connectTimeout;
    delete init.proxy;
    delete init.verify;
    delete init.noProxy;
  }

  // Headers / Request 可能丢弃 Cookie 等禁止头；先从原始 init 取出
  const rawCookie = extractRawHeader(init?.headers, 'cookie');

  const headers = init?.headers
    ? init.headers instanceof Headers
      ? init.headers
      : new Headers(init.headers)
    : new Headers();

  const req = new Request(input, init);
  const buffer = await req.arrayBuffer();
  const data
    = buffer.byteLength !== 0 ? Array.from(new Uint8Array(buffer)) : null;

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
      ua
        = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 Edg/135.0.0.0';
    }
    headers.set('user-agent', ua);
    // navigator.userAgent
  }

  const headersArray
    = headers instanceof Headers
      ? Array.from(headers.entries())
      : Array.isArray(headers)
        ? headers
        : Object.entries(headers);

  const mappedHeaders: Array<[string, string]> = headersArray.map(
    ([name, val]) => [
      name,
      // we need to ensure we have all header values as strings

      typeof val === 'string' ? val : (val as any).toString(),
    ],
  );

  if (
    rawCookie
    && !mappedHeaders.some(([name]) => name.toLowerCase() === 'cookie')
  ) {
    mappedHeaders.push(['Cookie', rawCookie]);
  }

  // abort early here if needed
  if (signal?.aborted) {
    throw new Error(ERROR_REQUEST_CANCELLED);
  }
  const resolvedConnectTimeout = connectTimeout ?? 15_000;

  return {
    method: req.method,
    url: req.url,
    headers: mappedHeaders,
    data,
    maxRedirections,
    connectTimeout: resolvedConnectTimeout,
    proxy,
    verify,
    noProxy,
  };
}

async function _fetch(
  input: URL | Request | string,
  init?: RequestInit & ClientOptions,
): Promise<Response> {
  const inputUrl = input instanceof Request ? input.url : input.toString();
  if (inputUrl.startsWith('blob:') || inputUrl.startsWith('data:')) {
    return window.fetch(input, init);
  }

  const clientConfig = await formatClientConfig(input, init);

  const rid = await invoke<number>('plugin:fetch-plugin|fetch', {
    clientConfig,
  });

  const abort = () => invoke('plugin:fetch-plugin|fetch_cancel', { rid });

  // abort early here if needed
  if (init?.signal?.aborted) {
    // we don't care about the result of this proimse
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

  const sendTimeoutMs = Math.max(clientConfig.connectTimeout ?? 15_000, 30_000);

  const {
    status,
    statusText,
    url,
    headers: responseHeaders,
    rid: responseRid,
  } = await Promise.race([
    invoke<FetchSendResponse>('plugin:fetch-plugin|fetch_send', { rid }),
    new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        void abort();
        reject(
          new Error(
            `fetch_send timeout after ${sendTimeoutMs}ms: ${clientConfig.url}`,
          ),
        );
      }, sendTimeoutMs + 5_000);
      init?.signal?.addEventListener('abort', () => clearTimeout(timer));
    }),
  ]);

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
            if (lastByte === 1) {
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
  // we define them like this, because using `Response`
  // constructor, it removes url and some headers
  // like `set-cookie` headers
  Object.defineProperty(res, 'url', { value: url });

  const setCookies: string[] = [];
  const headersObj = new Headers();
  for (const [key, val] of responseHeaders) {
    if (String(key).toLowerCase() === 'set-cookie') {
      setCookies.push(String(val));
      continue;
    }
    try {
      headersObj.append(key, val);
    }
    catch {
      // ignore invalid header
    }
  }
  const nativeGetSetCookie
    = typeof headersObj.getSetCookie === 'function'
      ? headersObj.getSetCookie.bind(headersObj)
      : () => [] as string[];
  headersObj.getSetCookie = () =>
    setCookies.length ? [...setCookies] : nativeGetSetCookie();

  Object.defineProperty(res, 'headers', {
    value: headersObj,
  });

  return res;
}

export async function fetch(
  input: URL | Request | string,
  init?: RequestInit & ClientOptions,
): Promise<Response> {
  const inputUrl = input instanceof Request ? input.url : input.toString();

  const runOnce = async (
    opts?: RequestInit & ClientOptions,
  ): Promise<Response> => {
    let response = await _fetch(input, opts);

    if (response.type === 'error' || response.status === 0) {
      throw new Error(`fetch failed (network/plugin): ${inputUrl}`);
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (location) {
        const nextUrl = new URL(location, response.url || inputUrl).toString();
        response = await fetch(nextUrl, {
          ...opts,
          verify: opts?.verify ?? false,
          headers: opts?.headers,
        });
      }
    }

    return response;
  };

  try {
    return await runOnce(init);
  }
  catch (error) {
    if (init?.noProxy !== true) {
      try {
        return await runOnce({ ...init, noProxy: true });
      }
      catch (retryError) {
        console.error('fetch error:', retryError);
        return Response.error();
      }
    }
    console.error('fetch error:', error);
    return Response.error();
  }
}

export async function cachedFetch(
  input: URL | Request | string,
  init?: RequestInit & ClientOptions,
  imageAndCompress = false,
): Promise<Response> {
  const inputUrl = input instanceof Request ? input.url : input.toString();
  if (!inputUrl.length) {
    return Response.error();
  }
  const isSupportedScheme
    = inputUrl.startsWith('http://') || inputUrl.startsWith('https://');

  if ('caches' in window && isSupportedScheme) {
    const cacheKey = buildCacheStorageKey(inputUrl, imageAndCompress);
    const fingerprint = await buildCacheFingerprintHash(
      input,
      init,
      imageAndCompress,
    );
    const cache = await caches.open('wuji-cache');

    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      if (cachedResponse.headers.get(WUJI_CACHE_FP_HEADER) === fingerprint) {
        return cachedResponse;
      }
      await cache.delete(cacheKey);
    }
    await deleteLegacyCacheKeys(cache, inputUrl);

    let response = await fetch(input, init);

    if (response.ok) {
      if (imageAndCompress) {
        const blob: Blob | null = await response.blob();
        if (blob.size === 0) {
          return response;
        }
        const file: File | null = new File([blob], 'image.png', {
          type: blob.type || 'image/png',
        });
        try {
          const compressedFile = await imageCompression(file, {
            maxSizeMB: 0.5, // 最大文件大小（MB）
            maxWidthOrHeight: 800, // 最大宽/高
            useWebWorker: true, // 多线程加速
            fileType: 'image/webp', // 可选转 WebP
            libURL: imageCompressionUrl,
          });
          response = new Response(compressedFile);
          await cache.put(
            cacheKey,
            withCacheFingerprint(response.clone(), fingerprint),
          );
        }
        catch (error) {
          console.warn(
            'LoadImage压缩错误, url: ',
            input.toString(),
            'error: ',
            error,
          );
          return new Response(blob);
        }
      }
      else {
        await cache.put(
          cacheKey,
          withCacheFingerprint(response.clone(), fingerprint),
        );
      }
    }
    return response;
  }
  else {
    const response = await fetch(input, init);
    return response;
  }
}

export async function fetchAndSave(
  input: URL | Request | string,
  init?: RequestInit
    & ClientOptions & { baseDir?: BaseDirectory; path?: string },
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
