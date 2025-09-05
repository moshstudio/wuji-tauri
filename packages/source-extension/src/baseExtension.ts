import type { ClientOptions } from '@wuji-tauri/fetch';
import type { BookItem } from './book';
import type { ComicItem } from './comic';
import type { PhotoItem } from './photo';
import type { PlaylistInfo, SongInfo } from './song';
import type { VideoItem } from './video';
import { fetch } from '@wuji-tauri/fetch';
import CryptoJS from 'crypto-js';
import * as iconv from 'iconv-lite';
import _ from 'lodash';
import * as m3u8Parser from 'm3u8-parser';
import { nanoid } from 'nanoid';
import forge from 'node-forge';
import {
  maxPageNoFromElements,
  urlJoin as myUrlJoin,
} from './utils/element.ts';
import { getM3u8ProxyUrl, getProxyUrl } from './utils/proxy.ts';

// 定义一个装饰器工厂函数，允许传入目标类型
export function transformResult<T>(func: (result: T) => T) {
  return function (_target: any, key: string, descriptor: PropertyDescriptor) {
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
  iconv: typeof iconv;
  m3u8Parser: typeof m3u8Parser;
  getProxyUrl: typeof getProxyUrl;
  getM3u8ProxyUrl: typeof getM3u8ProxyUrl;
  _: typeof _;
  fetchDom: (
    input: URL | Request | string,
    init?: RequestInit & ClientOptions,
    domType?: DOMParserSupportedType,
    encoding?: 'utf8' | 'gbk',
  ) => Promise<Document>;

  queryBookElements: (
    body: Document,
    tags: {
      element?: string;
      cover?: string;
      coverHeaders?: Record<string, string>;
      title?: string;
      intro?: string;
      author?: string;
      tags?: string;
      status?: string;
      url?: string;
      latestChapter?: string;
      latestUpdate?: string;
      coverDomain?: string;
    },
  ) => Promise<BookItem[]>;

  queryComicElements: (
    body: Document,
    tags: {
      element?: string;
      cover?: string;
      coverHeaders?: Record<string, string>;
      title?: string;
      intro?: string;
      author?: string;
      tags?: string;
      status?: string;
      url?: string;
      latestChapter?: string;
      latestUpdate?: string;
    },
  ) => Promise<ComicItem[]>;

  queryVideoElements: (
    body: Document,
    tags: {
      element?: string;
      cover?: string;
      coverHeaders?: Record<string, string>;
      title?: string;
      intro?: string;
      releaseDate?: string;
      country?: string;
      duration?: string;
      director?: string;
      cast?: string;
      tags?: string;
      status?: string;
      url?: string;
      latestUpdate?: string;
      coverDomain?: string;
      baseUrl?: string;
    },
  ) => Promise<VideoItem[]>;

  queryPhotoElements: (
    body: Document,
    tags: {
      element?: string;
      cover?: string;
      coverHeaders?: Record<string, string>;
      title?: string;
      desc?: string;
      author?: string;
      datetime?: string;
      hot?: string;
      view?: string;
      url?: string;
      coverDomain?: string;
    },
  ) => Promise<PhotoItem[]>;

  queryPlaylistElements: (
    body: Document,
    tags: {
      element?: string;
      picUrl?: string;
      picHeaders?: Record<string, string>;
      name?: string;
      desc?: string;
      creator?: string;
      createTime?: string;
      updateTime?: string;
      url?: string;
      coverDomain?: string;
    },
  ) => Promise<PlaylistInfo[]>;

  querySongElements: (
    body: Document,
    tags: {
      element?: string;
      picUrl?: string;
      picHeaders?: Record<string, string>;
      name?: string;
      artists?: string;
      duration?: string;
      url?: string;
      playUrl?: string;
      lyric?: string;
      coverDomain?: string;
    },
  ) => Promise<SongInfo[]>;

  queryChapters: (
    body: Document,
    tags: {
      element?: string;
    },
  ) => Promise<{ id: string; title: string; url?: string }[]>;

  getContentText: (element?: HTMLElement) => string | null;
  nanoid: typeof nanoid;
  urlJoin: (...parts: (string | null | undefined)[]) => string;
  maxPageNoFromElements: typeof maxPageNoFromElements;
  log: (...args: any[]) => void;

  abstract id: string;
  abstract name: string;
  abstract version: string;
  abstract baseUrl: string;
  codeString?: string;

  protected constructor() {
    this.log = console.log;
    this.cryptoJs = CryptoJS;
    this.forge = forge;
    this.iconv = iconv;
    this.m3u8Parser = m3u8Parser;
    this.getProxyUrl = getProxyUrl;
    this.getM3u8ProxyUrl = getM3u8ProxyUrl;
    this._ = _;
    this.fetch = fetch;
    this.fetchDom = async (
      input: URL | Request | string,
      init?: RequestInit & ClientOptions,
      domType?: DOMParserSupportedType,
      encoding?: 'utf8' | 'gbk',
    ) => {
      let maxRetry = 3;
      while (maxRetry > 0) {
        const response = await this.fetch(input, init);
        if (response.status >= 300) {
          maxRetry -= 1;
          if (maxRetry > 0) {
            continue;
          } else {
            const text = await response.text();
            console.log(`fetch error: ${response.status} ${text}`);
            throw new Error(`fetch error: ${response.status} ${text}`);
          }
        } else {
          const buffer = await response.arrayBuffer();
          const text = new TextDecoder(encoding || 'utf8').decode(buffer);
          return new DOMParser().parseFromString(text, domType || 'text/html');
        }
      }
      throw new Error(`fetch error: ${input.toString()} `);
    };
    this.nanoid = nanoid;

    this.urlJoin = (...parts: (string | null | undefined)[]): string => {
      return myUrlJoin(parts, { baseUrl: this.baseUrl });
    };
    this.maxPageNoFromElements = maxPageNoFromElements;
    this.queryBookElements = async (
      body: Document,
      {
        element = '.bookbox',
        cover = 'img',
        coverHeaders = undefined,
        title = 'h3 a',
        intro = '.intro',
        author = '.author a',
        tags = '.tags',
        status = '.status',
        url = 'a',
        latestChapter = '.latestchapter a',
        latestUpdate = '.update',
        coverDomain = undefined,
      },
    ) => {
      const elements = body.querySelectorAll(element);

      const list = [];
      for (const element of elements) {
        const img = element.querySelector(cover);
        let coverE =
          img?.getAttribute('data-original') ||
          img?.getAttribute('data-src') ||
          img?.getAttribute('src') ||
          img?.getAttribute('data-setbg') ||
          (img as HTMLElement)?.style.backgroundImage?.replace(
            /url\(["']?(.*?)["']?\)/,
            '$1',
          );

        if (coverE) {
          if (!coverE.startsWith('http')) {
            if (coverE.startsWith('//')) {
              coverE = `https:${coverE}`;
            } else if (coverE.startsWith('data:')) {
              try {
                const response = await window.fetch(coverE);
                const blob = await response.blob();
                coverE = URL.createObjectURL(blob);
              } catch (error) {
                console.log('parse b64 cover failed:', coverE);
              }
            } else {
              coverE = this.urlJoin(coverDomain ?? this.baseUrl, coverE);
            }
          }
        }
        const _titleE = title ? element.querySelector(title) : element;
        const titleE = _titleE?.textContent || _titleE?.getAttribute('title');
        const introE = element.querySelector(intro)?.textContent;
        const authorE = element.querySelector(author)?.textContent;
        const tagsE = Array.from(element.querySelectorAll(tags).values())
          .map((item) => item.textContent)
          .filter((item): item is string => !!item);
        const statusE = element.querySelector(status)?.textContent;
        const latestChapterE =
          element.querySelector(latestChapter)?.textContent;
        const latestUpdateE = element.querySelector(latestUpdate)?.textContent;

        const _urlE = url ? element.querySelector(url) : element;
        const urlE = _urlE?.getAttribute('href') || _urlE?.getAttribute('href');
        if (!titleE?.trim() || !urlE) {
          continue;
        }
        list.push({
          id: this.urlJoin(this.baseUrl, urlE),
          title: titleE.trim(),
          intro: introE?.trim() || undefined,
          cover: coverE ? this.urlJoin(this.baseUrl, coverE) : undefined,
          coverHeaders,
          author: authorE?.trim() || undefined,
          tags: tagsE.length
            ? tagsE.length === 1
              ? tagsE[0]
              : tagsE
            : undefined,
          status: statusE?.trim() || undefined,
          latestChapter: latestChapterE?.trim() || undefined,
          latestUpdate: latestUpdateE?.trim() || undefined,
          url: this.urlJoin(this.baseUrl, urlE),
          sourceId: '',
        });
      }
      return list;
    };
    this.queryComicElements = this.queryBookElements;
    this.queryVideoElements = async (
      body: Document,
      {
        element = '.bookbox',
        cover = 'img',
        title = 'h3 a',
        intro = '.intro',
        releaseDate = '.year',
        country = '.area',
        duration = '.time',
        director = '.director',
        cast = '.actor',
        tags = '.tags',
        status = '.status',
        url = 'a',
        latestUpdate = '.update',
        coverDomain = undefined,
        coverHeaders = undefined,
        baseUrl = undefined,
      },
    ) => {
      const elements = body.querySelectorAll(element);

      const list = [];
      for (const element of elements) {
        const img = element.querySelector(cover);
        let coverE =
          img?.getAttribute('data-original') ||
          img?.getAttribute('data-src') ||
          img?.getAttribute('src') ||
          img?.getAttribute('data-setbg') ||
          (img as HTMLElement)?.style.backgroundImage?.replace(
            /url\(["']?(.*?)["']?\)/,
            '$1',
          );

        if (coverE) {
          if (!coverE.startsWith('http')) {
            if (coverE.startsWith('//')) {
              coverE = `https:${coverE}`;
            } else if (coverE.startsWith('data:')) {
              try {
                const response = await window.fetch(coverE);
                const blob = await response.blob();
                coverE = URL.createObjectURL(blob);
              } catch (error) {
                console.log('parse b64 cover failed:', coverE);
              }
            } else {
              coverE = this.urlJoin(
                coverDomain ?? baseUrl ?? this.baseUrl,
                coverE,
              );
            }
          }
        }
        const _titleE = title ? element.querySelector(title) : element;
        const titleE = _titleE?.textContent || _titleE?.getAttribute('title');
        const introE = element.querySelector(intro)?.textContent;
        const releaseDateE = element.querySelector(releaseDate)?.textContent;
        const countryE = element.querySelector(country)?.textContent;
        const durationE = element.querySelector(duration)?.textContent;
        const directorE = element.querySelector(director)?.textContent;
        const castE = element.querySelector(cast)?.textContent;
        const tagsE = Array.from(element.querySelectorAll(tags).values())
          .map((item) => item.textContent)
          .filter((item): item is string => !!item);
        const statusE = element.querySelector(status)?.textContent;
        const latestUpdateE = element.querySelector(latestUpdate)?.textContent;

        const _urlE = url ? element.querySelector(url) : element;
        const urlE = _urlE?.getAttribute('href') || _urlE?.getAttribute('href');
        if (!titleE?.trim() || !urlE) {
          continue;
        }
        list.push({
          id: this.urlJoin(baseUrl ?? this.baseUrl, urlE),
          title: titleE.trim(),
          intro: introE?.trim() || undefined,
          cover: coverE
            ? this.urlJoin(baseUrl ?? this.baseUrl, coverE)
            : undefined,
          coverHeaders,
          releaseDate: releaseDateE?.trim() || undefined,
          country: countryE?.trim() || undefined,
          duration: durationE?.trim() || undefined,
          director: directorE?.trim() || undefined,
          cast: castE?.trim() || undefined,
          tags: tagsE.length
            ? tagsE.length === 1
              ? tagsE[0]
              : tagsE
            : undefined,
          status: statusE?.trim() || undefined,
          latestUpdate: latestUpdateE?.trim() || undefined,
          url: this.urlJoin(baseUrl ?? this.baseUrl, urlE),
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
        coverHeaders = undefined,
        title = '.title',
        desc = '.desc',
        author = '.author',
        datetime = '.datetime',
        hot = '.hot',
        view = '.view',
        url = 'a',
        coverDomain = undefined,
      },
    ) => {
      const elements = body.querySelectorAll(element);
      const list = [];
      for (const element of elements) {
        const img = element.querySelector(cover);
        let coverE =
          img?.getAttribute('data-original') ||
          img?.getAttribute('data-src') ||
          img?.getAttribute('src') ||
          img?.getAttribute('data-setbg') ||
          (img as HTMLElement)?.style.backgroundImage?.replace(
            /url\(["']?(.*?)["']?\)/,
            '$1',
          );
        if (coverE) {
          if (!coverE.startsWith('http')) {
            if (coverE.startsWith('//')) {
              coverE = `https:${coverE}`;
            } else if (coverE.startsWith('data:')) {
              try {
                const response = await window.fetch(coverE);
                const blob = await response.blob();
                coverE = URL.createObjectURL(blob);
              } catch (error) {
                console.log('parse b64 cover failed:', coverE);
              }
            } else {
              coverE = this.urlJoin(
                coverDomain ?? this.baseUrl ?? this.baseUrl,
                coverE,
              );
            }
          }
        }
        const _titleE = title ? element.querySelector(title) : element;
        const titleE =
          _titleE?.textContent ||
          _titleE?.getAttribute('title') ||
          _titleE?.getAttribute('alt');
        const descE = element.querySelector(desc)?.textContent;
        const authorE = element.querySelector(author)?.textContent;
        const datetimeE = element.querySelector(datetime)?.textContent;
        const hotE = element.querySelector(hot)?.textContent;
        const viewE = element.querySelector(view)?.textContent;
        const _urlE = url ? element.querySelector(url) : element;
        const urlE = _urlE?.getAttribute('href')?.trim();
        if (!urlE) {
          continue;
        }
        list.push({
          id: this.urlJoin(this.baseUrl, urlE),
          title: titleE?.trim() || '',
          desc: descE?.trim() || undefined,
          cover: coverE
            ? this.urlJoin(coverDomain ?? this.baseUrl, coverE)
            : '',
          coverHeaders,
          author: authorE?.trim() || undefined,
          datetime: datetimeE?.trim() || undefined,
          hot: hotE?.trim() || undefined,
          view: Number(viewE) || undefined,
          url: this.urlJoin(this.baseUrl, urlE),
          sourceId: '',
        });
      }
      return list;
    };
    this.queryPlaylistElements = async (
      body: Document,
      {
        element = '.update_area_content',
        picUrl = 'img',
        picHeaders = undefined,
        name = 'a[href]',
        desc = '.desc',
        creator = '.author',
        createTime = '.datetime',
        updateTime = '.datetime',
        url = 'a[href]',
        coverDomain = undefined,
      },
    ) => {
      const elements = body.querySelectorAll(element);
      const list = [];
      for (const element of elements) {
        const img = element.querySelector(picUrl);
        let coverE =
          img?.getAttribute('data-original') ||
          img?.getAttribute('data-src') ||
          img?.getAttribute('src') ||
          img?.getAttribute('data-setbg') ||
          (img as HTMLElement)?.style.backgroundImage?.replace(
            /url\(["']?(.*?)["']?\)/,
            '$1',
          );
        if (coverE) {
          if (!coverE.startsWith('http')) {
            if (coverE.startsWith('//')) {
              coverE = `https:${coverE}`;
            } else if (coverE.startsWith('data:')) {
              try {
                const response = await window.fetch(coverE);
                const blob = await response.blob();
                coverE = URL.createObjectURL(blob);
              } catch (error) {
                console.log('parse b64 cover failed:', coverE);
              }
            } else {
              coverE = this.urlJoin(
                coverDomain ?? this.baseUrl ?? this.baseUrl,
                coverE,
              );
            }
          }
        }
        const _titleE = name ? element.querySelector(name) : element;
        const titleE =
          _titleE?.textContent ||
          _titleE?.getAttribute('title') ||
          _titleE?.getAttribute('alt');
        const descE = element.querySelector(desc)?.textContent;
        const authorE = element.querySelector(creator)?.textContent;
        const datetimeE = element.querySelector(createTime)?.textContent;
        const updateTimeE = element.querySelector(updateTime)?.textContent;
        const _urlE = url ? element.querySelector(url) : element;
        const urlE = _urlE?.getAttribute('href')?.trim();
        if (!titleE?.trim() || !urlE) {
          continue;
        }
        list.push({
          id: this.urlJoin(this.baseUrl, urlE),
          name: titleE.trim(),
          desc: descE?.trim() || undefined,
          picUrl: coverE
            ? this.urlJoin(coverDomain ?? this.baseUrl, coverE)
            : '',
          picHeaders,
          creator: authorE?.trim() ? { name: authorE.trim() } : undefined,
          createTime: datetimeE?.trim() || undefined,
          updateTime: updateTimeE?.trim() || undefined,
          url: this.urlJoin(this.baseUrl, urlE),
          sourceId: '',
        });
      }
      return list;
    };
    this.querySongElements = async (
      body: Document,
      {
        element = '.update_area_content',
        picUrl = 'img',
        picHeaders = undefined,
        name = 'a[title]',
        artists = '.artist',
        duration = '.duration',
        url = 'a[href]',
        playUrl = '.play-url',
        lyric = '.lyric',
        coverDomain = undefined,
      },
    ) => {
      const elements = body.querySelectorAll(element);
      const list = [];
      for (const element of elements) {
        const img = element.querySelector(picUrl);
        let coverE =
          img?.getAttribute('data-original') ||
          img?.getAttribute('data-src') ||
          img?.getAttribute('src') ||
          img?.getAttribute('data-setbg') ||
          (img as HTMLElement)?.style.backgroundImage?.replace(
            /url\(["']?(.*?)["']?\)/,
            '$1',
          );
        if (coverE) {
          if (!coverE.startsWith('http')) {
            if (coverE.startsWith('//')) {
              coverE = `https:${coverE}`;
            } else if (coverE.startsWith('data:')) {
              try {
                const response = await window.fetch(coverE);
                const blob = await response.blob();
                coverE = URL.createObjectURL(blob);
              } catch (error) {
                console.log('parse b64 cover failed:', coverE);
              }
            } else {
              coverE = this.urlJoin(
                coverDomain ?? this.baseUrl ?? this.baseUrl,
                coverE,
              );
            }
          }
        }
        const _titleE = name ? element.querySelector(name) : element;
        const titleE =
          _titleE?.textContent ||
          _titleE?.getAttribute('title') ||
          _titleE?.getAttribute('alt');
        const authorE = Array.from(element.querySelectorAll(artists).values());
        const durationE = element.querySelector(duration)?.textContent;
        const lyricE = element.querySelector(lyric)?.textContent;
        const _urlE = url ? element.querySelector(url) : element;
        const urlE = _urlE?.getAttribute('href')?.trim();
        const playUrlE = element
          .querySelector(playUrl)
          ?.getAttribute('href')
          ?.trim();
        if (!titleE?.trim() || !urlE) {
          continue;
        }
        list.push({
          id: this.urlJoin(this.baseUrl, urlE),
          name: titleE.trim(),
          picUrl: coverE
            ? this.urlJoin(coverDomain ?? this.baseUrl, coverE)
            : '',
          picHeaders,
          artists: authorE
            ? authorE.map((a) => a.textContent || '')
            : undefined,
          duration: durationE?.trim() ? Number(durationE.trim()) : undefined,
          lyric: lyricE?.trim() || undefined,
          url: this.urlJoin(this.baseUrl, urlE),
          playUrl: playUrlE ? this.urlJoin(this.baseUrl, playUrlE) : undefined,
          sourceId: '',
        });
      }
      return list;
    };
    this.queryChapters = async (
      body: Document,
      { element = '.chapter_list a' },
    ) => {
      const elements = body.querySelectorAll(element);
      const list = [];
      for (const element of elements) {
        const href = element.getAttribute('href');
        const title =
          element.textContent?.trim() || element.getAttribute('title');
        if (href && title) {
          list.push({
            id: this.urlJoin(this.baseUrl, href),
            title,
            url: this.urlJoin(this.baseUrl, href),
          });
        }
      }
      return list;
    };
    this.getContentText = (element?: HTMLElement) => {
      if (!element) return '';
      let text = '';
      for (const child of element.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
          text += `${child.textContent}\n`;
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          text += `${this.getContentText(child as HTMLElement)}\n`;
        }
      }
      return text.trim();
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
