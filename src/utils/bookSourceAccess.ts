import type {
  BookChapter,
  BookSource,
  SubscribeItem,
  SubscribeSource,
} from '@wuji-tauri/source-extension';
import { showConfirmDialog, showToast } from 'vant';
import { useBookShelfStore, useStore } from '@/store';
import {
  enableSubscribeItemById,
  ensureSource,
  findSubscribeItem,
} from '@/utils/sourceAccess';

export function findBookSubscribeItem(sourceId: string): {
  subscribe: SubscribeSource;
  item: SubscribeItem;
} | undefined {
  return findSubscribeItem(sourceId);
}

export function findBookItemById(bookId: string) {
  const shelfStore = useBookShelfStore();
  for (const shelf of shelfStore.bookShelf) {
    for (const item of shelf.books) {
      if (item.book.id === bookId)
        return item.book;
    }
  }
  for (const history of shelfStore.bookHistory) {
    if (history.book.id === bookId)
      return history.book;
  }
  return undefined;
}

export async function enableBookSourceById(
  sourceId: string,
): Promise<BookSource | undefined> {
  if (!enableSubscribeItemById(sourceId))
    return undefined;
  return useStore().getBookSource(sourceId);
}

export function normalizeChapterTitle(title: string): string {
  return title.replace(/\s+/g, '').toLowerCase();
}

const CN_NUM: Record<string, number> = {
  零: 0,
  〇: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10,
};

function parseChineseNumber(text: string): number | undefined {
  if (!text)
    return undefined;
  if (/^\d+$/.test(text))
    return Number(text);

  let result = 0;
  let temp = 0;
  let hasTen = false;
  for (const char of text) {
    const num = CN_NUM[char];
    if (num == null)
      return undefined;
    if (num === 10) {
      hasTen = true;
      result += (temp || 1) * 10;
      temp = 0;
    }
    else {
      temp = num;
    }
  }
  result += temp;
  if (!hasTen && result === 0 && text !== '零' && text !== '〇')
    return undefined;
  return result;
}

/** 从章节标题提取集/章序号，如「第八集」「第8章」「08」 */
export function extractChapterNumber(title: string): number | undefined {
  if (!title)
    return undefined;

  const patterns = [
    /第\s*([0-9]+)\s*[章节回集话]/,
    /第\s*([零〇一二两三四五六七八九十百千两]+)\s*[章节回集话]/,
    /(?:^|[^\d])([0-9]{1,4})(?:\s*[\.、:：]|\s+)/,
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (!match?.[1])
      continue;
    const parsed = parseChineseNumber(match[1]);
    if (parsed != null && parsed > 0)
      return parsed;
  }

  return undefined;
}

export function findMatchedChapter(
  chapters: BookChapter[],
  current: BookChapter | undefined,
  currentChapterId: string,
  originalChapters?: BookChapter[],
): BookChapter | undefined {
  if (!chapters.length)
    return undefined;

  const byId = chapters.find(chapter => chapter.id === currentChapterId);
  if (byId)
    return byId;

  if (current?.title) {
    const byTitle = chapters.find(chapter => chapter.title === current.title);
    if (byTitle)
      return byTitle;

    const normalized = normalizeChapterTitle(current.title);
    const byNormalized = chapters.find(
      chapter => normalizeChapterTitle(chapter.title) === normalized,
    );
    if (byNormalized)
      return byNormalized;

    // 按「第N章/集」序号对齐
    const currentNo = extractChapterNumber(current.title);
    if (currentNo != null) {
      const byNumber = chapters.find(
        chapter => extractChapterNumber(chapter.title) === currentNo,
      );
      if (byNumber)
        return byNumber;
    }
  }

  // 原目录下标对齐
  let index = -1;
  if (currentChapterId) {
    index
      = originalChapters?.findIndex(chapter => chapter.id === currentChapterId)
        ?? -1;
  }
  if (index < 0 && current) {
    index
      = originalChapters?.findIndex(
        chapter =>
          chapter.id === current.id
          || (current.title && chapter.title === current.title),
      ) ?? -1;
  }
  if (index >= 0 && index < chapters.length)
    return chapters[index];

  // 下标超出新源目录时，尽量落到最接近的一章
  if (index >= chapters.length)
    return chapters[chapters.length - 1];

  return undefined;
}

