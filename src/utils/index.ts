import { ArtistInfo } from "@/extensions/song";
import { showNotify } from "vant";
import { fetch } from "@tauri-apps/plugin-http";
export * from "./extensionUtils";

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 音频时间格式化换算
export const transTime = (value: number) => {
  let time = "";
  let h = parseInt(String(value / 3600));
  value %= 3600;
  let m = parseInt(String(value / 60));
  let s = parseInt(String(value % 60));
  if (h > 0) {
    time = formatTime(h + ":" + m + ":" + s);
  } else {
    time = formatTime(m + ":" + s);
  }
  return time;
};
// 格式化时间显示，补零对齐
const formatTime = (value: string) => {
  let time = "";
  let s = value.split(":");
  let i = 0;
  for (; i < s.length - 1; i++) {
    time += s[i].length == 1 ? "0" + s[i] : s[i];
    time += ":";
  }
  time += s[i].length == 1 ? "0" + s[i] : s[i];

  return time;
};

export function joinSongArtists(
  artists: ArtistInfo[] | string[] | undefined | null
): string {
  if (!artists) return "";
  return artists
    .map((artist) => {
      if (typeof artist === "string") {
        return artist;
      }
      return artist.name;
    })
    .join(",");
}

export function keepCNAndEN(str: string): string {
  // 使用正则表达式匹配中文和英文字符
  return str.replace(/[^\u4e00-\u9fa5a-zA-Z]/g, "");
}

export function getScrollTop(el: Element | Window): number {
  const top = "scrollTop" in el ? el.scrollTop : el.pageYOffset;

  // iOS scroll bounce cause minus scrollTop
  return Math.max(top, 0);
}

export function setScrollTop(el: Element | Window, value: number) {
  if ("scrollTop" in el) {
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
  } = { waitTime: 1000, maxRetries: 3 }
) {
  options.waitTime ||= 1100;
  options.maxRetries ||= 2;
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
  text = text.replace(/\r\n|\r/g, "\n");

  // 2. 去除 HTML 标签
  text = text.replace(/<[^>]+>/g, "");

  // 3. 替换 HTML 实体
  const htmlEntities: { [key: string]: string } = {
    "&quot;": '"',
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&apos;": "'",
    "&nbsp;": " ",
    // 可以根据需要添加更多 HTML 实体
  };
  Object.keys(htmlEntities).forEach((entity) => {
    const regex = new RegExp(entity, "g");
    text = text.replace(regex, htmlEntities[entity]);
  });

  // 4. 去除无用的文本行
  const uselessPatterns: RegExp[] = [
    /本章未完，点击下一页继续阅读/g,
    /广告内容/g,
    /章节错误，点此举报/g,
    /请继续关注后续内容/g,
    /退出阅读模式/g,
    // 可以根据需要添加更多无用文本的正则表达式
  ];
  const lines = text.split("\n");
  const cleanedLines = lines.filter(
    (line) => !uselessPatterns.some((pattern) => pattern.test(line))
  );
  text = cleanedLines.join("\n");

  // 5. 去除空行
  text = text.replace(/(\n)+/g, "\n").replace(/^\n|\n$/g, "");

  // 6. 去除每行开头和结尾的多余空格
  text = text
    .split("\n")
    .map((line) => line.trim())
    .join("\n");

  return text;
}

export async function cachedFetch(
  url: URL | string,
  init?: RequestInit
): Promise<Response> {
  const cacheKey = url.toString();
  const cache = await caches.open("tauri-cache");
  const cachedResponse = await cache.match(cacheKey);

  if (cachedResponse) {
    return cachedResponse;
  }

  const response = await fetch(url, init);

  if (response.ok) {
    cache.put(cacheKey, response.clone());
  }
  return response.clone();
}