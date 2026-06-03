import type { VideoUrlMap } from '@wuji-tauri/source-extension';
import { fetch } from '@wuji-tauri/fetch';

/** 可探测、可重试的点播媒体类型（不含 rtmp） */
export type PlayableVideoMediaType = Exclude<
  NonNullable<VideoUrlMap['type']>,
  'rtmp'
>;

/** 播放失败时按此顺序轮换类型 */
export const VIDEO_TYPE_RETRY_ORDER: PlayableVideoMediaType[] = [
  'm3u8',
  'mp4',
  'dash',
];

const PROBE_TIMEOUT_MS = 8000;
const SNIFF_BYTE_LENGTH = 4096;

function normalizeDeclaredType(
  type?: VideoUrlMap['type'],
): PlayableVideoMediaType | undefined {
  if (!type || type === 'rtmp')
    return undefined;
  return type;
}

/** 从 URL 路径/查询推断类型（无匹配则返回 undefined，不盲目默认 m3u8） */
export function guessTypeFromUrl(url: string): PlayableVideoMediaType | undefined {
  const lower = url.toLowerCase();
  const path = lower.split('?')[0]?.split('#')[0] ?? lower;
  if (path.endsWith('.m3u8') || path.includes('.m3u8'))
    return 'm3u8';
  if (path.endsWith('.mp4') || path.includes('.mp4'))
    return 'mp4';
  if (path.endsWith('.mpd') || path.includes('.mpd'))
    return 'dash';
  return undefined;
}

export function guessTypeFromContentType(
  contentType: string,
): PlayableVideoMediaType | undefined {
  const ct = contentType.toLowerCase();
  if (
    ct.includes('application/vnd.apple.mpegurl')
    || ct.includes('application/x-mpegurl')
    || ct.includes('application/mpegurl')
  ) {
    return 'm3u8';
  }
  if (ct.includes('application/dash+xml'))
    return 'dash';
  if (ct.includes('video/mp4'))
    return 'mp4';
  return undefined;
}

function isNonMediaContentType(contentType: string): boolean {
  const ct = contentType.toLowerCase();
  return (
    ct.includes('text/html')
    || ct.includes('application/json')
    || ct.includes('text/plain')
    || ct.startsWith('text/')
  );
}

function looksLikeHtmlBody(sample: string): boolean {
  const head = sample.trim().slice(0, 512).toLowerCase();
  return head.startsWith('<!doctype') || head.startsWith('<html') || head.includes('<head');
}

export function guessTypeFromSniff(
  sample: string,
  contentType?: string,
): PlayableVideoMediaType | undefined {
  if (contentType && isNonMediaContentType(contentType)) {
    return undefined;
  }
  const head = sample.trim().slice(0, SNIFF_BYTE_LENGTH);
  if (looksLikeHtmlBody(head)) {
    return undefined;
  }
  if (head.includes('#EXTM3U')) {
    return 'm3u8';
  }
  if (head.includes('<MPD') || head.includes('urn:mpeg:dash:schema:mpd')) {
    return 'dash';
  }
  if (head.includes('ftyp')) {
    return 'mp4';
  }
  return undefined;
}

/** URL 无媒体扩展名时，浏览器内轮换类型无法解决 CORS/404，应优先 WebView 解析 */
export function shouldFastPathWebviewFallback(url: string): boolean {
  return !guessTypeFromUrl(url);
}

/** 无路径扩展名时不应采用 dash（多为订阅源误标或 HTML 页） */
export function sanitizeResolvedType(
  url: string,
  type: PlayableVideoMediaType | undefined,
): PlayableVideoMediaType {
  const fromUrl = guessTypeFromUrl(url);
  if (fromUrl) {
    return fromUrl;
  }
  if (type === 'dash' && !url.toLowerCase().includes('.mpd')) {
    return 'm3u8';
  }
  return type ?? 'm3u8';
}

/** video.js 跨域模式：有明确媒体扩展名时用 anonymous，否则保留凭证 */
export function resolveVideoJsCrossOrigin(
  url: string,
): 'anonymous' | 'use-credentials' | undefined {
  if (!url)
    return undefined;
  return guessTypeFromUrl(url) ? 'anonymous' : 'use-credentials';
}

export function toVideoJsMimeType(
  type?: VideoUrlMap['type'],
): string | undefined {
  switch (type) {
    case 'm3u8':
    case 'hls':
      return 'application/x-mpegURL';
    case 'mp4':
      return 'video/mp4';
    case 'dash':
      return 'application/dash+xml';
    default:
      return undefined;
  }
}

