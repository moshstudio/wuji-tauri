import type { HotItem } from '@/apis/hot/apiHot';
import type { Extension } from '@/extensions/baseExtension';

import type {
  BookChapter,
  BookExtension,
  BookItem,
  BooksList,
} from '@/extensions/book';
import type {
  ComicChapter,
  ComicContent,
  ComicExtension,
  ComicItem,
  ComicsList,
} from '@/extensions/comic';
import type { PhotoExtension, PhotoItem } from '@/extensions/photo';
import type { PlaylistInfo, SongExtension, SongInfo } from '@/extensions/song';
import type {
  VideoEpisode,
  VideoExtension,
  VideoItem,
  VideoResource,
  VideosList,
  VideoUrlMap,
} from '@/extensions/video';
import type {
  BookSource,
  ComicSource,
  PhotoSource,
  SongSource,
  Source,
  SubscribeDetail,
  SubscribeItem,
  SubscribeSource,
  VideoSource,
} from '@/types';
import { loadBookExtensionString } from '@/extensions/book';
import TestBookExtension from '@/extensions/book/test';
import { loadComicExtensionString } from '@/extensions/comic';
import TestComicExtension from '@/extensions/comic/test';
import { loadPhotoExtensionString } from '@/extensions/photo';
import TestPhotoExtension from '@/extensions/photo/test';
import { loadSongExtensionString } from '@/extensions/song';
import TestSongExtension from '@/extensions/song/test';
import { loadVideoExtensionString } from '@/extensions/video';
import TestVideoExtension from '@/extensions/video/test';
import { SourceType } from '@/types';
import { DEFAULT_SOURCE_URL, sleep, tryCatchProxy } from '@/utils';
import { createCancellableFunction } from '@/utils/cancelableFunction';
import { fetch } from '@/utils/fetch';
import { useStorageAsync } from '@vueuse/core';
import _ from 'lodash';
import { defineStore } from 'pinia';
import * as fs from 'tauri-plugin-fs-api';
import {
  showConfirmDialog,
  showLoadingToast,
  showNotify,
  showToast,
} from 'vant';
import { onBeforeMount, ref, triggerRef } from 'vue';
import { useBookChapterStore } from './bookChaptersStore';
import { useBookShelfStore } from './bookShelfStore';
import { useBookStore } from './bookStore';
import { useComicShelfStore } from './comicShelfStore';

import { useDisplayStore } from './displayStore';
import { usePhotoShelfStore } from './photoShelfStore';
import { useSongCacheStore } from './songCacheStore';
import { useSongShelfStore } from './songShelfStore';
import { useSongStore } from './songStore';
import { useSubscribeSourceStore } from './subscribeSourceStore';

import { createKVStore } from './utils';
import { useVideoShelfStore } from './videoShelfStore';
import { useServerStore } from './serverStore';
import { useTTSStore } from './ttsStore';