/**
 * 换源时尽量对齐章节；对不齐也保证能打开可读章节。
 * exact=false 表示用了兜底（下标/首章等）。
 */
export function resolveSwitchChapter(
  chapters: BookChapter[],
  current: BookChapter | undefined,
  currentChapterId: string,
  originalChapters?: BookChapter[],
): { chapter: BookChapter, exact: boolean } | undefined {
  if (!chapters.length)
    return undefined;

  const matched = findMatchedChapter(
    chapters,
    current,
    currentChapterId,
    originalChapters,
  );
  if (matched) {
    const exact = !!(
      matched.id === currentChapterId
      || (current?.title
        && (matched.title === current.title
          || normalizeChapterTitle(matched.title)
            === normalizeChapterTitle(current.title)
          || (extractChapterNumber(current.title) != null
            && extractChapterNumber(matched.title)
              === extractChapterNumber(current.title))))
    );
    return { chapter: matched, exact };
  }

  // 最终兜底：打开第一章，保证能继续读
  return { chapter: chapters[0], exact: false };
}

export type EnsureBookSourceResult =
  | { ok: true, source: BookSource }
  | { ok: false, action: 'cancelled' | 'switch' | 'unavailable' };

async function offerSwitchSource(
  message: string,
): Promise<EnsureBookSourceResult> {
  const store = useStore();
  if (!store.bookSources.length) {
    showToast('没有可用的书籍源');
    return { ok: false, action: 'unavailable' };
  }
  try {
    await showConfirmDialog({
      title: '源不可用',
      message,
      confirmButtonText: '换源',
      cancelButtonText: '取消',
    });
    return { ok: false, action: 'switch' };
  }
  catch {
    return { ok: false, action: 'cancelled' };
  }
}

/**
 * 确保书籍源可用：已启用则直接返回；未启用则询问启用；
 * 不存在/启用失败则询问换源。
 */
export async function ensureBookSource(
  sourceId: string,
  options?: {
    offerSwitch?: boolean;
    switchMessage?: string;
  },
): Promise<EnsureBookSourceResult> {
  const store = useStore();
  const offerSwitch = options?.offerSwitch !== false;

  // 先走通用启用询问（不弹不存在 toast，由书籍换源逻辑接管）
  const existing = store.getBookSource(sourceId);
  if (existing)
    return { ok: true, source: existing };

  const found = findSubscribeItem(sourceId);
  const isDisabled = !!(
    found
    && (found.item.disable || found.subscribe.disable)
  );

  if (isDisabled && found) {
    const ensured = await ensureSource(sourceId, 'book');
    if (ensured.ok)
      return { ok: true, source: ensured.source };
    if (ensured.action === 'cancelled') {
      if (offerSwitch) {
        return offerSwitchSource(
          options?.switchMessage ?? '当前源未启用，是否换源搜索？',
        );
      }
      return { ok: false, action: 'cancelled' };
    }
    if (offerSwitch) {
      return offerSwitchSource(
        options?.switchMessage ?? '启用后仍无法使用该源，是否换源搜索？',
      );
    }
    return { ok: false, action: 'unavailable' };
  }

  if (offerSwitch) {
    return offerSwitchSource(
      options?.switchMessage
        ?? (found ? '当前源不可用，是否换源搜索？' : '当前书籍源不存在，是否换源搜索？'),
    );
  }

  showToast(found ? '源不可用' : '源不存在');
  return { ok: false, action: 'unavailable' };
}

export async function confirmSwitchSource(
  message = '当前源无法获取内容，是否换源搜索并继续阅读？',
): Promise<boolean> {
  const store = useStore();
  if (!store.bookSources.length) {
    showToast('没有可用的书籍源');
    return false;
  }
  try {
    await showConfirmDialog({
      title: '加载失败',
      message,
      confirmButtonText: '换源',
      cancelButtonText: '取消',
    });
    return true;
  }
  catch {
    return false;
  }
}
