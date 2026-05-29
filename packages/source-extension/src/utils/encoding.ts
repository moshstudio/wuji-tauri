import type * as IconvLite from 'iconv-lite';
import { Buffer } from 'node:buffer';

const REPLACEMENT_CHAR = '\uFFFD';

const CHARSET_ALIASES: Record<string, string> = {
  'utf8': 'utf8',
  'utf-8': 'utf8',
  'gbk': 'gbk',
  'gb2312': 'gbk',
  'gb18030': 'gb18030',
  'cp936': 'gbk',
  'windows936': 'gbk',
  'windows-936': 'gbk',
  'big5': 'big5',
  'cp950': 'big5',
  'x-big5': 'big5',
  'iso-8859-1': 'latin1',
  'iso88591': 'latin1',
  'latin1': 'latin1',
};

export function normalizeCharset(charset: string): string {
  const key = charset.trim().toLowerCase().replace(/[_\s-]/g, '');
  return CHARSET_ALIASES[key] ?? charset.trim().toLowerCase();
}

export function parseCharsetFromContentType(
  contentType: string | null | undefined,
): string | null {
  if (!contentType)
    return null;
  const match = /charset\s*=\s*["']?([^"'\s;]+)/i.exec(contentType);
  return match?.[1]?.trim() ?? null;
}

export function parseCharsetFromHtml(
  buffer: ArrayBuffer,
  maxScan = 65536,
): string | null {
  const bytes = new Uint8Array(
    buffer,
    0,
    Math.min(buffer.byteLength, maxScan),
  );
  const snippet = new TextDecoder('iso-8859-1').decode(bytes);

  const xmlMatch = /<\?xml[^>]+encoding=["']([^"']+)["']/i.exec(snippet);
  if (xmlMatch?.[1])
    return xmlMatch[1];

  const metaCharset = /<meta[^>]+charset\s*=\s*["']?([^"'\s;>]+)/i.exec(
    snippet,
  );
  if (metaCharset?.[1])
    return metaCharset[1];

  const metaContent
    = /<meta[^>]+content\s*=\s*["'][^"']*charset\s*=\s*([^"'\s;]+)/i.exec(
      snippet,
    );
  if (metaContent?.[1])
    return metaContent[1];

  return null;
}

function countReplacementChars(text: string, sampleLength = 32768): number {
  const sample
    = text.length > sampleLength ? text.slice(0, sampleLength) : text;
  let count = 0;
  for (let i = 0; i < sample.length; i++) {
    if (sample[i] === REPLACEMENT_CHAR)
      count++;
  }
  return count;
}

function isLikelyHtml(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 512));
  const head = new TextDecoder('iso-8859-1').decode(bytes).toLowerCase();
  return (
    head.includes('<html')
    || head.includes('<!doctype')
    || head.includes('<head')
  );
}

function sliceBuffer(buffer: ArrayBuffer, maxBytes: number): ArrayBuffer {
  if (buffer.byteLength <= maxBytes)
    return buffer;
  return buffer.slice(0, maxBytes);
}

/**
 * 自动检测响应体字符集：Content-Type → HTML meta → GBK 启发式回退。
 */
export function detectCharset(
  buffer: ArrayBuffer,
  contentType: string | null | undefined,
  iconv: typeof IconvLite,
): string {
  const fromHeader = parseCharsetFromContentType(contentType);
  if (fromHeader)
    return normalizeCharset(fromHeader);

  const fromMeta = parseCharsetFromHtml(buffer);
  if (fromMeta)
    return normalizeCharset(fromMeta);

  if (!isLikelyHtml(buffer))
    return 'utf8';

  const previewBytes = sliceBuffer(buffer, 65536);
  const utf8Preview = new TextDecoder('utf-8').decode(previewBytes);
  const utf8Bad = countReplacementChars(utf8Preview);
  if (utf8Bad < 3 && (utf8Preview.length === 0 || utf8Bad / utf8Preview.length <= 0.002))
    return 'utf8';

  const gbkPreview = decodeBuffer(previewBytes, 'gbk', iconv);
  const gbkBad = countReplacementChars(gbkPreview);
  if (gbkBad < utf8Bad)
    return 'gbk';

  return 'utf8';
}

export function decodeBuffer(
  buffer: ArrayBuffer,
  encoding: string,
  iconv: typeof IconvLite,
): string {
  const normalized = normalizeCharset(encoding);
  if (normalized === 'utf8')
    return new TextDecoder('utf-8').decode(buffer);

  const nodeBuffer = Buffer.from(buffer);
  if (iconv.encodingExists(normalized))
    return iconv.decode(nodeBuffer, normalized);

  try {
    return new TextDecoder(normalized).decode(buffer);
  }
  catch {
    return new TextDecoder('utf-8').decode(buffer);
  }
}
