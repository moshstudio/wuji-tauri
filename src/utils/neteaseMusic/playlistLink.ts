/** 从网易云歌单分享链接或纯数字 ID 中解析歌单 ID */
export function extractNeteasePlaylistId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed)
    return null;

  if (/^\d+$/.test(trimmed))
    return trimmed;

  const urlMatch = trimmed.match(/https?:\/\/\S+/);
  const urlStr = urlMatch ? urlMatch[0] : trimmed;

  try {
    const url = new URL(urlStr);
    const id = url.searchParams.get('id');
    if (id && /^\d+$/.test(id))
      return id;

    const hashQuery = url.hash.includes('?') ? url.hash.split('?')[1] : '';
    if (hashQuery) {
      const hashId = new URLSearchParams(hashQuery).get('id');
      if (hashId && /^\d+$/.test(hashId))
        return hashId;
    }
  }
  catch {
    const match = trimmed.match(/[?&]id=(\d+)/);
    if (match)
      return match[1];
  }

  return null;
}
