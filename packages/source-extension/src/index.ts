export { Extension } from './baseExtension';

export { BookExtension, loadBookExtensionString } from './book/index';
export { ComicExtension, loadComicExtensionString } from './comic/index';
export { PhotoExtension, loadPhotoExtensionString } from './photo/index';
export { SongExtension, loadSongExtensionString } from './song/index';
export { VideoExtension, loadVideoExtensionString } from './video/index';

export type {
  BookChapter,
  ChapterList as BookChapterList,
  BookItem,
  BookList,
  BooksList,
  BookItemInShelf,
  BookShelf,
} from './book/index';

export type {
  ComicContent,
  ComicChapter,
  ChapterList as ComicChapterList,
  ComicItem,
  ComicList,
  ComicsList,
  ComicItemInShelf,
  ComicShelf,
} from './comic/index';

export type {
  PhotoItem,
  PhotoList,
  PhotoDetail,
  PhotoShelf,
} from './photo/index';

export { SongShelfType, SongPlayMode } from './song/index';

export type {
  SongInfo,
  SongList,
  ArtistInfo,
  AlbumInfo,
  PlaylistInfo,
  SongShelf,
  PlaylistList,
  SongSize,
  SongUrlMap,
} from './song/index';

export type {
  VideoUrlMap,
  VideoEpisode,
  VideoResource,
  VideoItem,
  VideoList,
  VideosList,
  VideoItemInShelf,
  VideoShelf,
} from './video/index';

export { SourceType } from './source/index';

export type {
  SubscribeItem,
  SubscribeDetail,
  SubscribeSource,
  Source,
  PhotoSource,
  SongSource,
  BookSource,
  ComicSource,
  VideoSource,
} from './source/index';
