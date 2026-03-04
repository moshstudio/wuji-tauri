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

// 从 video/index 导入基础类（不含 CMS，避免循环依赖）
import { VideoExtension } from './video/index';
// 从 video/cms 直接导入 CMS 类（不经过 video/index，避免循环依赖）
import { CmsVideoExtension } from './video/cms';

// 增强版 loadVideoExtensionString：同时注入 VideoExtension 和 CmsVideoExtension
function loadVideoExtensionString(
  codeString: string,
  raise = false,
): VideoExtension | undefined {
  try {
    const func = new Function(
      'VideoExtension',
      'CmsVideoExtension',
      codeString,
    );
    const extensionclass = func(VideoExtension, CmsVideoExtension);
    return new extensionclass();
  } catch (error) {
    console.error('Error executing code:\n', error);
    if (raise) throw error;
  }
}

export { loadVideoExtensionString, VideoExtension };
export { CmsVideoExtension, loadCmsVideoExtensionString } from './video/cms';

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

export type {
  CmsApiResponse,
  CmsClassItem,
  CmsVodDetailItem,
  CmsVodListItem,
} from './video/cms';
