import { cachedFetch } from '@wuji-tauri/fetch';

/**
 * 经 Tauri fetch 代理拉取图片（带源站 headers / 跳过证书校验），
 * 转成 data URL。安卓 MediaSession 不支持 blob:，只认 http / file / base64。
 */
export async function loadProxiedImageDataUrl(
  src: string,
  headers?: Record<string, string>,
): Promise<string | undefined> {
  if (!src)
    return undefined;
  if (src.startsWith('data:') && src.includes('base64'))
    return src;

  let response: Response;
  try {
    response = await cachedFetch(
      src,
      {
        headers,
        verify: false,
        maxRedirections: 0,
      },
      true,
    );
    if (!response.ok)
      throw new Error('cover fetch failed');
  }
  catch {
    response = await cachedFetch(
      src,
      {
        headers,
        verify: true,
      },
      true,
    );
  }
  if (!response.ok)
    return undefined;

  const blob = await response.blob();
  if (!blob.size)
    return undefined;

  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
