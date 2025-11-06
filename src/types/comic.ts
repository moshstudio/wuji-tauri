import { ComicChapter, ComicItem } from '@wuji-tauri/source-extension';

export interface ComicHistory {
  comic: ComicItem;
  lastReadChapter?: ComicChapter;
  lastReadTime: number;
}
