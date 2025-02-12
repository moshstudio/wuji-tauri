import CryptoJS from 'crypto-js';
import urlJoin from 'url-join';
import { nanoid } from 'nanoid';
import { fetch } from '@/utils/fetch';
import {
  maxPageNoFromElements,
  parseAndExecuteHtml,
  toProxyUrl,
} from '@/utils';
import { BookChapter, BookItem } from './book';
import { PhotoItem } from './photo';

abstract class Extension {
  cryptoJs: typeof CryptoJS;
  fetch: typeof fetch;
  fetchDom: (
    input: URL | Request | string,
    init?: RequestInit & { verify?: boolean },
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
    this.fetch = fetch;
    this.fetchDom = async (
      input: URL | Request | string,
      init?: RequestInit & { verify?: boolean },
      domType: DOMParserSupportedType = 'text/html'
    ) => {
      init = init || {};
      init.headers = new Headers(init.headers || {});
      init.headers.set(
        'User-Agent',
        init.headers.get('User-Agent') ||
          init.headers.get('user-agent') ||
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
      );
      const response = await this.fetch(input, init);
      const text = await response.text();

      return new DOMParser().parseFromString(text, domType);
    };
    this.nanoid = nanoid;

    this.urlJoin = (...parts: (string | null | undefined)[]): string => {
      const filter = parts.filter((part) => part != null && part !== undefined);
      if (!filter.length) return '';
      if (filter.length === 1) return filter[0];
      if (filter[1].startsWith('http')) return this.urlJoin(...filter.slice(1));
      return urlJoin(...filter);
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
        const coverE =
          img?.getAttribute('data-original') ||
          img?.getAttribute('data-src') ||
          img?.getAttribute('src');
        const titleE =
          element.querySelector(title)?.textContent ||
          element.querySelector(title)?.getAttribute('title');
        const introE = element.querySelector(intro)?.textContent;
        const authorE = element.querySelector(author)?.textContent;
        const tagsE = element.querySelector(tags)?.textContent;
        const statusE = element.querySelector(status)?.textContent;
        const latestChapterE =
          element.querySelector(latestChapter)?.textContent;
        const latestUpdateE = element.querySelector(latestUpdate)?.textContent;

        const urlE = element.querySelector(url)?.getAttribute('href');
        if (!titleE) continue;
        list.push({
          id: urlE || this.nanoid(),
          title: titleE,
          intro: introE || undefined,
          cover: coverE || undefined,
          author: authorE || undefined,
          tags: tagsE || undefined,
          status: statusE || undefined,
          latestChapter: latestChapterE || undefined,
          latestUpdate: latestUpdateE || undefined,
          url: this.urlJoin(this.baseUrl, urlE || null),
          sourceId: '',
        });
      }
      return list;
    };
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
          element.querySelector(title)?.getAttribute('title');
        const descE = element.querySelector(desc)?.textContent;
        const authorE = element.querySelector(author)?.textContent;
        const datetimeE = element.querySelector(datetime)?.textContent;
        const hotE = element.querySelector(hot)?.textContent;
        const viewE = element.querySelector(view)?.textContent;
        const urlE = element.querySelector(url)?.getAttribute('href');
        if (!titleE) continue;
        list.push({
          id: urlE?.trim() || this.nanoid(),
          title: titleE?.trim() || '',
          desc: descE?.trim() || undefined,
          cover: coverE?.trim() || '',
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
