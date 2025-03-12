import { warn, debug, trace, info, error } from '@tauri-apps/plugin-log';
import { ArtistInfo, SongUrlMap } from '@/extensions/song';
import { ClientOptions, fetch } from '@/utils/fetch';
import { onBeforeUnmount, onMounted } from 'vue';
import { showToast } from 'vant';
import _urlJoin from 'url-join';
import * as fs from 'tauri-plugin-fs-api';
// import * as dialog from '@tauri-apps/plugin-dialog';
export * from './extensionUtils';

export const DEFAULT_SOURCE_URL =
  'https://wuji.s3.bitiful.net/wuji%2Fdefault_source.json';
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 音频时间格式化换算
export const transTime = (value: number) => {
  let time = '';
  let h = parseInt(String(value / 3600));
  value %= 3600;
  let m = parseInt(String(value / 60));
  let s = parseInt(String(value % 60));
  if (h > 0) {
    time = formatTime(h + ':' + m + ':' + s);
  } else {
    time = formatTime(m + ':' + s);
  }
  return time;
};
// 格式化时间显示，补零对齐
const formatTime = (value: string) => {
  let time = '';
  let s = value.split(':');
  let i = 0;
  for (; i < s.length - 1; i++) {
    time += s[i].length == 1 ? '0' + s[i] : s[i];
    time += ':';
  }
  time += s[i].length == 1 ? '0' + s[i] : s[i];

  return time;
};

export function joinSongArtists(
  artists: ArtistInfo[] | string[] | undefined | null
): string {
  if (!artists) return '';
  return artists
    .map((artist) => {
      if (typeof artist === 'string') {
        return artist;
      }
      return artist.name;
    })
    .join(',');
}

export function songUrlToString(url: string | SongUrlMap | undefined): string {
  if (!url) return '';
  if (typeof url === 'string') {
    return url;
  } else {
    return (
      url.flac || url['320k'] || url['128k'] || url['320'] || url['128'] || ''
    );
  }
}

export function keepCNAndEN(str: string): string {
  // 使用正则表达式匹配中文和英文字符
  return str.replace(/[^\u4e00-\u9fa5a-zA-Z]/g, '');
}

export function getScrollTop(el: Element | Window): number {
  const top = 'scrollTop' in el ? el.scrollTop : el.pageYOffset;

  // iOS scroll bounce cause minus scrollTop
  return Math.max(top, 0);
}

export function setScrollTop(el: Element | Window, value: number) {
  if ('scrollTop' in el) {
    el.scrollTop = value;
  } else {
    el.scrollTo(el.scrollX, value);
  }
}

