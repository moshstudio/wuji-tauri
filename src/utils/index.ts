import type { SongUrlMap } from '@wuji-tauri/source-extension';
import * as fs from '@tauri-apps/plugin-fs';
import { debug, error, info, trace, warn } from '@tauri-apps/plugin-log';
import { fetch } from '@wuji-tauri/fetch';
import * as commands from 'tauri-plugin-commands-api';
import _urlJoin from 'url-join';
import { showToast } from 'vant';
import { onBeforeUnmount, onMounted } from 'vue';
import { useDisplayStore } from '@/store';
import { useClipboard } from '@vueuse/core';
// import * as dialog from '@tauri-apps/plugin-dialog';
export * from './extensionUtils';

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 音频时间格式化换算
export function transTime(value: number) {
  let time = '';
  const h = Number.parseInt(String(value / 3600));
  value %= 3600;
  const m = Number.parseInt(String(value / 60));
  const s = Number.parseInt(String(value % 60));
  if (h > 0) {
    time = formatTime(`${h}:${m}:${s}`);
  } else {
    time = formatTime(`${m}:${s}`);
  }
  return time;
}
// 格式化时间显示，补零对齐
function formatTime(value: string) {
  let time = '';
  const s = value.split(':');
  let i = 0;
  for (; i < s.length - 1; i++) {
    time += s[i].length == 1 ? `0${s[i]}` : s[i];
    time += ':';
  }
  time += s[i].length == 1 ? `0${s[i]}` : s[i];

  return time;
}

// export function joinSongArtists(
//   artists: ArtistInfo[] | string[] | undefined | null,
// ): string {
//   if (!artists) return '';
//   return artists
//     .map((artist) => {
//       if (!artist) return '';
//       if (typeof artist === 'string') {
//         return artist;
//       }
//       return artist.name;
//     })
//     .join(',');
// }

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
  return str.replace(/[^\u4E00-\u9FA5a-z]/gi, '');
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
  } = { waitTime: 1200, maxRetries: 3 },
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
            `Retry ${retries}/${options.maxRetries} after ${options.waitTime}ms...`,
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
  text = text.replace(/\r\n|\\n|\r/g, '\n');

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
    (line) => !uselessPatterns.some((pattern) => pattern.test(line)),
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

export function useElementResize(
  elementSelector: string,
  callback: (width: number, height: number) => void,
) {
  let observer: ResizeObserver | null = null;
  let currentElement: Element | null = null;

  // 处理大小变化
  const handleResize = (entries: ResizeObserverEntry[]) => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      if (width === 0 && height === 0) {
        // 元素可能被隐藏，跳过
        continue;
      }
      callback(width, height);
    }
  };

  // 初始化观察器
  const initObserver = () => {
    observer = new ResizeObserver(handleResize);
    observeCurrentElement();
  };

  // 观察当前元素
  const observeCurrentElement = () => {
    const element = document.querySelector(elementSelector);
    if (element) {
      if (element !== currentElement) {
        // 如果元素变化了，先取消旧元素的观察
        if (currentElement && observer) {
          observer.unobserve(currentElement);
        }
        currentElement = element;
        observer?.observe(element);
        // 立即触发一次回调
        const rect = element.getBoundingClientRect();
        callback(rect.width, rect.height);
      }
    } else {
      // console.warn(`元素 "${elementSelector}" 未找到!`);
    }
  };

  onMounted(() => {
    initObserver();

    // 使用MutationObserver监听DOM变化，以便在元素被替换时重新观察
    const mutationObserver = new MutationObserver(() => {
      observeCurrentElement();
    });

    // 监听整个文档的DOM变化
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    onBeforeUnmount(() => {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      mutationObserver.disconnect();
      currentElement = null;
    });
  });
}

export function forwardConsoleLog() {
  function forwardConsole(
    fnName: 'log' | 'debug' | 'info' | 'warn' | 'error',
    logger: (message: string) => Promise<void>,
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

export function urlJoin(
  parts: (string | null | undefined)[],
  option?: { baseUrl: string },
): string {
  const filter = parts.filter((part) => part != null && part !== undefined);
  if (!filter.length) return '';
  if (filter.length === 1) {
    if (filter[0].startsWith('//')) {
      return `http:${filter[0]}`;
    } else if (
      !filter[0].startsWith('http://') &&
      !filter[0].startsWith('https://')
    ) {
      if (option?.baseUrl) {
        return urlJoin([option.baseUrl, filter[0]], {
          baseUrl: option.baseUrl,
        });
      } else {
        return `http://${filter[0]}`;
      }
    } else {
      return filter[0];
    }
  }
  if (filter[1].startsWith('http')) return urlJoin(filter.slice(1));
  if (filter[1].startsWith('../')) {
    // 适配，返回一级
    filter[0] = filter[0].split('/').slice(0, -1).join('/');
    filter[1] = filter[1].substring(2);
    return urlJoin(filter);
  }

  return _urlJoin(filter);
}

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
  stream: ReadableStream<Uint8Array>,
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
    baseDir?: fs.BaseDirectory;
  },
): Promise<boolean> {
  try {
    url = urlJoin([url]);
    const response = await fetch(url, {
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
    const filename =
      options?.filename || getFileNameFromUrl(url, options?.suffix);

    const displayStore = useDisplayStore();
    if (displayStore.isAndroid) {
      const res = await commands.save_file(
        options?.baseDir || fs.BaseDirectory.Download,
        filename,
        new Uint8Array(await response.arrayBuffer()),
        '无极',
      );
      console.log('android download file 返回结果', res);

      return true;
    } else {
      const blob = await response.blob();
      if (!(await fs.exists('', { baseDir: fs.BaseDirectory.Download }))) {
        await fs.mkdir('', {
          baseDir: fs.BaseDirectory.Download,
          recursive: true,
        });
      }

      let file: fs.FileHandle;
      if (
        !(await fs.exists(filename, { baseDir: fs.BaseDirectory.Download }))
      ) {
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

      await file.write(await streamToUint8Array(blob.stream()));
      await file.close();
      return true;
    }
  } catch (error) {
    console.error('文件下载失败:', error);
    showToast('文件下载失败');
    return false;
  }
}

export function sanitizePathName(
  folderName: string,
  options: { removeSpaces?: boolean; maxLength?: number } = {},
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

export function estimateJsonSize(obj: any): number {
  const jsonString = JSON.stringify(obj);
  const encoder = new TextEncoder();
  const encoded = encoder.encode(jsonString);
  return encoded.length; // 返回字节数
}

export function bytesToSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const base = 1024;

  // 计算单位级别
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(base)),
    units.length - 1,
  );
  const size = bytes / base ** exponent;

  // 保留两位小数，但整数不显示小数
  return `${size.toFixed(2).replace(/\.00$/, '')} ${units[exponent]}`;
}

export function updateReactive<T extends object>(
  target: T,
  updates: Partial<T>,
) {
  Object.assign(target, updates);
}

export function copyText(text: string) {
  const clipboard = useClipboard();
  if (clipboard.isSupported) {
    clipboard.copy(text);
    showToast('复制成功');
  } else {
    showToast('复制失败');
  }
}
