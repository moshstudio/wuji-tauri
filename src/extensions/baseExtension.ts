import CryptoJS from 'crypto-js';
import forge from 'node-forge';
import _ from 'lodash';
import { nanoid } from 'nanoid';
import { ClientOptions, fetch } from '@/utils/fetch';
import {
  maxPageNoFromElements,
  parseAndExecuteHtml,
  toProxyUrl,
} from '@/utils';
import { BookItem } from './book';
import { PhotoItem } from './photo';
import { urlJoin as myUrlJoin } from '@/utils';

// 定义一个装饰器工厂函数，允许传入目标类型
export function transformResult<T>(func: (result: T) => T) {
  return function (target: any, key: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        // 调用原始方法
        const result: T = await originalMethod.apply(this, args);
        return func(result);
      } catch (error) {
        console.warn(`function ${key} failed`, error);

        return null;
      }
    };

    return descriptor;
  };
}

abstract class Extension {
  cryptoJs: typeof CryptoJS;
  forge: typeof forge;
  fetch: typeof fetch;
  _: typeof _;
  fetchDom: (
    input: URL | Request | string,
    init?: RequestInit & ClientOptions,
    domType?: DOMParserSupportedType
  ) => Promise<Document>;
  queryBookElements: (
    body: Document,
    tags: {
      element?: string;
      cover?: string;
      title?: string;
      intro?: string;
      author?: string;
      tags?: string;
      status?: string;
      url?: string;
      latestChapter?: string;
      latestUpdate?: string;
    }
  ) => Promise<BookItem[]>;
  queryComicElements: (
    body: Document,
    tags: {
      element?: string;
      cover?: string;
      title?: string;
      intro?: string;
      author?: string;
      tags?: string;
      status?: string;
      url?: string;
      latestChapter?: string;
      latestUpdate?: string;
    }
  ) => Promise<BookItem[]>;
  queryPhotoElements: (
    body: Document,
    tags: {
      element?: string;
      cover?: string;
      title?: string;
      desc?: string;
      author?: string;
      datetime?: string;
      hot?: string;
      view?: string;
      url?: string;
    }
  ) => Promise<PhotoItem[]>;
  queryChapters: (
    body: Document,
    tags: {
      element?: string;
    }
  ) => Promise<{ id: string; title: string; url?: string }[]>;
  nanoid: typeof nanoid;
  urlJoin: (...parts: (string | null | undefined)[]) => string;
  maxPageNoFromElements: typeof maxPageNoFromElements;
  parseAndExecuteHtml: typeof parseAndExecuteHtml;
  toProxyUrl: typeof toProxyUrl;

  abstract id: string;
  abstract name: string;
  abstract version: string;
  abstract baseUrl: string;
  codeString?: string;