export function retryOnFalse(
  options: {
    waitTime?: number;
    maxRetries?: number;
    onSuccess?: () => void;
    onFailed?: () => void;
  } = { waitTime: 1200, maxRetries: 3 }
) {
  options.waitTime ||= 1200;
  options.maxRetries ||= 3;
  return function <T extends (...args: any[]) => Promise<boolean>>(fn: T): T {
    return async function (...args: any[]): Promise<boolean> {
      let retries = 0;
      while (retries < options.maxRetries!) {
        const result = await fn(...args);

        if (result === true) {
          options.onSuccess?.();
          return true;
        }

        retries++;
        if (retries < options.maxRetries!) {
          console.log(
            `Retry ${retries}/${options.maxRetries} after ${options.waitTime}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, options.waitTime));
        }
      }
      options.onFailed?.();
      return false;
    } as T;
  };
}

export function purifyText(text: string): string {
  // 1. 统一换行符
  text = text.replace(/\r\n|\r/g, '\n');

  // 2. 去除 HTML 标签
  text = text.replace(/<[^>]+>/g, '');

  // 3. 替换 HTML 实体
  const htmlEntities: { [key: string]: string } = {
    '&quot;': '"',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&apos;': "'",
    '&nbsp;': ' ',
    // 可以根据需要添加更多 HTML 实体
  };
  Object.keys(htmlEntities).forEach((entity) => {
    const regex = new RegExp(entity, 'g');
    text = text.replace(regex, htmlEntities[entity]);
  });

  // 4. 去除无用的文本行
  const uselessPatterns: RegExp[] = [
    /.*本章未完.*/g,
    /.*最新章节.*/g,
    /.*广告内容.*/g,
    /.*点击下一页继续阅读.*/g,
    /章节错误，点此举报/g,
    /请继续关注后续内容/g,
    /退出阅读模式/g,
    /（本章完）|（本章未完，请翻页）|.*书友群.*/g,
    /為您提供精彩小說/g,
    /.*作者：.*|\(本章完\)|PS：.*求推荐！|PS：.*求收藏！|感谢.*打赏.*|感谢.*推荐票.*|感谢.*月票.*|（.*月票.*）|（为大家的.*票加更.*）|第二更在.*/g,
    // 可以根据需要添加更多无用文本的正则表达式
  ];
  const lines = text.split('\n');
  const cleanedLines = lines.filter(
    (line) => !uselessPatterns.some((pattern) => pattern.test(line))
  );
  text = cleanedLines.join('\n');

  // 5. 去除空行
  text = text.replace(/(\n)+/g, '\n').replace(/^\n|\n$/g, '');

  // 6. 去除每行开头和结尾的多余空格
  text = text
    .split('\n')
    .map((line) => line.trim())
    .join('\n');

  return text;
}

export async function cachedFetch(
  input: URL | Request | string,
  init?: RequestInit & ClientOptions
): Promise<Response> {
  if ('caches' in window) {
    const cacheKey = input.toString();
    const cache = await caches.open('tauri-cache');
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }
    const response = await fetch(input, init);

    if (response.ok) {
      cache.put(cacheKey, response.clone());
    }
    return response;
  } else {
    const response = await fetch(input, init);
    return response;
  }
}

export function levenshteinDistance(a: string, b: string): number {
  // Levenshtein 距离越小，说明两个字符串越相似；距离越大，说明差异越大。
  const matrix = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0)
  );

  // 初始化第一行和第一列
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  // 填充矩阵
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // 删除
        matrix[i][j - 1] + 1, // 插入
        matrix[i - 1][j - 1] + cost // 替换
      );
    }
  }

  return matrix[a.length][b.length];
}

export function useElementResize(
  elementSelector: string,
  callback: (width: number, height: number) => void
) {
  let resizeObserver: ResizeObserver | null = null;

  onMounted(() => {
    const element = document.querySelector(elementSelector);
    if (element) {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          callback(width, height); // 触发回调，传递尺寸变化
        }
      });
      resizeObserver.observe(element); // 开始观察
    } else {
      console.warn(`Element with selector "${elementSelector}" not found!`);
    }
  });

  onBeforeUnmount(() => {
    if (resizeObserver) {
      resizeObserver.disconnect(); // 清理观察器
    }
  });
}

export function forwardConsoleLog() {
  function forwardConsole(
    fnName: 'log' | 'debug' | 'info' | 'warn' | 'error',
    logger: (message: string) => Promise<void>
  ) {
    const original = console[fnName];
    console[fnName] = (...args: any[]) => {
      original(...args);
      logger(JSON.stringify(args));
    };
  }

  forwardConsole('log', trace);
  forwardConsole('debug', debug);
  forwardConsole('info', info);
  forwardConsole('warn', warn);
  forwardConsole('error', error);
}

export const urlJoin = (
  parts: (string | null | undefined)[],
  option?: { baseUrl: string }
): string => {
  const filter = parts.filter((part) => part != null && part !== undefined);
  if (!filter.length) return '';
  if (filter.length === 1) {
    if (filter[0].startsWith('//')) {
      return 'http:' + filter[0];
    } else if (
      !filter[0].startsWith('http://') &&
      !filter[0].startsWith('https://')
    ) {
      if (option?.baseUrl) {
        return urlJoin([option.baseUrl, filter[0]], {
          baseUrl: option.baseUrl,
        });
      } else {
        return 'http://' + filter[0];
      }
    } else {
      return filter[0];
    }
  }
  if (filter[1].startsWith('http')) return urlJoin(filter.slice(1));

  return _urlJoin(filter);
};

export function getFileNameFromUrl(url: string, suffix?: string): string {
  // 移除 URL 中的查询参数和哈希部分
  const cleanUrl =
    decodeURIComponent(url)
      .split('http://')
      .pop()
      ?.split('https://')
      .pop()
      ?.split('?')[0]
      .split('#')[0] || url.split('?')[0].split('#')[0];

  // 尝试从 URL 中提取文件名
  const fileName = cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1);

  // 如果文件名不存在或者文件名是空的（例如 URL 以 '/' 结尾）
  if (!fileName) {
    // 生成一个随机字符串作为文件名
    const randomString = Math.random().toString(36).substring(2, 15);
    return suffix ? `${randomString}.${suffix}` : randomString;
  }

  // 检查文件名是否包含后缀
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return suffix ? `${fileName}.${suffix}` : fileName;
  }

  // 返回提取到的文件名
  return fileName;
}

async function streamToUint8Array(
  stream: ReadableStream<Uint8Array>
): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(value);
    totalLength += value.length;
  }

  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

export async function downloadFile(
  url: string,
  options?: {
    headers?: Record<string, string>;
    filename?: string;
    suffix?: string;
  }
): Promise<boolean> {
  try {
    // const path = await dialog.save({
    //   filters: [
    //     {
    //       name: 'My Filter',
    //       extensions: ['png', 'jpeg'],
    //     },
    //   ],
    // });
    // console.log(path);
    url = urlJoin([url]);
    let response = await fetch(url, {
      headers: options?.headers,
      verify: false,
    });

    if (response.status === 403) {
      if (response.url !== url) {
        // 说明进行了url跳转
        return await downloadFile(response.url, options);
      }
    }
    if (!response.ok) {
      console.error('文件下载失败:', response.status, response.statusText);
      showToast(response.statusText);
      return false;
    }
    const blob = await response.blob();
    const filename =
      options?.filename || getFileNameFromUrl(url, options?.suffix);

    if (!(await fs.exists('', { baseDir: fs.BaseDirectory.Download }))) {
      await fs.mkdir('', {
        baseDir: fs.BaseDirectory.Download,
        recursive: true,
      });
    }

    let file: fs.FileHandle;
    if (!(await fs.exists(filename, { baseDir: fs.BaseDirectory.Download }))) {
      file = await fs.open(filename, {
        write: true,
        create: true,
        baseDir: fs.BaseDirectory.Download,
      });
    } else {
      file = await fs.open(filename, {
        write: true,
        baseDir: fs.BaseDirectory.Download,
      });
    }

    await file.write(await streamToUint8Array(await blob.stream()));
    await file.close();
    return true;
  } catch (error) {
    console.error('文件下载失败:', error);
    showToast('文件下载失败');
    return false;
  }
}

export function sanitizePathName(
  folderName: string,
  options: { removeSpaces?: boolean; maxLength?: number } = {}
): string {
  const { removeSpaces = true, maxLength = 255 } = options;

  // 定义非法字符的正则表达式
  const illegalChars = /[<>:"/\\|?*\x00-\x1F]/g;

  // 替换非法字符为空字符串
  let sanitizedName = folderName.replace(illegalChars, '');

  // 如果选项要求去除空格，则去除所有空格
  if (removeSpaces) {
    sanitizedName = sanitizedName.replace(/\s+/g, '');
  }

  // 去除首尾空格和点（某些操作系统不允许文件夹以点开头或结尾）
  sanitizedName = sanitizedName.replace(/^[\s.]+|[\s.]+$/g, '');

  // 确保文件夹名称长度不超过最大长度限制
  if (sanitizedName.length > maxLength) {
    sanitizedName = sanitizedName.substring(0, maxLength);
  }

  return sanitizedName;
}
