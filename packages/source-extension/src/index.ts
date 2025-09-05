export { Extension } from './baseExtension';

export { BookExtension, loadBookExtensionString } from './book/index';
export type {
  BookChapter,
  ChapterList as BookChapterList,
  BookItem,
  BookItemInShelf,
  BookList,
  BookShelf,
  BooksList,
} from './book/index';
export { ComicExtension, loadComicExtensionString } from './comic/index';
export type {
  ComicChapter,
  ChapterList as ComicChapterList,
  ComicContent,
  ComicItem,
  ComicItemInShelf,
  ComicList,
  ComicShelf,
  ComicsList,
} from './comic/index';
export { loadPhotoExtensionString, PhotoExtension } from './photo/index';

export type {
  PhotoDetail,
  PhotoItem,
  PhotoList,
  PhotoShelf,
} from './photo/index';

export { loadSongExtensionString, SongExtension } from './song/index';

export { SongPlayMode, SongShelfType } from './song/index';

export type {
  AlbumInfo,
  ArtistInfo,
  PlaylistInfo,
  PlaylistList,
  SongInfo,
  SongList,
  SongShelf,
  SongSize,
  SongUrlMap,
} from './song/index';

export { MarketSourcePermission, SourceType } from './source/index';

export type {
  BookSource,
  ComicSource,
  MarketSource,
  MarketSourceContent,
  PagedMarketSource,
  PhotoSource,
  SongSource,
  Source,
  SubscribeDetail,
  SubscribeItem,
  SubscribeSource,
  VideoSource,
} from './source/index';

export { loadVideoExtensionString, VideoExtension } from './video/index';

export type {
  VideoEpisode,
  VideoItem,
  VideoItemInShelf,
  VideoList,
  VideoResource,
  VideoShelf,
  VideosList,
  VideoUrlMap,
} from './video/index';