export function canonicalizeVideoType(
  type?: VideoUrlMap['type'],
): PlayableVideoMediaType | undefined {
  const normalized = normalizeDeclaredType(type);
  if (normalized === 'hls')
    return 'm3u8';
  return normalized;
}

export interface ProbeVideoTypeOptions {
  headers?: Record<string, string> | null;
  signal?: AbortSignal;
  /** 订阅源声明的类型，探测失败时作兜底 */
  declaredType?: VideoUrlMap['type'];
  connectTimeoutMs?: number;
}

/**
 * 探测远程资源的实际媒体类型：URL → HEAD Content-Type → GET 片段嗅探 → 声明类型
 */
export async function probeVideoType(
  url: string,
  options: ProbeVideoTypeOptions = {},
): Promise<PlayableVideoMediaType | undefined> {
  const {
    headers,
    signal,
    declaredType,
    connectTimeoutMs = PROBE_TIMEOUT_MS,
  } = options;

  const fromUrl = guessTypeFromUrl(url);
  if (fromUrl)
    return fromUrl;

  const requestHeaders: Record<string, string> = { ...(headers ?? {}) };
  const fetchInit = {
    headers: requestHeaders,
    signal,
    connectTimeout: connectTimeoutMs,
  };

  const tryParseResponse = async (response: Response) => {
    const contentType = response.headers.get('content-type') ?? '';
    const fromCt = guessTypeFromContentType(contentType);
    if (fromCt)
      return fromCt;
    try {
      const buffer = await response.arrayBuffer();
      const sample = new TextDecoder('utf-8', { fatal: false }).decode(
        buffer.slice(0, SNIFF_BYTE_LENGTH),
      );
      return guessTypeFromSniff(sample, contentType);
    }
    catch {
      return undefined;
    }
  };

  try {
    const headResponse = await fetch(url, { ...fetchInit, method: 'HEAD' });
    if (headResponse.ok) {
      const fromHead = await tryParseResponse(headResponse);
      if (fromHead)
        return fromHead;
    }
  }
  catch {
    /* HEAD 不可用（405 等）时继续 GET */
  }

  try {
    const getResponse = await fetch(url, {
      ...fetchInit,
      method: 'GET',
      headers: {
        ...requestHeaders,
        Range: `bytes=0-${SNIFF_BYTE_LENGTH - 1}`,
      },
    });
    if (getResponse.ok || getResponse.status === 206) {
      const fromGet = await tryParseResponse(getResponse);
      if (fromGet)
        return fromGet;
    }
  }
  catch {
    /* 探测失败 */
  }

  return (
    canonicalizeVideoType(declaredType)
    ?? guessTypeFromUrl(url)
  );
}

export interface ResolveVideoUrlMapOptions {
  signal?: AbortSignal;
  /** 为 false 时仅做 URL/声明类型归一化，不发网络探测 */
  probe?: boolean;
}

/**
 * 归一化 VideoUrlMap：修正错误/缺失的 type，供播放器创建前调用
 */
export async function resolveVideoUrlMap(
  src: VideoUrlMap,
  options: ResolveVideoUrlMapOptions = {},
): Promise<VideoUrlMap> {
  const { signal, probe = true } = options;

  if (!src.url)
    return src;

  if (src.type === 'rtmp')
    return src;

  if (src.isLive) {
    return {
      ...src,
      type: canonicalizeVideoType(src.type) ?? 'm3u8',
    };
  }

  const fromUrl = guessTypeFromUrl(src.url);
  const declared = canonicalizeVideoType(src.type);

  if (fromUrl) {
    return { ...src, type: sanitizeResolvedType(src.url, fromUrl) };
  }

  if (!probe) {
    return {
      ...src,
      type: declared ?? 'm3u8',
    };
  }

  const probed = await probeVideoType(src.url, {
    headers: src.headers,
    signal,
    declaredType: src.type,
  });

  const resolved = sanitizeResolvedType(
    src.url,
    probed ?? declared ?? 'm3u8',
  );
  return { ...src, type: resolved };
}

/** 当前类型播放失败时，返回尚未尝试的候选类型 */
export function getVideoTypeRetryCandidates(
  current: VideoUrlMap['type'] | undefined,
  tried: ReadonlySet<PlayableVideoMediaType>,
): PlayableVideoMediaType[] {
  const currentCanonical = canonicalizeVideoType(current);
  return VIDEO_TYPE_RETRY_ORDER.filter((candidate) => {
    if (currentCanonical && candidate === currentCanonical)
      return false;
    return !tried.has(candidate);
  });
}