  protected constructor() {
    this.cryptoJs = CryptoJS;
    this.forge = forge;
    this._ = _;
    this.fetch = fetch;
    this.fetchDom = async (
      input: URL | Request | string,
      init?: RequestInit & ClientOptions,
      domType: DOMParserSupportedType = 'text/html'
    ) => {
      const response = await this.fetch(input, init);
      const text = await response.text();

      return new DOMParser().parseFromString(text, domType);
    };
    this.nanoid = nanoid;

    this.urlJoin = (...parts: (string | null | undefined)[]): string => {
      return myUrlJoin(parts, { baseUrl: this.baseUrl });
    };
    this.maxPageNoFromElements = maxPageNoFromElements;
    this.parseAndExecuteHtml = parseAndExecuteHtml;
    this.toProxyUrl = toProxyUrl;
    this.queryBookElements = async (
      body: Document,
      {
        element = '.bookbox',
        cover = 'img',
        title = 'h3 a',
        intro = '.intro',
        author = '.author a',
        tags = '.tags',
        status = '.status',
        url = 'a',
        latestChapter = '.latestchapter a',
        latestUpdate = '.update',
      }
    ) => {
      const elements = body.querySelectorAll(element);

      const list = [];
      for (const element of elements) {
        const img = element.querySelector(cover);
        let coverE =
          img?.getAttribute('data-original') ||
          img?.getAttribute('data-src') ||
          img?.getAttribute('src') ||
          img?.getAttribute('data-setbg');
        if (coverE) {
          if (!coverE.startsWith('http')) {
            if (coverE.startsWith('//')) {
              coverE = `https:${coverE}`;
            } else {
              coverE = this.urlJoin(this.baseUrl, coverE);
            }
          }
        }
        const titleE =
          element.querySelector(title)?.textContent ||
          element.querySelector(title)?.getAttribute('title');
        const introE = element.querySelector(intro)?.textContent;
        const authorE = element.querySelector(author)?.textContent;
        const tagsE = Array.from(element.querySelectorAll(tags).values())
          .map((item) => item.textContent)
          .filter((item): item is string => !!item);
        const statusE = element.querySelector(status)?.textContent;
        const latestChapterE =
          element.querySelector(latestChapter)?.textContent;
        const latestUpdateE = element.querySelector(latestUpdate)?.textContent;

        const urlE =
          (!url ? element.getAttribute('href') : null) ||
          element.querySelector(url)?.getAttribute('href') ||
          element.querySelector(title)?.getAttribute('href');
        if (!titleE) continue;
        list.push({
          id: urlE ? this.urlJoin(this.baseUrl, urlE) : this.nanoid(),
          title: titleE,
          intro: introE || undefined,
          cover: coverE ? this.urlJoin(this.baseUrl, coverE) : undefined,
          author: authorE || undefined,
          tags: tagsE.length
            ? tagsE.length === 1
              ? tagsE[0]
              : tagsE
            : undefined,
          status: statusE || undefined,
          latestChapter: latestChapterE || undefined,
          latestUpdate: latestUpdateE || undefined,
          url: this.urlJoin(this.baseUrl, urlE || null),
          sourceId: '',
        });
      }
      return list;
    };
    this.queryComicElements = this.queryBookElements;
    this.queryPhotoElements = async (
      body: Document,
      {
        element = '.update_area_content',
        cover = 'img',
        title = '.title',
        desc = '.desc',
        author = '.author',
        datetime = '.datetime',
        hot = '.hot',
        view = '.view',
        url = 'a',
      }
    ) => {
      const elements = body.querySelectorAll(element);
      const list = [];
      for (const element of elements) {
        const img = element.querySelector(cover);
        const coverE =
          img?.getAttribute('data-original') ||
          img?.getAttribute('data-src') ||
          img?.getAttribute('src');
        const titleE =
          element.querySelector(title)?.textContent ||
          element.querySelector(title)?.getAttribute('title') ||
          element.querySelector(title)?.getAttribute('alt');
        const descE = element.querySelector(desc)?.textContent;
        const authorE = element.querySelector(author)?.textContent;
        const datetimeE = element.querySelector(datetime)?.textContent;
        const hotE = element.querySelector(hot)?.textContent;
        const viewE = element.querySelector(view)?.textContent;
        const urlE = element.querySelector(url)?.getAttribute('href')?.trim();
        if (!titleE) continue;
        list.push({
          id: urlE ? this.urlJoin(this.baseUrl, urlE) : this.nanoid(),
          title: titleE?.trim() || '',
          desc: descE?.trim() || undefined,
          cover: coverE ? this.urlJoin(this.baseUrl, coverE) : '',
          author: authorE?.trim() || undefined,
          datetime: datetimeE?.trim() || undefined,
          hot: hotE?.trim() || undefined,
          view: Number(viewE) || undefined,
          url: this.urlJoin(this.baseUrl, urlE || null),
          sourceId: '',
        });
      }
      return list;
    };
    this.queryChapters = async (
      body: Document,
      { element = '.chapter_list a' }
    ) => {
      const elements = body.querySelectorAll(element);
      const list = [];
      for (let element of elements) {
        const href = element.getAttribute('href');
        const title =
          element.textContent?.trim() || element.getAttribute('title');
        if (href) {
          list.push({
            id: this.urlJoin(this.baseUrl, href),
            title: title || '',
            url: this.urlJoin(this.baseUrl, href),
          });
        }
      }
      return list;
    };
  }

  get hash() {
    // 由id+name+version生成，不可重复
    return this.cryptoJs.MD5(this.id + this.name + this.version).toString();
  }
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      version: this.version,
      baseUrl: this.baseUrl,
      hash: this.hash,
    };
  }
}

export { Extension };
