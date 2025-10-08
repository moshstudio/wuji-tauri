import { cachedFetch } from '@wuji-tauri/fetch';
import { LazyloadOptions } from 'vant/lib/lazyload/vue-lazyload';

async function getImageSrc(
  src: string,
  headers?: Record<string, string>,
  compress = true,
) {
  if (src.startsWith('blob:')) {
    return src;
  }
  if (src.startsWith('data:image') && src.includes('base64')) {
    // 转为blob
    async function dataURLToBlobURL(dataURL: string) {
      try {
        const response = await fetch(dataURL);
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      } catch (error) {
        console.error('image 转换失败:', error);
        throw error;
      }
    }
    return await dataURLToBlobURL(src);
  }
  if (!headers && !compress) {
    return src;
  }
  let response: Response;
  try {
    response = await cachedFetch(
      src,
      {
        headers,
        verify: false,
        maxRedirections: 0,
      },
      compress,
    );
    if (!response.ok) {
      throw new Error('maxRedirections == 0 failed');
    }
  } catch (error) {
    response = await cachedFetch(
      src,
      {
        headers,
        verify: true,
      },
      compress,
    );
  }

  const blob = await response.blob();
  if (blob.size === 0) {
    return src;
  }
  return URL.createObjectURL(
    new Blob([blob], { type: blob.type || 'image/png' }),
  );
}

export const lazyloadFilter = {
  progressive: async (listener: any, options: LazyloadOptions) => {
    const { src, headers, compress } = JSON.parse(
      listener.el.parentElement.getAttribute('data-src'),
    );
    const imageSrc = await getImageSrc(src, headers, compress);
    listener.src = imageSrc;
  },
  // webp: async (listener: any, options: LazyloadOptions) => {
  //   console.log('webp');
  //   console.log(listener, options);
  // },
};
