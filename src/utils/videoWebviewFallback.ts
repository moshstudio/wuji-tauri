import type { FetchWebviewResult } from '@/utils/webview';

export function extractPlayableUrlFromWebviewResult(
  ret: FetchWebviewResult,
): string | null {
  const resources = Array.isArray(ret?.resources) ? ret.resources : [];
  const mediaResource = resources.find((item) => {
    const rawUrl = item.url;
    if (typeof rawUrl !== 'string' || !rawUrl) {
      return false;
    }
    const lowerUrl = rawUrl.toLowerCase();
    const contentType = String(item.contentType || '').toLowerCase();
    return (
      lowerUrl.includes('.m3u8')
      || lowerUrl.includes('.mp4')
      || lowerUrl.includes('.mpd')
      || contentType.includes('application/x-mpegurl')
      || contentType.includes('application/vnd.apple.mpegurl')
      || contentType.includes('video/mp4')
      || contentType.includes('application/dash+xml')
    );
  });
  if (mediaResource?.url) {
    return mediaResource.url;
  }

  const content = String(ret?.content || '');
  if (!content) {
    return null;
  }
  const extMatch = content.match(
    /https?:\/\/[^\s"'<>\\]+?\.(m3u8|mp4|mpd)(\?[^\s"'<>\\]*)?/i,
  );
  if (extMatch?.[0]) {
    return extMatch[0];
  }
  const m3u8InQuery = content.match(
    /https?:\/\/[^\s"'<>\\]+(?:m3u8|\.m3u8)[^\s"'<>\\]*/i,
  );
  return m3u8InQuery?.[0] || null;
}