export const useStore = defineStore('store', () => {
  const hotItems = ref<HotItem[]>([]); // 热搜榜

  const kvStorage = createKVStore();
  const bookChapterStore = useBookChapterStore();
  const bookShelfStore = usePhotoShelfStore();
  const bookStore = useBookStore();
  const comicShelfStore = useComicShelfStore();
  const displayStore = useDisplayStore();
  const photoShelfStore = usePhotoShelfStore();
  const serverStore = useServerStore();
  const songCacheStore = useSongCacheStore();
  const songShelfStore = useSongShelfStore();
  const songStore = useSongStore();
  const subscribeSourceStore = useSubscribeSourceStore();
  const ttsStore = useTTSStore();
  const videoShelfStore = useVideoShelfStore();

  const sourceClasses = new Map<string, Extension | null>();
  const sourceClass = async (
    item: SubscribeItem,
  ): Promise<Extension | null | undefined> => {
    if (item.id && sourceClasses.has(item.id)) {
      return sourceClasses.get(item.id);
    }
    // for test
    if (item.code === 'test') {
      switch (item.type) {
        case SourceType.Photo:
          sourceClasses.set(item.id, new TestPhotoExtension());
          break;
        case SourceType.Song:
          sourceClasses.set(item.id, new TestSongExtension());
          break;
        case SourceType.Book:
          sourceClasses.set(item.id, new TestBookExtension());
          break;
        case SourceType.Comic:
          sourceClasses.set(item.id, new TestComicExtension());
          break;
        case SourceType.Video:
          sourceClasses.set(item.id, new TestVideoExtension());
          break;
        default:
          break;
      }
      return sourceClasses.get(item.id);
    }
    if (!item.code) {
      try {
        item.code = await (await fetch(item.url)).text();
      } catch (error) {
        console.log('加载扩展失败:', item);
        sourceClasses.set(item.id, null);
        return null;
      }
    }
    let extensionClass:
      | PhotoExtension
      | SongExtension
      | BookExtension
      | ComicExtension
      | VideoExtension
      | undefined;
    switch (item.type) {
      case SourceType.Photo:
        extensionClass = loadPhotoExtensionString(item.code);
        break;
      case SourceType.Song:
        extensionClass = loadSongExtensionString(item.code);
        break;
      case SourceType.Book:
        extensionClass = loadBookExtensionString(item.code);
        break;
      case SourceType.Comic:
        extensionClass = loadComicExtensionString(item.code);
        break;
      case SourceType.Video:
        extensionClass = loadVideoExtensionString(item.code);
        break;
      default:
        extensionClass = undefined;
        break;
    }
    if (!extensionClass) {
      showToast(`添加 ${item.name} 订阅源失败`);
      sourceClasses.delete(item.id);
      return null;
    }
    // 防止报错
    extensionClass = tryCatchProxy(extensionClass);
    extensionClass.codeString = item.code;
    item.id ||= extensionClass.id; // item.id默认可以为空
    item.name ||= extensionClass.name; // item.name默认可以为空
    sourceClasses.set(item.id, extensionClass);
    return extensionClass;
  };

  const photoSources = useStorageAsync<PhotoSource[]>(
    'photoSources',
    [],
    kvStorage.storage,
  );

  const songSources = useStorageAsync<SongSource[]>(
    'songSources',
    [],
    kvStorage.storage,
  );

  const bookSources = useStorageAsync<BookSource[]>(
    'bookSources',
    [],
    kvStorage.storage,
  );

  const comicSources = useStorageAsync<ComicSource[]>(
    'comicSources',
    [],
    kvStorage.storage,
  );
  const videoSources = useStorageAsync<VideoSource[]>(
    'videoSources',
    [],
    kvStorage.storage,
  );
  const keepTest = ref(false);

  const __split__0 = () => {};
  /**
   * 获取推荐列表
   */
  const photoRecommendList = async (
    source: PhotoSource,
    pageNo: number = 1,
  ) => {
    const sc = (await sourceClass(source.item)) as PhotoExtension;
    const res = await sc?.execGetRecommendList(pageNo);

    if (res) {
      source.list = res;
    } else {
      showToast(`${source.item.name} 推荐结果为空`);
      source.list = undefined;
    }
    triggerRef(photoSources);
  };
  /**
   * 搜索
   */
  const photoSearchList = async (
    source: PhotoSource,
    keyword: string,
    pageNo: number = 1,
  ) => {
    const sc = (await sourceClass(source.item)) as PhotoExtension;
    const res = await sc?.execSearch(keyword, pageNo);

    if (res) {
      source.list = res;
    } else {
      showToast(`${source.item.name} 搜索结果为空`);
      source.list = undefined;
    }
    triggerRef(photoSources);
  };
  /**
   * 获取详情
   */
  const photoDetail = async (
    source: PhotoSource,
    item: PhotoItem,
    pageNo: number = 1,
  ) => {
    const sc = (await sourceClass(source.item)) as PhotoExtension;
    const res = await sc?.execGetPhotoDetail(item, pageNo);
    if (res) {
      return res;
    } else {
      showNotify(`${source.item.name} 获取内容失败`);
      return null;
    }
  };

  const getPhotoSource = (sourceId: string): PhotoSource | undefined => {
    return photoSources.value.find((item) => item.item.id === sourceId);
  };
  /**
   * 根据id获取图片
   */
  const getPhotoItem = (
    source: PhotoSource,
    itemId: string,
  ): PhotoItem | undefined => {
    const fromShelf = () => {
      for (const shelf of shelfStore.photoShelf) {
        for (const item of shelf.photos) {
          if (item.id === itemId) {
            return item;
          }
        }
      }
    };
    const fromSource = () => {
      if (source.list) {
        return source.list.list.find((item) => item.id === itemId);
      }
    };
    const shelfStore = usePhotoShelfStore();
    if (shelfStore.photoInShelf(itemId)) {
      return fromShelf();
    } else {
      return fromSource();
    }
  };
  const __split__1 = () => {};
  // 音乐
  const songRecommendPlayist = async (
    source: SongSource,
    pageNo: number = 1,
  ) => {
    const sc = (await sourceClass(source.item)) as SongExtension;
    const res = await sc?.execGetRecommendPlaylists(pageNo);
    if (res) {
      source.playlist = res;
    } else {
      source.playlist = undefined;
    }
    triggerRef(songSources);
  };
  const songPlaylistDetail = async (
    source: SongSource,
    item: PlaylistInfo,
    pageNo: number = 1,
  ) => {
    const toast = showLoadingToast({
      message: '加载中',
      duration: 0,
      closeOnClick: true,
      closeOnClickOverlay: false,
    });
    const sc = (await sourceClass(source.item)) as SongExtension;
    const res = await sc?.execGetPlaylistDetail(item, pageNo);
    toast.close();
    if (res) {
      return res;
    } else {
      showNotify(`${source.item.name} 获取内容失败`);
      return null;
    }
  };
  const songPlaylistPlayAll = async (item: PlaylistInfo) => {
    const source = getSongSource(item.sourceId);
    if (!source) {
      showNotify(`获取内容失败`);
      return;
    }
    const songs: SongInfo[] = [];
    let pageNo = 1;
    while (true) {
      const sc = (await sourceClass(source.item)) as SongExtension;
      const res = await sc?.execGetPlaylistDetail(
        _.cloneDeep(item), // 不修改原对象
        pageNo,
      );

      if (res && res.list?.list) {
        songs.push(...res.list.list);
        pageNo += 1;
        const totalPage = res.totalPage || res.list.totalPage;
        if (!totalPage || pageNo > totalPage) {
          break;
        }
      } else {
        break;
      }
    }
    if (!songs) {
      showNotify(`内容为空`);
    } else {
      const songStore = useSongStore();
      await songStore.setPlayingList(songs, songs[0]);
    }
  };
  const songRecommendSong = async (source: SongSource, pageNo: number = 1) => {
    const sc = (await sourceClass(source.item)) as SongExtension;
    const res = await sc?.execGetRecommendSongs(pageNo);
    if (res) {
      source.songList = res;
    } else {
      source.songList = undefined;
    }
    triggerRef(songSources);
  };
  const songSearchSong = async (
    source: SongSource,
    keyword: string,
    pageNo: number = 1,
  ) => {
    const sc = (await sourceClass(source.item)) as SongExtension;
    const res = await sc?.execSearchSongs(keyword, pageNo);
    if (res) {
      source.songList = res;
    } else {
      source.songList = undefined;
    }
    triggerRef(songSources);
  };
  const songSearchPlaylist = async (
    source: SongSource,
    keyword: string,
    pageNo: number = 1,
  ) => {
    const sc = (await sourceClass(source.item)) as SongExtension;
    const res = await sc?.execSearchPlaylists(keyword, pageNo);
    if (res) {
      source.playlist = res;
    } else {
      source.playlist = undefined;
    }
    triggerRef(songSources);
  };
  const getPlaylistInfo = (
    source: SongSource,
    playlistId: string,
  ): PlaylistInfo | undefined => {
    return source.playlist?.list.find((item) => item.id === playlistId);
  };
  const getSongSource = (sourceId: string): SongSource | undefined => {
    return songSources.value.find((source) => source.item.id === sourceId);
  };
  const __split__2 = () => {};

  /**
   * 获取推荐列表
   */
  const bookRecommendList = async (
    source: BookSource,
    pageNo: number = 1,
    type?: string,
  ) => {
    const sc = (await sourceClass(source.item)) as BookExtension;
    const res = await sc?.execGetRecommendBooks(pageNo, type);

    if (res) {
      if (!type) {
        // 1. 获取的不是指定type类型的数据，直接赋值
        source.list = res;
      } else {
        // 2. 获取的是指定type类型的数据，判断是否已经存在，不存在则添加
        const find = _.castArray(source.list).find(
          (item) => item.type === type,
        );
        if (find) {
          _.assign(find, res);
        } else {
          source.list = [..._.castArray(source.list), ..._.castArray(res)];
        }
      }
    } else {
      if (!type) {
        source.list = undefined;
      }
    }
    triggerRef(bookSources);
  };
  const bookSearch = async (
    source: BookSource,
    keyword: string,
    pageNo: number = 1,
  ) => {
    const sc = (await sourceClass(source.item)) as BookExtension;
    const res = await sc?.execSearch(keyword, pageNo);
    if (res) {
      if (!_.isArray(res) && !res.list.length) {
        source.list = undefined;
        return;
      }
      source.list = res;
    } else {
      source.list = undefined;
    }
    triggerRef(bookSources);
  };
  const bookDetail = async (source: BookSource, book: BookItem) => {
    const sc = (await sourceClass(source.item)) as BookExtension;
    const res = await sc?.execGetBookDetail(book);
    if (res) {
      return res;
    } else {
      showNotify(`${source.item.name} 获取内容失败`);
      return null;
    }
  };
  const bookRead = async (
    source: BookSource,
    book: BookItem,
    chapter: BookChapter,
    options?: {
      cacheMoreChapters?: boolean;
      refresh?: boolean;
    },
  ): Promise<string | null> => {
    options ||= {};
    if (options.cacheMoreChapters === undefined) {
      options.cacheMoreChapters = true;
    }
    if (options.refresh === undefined) {
      options.refresh = false;
    }
    if (!options.refresh) {
      const content = await bookChapterStore.getBookChapter(book, chapter);
      if (content) {
        if (options.cacheMoreChapters) {
          // 缓存书籍
          cacheBookChapters(source, book, chapter);
        }
        return content;
      }
    }

    const sc = (await sourceClass(source.item)) as BookExtension;
    const res = await sc?.execGetContent(book, chapter);
    if (res) {
      await bookChapterStore.saveBookChapter(book, chapter, res);
      if (options.cacheMoreChapters) {
        // 缓存书籍
        cacheBookChapters(source, book, chapter);
      }
    }

    return res;
  };
  const cacheBookChapters = createCancellableFunction(
    async (
      signal: AbortSignal,
      source: BookSource,
      book: BookItem,
      chapter: BookChapter,
    ) => {
      if (!book.chapters) return;
      const index = book.chapters.findIndex((item) => item.id === chapter.id);
      if (index === -1) return;
      let count = 1;
      const bookStore = useBookStore();
      while (count <= bookStore.chapterCacheNum) {
        if (signal.aborted) {
          return;
        }
        const targetChapter = book.chapters[index + count];
        if (targetChapter) {
          await bookRead(source, book, targetChapter, {
            cacheMoreChapters: false,
          });
        }
        count += 1;
        if (count >= book.chapters.length) {
          return;
        }
      }
    },
  );
  const getBookSource = (sourceId: string): BookSource | undefined => {
    return bookSources.value.find((item) => item.item.id === sourceId);
  };
  const getBookItem = (
    source: BookSource,
    bookId: string,
  ): BookItem | undefined => {
    const checkFromShelf = () => {
      for (const shelf of shelfStore.bookShelf) {
        for (const book of shelf.books) {
          if (book.book.id === bookId) {
            return book.book;
          }
        }
      }
    };
    const fromSource = () => {
      if (source.list) {
        for (const bookList of _.castArray(source.list)) {
          for (const bookItem of bookList.list) {
            if (bookItem.id === bookId) {
              return bookItem;
            }
          }
        }
      }
    };

    const shelfStore = useBookShelfStore();
    // 优先从书架中获取
    if (shelfStore.isBookInShelf(bookId)) {
      return checkFromShelf();
    } else {
      return fromSource();
    }
  };
  const __split__3 = () => {};

  const comicRecommendList = async (
    source: ComicSource,
    pageNo: number = 1,
    type?: string,
  ) => {
    const sc = (await sourceClass(source.item)) as ComicExtension;
    const res = await sc?.execGetRecommendComics(pageNo, type);

    if (res) {
      if (!type) {
        // 1. 获取的不是指定type类型的数据，直接赋值
        source.list = res;
      } else {
        // 2. 获取的是指定type类型的数据，判断是否已经存在，不存在则添加
        const find = _.castArray(source.list).find(
          (item) => item.type === type,
        );
        if (find) {
          _.assign(find, res);
        } else {
          source.list = [..._.castArray(source.list), ..._.castArray(res)];
        }
      }
    } else {
      if (!type) {
        source.list = undefined;
      }
    }
    triggerRef(comicSources);
  };
  const comicSearch = async (
    source: ComicSource,
    keyword: string,
    pageNo: number = 1,
  ) => {
    const sc = (await sourceClass(source.item)) as ComicExtension;
    const res = await sc?.execSearch(keyword, pageNo);
    if (res) {
      if (!_.isArray(res) && !res.list.length) {
        source.list = undefined;
        return;
      }
      source.list = res;
    } else {
      source.list = undefined;
    }
    triggerRef(comicSources);
  };
  const comicDetail = async (source: ComicSource, comic: ComicItem) => {
    const sc = (await sourceClass(source.item)) as ComicExtension;
    const res = await sc?.execGetComicDetail(comic);
    if (res) {
      return res;
    } else {
      showNotify(`${source.item.name} 获取内容失败`);
      return null;
    }
  };
  const comicRead = async (
    source: ComicSource,
    comic: ComicItem,
    chapter: ComicChapter,
  ): Promise<ComicContent | null> => {
    const sc = (await sourceClass(source.item)) as ComicExtension;
    const res = await sc?.execGetContent(comic, chapter);
    return res;
  };
  const getComicSource = (sourceId: string): ComicSource | undefined => {
    return comicSources.value.find((item) => item.item.id === sourceId);
  };
  const getComicItem = (
    source: ComicSource,
    comicId: string,
  ): ComicItem | undefined => {
    const checkFromShelf = () => {
      for (const shelf of shelfStore.comicShelf) {
        for (const comic of shelf.comics) {
          if (comic.comic.id === comicId) {
            return comic.comic;
          }
        }
      }
    };
    const fromSource = () => {
      if (source.list) {
        for (const comicList of _.castArray(source.list)) {
          for (const comicItem of comicList.list) {
            if (comicItem.id === comicId) {
              return comicItem;
            }
          }
        }
      }
    };

    const shelfStore = useComicShelfStore();
    // 优先从书架中获取
    if (shelfStore.isComicInShelf(comicId)) {
      return checkFromShelf();
    } else {
      return fromSource();
    }
  };

  const __split__4 = () => {};

  const videoRecommendList = async (
    source: VideoSource,
    pageNo: number = 1,
    type?: string,
  ) => {
    const sc = (await sourceClass(source.item)) as VideoExtension;
    const res = await sc?.execGetRecommendVideos(pageNo, type);

    if (res) {
      if (!type) {
        // 1. 获取的不是指定type类型的数据，直接赋值
        source.list = res;
      } else {
        // 2. 获取的是指定type类型的数据，判断是否已经存在，不存在则添加
        const find = _.castArray(source.list).find(
          (item) => item.type === type,
        );
        if (find) {
          _.assign(find, res);
        } else {
          source.list = [..._.castArray(source.list), ..._.castArray(res)];
        }
      }
    } else {
      if (!type) {
        source.list = undefined;
      }
    }
    triggerRef(videoSources);
  };
  const videoSearch = async (
    source: VideoSource,
    keyword: string,
    pageNo: number = 1,
  ) => {
    const sc = (await sourceClass(source.item)) as VideoExtension;
    const res = await sc?.execSearch(keyword, pageNo);
    if (res) {
      if (!_.isArray(res)) {
        if (!res.list?.length) {
          source.list = undefined;
          return;
        }
      }
      source.list = res;
    } else {
      source.list = undefined;
    }
  };
  const videoDetail = async (source: VideoSource, video: VideoItem) => {
    const sc = (await sourceClass(source.item)) as VideoExtension;
    const res = await sc?.execGetVideoDetail(video);
    if (res) {
      return res;
    } else {
      showNotify(`${source.item.name} 获取内容失败`);
      return null;
    }
  };
  const videoPlay = async (
    source: VideoSource,
    video: VideoItem,
    resource: VideoResource,
    episode: VideoEpisode,
  ): Promise<VideoUrlMap | null> => {
    const sc = (await sourceClass(source.item)) as VideoExtension;
    const res = await sc?.execGetPlayUrl(video, resource, episode);
    return res;
  };
  const getVideoSource = (sourceId: string): VideoSource | undefined => {
    return videoSources.value.find((item) => item.item.id === sourceId);
  };
  const getVideoItem = (
    source: VideoSource,
    videoId: string,
  ): ComicItem | undefined => {
    const checkFromShelf = () => {
      for (const shelf of shelfStore.videoShelf) {
        for (const video of shelf.videos) {
          if (video.video.id === videoId) {
            return video.video;
          }
        }
      }
    };
    const fromSource = () => {
      if (source.list) {
        for (const videoList of _.castArray(source.list)) {
          if (videoList.list) {
            for (const videoItem of videoList.list) {
              if (videoItem.id === videoId) {
                return videoItem;
              }
            }
          }
        }
      }
    };

    const shelfStore = useVideoShelfStore();
    // 优先从书架中获取
    if (shelfStore.isVideoInShelf(videoId)) {
      return checkFromShelf();
    } else {
      return fromSource();
    }
  };

  /**
   * 根据名称获取源
   */
  const getSource = (item: SubscribeItem): Source | undefined => {
    switch (item.type) {
      case SourceType.Photo:
        return getPhotoSource(item.id);
      case SourceType.Song:
        return getSongSource(item.id);
      case SourceType.Book:
        return getBookSource(item.id);
      case SourceType.Comic:
        return getComicSource(item.id);
      default:
        return undefined;
    }
  };
  const removeSource = (item: SubscribeItem) => {
    switch (item.type) {
      case SourceType.Photo:
        _.remove(photoSources.value, (p) => p.item.id === item.id);
        triggerRef(photoSources);
        break;
      case SourceType.Song:
        _.remove(songSources.value, (p) => p.item.id === item.id);
        triggerRef(songSources);
        break;
      case SourceType.Book:
        _.remove(bookSources.value, (p) => p.item.id === item.id);
        triggerRef(bookSources);
        break;
      case SourceType.Comic:
        _.remove(comicSources.value, (p) => p.item.id === item.id);
        triggerRef(comicSources);
        break;
      case SourceType.Video:
        _.remove(videoSources.value, (p) => p.item.id === item.id);
        triggerRef(videoSources);
        break;
      default:
        return undefined;
    }
  };

  /**
   * 添加订阅源
   */
  const addSubscribeSource = async (url: string, raise: boolean = false) => {
    const displayStore = useDisplayStore();
    const t = displayStore.showToast();
    try {
      // 1. 从网址获取内容
      const subscribeResponse = await fetch(url);
      const res: SubscribeDetail = await subscribeResponse.json();
      // 2. 检查是否已存在，然后同步disable状态
      const oldSource = subscribeSourceStore.getSubscribeSource(res.id);
      // 3.测试是否可用，然后添加
      const source: SubscribeSource = {
        url,
        detail: {
          id: res.id,
          name: res.name,
          version: res.version,
          requireVersion: res.requireVersion,
          urls: [],
        },
        disable: oldSource?.disable || false,
      };
      for (const item of res.urls) {
        try {
          const sc = await sourceClass(item);
          if (!sc) {
            showToast(`添加 ${item.name} 订阅源失败`);
            continue;
          }
          item.id ||= sc.id || sc.hash;
          item.name ||= sc.name;
          item.code ||= sc.codeString;
          addToSource(
            {
              item,
            },
            true,
          );
          source.detail.urls.push(item);
        } catch (error) {
          showToast(`添加 ${item.name} 订阅源失败`);
        }
      }
      // 同步disable状态
      if (source.detail.urls.every((item) => item.disable)) {
        source.disable = true;
      }
      source.detail.urls.forEach((item) => {
        item.disable =
          oldSource?.detail.urls.find((s) => s.id === item.id)?.disable ||
          false;
      });
      subscribeSourceStore.addSubscribeSource(source); // 保存
    } catch (error) {
      showToast('添加订阅源失败');
      if (raise) {
        throw error;
      }
    } finally {
      displayStore.closeToast(t);
    }
  };

  const localSourceId = 'localSource-wuji';

  const addLocalSubscribeSource = async (path: string) => {
    let content: string;
    try {
      content = await fs.readTextFile(path);
    } catch (error) {
      showNotify(`读取文件失败:${String(error)}`);
      return;
    }
    const oldSource = subscribeSourceStore.getSubscribeSource(localSourceId);
    const source: SubscribeSource = {
      url: '',
      detail: {
        id: localSourceId,
        name: '本地源',
        version: 1,
        urls: oldSource?.detail.urls || [],
      },
      disable: oldSource?.disable || false,
    };
    try {
      let sourceType: SourceType | undefined;
      let extensionClass:
        | PhotoExtension
        | SongExtension
        | BookExtension
        | ComicExtension
        | VideoExtension
        | undefined;
      for (const [t, f] of [
        [SourceType.Photo, loadPhotoExtensionString],
        [SourceType.Book, loadBookExtensionString],
        [SourceType.Song, loadSongExtensionString],
        [SourceType.Comic, loadComicExtensionString],
        [SourceType.Video, loadVideoExtensionString],
      ] as const) {
        const c = f(String(content));
        if (c) {
          sourceType = t;
          extensionClass = c;
          break;
        }
      }
      if (!sourceType || !extensionClass) {
        showNotify('导入失败，不支持的订阅源');
        return;
      }
      const item = {
        id: extensionClass.id,
        name: extensionClass.name,
        type: sourceType,
        url: path,
        code: String(content),
      };
      const sc = await sourceClass(item);
      if (!sc) {
        showToast(`添加 ${item.name} 源失败`);
        return;
      }
      for (const existSource of subscribeSourceStore.subscribeSources) {
        if (existSource.detail.urls.find((item) => item.id === sc.id)) {
          showNotify(`${sc.name} 在 ${existSource.detail.name} 已存在`);
          return;
        }
      }
      addToSource(
        {
          item,
        },
        true,
      );
      source.detail.urls.push(item);
      subscribeSourceStore.addSubscribeSource(source); // 保存
    } catch (error) {
      showToast('添加订阅源失败');
    }
  };
  const updateSubscribeSources = async () => {
    if (!subscribeSourceStore.subscribeSources.length) {
      const dialog = await showConfirmDialog({
        message: '您需要添加订阅源才能正常使用，\n是否立即导入默认订阅源？',
      });
      if (dialog === 'confirm') {
        await addSubscribeSource(DEFAULT_SOURCE_URL);
        showToast('默认源已导入');
      }
      return;
    }
    const displayStore = useDisplayStore();
    const t = displayStore.showToast();
    const failed: string[] = [];
    await Promise.all(
      subscribeSourceStore.subscribeSources.map(async (source) => {
        const url = source.url;
        try {
          if (source.detail.id === localSourceId) {
            await addLocalSubscribeSource(url);
          } else {
            await addSubscribeSource(url, true);
          }
        } catch (error) {
          console.log(error);
          failed.push(source.detail.name);
        }
      }),
    );
    // for (const source of subscribeSourceStore.subscribeSources) {
    //   const url = source.url;
    //   try {
    //     if (source.detail.id === localSourceId) {
    //       await addLocalSubscribeSource(url);
    //     } else {
    //       await addSubscribeSource(url, true);
    //     }
    //   } catch (error) {
    //     console.log(error);
    //     failed.push(source.detail.name);
    //   }
    // }

    if (failed.length > 0) {
      showNotify(`${failed.join(',')} 订阅源更新失败`);
    } else {
      showNotify({
        type: 'success',
        message: '更新订阅源成功',
        duration: 2000,
      });
    }
    displayStore.closeToast(t);
    await subscribeSourceStore.saveSubscribeSources();
    loadSubscribeSources(true);
  };
  /**
   * 将当前source添加到对应的列表中
   */
  const addToSource = (source: Source, load: boolean = false) => {
    sourceClasses.delete(source.item.id);
    let index: number;
    switch (source.item.type.toLowerCase()) {
      case SourceType.Photo:
        index = photoSources.value.findIndex(
          (item) => item.item.id === source.item.id,
        );
        if (index != -1) {
          photoSources.value[index].item = source.item;
        } else {
          photoSources.value.push(source as PhotoSource);
        }
        triggerRef(photoSources);
        if (load) {
          photoRecommendList(source);
        }
        break;
      case SourceType.Song:
        index = songSources.value.findIndex(
          (item) => item.item.id === source.item.id,
        );
        if (index != -1) {
          songSources.value[index].item = source.item;
        } else {
          songSources.value.push(source as SongSource);
        }
        triggerRef(songSources);
        if (load) {
          songRecommendPlayist(source);
          songRecommendSong(source);
        }
        break;
      case SourceType.Book:
        index = bookSources.value.findIndex(
          (item) => item.item.id === source.item.id,
        );
        if (index != -1) {
          bookSources.value[index].item = source.item;
        } else {
          bookSources.value.push(source as BookSource);
        }
        triggerRef(bookSources);
        if (load) {
          bookRecommendList(source);
        }
        break;
      case SourceType.Comic:
        index = comicSources.value.findIndex(
          (item) => item.item.id === source.item.id,
        );
        if (index != -1) {
          comicSources.value[index].item = source.item;
        } else {
          comicSources.value.push(source as ComicSource);
        }
        triggerRef(comicSources);
        if (load) {
          comicRecommendList(source);
        }
        break;
      case SourceType.Video:
        index = videoSources.value.findIndex(
          (item) => item.item.id === source.item.id,
        );
        if (index != -1) {
          videoSources.value[index].item = source.item;
        } else {
          videoSources.value.push(source as VideoSource);
        }
        triggerRef(videoSources);
        if (load) {
          videoRecommendList(source);
        }
        break;
      default:
        console.log('暂未实现', source);
        break;
    }
  };
  /**
   * 将当前source从对应的列表中删除
   */
  const removeFromSource = (itemId: string, sourceType: SourceType) => {
    switch (sourceType) {
      case SourceType.Photo:
        _.remove(photoSources.value, (source) => source.item.id === itemId);
        break;
      case SourceType.Song:
        _.remove(songSources.value, (source) => source.item.id === itemId);
        break;
      case SourceType.Book:
        _.remove(bookSources.value, (source) => source.item.id === itemId);
        break;
      case SourceType.Comic:
        _.remove(comicSources.value, (source) => source.item.id === itemId);
        break;
      case SourceType.Video:
        _.remove(videoSources.value, (source) => source.item.id === itemId);
        break;
      default:
        console.log('暂未实现 removeFromSource', sourceType);
    }
  };
  const loadSubscribeSources = (load?: boolean) => {
    load ??= false;
    const added: string[] = [];

    for (const source of subscribeSourceStore.subscribeSources) {
      if (source.detail) {
        for (const item of source.detail.urls) {
          if (!item.disable) {
            const found = getSource(item);
            if (found) {
              found.item = item;
            } else {
              addToSource(
                {
                  item,
                },
                false,
              );
            }
            added.push(item.id);
          } else {
            // const found = getSource(item);
            // if (found) {
            //   removeSource(item);
            // }
          }
        }
      }
    }
    // 移除多余的source
    for (const source of [
      ...photoSources.value,
      ...songSources.value,
      ...bookSources.value,
      ...comicSources.value,
      ...videoSources.value,
    ]) {
      if (!added.includes(source.item.id)) {
        if (source.item.id.includes('test') && keepTest.value) {
          continue;
        }
        removeFromSource(source.item.id, source.item.type);
      }
    }
    if (load) {
      const bookHasContent = (a?: BooksList): boolean =>
        a != null && (Array.isArray(a) ? !!a.length : !!a.list?.length);
      const comicHasContent = (a?: ComicsList): boolean =>
        a != null && (Array.isArray(a) ? !!a.length : !!a.list?.length);
      const videoHasContent = (a?: VideosList): boolean =>
        a != null && (Array.isArray(a) ? !!a.length : !!a.list?.length);
      sleep(4000).then(async () => {
        await Promise.all(
          [
            photoSources,
            songSources,
            bookSources,
            comicSources,
            videoSources,
          ].map(async (sources) => {
            await Promise.all(
              sources.value.map(async (source) => {
                switch (source.item.type) {
                  case SourceType.Photo:
                    if (!(source as PhotoSource).list?.list.length) {
                      console.log(`初始化加载photo ${source.item.name}`);
                      await photoRecommendList(source as PhotoSource);
                    }
                    break;
                  case SourceType.Song:
                    if (!(source as SongSource).playlist?.list.length) {
                      console.log(`初始化加载playlist ${source.item.name}`);
                      await songRecommendPlayist(source);
                    }
                    if (!(source as SongSource).songList?.list.length) {
                      console.log(`初始化加载song ${source.item.name}`);
                      await songRecommendSong(source);
                    }
                    break;
                  case SourceType.Book:
                    if (!bookHasContent((source as BookSource).list)) {
                      console.log(`初始化加载book ${source.item.name}`);
                      await bookRecommendList(source as BookSource);
                    }
                    break;
                  case SourceType.Comic:
                    if (!comicHasContent((source as ComicSource).list)) {
                      console.log(`初始化加载comic ${source.item.name}`);
                      await comicRecommendList(source as ComicSource);
                    }
                    break;
                  case SourceType.Video:
                    if (!videoHasContent((source as VideoSource).list)) {
                      console.log(`初始化加载video ${source.item.name}`);
                      await videoRecommendList(source as VideoSource);
                    }
                    break;
                  default:
                    break;
                }
              }),
            );
          }),
        );
        console.log('初始化加载完成');
      });
    }
  };

  const addTestSource = (extension: Extension, type: SourceType) => {
    const item = {
      id: extension.id,
      name: extension.name,
      type: '',
      url: '',
      code: 'test',
    };
    switch (type) {
      case SourceType.Photo:
        item.type = SourceType.Photo;
        break;
      case SourceType.Song:
        item.type = SourceType.Song;
        break;
      case SourceType.Book:
        item.type = SourceType.Book;
        break;
      case SourceType.Comic:
        item.type = SourceType.Comic;
        break;
      case SourceType.Video:
        item.type = SourceType.Video;
        break;
      default:
        break;
    }
    if (!item.type) return;
    addToSource(
      {
        item: item as SubscribeItem,
      },
      true,
    );
  };

  const clearData = async () => {
    const loading = showLoadingToast({
      message: '清空中',
      duration: 0,
      closeOnClick: true,
      closeOnClickOverlay: false,
    });
    // 清空订阅源
    await subscribeSourceStore.clearSubscribeSources();
    loadSubscribeSources(true);

    const photoShelfStore = usePhotoShelfStore();
    photoShelfStore.clear(); // 清空图片收藏
    const songShelfStore = useSongShelfStore();
    songShelfStore.clear(); // 清空音乐收藏
    const bookShelfStore = useBookShelfStore();
    bookShelfStore.clear(); // 清空书架
    const comicShelfStore = useComicShelfStore();
    comicShelfStore.clear(); // 清空漫画收藏
    const videoShelfStore = useVideoShelfStore();
    videoShelfStore.clear(); // 清空视频收藏

    // 清空章节缓存
    bookChapterStore.clear();
    // 清空音乐缓存
    const songCacheStore = useSongCacheStore();
    songCacheStore.clear();
    localStorage.clear();
    kvStorage.storage.clear();
    loading.close();
  };
  const clearCache = async () => {
    const toast = showLoadingToast({
      message: '请稍候',
      duration: 0,
      closeOnClick: true,
      closeOnClickOverlay: false,
    });
    // 清空章节缓存
    await bookChapterStore.clear();
    // 清空音乐缓存
    const songCacheStore = useSongCacheStore();
    await songCacheStore.clear();
    if ('caches' in window) {
      const cache = await caches.open('tauri-cache');
      for (const key of await cache.keys()) {
        await cache.delete(key);
      }
      cache.delete('*');
    }
    toast.close();
    showToast('缓存已清空');
  };

  const latestUpdateSource = useStorageAsync('latestUpdateSource', 0);

  onBeforeMount(async () => {
    await subscribeSourceStore.init();
    if (!subscribeSourceStore.isEmpty) {
      // 更新订阅源
      if (Date.now() - latestUpdateSource.value > 1000 * 60 * 60 * 24) {
        await updateSubscribeSources();
        latestUpdateSource.value = Date.now();
      }
      // try {
      //   const dialog = await showConfirmDialog({
      //     title: "订阅更新",
      //     message: "是否立即更新所有订阅源？",
      //   });
      //   if (dialog === "confirm") {
      //     await updateSubscribeSources();
      //   }
      // } catch (error) {}
    } else {
      try {
        const dialog = await showConfirmDialog({
          message: '您需要添加订阅源才能正常使用，\n是否立即导入默认订阅源？',
        });
        if (dialog === 'confirm') {
          await addSubscribeSource(DEFAULT_SOURCE_URL);
          showToast('默认源已导入');
        }
      } catch (error) {
        _;
      }
    }
    // keepTest.value = true;
    // addTestSource(new TestSongExtension(), SourceType.Song);
    // addTestSource(new TestBookExtension(), SourceType.Book);
    // addTestSource(new TestPhotoExtension(), SourceType.Photo);
    // addTestSource(new TestComicExtension(), SourceType.Comic);
    // addTestSource(new TestVideoExtension(), SourceType.Video);

    loadSubscribeSources(true);
  });

  return {
    sourceClasses,
    sourceClass,

    hotItems,

    photoSources,
    photoRecommendList,
    photoSearchList,
    photoDetail,
    getPhotoSource,
    getPhotoItem,
    getSongSource,

    songSources,
    songRecommendPlayist,
    songPlaylistDetail,
    songRecommendSong,
    songSearchSong,
    songSearchPlaylist,
    getPlaylistInfo,
    songPlaylistPlayAll,

    bookSources,
    bookRecommendList,
    bookSearch,
    bookDetail,
    bookRead,
    getBookSource,
    getBookItem,

    comicSources,
    comicRecommendList,
    comicSearch,
    comicDetail,
    comicRead,
    getComicSource,
    getComicItem,

    videoSources,
    videoRecommendList,
    videoSearch,
    videoDetail,
    videoPlay,
    getVideoSource,
    getVideoItem,

    addSubscribeSource,
    addLocalSubscribeSource,
    loadSubscribeSources,
    updateSubscribeSources,
    removeFromSource,

    clearData,
    clearCache,
  };
});
