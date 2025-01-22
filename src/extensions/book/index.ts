import { Extension } from '../baseExtension';
export interface BookChapter {
  id: string;
  title: string;
  url?: string;
}

export type ChapterList = BookChapter[];
export interface BookItem {
  id: string;
  title: string;
  intro?: string;
  cover?: string;
  author?: string;
  tags?: string[] | string;
  status?: string;
  latestChapter?: string | BookChapter;
  latestUpdate?: string;
  url?: string;
  chapters?: ChapterList;
  extra?: any;
  sourceId: string;
}

export interface BookList {
  id?: string;
  list: BookItem[];
  page: number;
  pageSize?: number | null;
  totalPage?: number | null;
  type?: string;
}

export type BooksList = BookList | BookList[];

export interface BookItemInShelf {
  book: BookItem;
  lastReadChapter?: BookChapter;
  lastReadTime?: number;
  createTime?: number;
  extra?: any;
}

export interface BookShelf {
  id: string; // 书架id
  name: string; // 书架名称
  books: BookItemInShelf[];
  createTime: number; // 创建时间
}

abstract class BookExtension extends Extension {
  hasDetailPage: boolean = true;

  public constructor() {
    super();
  }
  // 1. 首页推荐
  abstract getRecommendBooks(
    pageNo?: number,
    type?: string
  ): Promise<BooksList | null>;
  // 2. 搜索
  abstract search(keyword: string, pageNo?: number): Promise<BooksList | null>;
  // 3. 获取章节
  abstract getBookDetail(item: BookItem): Promise<BookItem | null>;
  // 4. 获取内容
  abstract getContent(
    item: BookItem,
    chapter: BookChapter
  ): Promise<string | null>;
}

function loadBookExtensionString(
  codeString: string
): BookExtension | undefined {
  try {
    const func = new Function('BookExtension', codeString);
    const extensionclass = func(BookExtension);
    return new extensionclass();
  } catch (error) {
    console.error('Error executing code:\n', error);
  }
}

export { BookExtension, loadBookExtensionString };
