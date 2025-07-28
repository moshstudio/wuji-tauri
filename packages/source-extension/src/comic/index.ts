import _ from 'lodash';
import { nanoid } from 'nanoid';
import { Extension, transformResult } from '../baseExtension';

export interface ComicContent {
  photos: string[];
  photosHeaders?: Record<string, string> | null;
  page: number;
  pageSize?: number | null;
  totalPage?: number | null;
  extra?: any | null;
}

export interface ComicChapter {
  id: string;
  title: string;
  url?: string;
  readingPage?: number;
}

export type ChapterList = ComicChapter[];
export interface ComicItem {
  id: string;
  title: string;
  intro?: string;
  cover?: string;
  coverHeaders?: Record<string, string> | null;
  author?: string;
  tags?: string[] | string;
  status?: string;
  latestChapter?: string | ComicChapter;
  latestUpdate?: string;
  url?: string;
  chapters?: ChapterList;
  extra?: any;
  sourceId: string;
}

export interface ComicList {
  id?: string;
  list: ComicItem[];
  page: number;
  pageSize?: number | null;
  totalPage?: number | null;
  type?: string;
}

export type ComicsList = ComicList | ComicList[];

export interface ComicItemInShelf {
  comic: ComicItem;
  lastReadChapter?: ComicChapter;
  lastReadTime?: number;
  createTime?: number;
  extra?: any;
}

export interface ComicShelf {
  id: string; // 书架id
  name: string; // 书架名称
  comics: ComicItemInShelf[];
  createTime: number; // 创建时间
}

abstract class ComicExtension extends Extension {
  public constructor() {
    super();
  }

  @transformResult<ComicsList | null>((r) => {
    if (r) {
      _.castArray(r).forEach((comicList) => {
        comicList.id = String(comicList.id || nanoid());
        comicList.list.forEach((comicItem) => {
          comicItem.id = String(
            comicItem.id ||
              comicItem.url ||
              comicItem.title + comicItem.sourceId,
          );
        });
      });
    }
    return r;
  })
  async execGetRecommendComics(pageNo?: number, type?: string) {
    pageNo = pageNo || 1;
    const ret = await this.getRecommendComics(pageNo, type);
    if (ret) {
      _.castArray(ret).forEach((comicList) => {
        comicList.list.forEach((comicItem) => {
          comicItem.sourceId = String(this.id);
        });
      });
    }
    return ret;
  }
  // 1. 首页推荐
  abstract getRecommendComics(
    pageNo?: number,
    type?: string,
  ): Promise<ComicsList | null>;

  @transformResult<ComicsList | null>((r) => {
    if (r) {
      _.castArray(r).forEach((comicList) => {
        comicList.id = String(comicList.id || nanoid());
        comicList.list.forEach((comicItem) => {
          comicItem.id = String(
            comicItem.id ||
              comicItem.url ||
              comicItem.title + comicItem.sourceId,
          );
        });
      });
    }
    return r;
  })
  async execSearch(keyword: string, pageNo?: number) {
    if (keyword === '') {
      return await this.execGetRecommendComics(pageNo);
    }
    pageNo = pageNo || 1;
    const ret = await this.search(keyword, pageNo);
    if (ret) {
      _.castArray(ret).forEach((comicList) => {
        comicList.list.forEach((comicItem) => {
          comicItem.sourceId = String(this.id);
        });
      });
    }
    return ret;
  }
  // 2. 搜索
  abstract search(keyword: string, pageNo?: number): Promise<ComicsList | null>;

  @transformResult<ComicItem | null>((r) => {
    if (r) {
      r.id = String(r.id);
      r.chapters?.forEach((chapter) => {
        chapter.id = String(chapter.id || chapter.url || nanoid());
      });
    }
    return r;
  })
  async execGetComicDetail(item: ComicItem) {
    const ret = await this.getComicDetail(item);
    if (ret) {
      ret.sourceId = String(this.id);
    }
    return ret;
  }
  // 3. 获取章节
  abstract getComicDetail(item: ComicItem): Promise<ComicItem | null>;

  @transformResult<string | null>((r) => {
    return r;
  })
  execGetContent(item: ComicItem, chapter: ComicChapter) {
    return this.getContent(item, chapter);
  }
  // 4. 获取内容
  abstract getContent(
    item: ComicItem,
    chapter: ComicChapter,
  ): Promise<ComicContent | null>;
}

function loadComicExtensionString(
  codeString: string,
): ComicExtension | undefined {
  try {
    const func = new Function('ComicExtension', codeString);
    const extensionclass = func(ComicExtension);
    return new extensionclass();
  } catch (error) {
    console.error('Error executing code:\n', error);
  }
}

export { ComicExtension, loadComicExtensionString };
