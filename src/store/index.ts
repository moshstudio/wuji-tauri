export * from './bookChaptersStore';
export * from './bookShelfStore';
export * from './bookStore';
export * from './comicShelfStore';
export * from './comicStore';
export * from './displayStore';
export * from './photoShelfStore';
export * from './songCacheStore';
export * from './songShelfStore';
export * from './songStore';
export * from './store';
export * from './subscribeSourceStore';
export * from './ttsStore';
export * from './utils';
export * from './videoShelfStore';

// import _ from 'lodash';
// import CryptoJS from 'crypto-js';
// import { HotItem } from '@/apis/hot/apiHot';
// import {
//   loadPhotoExtensionString,
//   PhotoExtension,
//   PhotoItem,
//   PhotoShelf,
// } from '@/extensions/photo';
// import {
//   SongSource,
//   PhotoSource,
//   Source,
//   SourceType,
//   SubscribeDetail,
//   SubscribeSource,
//   SubscribeItem,
//   BookSource,
//   ComicSource,
//   VideoSource,
// } from '@/types';
// import {
//   StorageLikeAsync,
//   useDark,
//   useStorageAsync,
//   useToggle,
// } from '@vueuse/core';
// import {
//   clearInterval,
//   clearTimeout,
//   setInterval,
//   setTimeout,
// } from 'worker-timers';
// import { defineStore } from 'pinia';
// import {
//   showConfirmDialog,
//   showLoadingToast,
//   showNotify,
//   showToast,
// } from 'vant';
// import {
//   computed,
//   nextTick,
//   onBeforeMount,
//   onMounted,
//   onUnmounted,
//   reactive,
//   Ref,
//   ref,
//   triggerRef,
// } from 'vue';
// import { Channel, invoke, PluginListener } from '@tauri-apps/api/core';
// import { Store } from '@tauri-apps/plugin-store';
// import { type as osType } from '@tauri-apps/plugin-os';
// import * as fs from 'tauri-plugin-fs-api';
// import * as androidMedia from 'tauri-plugin-mediasession-api';
// import * as commands from 'tauri-plugin-commands-api';
// import { ClientOptions, fetch } from '@/utils/fetch';
// import {
//   loadSongExtensionString,
//   SongShelf,
//   PlaylistInfo,
//   SongExtension,
//   SongInfo,
//   ArtistInfo,
// } from '@/extensions/song';
// import { SongPlayMode, SongShelfType } from '@/types/song';
// import { ReadTheme } from '@/types/book';
// import { watch } from 'vue';
// import {
//   DEFAULT_SOURCE_URL,
//   joinSongArtists,
//   sanitizePathName,
//   sleep,
//   songUrlToString,
//   tryCatchProxy,
// } from '@/utils';
// import {
//   BookChapter,
//   BookExtension,
//   BookItem,
//   BookList,
//   BookShelf,
//   BooksList,
//   loadBookExtensionString,
// } from '@/extensions/book';
// import { Extension } from '@/extensions/baseExtension';

// import TestPhotoExtension from '@/extensions/photo/test';
// import TestSongExtension from '@/extensions/song/test';
// import TestBookExtension from '@/extensions/book/test';
// import TestComicExtension from '@/extensions/comic/test';
// import TestVideoExtension from '@/extensions/video/test';
// import { nanoid } from 'nanoid';
// import { createCancellableFunction } from '@/utils/cancelableFunction';
// import { getSongCover } from '@/utils/songCover';

// import {
//   ComicChapter,
//   ComicContent,
//   ComicExtension,
//   ComicItem,
//   ComicShelf,
//   loadComicExtensionString,
// } from '@/extensions/comic';
// import {
//   loadVideoExtensionString,
//   VideoEpisode,
//   VideoExtension,
//   VideoItem,
//   VideoItemInShelf,
//   VideoResource,
//   VideoShelf,
//   VideoUrlMap,
// } from '@/extensions/video';
// import HeartSVG from '@/assets/heart-fill.svg';
// import { getCurrentWindow } from '@tauri-apps/api/window';

// async function tauriAddPluginListener<T>(
//   plugin: string,
//   event: string,
//   cb: (payload: T) => void
// ) {
//   const handler = new Channel();
//   handler.onmessage = (response: unknown) => {
//     cb(response as T);
//   };
//   return invoke(`plugin:${plugin}|register_listener`, { event, handler }).then(
//     () => new PluginListener(plugin, event, handler.id)
//   );
// }
// export const useStore = defineStore('store', () => {
//   const hotItems = ref<HotItem[]>([]); // 热搜榜

//   const subscribeSourceStore = useSubscribeSourceStore();
//   const songStore = useSongStore();
//   const kvStorage = createKVStore();
//   const bookChapterStore = useBookChapterStore();
//   const bookShelfStore = useBookShelfStore();

//   const sourceClasses = new Map<String, Extension | null>();
//   const sourceClass = async (
//     item: SubscribeItem
//   ): Promise<Extension | null | undefined> => {
//     if (item.id && sourceClasses.has(item.id)) {
//       return sourceClasses.get(item.id);
//     }
//     // for test
//     if (item.code === 'test') {
//       switch (item.type) {
//         case SourceType.Photo:
//           sourceClasses.set(item.id, new TestPhotoExtension());
//           break;
//         case SourceType.Song:
//           sourceClasses.set(item.id, new TestSongExtension());
//           break;
//         case SourceType.Book:
//           sourceClasses.set(item.id, new TestBookExtension());
//           break;
//         case SourceType.Comic:
//           sourceClasses.set(item.id, new TestComicExtension());
//           break;
//         case SourceType.Video:
//           sourceClasses.set(item.id, new TestVideoExtension());
//           break;
//         default:
//           break;
//       }
//       return sourceClasses.get(item.id);
//     }
//     if (!item.code) {
//       try {
//         item.code = await (await fetch(item.url)).text();
//       } catch (error) {
//         console.log('加载扩展失败:', item);
//         sourceClasses.set(item.id, null);
//         return null;
//       }
//     }
//     let extensionClass:
//       | PhotoExtension
//       | SongExtension
//       | BookExtension
//       | ComicExtension
//       | VideoExtension
//       | undefined;
//     switch (item.type) {
//       case SourceType.Photo:
//         extensionClass = loadPhotoExtensionString(item.code);
//         break;
//       case SourceType.Song:
//         extensionClass = loadSongExtensionString(item.code);
//         break;
//       case SourceType.Book:
//         extensionClass = loadBookExtensionString(item.code);
//         break;
//       case SourceType.Comic:
//         extensionClass = loadComicExtensionString(item.code);
//         break;
//       case SourceType.Video:
//         extensionClass = loadVideoExtensionString(item.code);
//         break;
//       default:
//         extensionClass = undefined;
//         break;
//     }
//     if (!extensionClass) {
//       showToast(`添加 ${item.name} 订阅源失败`);
//       sourceClasses.delete(item.id);
//       return null;
//     }
//     // 防止报错
//     extensionClass = tryCatchProxy(extensionClass);
//     extensionClass.codeString = item.code;
//     item.id ||= extensionClass.id; // item.id默认可以为空
//     item.name ||= extensionClass.name; // item.name默认可以为空
//     sourceClasses.set(item.id, extensionClass);
//     return extensionClass;
//   };

//   const photoSources = useStorageAsync<PhotoSource[]>(
//     'photoSources',
//     [],
//     kvStorage.storage
//   );

//   const songSources = useStorageAsync<SongSource[]>(
//     'songSources',
//     [],
//     kvStorage.storage
//   );

//   const bookSources = useStorageAsync<BookSource[]>(
//     'bookSources',
//     [],
//     kvStorage.storage
//   );

//   const comicSources = useStorageAsync<ComicSource[]>(
//     'comicSources',
//     [],
//     kvStorage.storage
//   );
//   const videoSources = useStorageAsync<VideoSource[]>(
//     'videoSources',
//     [],
//     kvStorage.storage
//   );
//   const keepTest = ref(false);

//   const __split__0 = () => {};
//   /**
//    * 获取推荐列表
//    */
//   const photoRecommendList = async (
//     source: PhotoSource,
//     pageNo: number = 1
//   ) => {
//     const sc = (await sourceClass(source.item)) as PhotoExtension;
//     const res = await sc?.execGetRecommendList(pageNo);

//     if (res) {
//       source.list = res;
//     } else {
//       showToast(`${source.item.name} 推荐结果为空`);
//       source.list = undefined;
//     }
//     triggerRef(photoSources);
//   };
//   /**
//    * 搜索
//    */
//   const photoSearchList = async (
//     source: PhotoSource,
//     keyword: string,
//     pageNo: number = 1
//   ) => {
//     const sc = (await sourceClass(source.item)) as PhotoExtension;
//     const res = await sc?.execSearch(keyword, pageNo);

//     if (res) {
//       source.list = res;
//     } else {
//       showToast(`${source.item.name} 搜索结果为空`);
//       source.list = undefined;
//     }
//     triggerRef(photoSources);
//   };
//   /**
//    * 获取详情
//    */
//   const photoDetail = async (
//     source: PhotoSource,
//     item: PhotoItem,
//     pageNo: number = 1
//   ) => {
//     const sc = (await sourceClass(source.item)) as PhotoExtension;
//     const res = await sc?.execGetPhotoDetail(item, pageNo);
//     if (res) {
//       return res;
//     } else {
//       showNotify(`${source.item.name} 获取内容失败`);
//       return null;
//     }
//   };

//   const getPhotoSource = (sourceId: string): PhotoSource | undefined => {
//     return photoSources.value.find((item) => item.item.id === sourceId);
//   };
//   /**
//    * 根据id获取图片
//    */
//   const getPhotoItem = (
//     source: PhotoSource,
//     itemId: string
//   ): PhotoItem | undefined => {
//     const fromShelf = () => {
//       for (const shelf of shelfStore.photoShelf) {
//         for (const item of shelf.photos) {
//           if (item.id === itemId) {
//             return item;
//           }
//         }
//       }
//     };
//     const fromSource = () => {
//       if (source.list) {
//         return source.list.list.find((item) => item.id === itemId);
//       }
//     };
//     const shelfStore = usePhotoShelfStore();
//     if (shelfStore.photoInShelf(itemId)) {
//       return fromShelf();
//     } else {
//       return fromSource();
//     }
//   };
//   const __split__1 = () => {};
//   // 音乐
//   const songRecommendPlayist = async (
//     source: SongSource,
//     pageNo: number = 1
//   ) => {
//     const sc = (await sourceClass(source.item)) as SongExtension;
//     const res = await sc?.execGetRecommendPlaylists(pageNo);
//     if (res) {
//       source.playlist = res;
//     } else {
//       source.playlist = undefined;
//     }
//     triggerRef(songSources);
//   };
//   const songPlaylistDetail = async (
//     source: SongSource,
//     item: PlaylistInfo,
//     pageNo: number = 1
//   ) => {
//     const toast = showLoadingToast({
//       message: '加载中',
//       duration: 0,
//       closeOnClick: true,
//       closeOnClickOverlay: false,
//     });
//     const sc = (await sourceClass(source.item)) as SongExtension;
//     const res = await sc?.execGetPlaylistDetail(item, pageNo);
//     toast.close();
//     if (res) {
//       return res;
//     } else {
//       showNotify(`${source.item.name} 获取内容失败`);
//       return null;
//     }
//   };
//   const songPlaylistPlayAll = async (item: PlaylistInfo) => {
//     const source = getSongSource(item.sourceId);
//     if (!source) {
//       showNotify(`获取内容失败`);
//       return;
//     }
//     const songs: SongInfo[] = [];
//     let pageNo = 1;
//     while (true) {
//       const sc = (await sourceClass(source.item)) as SongExtension;
//       const res = await sc?.execGetPlaylistDetail(
//         _.cloneDeep(item), // 不修改原对象
//         pageNo
//       );

//       if (res && res.list?.list) {
//         songs.push(...res.list.list);
//         pageNo += 1;
//         const totalPage = res.totalPage || res.list.totalPage;
//         if (!totalPage || pageNo > totalPage) {
//           break;
//         }
//       } else {
//         break;
//       }
//     }
//     if (!songs) {
//       showNotify(`内容为空`);
//       return;
//     } else {
//       const songStore = useSongStore();
//       await songStore.setPlayingList(songs, songs[0]);
//     }
//   };
//   const songRecommendSong = async (source: SongSource, pageNo: number = 1) => {
//     const sc = (await sourceClass(source.item)) as SongExtension;
//     const res = await sc?.execGetRecommendSongs(pageNo);
//     if (res) {
//       source.songList = res;
//     } else {
//       source.songList = undefined;
//     }
//     triggerRef(songSources);
//   };
//   const songSearchSong = async (
//     source: SongSource,
//     keyword: string,
//     pageNo: number = 1
//   ) => {
//     const sc = (await sourceClass(source.item)) as SongExtension;
//     const res = await sc?.execSearchSongs(keyword, pageNo);
//     if (res) {
//       source.songList = res;
//     } else {
//       source.songList = undefined;
//     }
//     triggerRef(songSources);
//   };
//   const songSearchPlaylist = async (
//     source: SongSource,
//     keyword: string,
//     pageNo: number = 1
//   ) => {
//     const sc = (await sourceClass(source.item)) as SongExtension;
//     const res = await sc?.execSearchPlaylists(keyword, pageNo);
//     if (res) {
//       source.playlist = res;
//     } else {
//       source.playlist = undefined;
//     }
//     triggerRef(songSources);
//   };
//   const getPlaylistInfo = (
//     source: SongSource,
//     playlistId: string
//   ): PlaylistInfo | undefined => {
//     return source.playlist?.list.find((item) => item.id === playlistId);
//   };
//   const getSongSource = (sourceId: string): SongSource | undefined => {
//     return songSources.value.find((source) => source.item.id === sourceId);
//   };
//   const __split__2 = () => {};

//   /**
//    * 获取推荐列表
//    */
//   const bookRecommendList = async (
//     source: BookSource,
//     pageNo: number = 1,
//     type?: string
//   ) => {
//     const sc = (await sourceClass(source.item)) as BookExtension;
//     const res = await sc?.execGetRecommendBooks(pageNo, type);

//     if (res) {
//       if (!type) {
//         // 1. 获取的不是指定type类型的数据，直接赋值
//         source.list = res;
//       } else {
//         // 2. 获取的是指定type类型的数据，判断是否已经存在，不存在则添加
//         const find = _.castArray(source.list).find(
//           (item) => item.type === type
//         );
//         if (find) {
//           _.assign(find, res);
//         } else {
//           source.list = [..._.castArray(source.list), ..._.castArray(res)];
//         }
//       }
//     } else {
//       if (!type) {
//         source.list = undefined;
//       }
//     }
//     triggerRef(bookSources);
//   };
//   const bookSearch = async (
//     source: BookSource,
//     keyword: string,
//     pageNo: number = 1
//   ) => {
//     const sc = (await sourceClass(source.item)) as BookExtension;
//     const res = await sc?.execSearch(keyword, pageNo);
//     if (res) {
//       if (!_.isArray(res) && !res.list.length) {
//         source.list = undefined;
//         return;
//       }
//       source.list = res;
//     } else {
//       source.list = undefined;
//     }
//     triggerRef(bookSources);
//   };
//   const bookDetail = async (source: BookSource, book: BookItem) => {
//     const sc = (await sourceClass(source.item)) as BookExtension;
//     const res = await sc?.execGetBookDetail(book);
//     if (res) {
//       return res;
//     } else {
//       showNotify(`${source.item.name} 获取内容失败`);
//       return null;
//     }
//   };
//   const bookRead = async (
//     source: BookSource,
//     book: BookItem,
//     chapter: BookChapter,
//     options?: {
//       cacheMoreChapters?: boolean;
//       refresh?: boolean;
//     }
//   ): Promise<string | null> => {
//     options ||= {};
//     if (options.cacheMoreChapters === undefined) {
//       options.cacheMoreChapters = true;
//     }
//     if (options.refresh === undefined) {
//       options.refresh = false;
//     }
//     if (!options.refresh) {
//       const content = await bookChapterStore.getBookChapter(book, chapter);
//       if (content) {
//         if (options.cacheMoreChapters && bookShelfStore.isBookInShelf(book)) {
//           // 只缓存在书架中的书
//           cacheBookChapters(source, book, chapter);
//         }
//         return content;
//       }
//     }

//     const sc = (await sourceClass(source.item)) as BookExtension;
//     const res = await sc?.execGetContent(book, chapter);
//     if (res) {
//       if (bookShelfStore.isBookInShelf(book)) {
//         // 只缓存在书架中的书
//         await bookChapterStore.saveBookChapter(book, chapter, res);
//         if (options.cacheMoreChapters) {
//           cacheBookChapters(source, book, chapter);
//         }
//       }
//     }

//     return res;
//   };
//   const cacheBookChapters = createCancellableFunction(
//     async (
//       signal: AbortSignal,
//       source: BookSource,
//       book: BookItem,
//       chapter: BookChapter
//     ) => {
//       if (!book.chapters) return;
//       const index = book.chapters.findIndex((item) => item.id === chapter.id);
//       if (index === -1) return;
//       let count = 1;
//       const bookStore = useBookStore();
//       while (count <= bookStore.chapterCacheNum) {
//         if (signal.aborted) {
//           return;
//         }
//         const targetChapter = book.chapters[index + count];
//         if (targetChapter) {
//           await bookRead(source, book, targetChapter, {
//             cacheMoreChapters: false,
//           });
//         }
//         count += 1;
//         if (count >= book.chapters.length) {
//           return;
//         }
//       }
//     }
//   );
//   const getBookSource = (sourceId: string): BookSource | undefined => {
//     return bookSources.value.find((item) => item.item.id === sourceId);
//   };
//   const getBookItem = (
//     source: BookSource,
//     bookId: string
//   ): BookItem | undefined => {
//     const checkFromShelf = () => {
//       for (const shelf of shelfStore.bookShelf) {
//         for (const book of shelf.books) {
//           if (book.book.id === bookId) {
//             return book.book;
//           }
//         }
//       }
//     };
//     const fromSource = () => {
//       if (source.list) {
//         for (let bookList of _.castArray(source.list)) {
//           for (let bookItem of bookList.list) {
//             if (bookItem.id === bookId) {
//               return bookItem;
//             }
//           }
//         }
//       }
//     };

//     const shelfStore = useBookShelfStore();
//     // 优先从书架中获取
//     if (shelfStore.isBookInShelf(bookId)) {
//       return checkFromShelf();
//     } else {
//       return fromSource();
//     }
//   };
//   const __split__3 = () => {};

//   const comicRecommendList = async (
//     source: ComicSource,
//     pageNo: number = 1,
//     type?: string
//   ) => {
//     const sc = (await sourceClass(source.item)) as ComicExtension;
//     const res = await sc?.execGetRecommendComics(pageNo, type);

//     if (res) {
//       if (!type) {
//         // 1. 获取的不是指定type类型的数据，直接赋值
//         source.list = res;
//       } else {
//         // 2. 获取的是指定type类型的数据，判断是否已经存在，不存在则添加
//         const find = _.castArray(source.list).find(
//           (item) => item.type === type
//         );
//         if (find) {
//           _.assign(find, res);
//         } else {
//           source.list = [..._.castArray(source.list), ..._.castArray(res)];
//         }
//       }
//     } else {
//       if (!type) {
//         source.list = undefined;
//       }
//     }
//     triggerRef(comicSources);
//   };
//   const comicSearch = async (
//     source: ComicSource,
//     keyword: string,
//     pageNo: number = 1
//   ) => {
//     const sc = (await sourceClass(source.item)) as ComicExtension;
//     const res = await sc?.execSearch(keyword, pageNo);
//     if (res) {
//       if (!_.isArray(res) && !res.list.length) {
//         source.list = undefined;
//         return;
//       }
//       source.list = res;
//     } else {
//       source.list = undefined;
//     }
//     triggerRef(comicSources);
//   };
//   const comicDetail = async (source: ComicSource, comic: ComicItem) => {
//     const sc = (await sourceClass(source.item)) as ComicExtension;
//     const res = await sc?.execGetComicDetail(comic);
//     if (res) {
//       return res;
//     } else {
//       showNotify(`${source.item.name} 获取内容失败`);
//       return null;
//     }
//   };
//   const comicRead = async (
//     source: ComicSource,
//     comic: ComicItem,
//     chapter: ComicChapter
//   ): Promise<ComicContent | null> => {
//     const sc = (await sourceClass(source.item)) as ComicExtension;
//     const res = await sc?.execGetContent(comic, chapter);
//     return res;
//   };
//   const getComicSource = (sourceId: string): ComicSource | undefined => {
//     return comicSources.value.find((item) => item.item.id === sourceId);
//   };
//   const getComicItem = (
//     source: ComicSource,
//     comicId: string
//   ): ComicItem | undefined => {
//     const checkFromShelf = () => {
//       for (const shelf of shelfStore.comicShelf) {
//         for (const comic of shelf.comics) {
//           if (comic.comic.id === comicId) {
//             return comic.comic;
//           }
//         }
//       }
//     };
//     const fromSource = () => {
//       if (source.list) {
//         for (let comicList of _.castArray(source.list)) {
//           for (let comicItem of comicList.list) {
//             if (comicItem.id === comicId) {
//               return comicItem;
//             }
//           }
//         }
//       }
//     };

//     const shelfStore = useComicShelfStore();
//     // 优先从书架中获取
//     if (shelfStore.isComicInShelf(comicId)) {
//       return checkFromShelf();
//     } else {
//       return fromSource();
//     }
//   };

//   const __split__4 = () => {};

//   const videoRecommendList = async (
//     source: VideoSource,
//     pageNo: number = 1,
//     type?: string
//   ) => {
//     const sc = (await sourceClass(source.item)) as VideoExtension;
//     const res = await sc?.execGetRecommendVideos(pageNo, type);

//     if (res) {
//       if (!type) {
//         // 1. 获取的不是指定type类型的数据，直接赋值
//         source.list = res;
//       } else {
//         // 2. 获取的是指定type类型的数据，判断是否已经存在，不存在则添加
//         const find = _.castArray(source.list).find(
//           (item) => item.type === type
//         );
//         if (find) {
//           _.assign(find, res);
//         } else {
//           source.list = [..._.castArray(source.list), ..._.castArray(res)];
//         }
//       }
//     } else {
//       if (!type) {
//         source.list = undefined;
//       }
//     }
//     triggerRef(videoSources);
//   };
//   const videoSearch = async (
//     source: VideoSource,
//     keyword: string,
//     pageNo: number = 1
//   ) => {
//     const sc = (await sourceClass(source.item)) as VideoExtension;
//     const res = await sc?.execSearch(keyword, pageNo);
//     if (res) {
//       if (!_.isArray(res)) {
//         if (!res.list?.length) {
//           source.list = undefined;
//           return;
//         }
//       }
//       source.list = res;
//     } else {
//       source.list = undefined;
//     }
//   };
//   const videoDetail = async (source: VideoSource, video: VideoItem) => {
//     const sc = (await sourceClass(source.item)) as VideoExtension;
//     const res = await sc?.execGetVideoDetail(video);
//     if (res) {
//       return res;
//     } else {
//       showNotify(`${source.item.name} 获取内容失败`);
//       return null;
//     }
//   };
//   const videoPlay = async (
//     source: VideoSource,
//     video: VideoItem,
//     resource: VideoResource,
//     episode: VideoEpisode
//   ): Promise<VideoUrlMap | null> => {
//     const sc = (await sourceClass(source.item)) as VideoExtension;
//     const res = await sc?.execGetPlayUrl(video, resource, episode);
//     return res;
//   };
//   const getVideoSource = (sourceId: string): VideoSource | undefined => {
//     return videoSources.value.find((item) => item.item.id === sourceId);
//   };
//   const getVideoItem = (
//     source: VideoSource,
//     videoId: string
//   ): ComicItem | undefined => {
//     const checkFromShelf = () => {
//       for (const shelf of shelfStore.videoShelf) {
//         for (const video of shelf.videos) {
//           if (video.video.id === videoId) {
//             return video.video;
//           }
//         }
//       }
//     };
//     const fromSource = () => {
//       if (source.list) {
//         for (let videoList of _.castArray(source.list)) {
//           if (videoList.list) {
//             for (let videoItem of videoList.list) {
//               if (videoItem.id === videoId) {
//                 return videoItem;
//               }
//             }
//           }
//         }
//       }
//     };

//     const shelfStore = useVideoShelfStore();
//     // 优先从书架中获取
//     if (shelfStore.isVideoInShelf(videoId)) {
//       return checkFromShelf();
//     } else {
//       return fromSource();
//     }
//   };

//   /**
//    * 根据名称获取源
//    */
//   const getSource = (item: SubscribeItem): Source | undefined => {
//     switch (item.type) {
//       case SourceType.Photo:
//         return getPhotoSource(item.id);
//       case SourceType.Song:
//         return getSongSource(item.id);
//       case SourceType.Book:
//         return getBookSource(item.id);
//       case SourceType.Comic:
//         return getComicSource(item.id);
//       default:
//         return undefined;
//     }
//   };
//   const removeSource = (item: SubscribeItem) => {
//     switch (item.type) {
//       case SourceType.Photo:
//         _.remove(photoSources.value, (p) => p.item.id === item.id);
//         triggerRef(photoSources);
//         break;
//       case SourceType.Song:
//         _.remove(songSources.value, (p) => p.item.id === item.id);
//         triggerRef(songSources);
//         break;
//       case SourceType.Book:
//         _.remove(bookSources.value, (p) => p.item.id === item.id);
//         triggerRef(bookSources);
//         break;
//       case SourceType.Comic:
//         _.remove(comicSources.value, (p) => p.item.id === item.id);
//         triggerRef(comicSources);
//         break;
//       case SourceType.Video:
//         _.remove(videoSources.value, (p) => p.item.id === item.id);
//         triggerRef(videoSources);
//         break;
//       default:
//         return undefined;
//     }
//   };

//   /**
//    * 添加订阅源
//    */
//   const addSubscribeSource = async (url: string, raise: boolean = false) => {
//     const displayStore = useDisplayStore();
//     const t = displayStore.showToast();
//     try {
//       // 1. 从网址获取内容
//       const subscribeResponse = await fetch(url);
//       const res: SubscribeDetail = await subscribeResponse.json();
//       // 2. 检查是否已存在，然后同步disable状态
//       const oldSource = subscribeSourceStore.getSubscribeSource(res.id);
//       // 3.测试是否可用，然后添加
//       const source: SubscribeSource = {
//         url: url,
//         detail: {
//           id: res.id,
//           name: res.name,
//           version: res.version,
//           requireVersion: res.requireVersion,
//           urls: [],
//         },
//         disable: oldSource?.disable || false,
//       };
//       for (let item of res.urls) {
//         try {
//           const sc = await sourceClass(item);
//           if (!sc) {
//             showToast(`添加 ${item.name} 订阅源失败`);
//             continue;
//           }
//           item.id ||= sc.id || sc.hash;
//           item.name ||= sc.name;
//           item.code ||= sc.codeString;
//           addToSource(
//             {
//               item,
//             },
//             true
//           );
//           source.detail.urls.push(item);
//         } catch (error) {
//           showToast(`添加 ${item.name} 订阅源失败`);
//         }
//       }
//       // 同步disable状态
//       if (source.detail.urls.every((item) => item.disable)) {
//         source.disable = true;
//       }
//       source.detail.urls.forEach((item) => {
//         item.disable =
//           oldSource?.detail.urls.find((s) => s.id === item.id)?.disable ||
//           false;
//       });
//       subscribeSourceStore.addSubscribeSource(source); //保存
//     } catch (error) {
//       showToast('添加订阅源失败');
//       if (raise) {
//         throw error;
//       }
//     } finally {
//       displayStore.closeToast(t);
//     }
//   };

//   const localSourceId = 'localSource-wuji';

//   const addLocalSubscribeSource = async (path: string) => {
//     let content: String;
//     try {
//       content = await fs.readTextFile(path);
//     } catch (error) {
//       showNotify(`读取文件失败:${String(error)}`);
//       return;
//     }
//     const oldSource = subscribeSourceStore.getSubscribeSource(localSourceId);
//     const source: SubscribeSource = {
//       url: '',
//       detail: {
//         id: localSourceId,
//         name: '本地源',
//         version: 1,
//         urls: oldSource?.detail.urls || [],
//       },
//       disable: oldSource?.disable || false,
//     };
//     try {
//       let sourceType: SourceType | undefined;
//       let extensionClass:
//         | PhotoExtension
//         | SongExtension
//         | BookExtension
//         | ComicExtension
//         | VideoExtension
//         | undefined;
//       for (const [t, f] of [
//         [SourceType.Photo, loadPhotoExtensionString],
//         [SourceType.Book, loadBookExtensionString],
//         [SourceType.Song, loadSongExtensionString],
//         [SourceType.Comic, loadComicExtensionString],
//         [SourceType.Video, loadVideoExtensionString],
//       ] as const) {
//         const c = f(String(content));
//         if (c) {
//           sourceType = t;
//           extensionClass = c;
//           break;
//         }
//       }
//       if (!sourceType || !extensionClass) {
//         showNotify('导入失败，不支持的订阅源');
//         return;
//       }
//       const item = {
//         id: extensionClass.id,
//         name: extensionClass.name,
//         type: sourceType,
//         url: path,
//         code: String(content),
//       };
//       const sc = await sourceClass(item);
//       if (!sc) {
//         showToast(`添加 ${item.name} 源失败`);
//         return;
//       }
//       for (let existSource of subscribeSourceStore.subscribeSources) {
//         if (existSource.detail.urls.find((item) => item.id === sc.id)) {
//           showNotify(`${sc.name} 在 ${existSource.detail.name} 已存在`);
//           return;
//         }
//       }
//       addToSource(
//         {
//           item,
//         },
//         true
//       );
//       source.detail.urls.push(item);
//       subscribeSourceStore.addSubscribeSource(source); //保存
//     } catch (error) {
//       showToast('添加订阅源失败');
//       return;
//     }
//   };
//   const updateSubscribeSources = async () => {
//     if (!subscribeSourceStore.subscribeSources.length) {
//       const dialog = await showConfirmDialog({
//         message: '您需要添加订阅源才能正常使用，\n是否立即导入默认订阅源？',
//       });
//       if (dialog === 'confirm') {
//         await addSubscribeSource(DEFAULT_SOURCE_URL);
//         showToast('默认源已导入');
//       }
//       return;
//     }
//     const displayStore = useDisplayStore();
//     const t = displayStore.showToast();
//     const failed: string[] = [];
//     await Promise.all(
//       subscribeSourceStore.subscribeSources.map(async (source) => {
//         const url = source.url;
//         try {
//           if (source.detail.id === localSourceId) {
//             await addLocalSubscribeSource(url);
//           } else {
//             await addSubscribeSource(url, true);
//           }
//         } catch (error) {
//           console.log(error);
//           failed.push(source.detail.name);
//         }
//       })
//     );
//     // for (const source of subscribeSourceStore.subscribeSources) {
//     //   const url = source.url;
//     //   try {
//     //     if (source.detail.id === localSourceId) {
//     //       await addLocalSubscribeSource(url);
//     //     } else {
//     //       await addSubscribeSource(url, true);
//     //     }
//     //   } catch (error) {
//     //     console.log(error);
//     //     failed.push(source.detail.name);
//     //   }
//     // }

//     if (failed.length > 0) {
//       showNotify(`${failed.join(',')} 订阅源更新失败`);
//     } else {
//       showNotify({
//         type: 'success',
//         message: '更新订阅源成功',
//         duration: 2000,
//       });
//     }
//     displayStore.closeToast(t);
//     await subscribeSourceStore.saveSubscribeSources();
//     loadSubscribeSources(true);
//   };
//   /**
//    * 将当前source添加到对应的列表中
//    */
//   const addToSource = (source: Source, load: boolean = false) => {
//     sourceClasses.delete(source.item.id);
//     let index: number;
//     switch (source.item.type.toLowerCase()) {
//       case SourceType.Photo:
//         index = photoSources.value.findIndex(
//           (item) => item.item.id === source.item.id
//         );
//         if (index != -1) {
//           photoSources.value[index].item = source.item;
//         } else {
//           photoSources.value.push(source as PhotoSource);
//         }
//         triggerRef(photoSources);
//         if (load) {
//           photoRecommendList(source);
//         }
//         break;
//       case SourceType.Song:
//         index = songSources.value.findIndex(
//           (item) => item.item.id === source.item.id
//         );
//         if (index != -1) {
//           songSources.value[index].item = source.item;
//         } else {
//           songSources.value.push(source as SongSource);
//         }
//         triggerRef(songSources);
//         if (load) {
//           songRecommendPlayist(source);
//           songRecommendSong(source);
//         }
//         break;
//       case SourceType.Book:
//         index = bookSources.value.findIndex(
//           (item) => item.item.id === source.item.id
//         );
//         if (index != -1) {
//           bookSources.value[index].item = source.item;
//         } else {
//           bookSources.value.push(source as BookSource);
//         }
//         triggerRef(bookSources);
//         if (load) {
//           bookRecommendList(source);
//         }
//         break;
//       case SourceType.Comic:
//         index = comicSources.value.findIndex(
//           (item) => item.item.id === source.item.id
//         );
//         if (index != -1) {
//           comicSources.value[index].item = source.item;
//         } else {
//           comicSources.value.push(source as ComicSource);
//         }
//         triggerRef(comicSources);
//         if (load) {
//           comicRecommendList(source);
//         }
//         break;
//       case SourceType.Video:
//         index = videoSources.value.findIndex(
//           (item) => item.item.id === source.item.id
//         );
//         if (index != -1) {
//           videoSources.value[index].item = source.item;
//         } else {
//           videoSources.value.push(source as VideoSource);
//         }
//         triggerRef(videoSources);
//         if (load) {
//           videoRecommendList(source);
//         }
//         break;
//       default:
//         console.log('暂未实现', source);
//         break;
//     }
//   };
//   /**
//    * 将当前source从对应的列表中删除
//    */
//   const removeFromSource = (itemId: string, sourceType: SourceType) => {
//     switch (sourceType) {
//       case SourceType.Photo:
//         _.remove(photoSources.value, (source) => source.item.id === itemId);
//         break;
//       case SourceType.Song:
//         _.remove(songSources.value, (source) => source.item.id === itemId);
//         break;
//       case SourceType.Book:
//         _.remove(bookSources.value, (source) => source.item.id === itemId);
//         break;
//       case SourceType.Comic:
//         _.remove(comicSources.value, (source) => source.item.id === itemId);
//         break;
//       case SourceType.Video:
//         _.remove(videoSources.value, (source) => source.item.id === itemId);
//         break;
//       default:
//         console.log('暂未实现 removeFromSource', sourceType);
//     }
//   };
//   const loadSubscribeSources = (load?: boolean) => {
//     load ??= false;
//     const added: string[] = [];

//     for (const source of subscribeSourceStore.subscribeSources) {
//       if (source.detail) {
//         for (let item of source.detail.urls) {
//           if (!item.disable) {
//             const found = getSource(item);
//             if (found) {
//               found.item = item;
//             } else {
//               addToSource(
//                 {
//                   item,
//                 },
//                 load
//               );
//             }
//             added.push(item.id);
//           } else {
//             // const found = getSource(item);
//             // if (found) {
//             //   removeSource(item);
//             // }
//           }
//         }
//       }
//     }
//     // 移除多余的source
//     for (const source of [
//       ...photoSources.value,
//       ...songSources.value,
//       ...bookSources.value,
//       ...comicSources.value,
//       ...videoSources.value,
//     ]) {
//       if (!added.includes(source.item.id)) {
//         if (source.item.id.includes('test') && keepTest.value) {
//           continue;
//         }
//         removeFromSource(source.item.id, source.item.type);
//       }
//     }
//     if (load) {
//       sleep(4500).then(async () => {
//         await Promise.all(
//           [
//             photoSources,
//             songSources,
//             bookSources,
//             comicSources,
//             videoSources,
//           ].map(async (sources) => {
//             await Promise.all(
//               sources.value.map(async (source) => {
//                 switch (source.item.type) {
//                   case SourceType.Photo:
//                     if (!(source as PhotoSource).list) {
//                       console.log(`初始化加载photo ${source.item.name}`);
//                       await photoRecommendList(source as PhotoSource);
//                     }
//                     break;
//                   case SourceType.Song:
//                     if (!(source as SongSource).playlist) {
//                       console.log(`初始化加载playlist ${source.item.name}`);
//                       await songRecommendPlayist(source);
//                     }
//                     if (!(source as SongSource).songList) {
//                       console.log(`初始化加载song ${source.item.name}`);
//                       await songRecommendSong(source);
//                     }
//                     break;
//                   case SourceType.Book:
//                     if (!(source as BookSource).list) {
//                       console.log(`初始化加载book ${source.item.name}`);
//                       await bookRecommendList(source as BookSource);
//                     }

//                     break;
//                   case SourceType.Comic:
//                     if (!(source as ComicSource).list) {
//                       console.log(`初始化加载comic ${source.item.name}`);
//                       await comicRecommendList(source as ComicSource);
//                     }
//                     break;
//                   case SourceType.Video:
//                     if (!(source as VideoSource).list) {
//                       console.log(`初始化加载video ${source.item.name}`);
//                       await videoRecommendList(source as VideoSource);
//                     }
//                     break;
//                   default:
//                     break;
//                 }
//               })
//             );
//           })
//         );
//         console.log('初始化加载完成');
//       });
//     }
//   };

//   const addTestSource = (extension: Extension, type: SourceType) => {
//     const item = {
//       id: extension.id,
//       name: extension.name,
//       type: '',
//       url: '',
//       code: 'test',
//     };
//     switch (type) {
//       case SourceType.Photo:
//         item.type = SourceType.Photo;
//         break;
//       case SourceType.Song:
//         item.type = SourceType.Song;
//         break;
//       case SourceType.Book:
//         item.type = SourceType.Book;
//         break;
//       case SourceType.Comic:
//         item.type = SourceType.Comic;
//         break;
//       case SourceType.Video:
//         item.type = SourceType.Video;
//         break;
//       default:
//         break;
//     }
//     if (!item.type) return;
//     addToSource(
//       {
//         item: item as SubscribeItem,
//       },
//       true
//     );
//   };

//   const clearData = async () => {
//     const loading = showLoadingToast({
//       message: '清空中',
//       duration: 0,
//       closeOnClick: true,
//       closeOnClickOverlay: false,
//     });
//     // 清空订阅源
//     await subscribeSourceStore.clearSubscribeSources();
//     loadSubscribeSources(true);

//     const photoShelfStore = usePhotoShelfStore();
//     photoShelfStore.clear(); // 清空图片收藏
//     const songShelfStore = useSongShelfStore();
//     songShelfStore.clear(); // 清空音乐收藏
//     const bookShelfStore = useBookShelfStore();
//     bookShelfStore.clear(); // 清空书架
//     const comicShelfStore = useComicShelfStore();
//     comicShelfStore.clear(); // 清空漫画收藏
//     const videoShelfStore = useVideoShelfStore();
//     videoShelfStore.clear(); // 清空视频收藏

//     // 清空章节缓存
//     bookChapterStore.clear();
//     // 清空音乐缓存
//     const songCacheStore = useSongCacheStore();
//     songCacheStore.clear();
//     localStorage.clear();
//     kvStorage.storage.clear();
//     loading.close();
//   };
//   const clearCache = async () => {
//     const toast = showLoadingToast({
//       message: '请稍候',
//       duration: 0,
//       closeOnClick: true,
//       closeOnClickOverlay: false,
//     });
//     // 清空章节缓存
//     await bookChapterStore.clear();
//     // 清空音乐缓存
//     const songCacheStore = useSongCacheStore();
//     await songCacheStore.clear();
//     if ('caches' in window) {
//       const cache = await caches.open('tauri-cache');
//       for (const key of await cache.keys()) {
//         await cache.delete(key);
//       }
//       cache.delete('*');
//     }
//     toast.close();
//     showToast('缓存已清空');
//   };

//   const latestUpdateSource = useStorageAsync('latestUpdateSource', 0);

//   onBeforeMount(async () => {
//     await subscribeSourceStore.init();
//     if (!subscribeSourceStore.isEmpty) {
//       // 更新订阅源
//       if (Date.now() - latestUpdateSource.value > 1000 * 60 * 60 * 24) {
//         await updateSubscribeSources();
//         latestUpdateSource.value = Date.now();
//       }
//       // try {
//       //   const dialog = await showConfirmDialog({
//       //     title: "订阅更新",
//       //     message: "是否立即更新所有订阅源？",
//       //   });
//       //   if (dialog === "confirm") {
//       //     await updateSubscribeSources();
//       //   }
//       // } catch (error) {}
//     } else {
//       try {
//         const dialog = await showConfirmDialog({
//           message: '您需要添加订阅源才能正常使用，\n是否立即导入默认订阅源？',
//         });
//         if (dialog === 'confirm') {
//           await addSubscribeSource(DEFAULT_SOURCE_URL);
//           showToast('默认源已导入');
//         }
//       } catch (error) {}
//     }
//     // keepTest.value = true;
//     // addTestSource(new TestSongExtension(), SourceType.Song);
//     // addTestSource(new TestBookExtension(), SourceType.Book);
//     // addTestSource(new TestPhotoExtension(), SourceType.Photo);
//     // addTestSource(new TestComicExtension(), SourceType.Comic);
//     // addTestSource(new TestVideoExtension(), SourceType.Video);

//     loadSubscribeSources(true);
//   });
//   return {
//     sourceClasses,
//     sourceClass,

//     hotItems,

//     photoSources,
//     photoRecommendList,
//     photoSearchList,
//     photoDetail,
//     getPhotoSource,
//     getPhotoItem,
//     getSongSource,

//     songSources,
//     songRecommendPlayist,
//     songPlaylistDetail,
//     songRecommendSong,
//     songSearchSong,
//     songSearchPlaylist,
//     getPlaylistInfo,
//     songPlaylistPlayAll,

//     bookSources,
//     bookRecommendList,
//     bookSearch,
//     bookDetail,
//     bookRead,
//     getBookSource,
//     getBookItem,

//     comicSources,
//     comicRecommendList,
//     comicSearch,
//     comicDetail,
//     comicRead,
//     getComicSource,
//     getComicItem,

//     videoSources,
//     videoRecommendList,
//     videoSearch,
//     videoDetail,
//     videoPlay,
//     getVideoSource,
//     getVideoItem,

//     addSubscribeSource,
//     addLocalSubscribeSource,
//     loadSubscribeSources,
//     updateSubscribeSources,
//     removeFromSource,

//     clearData,
//     clearCache,
//   };
// });

// export const useDisplayStore = defineStore('display', () => {
//   const showTabBar = ref(true);

//   // 检测是否为手机尺寸
//   const mobileMediaQuery = window.matchMedia('(max-width: 420px)');
//   // 检测是否为横屏
//   const landscapeMediaQuery = window.matchMedia('(orientation: landscape)');

//   const isMobileView = ref(osType() == 'android' || mobileMediaQuery.matches);
//   const isWindows = ref(osType() == 'windows');
//   const isAndroid = ref(osType() == 'android');
//   const isLandscape = ref(landscapeMediaQuery.matches);

//   const fullScreenMode = ref(false);
//   onMounted(async () => {
//     showTabBar.value = true;
//     if (isAndroid.value) {
//       await commands.set_screen_orientation('portrait');
//     } else {
//       await getCurrentWindow().setFullscreen(false);
//     }
//   });

//   const checkMobile = (event: MediaQueryListEvent) => {
//     // 全屏状态下就不刷新`isMobile`了
//     if (fullScreenMode.value) return;
//     isMobileView.value = osType() == 'android' || event.matches;
//   };
//   const checklanscape = (event: MediaQueryListEvent) => {
//     isLandscape.value = event.matches;
//   };

//   onMounted(() => {
//     // 监听变化
//     mobileMediaQuery.addEventListener('change', checkMobile);

//     landscapeMediaQuery.addEventListener('change', checklanscape);
//   });
//   onUnmounted(() => {
//     mobileMediaQuery.removeEventListener('change', checkMobile);
//     landscapeMediaQuery.removeEventListener('change', checklanscape);
//   });

//   const taichiAnimateRandomized = ref(false);

//   const isDark = useDark();
//   const toggleDark = useToggle(isDark);

//   const showAddSubscribeDialog = ref(false);
//   const showManageSubscribeDialog = ref(false);

//   const showAddBookShelfDialog = ref(false);
//   const showRemoveBookShelfDialog = ref(false);

//   const showAddSongShelfDialog = ref(false);
//   const showRemoveSongShelfDialog = ref(false);

//   const showAddPhotoShelfDialog = ref(false);
//   const showRemovePhotoShelfDialog = ref(false);

//   const showAddComicShelfDialog = ref(false);
//   const showRemoveComicShelfDialog = ref(false);

//   const showAddVideoShelfDialog = ref(false);
//   const showRemoveVideoShelfDialog = ref(false);

//   const showAboutDialog = ref(false);

//   const showSettingDialog = ref(false);
//   const showLeftPopup = ref(false);

//   // 仅移动端有效
//   const bookKeepScreenOn = useStorageAsync('bookKeepScreenOn', false);
//   const comicKeepScreenOn = useStorageAsync('comicKeepScreenOn', false);

//   const trayId = ref('');

//   const toastActive = ref(false);
//   const toastId = ref('');

//   const photoCollapse = useStorageAsync('photoCollapse', []);
//   const songCollapse = useStorageAsync('songCollapse', []);
//   const bookCollapse = useStorageAsync('bookCollapse', []);
//   const comicCollapse = useStorageAsync('comicCollapse', []);
//   const videoCollapse = useStorageAsync('videoCollapse', []);

//   const routerCurrPath = useStorageAsync('routerCurrPath', '/');
//   const photoPath = useStorageAsync('photoPath', '/photo');
//   const songPath = useStorageAsync('songPath', '/song');
//   const bookPath = useStorageAsync('bookPath', '/book');
//   const comicPath = useStorageAsync('comicPath', '/comic');
//   const videoPath = useStorageAsync('videoPath', '/video');

//   const showPhotoShelf = useStorageAsync('showPhotoShelf', false);
//   const showSongShelf = useStorageAsync('showSongShelf', false);
//   const showSongShelfDetail = useStorageAsync('showSongShelfDetail', false);
//   const selectedSongShelf = useStorageAsync<SongShelf | undefined>(
//     'selectedSongShelf',
//     undefined,
//     undefined,
//     {
//       serializer: {
//         read: async (raw: string) => {
//           if (!raw) return undefined;
//           return JSON.parse(raw);
//         },
//         write: async (value: SongShelf | undefined) => {
//           if (!value) return '';
//           return JSON.stringify(value);
//         },
//       },
//     }
//   );
//   const showImportPlaylistDialog = useStorageAsync(
//     'showImportPlaylistDialog',
//     false
//   );
//   const showBookShelf = useStorageAsync('showBookShelf', false);
//   const showComicShelf = useStorageAsync('showComicShelf', false);
//   const showVideoShelf = useStorageAsync('showVideoShelf', false);
//   const showPlayView = useStorageAsync('showPlayView', false);
//   const showPlayingPlaylist = useStorageAsync('showPlayingPlaylist', false);

//   watch(
//     showPlayingPlaylist,
//     (val) => {
//       if (val) {
//         nextTick(() => {
//           document
//             .querySelector('.playing-song')
//             ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
//         });
//       }
//     },
//     {
//       immediate: true,
//     }
//   );

//   const searchHistories = useStorageAsync<string[]>('searchHistories', []);
//   onMounted(() => {
//     if (searchHistories.value.length > 100) {
//       searchHistories.value = searchHistories.value.slice(0, 100);
//     }
//   });

//   const showToast = () => {
//     toastActive.value = true;
//     toastId.value = String(Date.now());
//     return toastId.value;
//   };
//   const closeToast = (id?: string) => {
//     if (!id || !toastId.value) {
//       toastActive.value = false;
//       toastId.value = '';
//       return;
//     }
//     if (id && Number(id) >= Number(toastId.value)) {
//       if (toastActive.value) {
//         toastActive.value = false;
//       }

//       toastId.value = '';
//       return;
//     }
//   };

//   const tabBarPages = useStorageAsync('tabBarPages', [
//     {
//       name: 'Home',
//       chineseName: '首页',
//       enable: true,
//     },
//     {
//       name: 'Photo',
//       chineseName: '图片',
//       enable: true,
//     },
//     {
//       name: 'Song',
//       chineseName: '歌曲',
//       enable: true,
//     },
//     {
//       name: 'Book',
//       chineseName: '书籍',
//       enable: true,
//     },
//     {
//       name: 'Comic',
//       chineseName: '漫画',
//       enable: true,
//     },
//     {
//       name: 'Video',
//       chineseName: '影视',
//       enable: true,
//     },
//   ]);

//   /**监听安卓的屏幕方向 */
//   const androidOrientation = ref<'landscape' | 'portrait' | 'auto'>();
//   const androidPlugins: PluginListener[] = [];
//   if (isAndroid.value) {
//     onMounted(async () => {
//       const orientation = await commands.get_screen_orientation();
//       androidOrientation.value = orientation;
//       tauriAddPluginListener(
//         'commands',
//         'orientationChanged',
//         async (payload: any) => {
//           androidOrientation.value = payload.orientation;
//         }
//       ).then((listener) => {
//         androidPlugins.push(listener);
//       });
//     });
//     onUnmounted(() => {
//       for (const plugin of androidPlugins) {
//         plugin.unregister();
//       }
//     });
//   }

//   return {
//     fullScreenMode,
//     isMobileView,
//     isAndroid,
//     isWindows,
//     androidOrientation,

//     taichiAnimateRandomized,
//     isDark,
//     toggleDark,
//     showTabBar,
//     showAddSubscribeDialog,
//     showManageSubscribeDialog,

//     showAddBookShelfDialog,
//     showRemoveBookShelfDialog,

//     showAddSongShelfDialog,
//     showRemoveSongShelfDialog,
//     showImportPlaylistDialog,

//     showAddPhotoShelfDialog,
//     showRemovePhotoShelfDialog,

//     showAddComicShelfDialog,
//     showRemoveComicShelfDialog,

//     showAddVideoShelfDialog,
//     showRemoveVideoShelfDialog,

//     showAboutDialog,

//     showSettingDialog,
//     showLeftPopup,

//     bookKeepScreenOn,
//     comicKeepScreenOn,

//     trayId,
//     toastActive,
//     showToast,
//     closeToast,

//     photoCollapse,
//     songCollapse,
//     bookCollapse,
//     comicCollapse,
//     videoCollapse,

//     routerCurrPath,
//     photoPath,
//     songPath,
//     bookPath,
//     comicPath,
//     videoPath,

//     showPhotoShelf,
//     showSongShelf,
//     showSongShelfDetail,
//     selectedSongShelf,
//     showBookShelf,
//     showComicShelf,
//     showVideoShelf,
//     showPlayView,
//     showPlayingPlaylist,

//     searchHistories,

//     tabBarPages,
//   };
// });

// export const useSubscribeSourceStore = defineStore('subscribeSource', () => {
//   let store: Store | undefined = undefined;
//   const subscribeSources = reactive<SubscribeSource[]>([]);
//   const init = async () => {
//     store = await Store.load('subscribeSourceStore.json');
//     const stored = await store?.get<SubscribeSource[]>('subscribeSources');
//     if (stored) {
//       subscribeSources.push(...stored);
//     }
//   };
//   const addSubscribeSource = async (source: SubscribeSource) => {
//     const index = subscribeSources.findIndex(
//       (item) => item.detail.id === source.detail.id
//     );
//     if (index != -1) {
//       subscribeSources[index] = source;
//     } else {
//       subscribeSources.push(source);
//     }
//     await saveSubscribeSources();
//   };
//   const removeSubscribeSource = async (source: SubscribeSource) => {
//     _.remove(subscribeSources, (s) => s.detail.id === source.detail.id);
//     await saveSubscribeSources();
//   };
//   const getSubscribeSource = (
//     sourceId: string
//   ): SubscribeSource | undefined => {
//     return subscribeSources.find((item) => item.detail.id === sourceId);
//   };
//   const saveSubscribeSources = async () => {
//     await store?.set('subscribeSources', subscribeSources);
//   };
//   const clearSubscribeSources = async () => {
//     subscribeSources.length = 0;
//     await store?.clear();
//   };
//   const isEmpty = computed(() => subscribeSources.length === 0);

//   return {
//     store,
//     init,
//     subscribeSources,
//     addSubscribeSource,
//     removeSubscribeSource,
//     getSubscribeSource,
//     saveSubscribeSources,
//     clearSubscribeSources,
//     isEmpty,
//   };
// });

// export const useSongStore = defineStore('song', () => {
//   const displayStore = useDisplayStore();
//   const songCacheStore = useSongCacheStore();

//   const audioRef = ref<HTMLAudioElement>();
//   const volumeVisible = ref<boolean>(false); // 设置音量弹窗
//   const playlist = useStorageAsync<SongInfo[]>('songPlaylist', []);
//   const playingPlaylist = useStorageAsync<SongInfo[]>(
//     'songPlayingPlaylist',
//     []
//   ); // 当前播放列表
//   const audioDuration = ref(0); // 音频总时长
//   const audioCurrent = ref(0); // 音频当前播放时间
//   const audioVolume = useStorageAsync<number>('songVolume', 1); // 音频声音，范围 0-1
//   const isPlaying = ref<boolean>(false); // 音频播放状态：true 播放，false 暂停
//   const playMode = useStorageAsync<SongPlayMode>(
//     'songPlayMode',
//     SongPlayMode.list
//   );
//   const playProgress = ref(0); // 音频播放进度

//   const playingSong = useStorageAsync<SongInfo>(
//     'songPlayingSong',
//     null,
//     undefined,
//     {
//       serializer: {
//         read: (raw: string) => {
//           return JSON.parse(raw);
//         },
//         write: (value: SongInfo) => {
//           return JSON.stringify(value);
//         },
//       },
//     }
//   ); // 当前播放

//   const switchSongSource = async function* (
//     song: SongInfo
//   ): AsyncIterableIterator<SongInfo> {
//     const store = useStore();
//     for (const source of store.songSources) {
//       const songName = song.name;
//       if (!songName) continue;
//       const singer = joinSongArtists(song.artists);
//       try {
//         const sc = (await store.sourceClass(source.item)) as SongExtension;
//         const songList = await sc?.execSearchSongs(songName);
//         if (!songList) continue;
//         for (const s of songList.list) {
//           if (s.name === songName && joinSongArtists(s.artists) === singer) {
//             // 当前歌曲满足条件
//             yield s;
//             break;
//           }
//         }
//       } catch (error) {}
//     }
//   };

//   const getSongPlayUrl = async (
//     song: SongInfo,
//     switchSource: Boolean = true
//   ): Promise<string | undefined> => {
//     // 返回有两种类型
//     // 1. blobUrl, 前端(win)使用
//     // 2. filePath, 安卓段使用
//     const cached_url = await songCacheStore.getSong(song);
//     if (cached_url) {
//       console.log(`${song.name}返回缓存的播放地址${cached_url}`);
//       return cached_url;
//     }
//     let src = null;
//     let headers = null;
//     let t: string | null = null;
//     t = displayStore.showToast();
//     if (!song.playUrl) {
//       const store = useStore();
//       const source = store.getSongSource(song.sourceId);
//       // if (!source) {
//       //   showToast(`${song.name} 所属源不存在或未启用`);
//       //   return;
//       // }
//       if (source) {
//         const sc = (await store.sourceClass(source.item)) as SongExtension;

//         const newUrl = await sc?.execGetSongUrl(song);
//         if (typeof newUrl === 'string') {
//           src = newUrl;
//         } else if (newUrl instanceof Object) {
//           src = newUrl['128k'] || newUrl['320k'] || newUrl.flac || '';
//           headers = newUrl.headers || null;
//           if (newUrl.lyric) {
//             song.lyric = newUrl.lyric;
//           }
//         }
//       }
//     } else {
//       if (typeof song.playUrl === 'string') {
//         src = song.playUrl;
//       } else if (song.playUrl instanceof Object) {
//         src = songUrlToString(song.playUrl);
//         headers = song.playUrl.headers || null;
//       }
//     }
//     if (!src) {
//       // 使用其他源的播放地址
//       if (switchSource) {
//         let newSrc: string | undefined;
//         for await (const s of switchSongSource(song)) {
//           console.log(`${song.name} 使用其他源播放地址`, JSON.stringify(s));
//           newSrc = await getSongPlayUrl(s, false);

//           if (newSrc) {
//             await songCacheStore.replaceSongSrc(song, s);
//             break;
//           }
//         }
//         if (!newSrc) {
//           showNotify(`歌曲 ${song.name} 无法播放`);
//         }
//       }
//     }
//     try {
//       if (src) {
//         await songCacheStore.saveSongv2(song, src, {
//           headers: headers || undefined,
//           verify: false,
//         });
//       }
//     } catch (error) {}
//     if (t) displayStore.closeToast(t);

//     const ret = await songCacheStore.getSong(song);
//     console.log(`${song.name}返回播放地址${ret}`);
//     return ret;
//   };
//   abstract class BaseHelper {
//     constructor() {
//       this.onMounted = this.onMounted.bind(this);
//       this.watch = this.watch.bind(this);
//       this.setPlaylist = this.setPlaylist.bind(this);
//       this.onPlay = this.onPlay.bind(this);
//       this.onPause = this.onPause.bind(this);
//       this.prevSong = this.prevSong.bind(this);
//       this.nextSong = this.nextSong.bind(this);
//       this.onSetVolume = this.onSetVolume.bind(this);
//       this.seek = this.seek.bind(this);
//     }
//     abstract onMounted(): Promise<void> | void;
//     abstract watch(): Promise<void> | void;
//     abstract setPlaylist(
//       list: SongInfo[],
//       firstSong: SongInfo
//     ): Promise<void> | void;
//     abstract onPlay(): Promise<void> | void;
//     abstract onPause(): Promise<void> | void;
//     abstract prevSong(): Promise<void> | void;
//     abstract nextSong(): Promise<void> | void;
//     abstract onSetVolume(value: number): Promise<void> | void;
//     abstract seek(value: number): Promise<void> | void;
//   }

//   class WinSongHelper extends BaseHelper {
//     constructor() {
//       super();
//     }
//     onMounted() {
//       onMounted(() => {
//         audioRef.value = document.createElement('audio');
//         audioRef.value.style.width = '0px';
//         audioRef.value.style.height = '0px';
//         document.body.appendChild(audioRef.value);
//         audioRef.value.volume = audioVolume.value;

//         // audioRef.value.oncanplay = () => {
//         //   onPlay();
//         // };
//         audioRef.value.onplay = () => {
//           isPlaying.value = true;
//         };
//         audioRef.value.onpause = () => {
//           isPlaying.value = false;
//         };
//         audioRef.value.onloadedmetadata = () => {
//           audioDuration.value = audioRef.value!.duration;
//         };
//         audioRef.value.ondurationchange = () => {
//           audioDuration.value = audioRef.value!.duration;
//         };
//         audioRef.value.ontimeupdate = () => {
//           audioCurrent.value = audioRef.value!.currentTime;
//         };
//         audioRef.value.onended = () => {
//           if (playMode.value === SongPlayMode.single) {
//             this.onPlay();
//           } else {
//             this.nextSong();
//           }
//         };
//         if ('mediaSession' in navigator) {
//           navigator.mediaSession.setActionHandler('play', () => {
//             this.onPlay();
//           });
//           navigator.mediaSession.setActionHandler('pause', () => {
//             this.onPause();
//           });
//           navigator.mediaSession.setActionHandler('nexttrack', () => {
//             this.nextSong();
//           });
//           navigator.mediaSession.setActionHandler('previoustrack', () => {
//             this.prevSong();
//           });
//           if (playingSong.value) {
//             this.setMedisSession(playingSong.value, 'paused');
//           }
//         }
//       });
//     }
//     watch() {
//       watch(
//         playMode,
//         (__) => {
//           // 播放模式变化时，重置播放列表索引
//           if (playMode.value === SongPlayMode.random) {
//             playingPlaylist.value = _.shuffle([...playlist.value]);
//             return;
//           } else {
//             playingPlaylist.value = [...playlist.value];
//           }
//         },
//         {
//           immediate: true,
//         }
//       );
//       watch(
//         audioVolume,
//         (newValue) => {
//           if (!audioRef.value) return;
//           audioRef.value.volume = newValue;
//         },
//         {
//           immediate: true,
//         }
//       );
//     }
//     async setPlaylist(list: SongInfo[], firstSong: SongInfo): Promise<void> {
//       if (list != playlist.value) {
//         playlist.value = list;
//         if (playMode.value === SongPlayMode.random) {
//           playingPlaylist.value = _.shuffle(list);
//         } else {
//           playingPlaylist.value = [...list];
//         }
//       }

//       if (firstSong.id !== playingSong.value?.id) {
//         if (audioRef.value) {
//           // audioRef.value.pause();
//           audioRef.value.removeAttribute('src');
//           audioRef.value.srcObject = null;
//           audioRef.value.currentTime = 0;
//         }
//         playingSong.value = firstSong;
//         audioCurrent.value = 0;
//         audioDuration.value = 0;
//         isPlaying.value = false;
//       }
//       await this.onPlay();
//     }
//     async onPlay() {
//       if (!audioRef.value) return;
//       if (!playingSong.value.picUrl) {
//         // 获取封面
//         getSongCover(playingSong.value);
//       }
//       if (!audioRef.value.src && !audioRef.value.srcObject) {
//         // 暂停并重置音频
//         audioRef.value.removeAttribute('src');
//         audioRef.value.srcObject = null;
//         audioRef.value.currentTime = 0;
//         audioCurrent.value = 0;
//         audioDuration.value = 0;
//         isPlaying.value = false;
//         const url = await getSongPlayUrl(playingSong.value);

//         if (!url) {
//           showToast('歌曲无法播放');
//           return;
//         } else {
//           audioRef.value.src = url;
//           const song = playingSong.value;
//           if (!song.lyric) {
//             const store = useStore();
//             const source = store.getSongSource(song.sourceId);
//             if (source) {
//               const sc = (await store.sourceClass(
//                 source?.item
//               )) as SongExtension;
//               sc?.execGetLyric(song).then((lyric) => {
//                 song.lyric = lyric || undefined;
//               });
//             }
//           }
//         }
//       }
//       await audioRef.value.play();
//       if (playingSong.value && 'mediaSession' in navigator) {
//         this.setMedisSession(playingSong.value, 'playing');
//       }
//     }
//     onPause(): Promise<void> | void {
//       if (!audioRef.value) return;
//       audioRef.value.pause();
//       if ('mediaSession' in navigator) {
//         navigator.mediaSession.playbackState = 'paused';
//       }
//     }
//     async prevSong(): Promise<void> {
//       if (!playingPlaylist.value) return;
//       const index = playingPlaylist.value.findIndex(
//         (item) => item.id === playingSong.value?.id
//       );
//       if (index === -1) return;
//       let prevIndex;
//       if (index === 0) {
//         prevIndex = playingPlaylist.value.length - 1;
//       } else {
//         prevIndex = index - 1;
//       }
//       await setPlaylist(playlist.value, playingPlaylist.value[prevIndex]);
//     }
//     async nextSong(): Promise<void> {
//       if (!playingPlaylist.value) return;
//       const index = playingPlaylist.value.findIndex(
//         (item) => item.id === playingSong.value?.id
//       );
//       if (index === -1) return;
//       let nextIndex;
//       if (index + 1 === playingPlaylist.value.length) {
//         nextIndex = 0;
//       } else {
//         nextIndex = index + 1;
//       }
//       await setPlaylist(playlist.value, playingPlaylist.value[nextIndex]);
//     }
//     onSetVolume(value: number): Promise<void> | void {
//       if (!audioRef.value) return;
//       audioRef.value.volume = value;
//       audioVolume.value = value;
//     }
//     seek(value: number): Promise<void> | void {
//       if (!audioRef.value) return;
//       audioRef.value.currentTime = value;
//     }
//     setMedisSession = async (
//       song: SongInfo,
//       playbackState?: MediaSessionPlaybackState
//     ) => {
//       try {
//         const artwork = [];
//         if (song.picUrl) {
//           if (song.picHeaders) {
//             const response = await fetch(song.picUrl, {
//               headers: song.picHeaders,
//               verify: false,
//             });
//             const blob = new Blob([await response.blob()], {
//               type: 'image/png',
//             });

//             const b64: string = await new Promise((resolve, reject) => {
//               const reader = new FileReader();
//               reader.onloadend = () => {
//                 // reader.result 是一个包含 Base64 编码的字符串
//                 const base64String = reader.result as string;
//                 resolve(base64String);
//               };
//               reader.onerror = reject;
//               reader.readAsDataURL(blob);
//             });
//             artwork.push({
//               src: b64,
//               type: 'image/png',
//             });
//           } else {
//             artwork.push({
//               src: song.picUrl,
//             });
//           }
//         }
//         const metaData = new MediaMetadata({
//           // 媒体标题
//           title: song.name,
//           // 媒体类型
//           artist: joinSongArtists(song.artists),
//           // 媒体封面
//           artwork: artwork,
//         });
//         // 设置媒体元数据
//         navigator.mediaSession.metadata = metaData;
//         if (playbackState) {
//           navigator.mediaSession.playbackState = playbackState;
//         }
//       } catch (error) {}
//     };
//   }
//   class AndroidSongHelper extends BaseHelper {
//     constructor() {
//       super();
//     }
//     androidPlugins: PluginListener[] = [];
//     getUrlPlugin: PluginListener | undefined = undefined;
//     getUrlTasks: androidMedia.MusicItem[] = [];
//     onMounted() {
//       onMounted(async () => {
//         tauriAddPluginListener(
//           'mediasession',
//           'getUrl',
//           async (payload: any) => {
//             // 将要播放的歌曲获取url
//             const musicItem: androidMedia.MusicItem = JSON.parse(payload.value);
//             let song: SongInfo = JSON.parse(musicItem.extra as string);
//             if (playingSong.value && playingSong.value.id === song.id) {
//               song = playingSong.value;
//             }
//             if (!playingSong.value.picUrl) {
//               // 获取封面
//               await getSongCover(song);
//             }
//             musicItem.iconUri = song.picUrl;
//             const newItem = _.cloneDeep(musicItem);
//             const url = await getSongPlayUrl(song);
//             if (url) {
//               newItem.uri = url;
//             } else {
//               showToast(`${song.name} 播放地址失败`);
//             }
//             const coverUrl = await songCacheStore.getCover(song);

//             if (coverUrl) {
//               newItem.iconUri = coverUrl;
//             }
//             await androidMedia.update_music_item(musicItem, newItem);
//           }
//         ).then((listener) => {
//           this.androidPlugins.push(listener);
//         });
//         tauriAddPluginListener('mediasession', 'play', async (payload: any) => {
//           isPlaying.value = true;
//         }).then((listener) => {
//           this.androidPlugins.push(listener);
//         });
//         tauriAddPluginListener(
//           'mediasession',
//           'progress',
//           async (payload: any) => {
//             const progress = Number(payload.progress);
//             const duration = Number(payload.duration);
//             audioDuration.value = duration;
//             audioCurrent.value = progress;
//           }
//         ).then((listener) => {
//           this.androidPlugins.push(listener);
//         });
//         tauriAddPluginListener(
//           'mediasession',
//           'pause',
//           async (payload: any) => {
//             isPlaying.value = false;
//           }
//         ).then((listener) => {
//           this.androidPlugins.push(listener);
//         });
//         tauriAddPluginListener('mediasession', 'stop', async (payload: any) => {
//           isPlaying.value = false;
//         }).then((listener) => {
//           this.androidPlugins.push(listener);
//         });

//         tauriAddPluginListener(
//           'mediasession',
//           'playingMusicItemChanged',
//           async (payload: any) => {
//             const item = payload.musicItem;
//             if (item) {
//               const musicItem: androidMedia.MusicItem = JSON.parse(
//                 payload.musicItem
//               );
//               playingSong.value = playingPlaylist.value.find(
//                 (item) => item.id === musicItem.id
//               );
//             }
//           }
//         ).then((listener) => {
//           this.androidPlugins.push(listener);
//         });
//         tauriAddPluginListener(
//           'mediasession',
//           'volumeChanged',
//           async (payload: any) => {
//             audioVolume.value = Math.min(Number(payload.volume), 100);
//           }
//         ).then((listener) => {
//           this.androidPlugins.push(listener);
//         });
//         tauriAddPluginListener(
//           'mediasession',
//           'seekComplete',
//           async (payload: any) => {
//             const progress = Number(payload.progress);
//             // const updateTime = Number(payload.updateTime);
//             audioCurrent.value = progress;
//           }
//         );
//         setTimeout(() => {
//           // playlist初始同步
//           if (playingPlaylist.value.length) {
//             // android播放列表初始化
//             androidMedia.set_playlist(
//               this.playlistToAndroidMusics(
//                 playingPlaylist.value,
//                 Math.max(
//                   playingPlaylist.value.findIndex(
//                     (s) => s.id === playingSong.value.id
//                   ),
//                   0
//                 ),
//                 false
//               )
//             );
//           }
//         }, 1000);
//       });

//       onUnmounted(() => {
//         for (const plugin of this.androidPlugins) {
//           plugin.unregister();
//         }
//         this.androidPlugins.length = 0;
//       });
//     }
//     watch() {
//       watch(
//         playMode,
//         (newMode, oldMode) => {
//           // 播放模式变化时，重置播放列表索引
//           switch (oldMode) {
//             case SongPlayMode.single:
//               switch (newMode) {
//                 case SongPlayMode.list:
//                   androidMedia.set_play_mode(
//                     androidMedia.PlayMode.playlistLoop
//                   );
//                   break;
//                 case SongPlayMode.random:
//                   playingPlaylist.value = _.shuffle(playlist.value);
//                   androidMedia.update_playlist_order(
//                     this.playlistToAndroidMusics(playingPlaylist.value)
//                   );
//                   androidMedia.set_play_mode(
//                     androidMedia.PlayMode.playlistLoop
//                   );
//                   break;
//                 case SongPlayMode.single:
//                   break;
//               }
//               break;
//             case SongPlayMode.list:
//               switch (newMode) {
//                 case SongPlayMode.list:
//                   break;
//                 case SongPlayMode.random:
//                   playingPlaylist.value = _.shuffle(playlist.value);
//                   androidMedia.update_playlist_order(
//                     this.playlistToAndroidMusics(playingPlaylist.value)
//                   );
//                   break;
//                 case SongPlayMode.single:
//                   androidMedia.set_play_mode(androidMedia.PlayMode.loop);
//                   break;
//               }
//               break;
//             case SongPlayMode.random:
//               switch (newMode) {
//                 case SongPlayMode.list:
//                   playingPlaylist.value = [...playlist.value];
//                   androidMedia.update_playlist_order(
//                     this.playlistToAndroidMusics(playingPlaylist.value)
//                   );
//                   break;
//                 case SongPlayMode.random:
//                   break;
//                 case SongPlayMode.single:
//                   androidMedia.set_play_mode(androidMedia.PlayMode.loop);
//                   break;
//               }
//               break;
//             case undefined:
//               switch (newMode) {
//                 case SongPlayMode.list:
//                   androidMedia.update_playlist_order(
//                     this.playlistToAndroidMusics(playingPlaylist.value)
//                   );
//                   break;
//                 case SongPlayMode.random:
//                   androidMedia.update_playlist_order(
//                     this.playlistToAndroidMusics(playingPlaylist.value)
//                   );
//                   break;
//                 case SongPlayMode.single:
//                   playingPlaylist.value = [playingSong.value];
//                   androidMedia.update_playlist_order(
//                     this.playlistToAndroidMusics(playingPlaylist.value)
//                   );
//                   androidMedia.set_play_mode(androidMedia.PlayMode.loop);
//                   break;
//               }
//               break;
//           }
//         },
//         {
//           immediate: true,
//         }
//       );
//     }
//     async setPlaylist(list: SongInfo[], firstSong: SongInfo): Promise<void> {
//       try {
//         if (!list.length) {
//           showNotify('播放列表为空');
//           return;
//         }
//         firstSong ||= list[0];
//         if (list != playlist.value) {
//           // 新的播放列表
//           playlist.value = list;
//           if (playMode.value === SongPlayMode.random) {
//             playingPlaylist.value = _.shuffle(list);
//           } else {
//             playingPlaylist.value = [...list];
//           }
//           let index = playingPlaylist.value.findIndex(
//             (item) => item.id === firstSong?.id
//           );
//           if (index === -1) index = 0;
//           const res = await androidMedia.set_playlist(
//             this.playlistToAndroidMusics(playingPlaylist.value, index)
//           );
//           if (!res) {
//             showNotify('播放列表设置失败');
//             return;
//           }
//         } else {
//           // 当前播放列表切换歌曲
//           androidMedia.play_target_music(this.musicToAndroidMusic(firstSong));
//         }
//         playingSong.value = firstSong;
//         audioCurrent.value = 0;
//         audioDuration.value = 0;
//         isPlaying.value = false;
//       } catch (error) {
//         console.log(String(error));
//       }
//     }
//     musicToAndroidMusic(song: SongInfo): androidMedia.MusicItem {
//       return {
//         id: song.id,
//         title: song.name || '未知歌曲',
//         artist: joinSongArtists(song.artists),
//         album: song.album?.name,
//         duration: song.duration,
//         uri: songUrlToString(song.playUrl),
//         iconUri: song.picUrl,
//         extra: JSON.stringify(song),
//       };
//     }
//     playlistToAndroidMusics(
//       songs: SongInfo[],
//       position?: number,
//       playImmediately?: boolean
//     ): androidMedia.Playlist {
//       return {
//         name: '播放列表',
//         musics: songs
//           .filter((item) => item != undefined && item != null)
//           .map((item) => this.musicToAndroidMusic(item)),
//         position: position,
//         playImmediately: playImmediately,
//       };
//     }
//     async cache_playlist(songs: SongInfo[]) {
//       await Promise.all(
//         songs.map(async (song) => {
//           await getSongPlayUrl(song);
//         })
//       );
//     }

//     async onPlay(): Promise<void> {
//       await androidMedia.play();
//     }
//     async onPause(): Promise<void> {
//       await androidMedia.pause();
//     }
//     async prevSong(): Promise<void> {
//       const currIndex = playingPlaylist.value.findIndex(
//         (item) => item.id === playingSong.value.id
//       );
//       let prevIndex = 0;
//       if (!playingPlaylist.value.length) return;
//       if (currIndex !== -1) {
//         if (currIndex === 0) {
//           prevIndex = playingPlaylist.value.length - 1;
//         } else {
//           prevIndex = currIndex - 1;
//         }
//       }
//       playingSong.value = playingPlaylist.value[prevIndex];
//       await androidMedia.play_target_music(
//         this.musicToAndroidMusic(playingSong.value)
//       );
//     }
//     async nextSong(): Promise<void> {
//       const currIndex = playingPlaylist.value.findIndex(
//         (item) => item.id === playingSong.value.id
//       );
//       let nextIndex = 0;
//       if (!playingPlaylist.value.length) return;
//       if (currIndex !== -1) {
//         if (currIndex === playingPlaylist.value.length - 1) {
//           nextIndex = 0;
//         } else {
//           nextIndex = currIndex + 1;
//         }
//       }
//       playingSong.value = playingPlaylist.value[nextIndex];
//       await androidMedia.play_target_music(
//         this.musicToAndroidMusic(playingSong.value)
//       );
//     }
//     async onSetVolume(value: number): Promise<void> {
//       await androidMedia.set_volume(value);
//       throw new Error('Method not implemented.');
//     }
//     async seek(value: number): Promise<void> {
//       await androidMedia.seek_to(value * 1000);
//     }
//   }

//   let helper: BaseHelper;
//   if (displayStore.isAndroid) {
//     helper = new AndroidSongHelper();
//   } else {
//     helper = new WinSongHelper();
//   }

//   const setPlaylist = helper.setPlaylist;
//   helper.onMounted();
//   helper.watch();

//   return {
//     volumeVisible,
//     playlist,
//     playingPlaylist,
//     playingSong,
//     audioDuration,
//     audioCurrent,
//     audioVolume,
//     isPlaying,
//     playMode,
//     playProgress,
//     onPlay: helper.onPlay,
//     onPause: helper.onPause,
//     nextSong: helper.nextSong,
//     prevSong: helper.prevSong,
//     onSetVolume: helper.onSetVolume,
//     setPlayingList: helper.setPlaylist,
//     seek: helper.seek,
//   };
// });

// export const useBookStore = defineStore('book', () => {
//   const displayStore = useDisplayStore();
//   const readMode = ref<'slide' | 'scroll'>(
//     displayStore.isMobileView ? 'slide' : 'scroll'
//   );
//   watch(
//     () => displayStore.isMobileView,
//     () => {
//       readMode.value = displayStore.isMobileView ? 'slide' : 'scroll';
//     }
//   );
//   const fontSize = useStorageAsync('readFontSize', 20);
//   const fontFamily = useStorageAsync('eradFontFamily', 'alipuhui');
//   const lineHeight = useStorageAsync('readLineHeight', 1.5);
//   const readPGap = useStorageAsync('readPGap', 8);
//   const underline = useStorageAsync('readUnderline', false);
//   const paddingX = useStorageAsync('readPaddingX', 16);
//   const paddingTop = useStorageAsync('readPaddingTop', 4);
//   const paddingBottom = useStorageAsync('readPaddingBottom', 18);

//   const defaultThemes: ReadTheme[] = [
//     {
//       name: '默认',
//       color: 'var(--van-text-color)',
//       bgColor: 'var(--van-background)',
//     },
//     {
//       name: '预设1',
//       color: '#adadad',
//       bgColor: '#000',
//     },
//     {
//       name: '预设2',
//       color: '#fff',
//       bgColor: '#000',
//     },
//     {
//       name: '预设3',
//       color: '#dcdfe1',
//       bgColor: '#3c3f43',
//     },
//     {
//       name: '预设4',
//       color: '#90bff5',
//       bgColor: '#3c3f43',
//     },
//     {
//       name: '预设5',
//       color: '#000',
//       bgColor: '#f5f5f5',
//     },
//     {
//       name: '预设6',
//       color: '#060606',
//       bgColor: '#F5F1E8',
//     },
//     {
//       name: '预设7',
//       color: '#060606',
//       bgColor: '#EFE2C0',
//     },
//     {
//       name: '预设8',
//       color: '#060606',
//       bgColor: '#E0EEE1',
//     },
//   ];
//   const customThemes = useStorageAsync<ReadTheme[]>('customReadThemes', []);
//   const themes = computed(() => [...defaultThemes, ...customThemes.value]);
//   const currTheme = useStorageAsync<ReadTheme>('readTheme', defaultThemes[0]);
//   const fullScreenClickToNext = useStorageAsync(
//     'readFullScreenClickToNext',
//     false
//   );

//   const readingBook = ref<BookItem>();
//   const readingChapter = ref<BookChapter>();

//   const chapterCacheNum = useStorageAsync('readChapterCacheNum', 10);

//   return {
//     readMode,
//     fontSize,
//     fontFamily,
//     lineHeight,
//     readPGap,
//     underline,
//     paddingX,
//     paddingTop,
//     paddingBottom,

//     themes,
//     currTheme,

//     fullScreenClickToNext,

//     readingBook,
//     readingChapter,
//     chapterCacheNum,
//   };
// });

// export const useComicStore = defineStore('comic', () => {
//   const readingComic = ref<ComicItem>();
//   const readingChapter = ref<ComicChapter>();
//   return {
//     readingComic,
//     readingChapter,
//   };
// });

// // 定义一个工厂函数来创建 store // 注意：此函数没有优化成单例函数，注意重复定义出错
// const createKVStore = (name?: string) => {
//   return defineStore(`KVStore${name}`, () => {
//     let store: Store | undefined = undefined;
//     class KVStorage implements StorageLikeAsync {
//       loaded = false;
//       middleware = new Map<string, string>();
//       constructor() {
//         this.load();
//       }
//       async load() {
//         const data = await Store.load(`${name ? name : 'KVStore'}.json`);
//         store = data;
//         const entries = await data.entries<string>();
//         for (const [key, value] of entries) {
//           this.middleware.set(key, value);
//         }
//         this.loaded = true;
//       }
//       async getItem(key: string): Promise<string | null> {
//         if (!this.loaded) {
//           await this.load();
//         }
//         return this.middleware.get(key) || null;
//       }

//       async setItem(key: string, value: string): Promise<void> {
//         this.middleware.set(key, value);
//         await store?.set(key, value);
//       }

//       async removeItem(key: string): Promise<void> {
//         this.middleware.delete(key);
//         await store?.delete(key);
//       }
//       async clear(): Promise<void> {
//         this.middleware.clear();
//         await store?.clear();
//       }
//     }
//     const storage = new KVStorage();

//     return {
//       storage,
//     };
//   })();
// };

// export const useBookShelfStore = defineStore('bookShelfStore', () => {
//   const kvStorage = createKVStore('bookShelfStore');

//   // 书籍书架⬇️
//   const bookShelf = useStorageAsync<BookShelf[]>(
//     'bookShelf',
//     [
//       {
//         id: nanoid(),
//         name: '默认书架',
//         books: [],
//         createTime: Date.now(),
//       },
//     ],
//     kvStorage.storage
//   );
//   const bookChapterRefreshing = ref(false);

//   const createBookShelf = (name: string) => {
//     if (bookShelf.value.some((item) => item.name === name)) {
//       // 书架已存在
//       return;
//     } else {
//       bookShelf.value.push({
//         id: nanoid(),
//         name,
//         books: [],
//         createTime: Date.now(),
//       });
//     }
//   };
//   const removeBookShelf = (shelfId: string) => {
//     const find = bookShelf.value.find((item) => item.id === shelfId);
//     bookShelf.value = bookShelf.value.filter((item) => item.id !== shelfId);
//     if (find) {
//       const bookChapterStore = useBookChapterStore();
//       find.books.forEach((book) => {
//         if (!isBookInShelf(book.book)) {
//           // 确保不在其他书架中也存在
//           bookChapterStore.removeBookCache(book.book);
//         }
//       });
//     }
//   };
//   const isBookInShelf = (
//     book: BookItem | string,
//     shelfId?: string
//   ): boolean => {
//     let id: string;
//     if (typeof book === 'string') {
//       id = book;
//     } else {
//       id = book.id;
//     }
//     if (shelfId) {
//       return !!bookShelf.value
//         .find((shelf) => shelf.id === shelfId)
//         ?.books.find((b) => b.book.id === id);
//     } else {
//       for (const shelf of bookShelf.value) {
//         const find = shelf.books.find((b) => b.book.id === id);
//         if (find) {
//           return true;
//         }
//       }
//     }
//     return false;
//   };
//   const addToBookSelf = (bookItem: BookItem, shelfId?: string): boolean => {
//     /**const shelf = shelfId
//       ? photoShelf.value.find((item) => item.id === shelfId)
//       : photoShelf.value[0];
//     if (!shelf) {
//       showToast('收藏夹不存在');
//       return false;
//     }

//     if (shelf.photos.find((i) => i.id === item.id)) {
//       showToast('已存在');
//       return false;
//     } else {
//       item.extra ||= {};
//       item.extra.selected ||= false; // 用作从书架中删除
//       shelf.photos.push(_.cloneDeep(item));
//       showToast(`已添加到 ${shelf.name}`);
//       return true;
//     } */
//     if (!bookShelf.value.length) {
//       showToast('书架为空，请先创建书架');
//       return false;
//     }
//     const shelf = shelfId
//       ? bookShelf.value.find((item) => item.id === shelfId)
//       : bookShelf.value[0];
//     if (!shelf) {
//       showToast('书架不存在');
//       return false;
//     }
//     if (shelf.books.find((item) => item.book.id === bookItem.id)) {
//       showToast('书架中已存在此书');
//       return false;
//     }
//     shelf.books.push({
//       book: _.cloneDeep(bookItem),
//       createTime: Date.now(),
//     });
//     showToast(`已添加到 ${shelf.name}`);
//     return true;
//   };
//   const removeBookFromShelf = (bookItem: BookItem, shelfId?: string) => {
//     if (!bookShelf.value.length) {
//       showToast('书架为空');
//       return;
//     }
//     if (!shelfId) shelfId = bookShelf.value[0].id;
//     const shelf = bookShelf.value.find((item) => item.id === shelfId);
//     if (!shelf) {
//       showToast('书架不存在');
//       return;
//     }
//     _.remove(shelf.books, (item) => item.book.id === bookItem.id);
//     if (!isBookInShelf(bookItem)) {
//       const bookChapterStore = useBookChapterStore();
//       bookChapterStore.removeBookCache(bookItem);
//     }
//   };
//   const updateBookReadInfo = (bookItem: BookItem, chapter: BookChapter) => {
//     if (!bookShelf.value) return;
//     for (let shelf of bookShelf.value) {
//       for (let book of shelf.books) {
//         if (book.book.id === bookItem.id) {
//           if (book.book.chapters?.find((item) => item.id === chapter.id)) {
//             book.lastReadChapter = chapter;
//             book.lastReadTime = Date.now();
//           }
//         }
//       }
//     }
//   };
//   const deleteBookFromShelf = (bookItem: BookItem, shelfId: string) => {
//     const shelf = bookShelf.value.find((item) => item.id === shelfId);
//     if (!shelf) return;
//     _.remove(shelf.books, (item) => item.book.id === bookItem.id);
//   };
//   const bookRefreshChapters = async () => {
//     if (bookChapterRefreshing.value) return;
//     bookChapterRefreshing.value = true;
//     const store = useStore();
//     await Promise.all(
//       bookShelf.value.map(async (shelf) => {
//         await Promise.all(
//           shelf.books.map(async (book) => {
//             const source = store.getBookSource(book.book.sourceId);
//             if (source) {
//               await store.bookDetail(source, book.book);
//             }
//           })
//         );
//       })
//     );
//     bookChapterRefreshing.value = false;
//     showToast('刷新章节完成');
//   };
//   const clear = () => {
//     bookShelf.value = [
//       {
//         id: nanoid(),
//         name: '默认书架',
//         books: [],
//         createTime: Date.now(),
//       },
//     ];
//   };

//   return {
//     bookShelf,
//     bookChapterRefreshing,
//     createBookShelf,
//     removeBookShelf,
//     isBookInShelf,
//     addToBookSelf,
//     removeBookFromShelf,
//     updateBookReadInfo,
//     deleteBookFromShelf,
//     bookRefreshChapters,
//     clear,
//   };
// });

// export const useSongShelfStore = defineStore('songShelfStore', () => {
//   const kvStorage = createKVStore('songShelfStore');

//   const songCreateShelf = useStorageAsync<SongShelf[]>(
//     'songShelf',
//     [],
//     kvStorage.storage
//   );
//   const songPlaylistShelf = useStorageAsync<SongShelf[]>(
//     'songPlaylistShelf',
//     [],
//     kvStorage.storage
//   );
//   const songLikeShelf = useStorageAsync<SongShelf>('songLikeShelf', {
//     type: SongShelfType.like,
//     playlist: {
//       id: nanoid(),
//       name: '我喜欢的音乐',
//       picUrl: HeartSVG,
//       sourceId: '',
//       list: {
//         list: [],
//         page: 1,
//         totalPage: 1,
//       },
//     },
//     createTime: Date.now(),
//   });
//   const songInLikeShelf = (song: SongInfo) => {
//     if (!song) return false;
//     return (
//       songLikeShelf.value?.playlist.list?.list.some(
//         (item) => item.id === song.id
//       ) || false
//     );
//   };
//   const playlistInShelf = (playlist?: PlaylistInfo) => {
//     if (!playlist) return false;
//     return songPlaylistShelf.value.some(
//       (item) => item.playlist.id === playlist.id
//     );
//   };

//   const createShelf = (name: string): SongShelf | null => {
//     // 创建收藏
//     if (songCreateShelf.value.some((item) => item.playlist.name === name)) {
//       showToast('收藏夹已存在');
//       return null;
//     }
//     const newShelf = {
//       type: SongShelfType.create,
//       playlist: {
//         id: nanoid(),
//         name,
//         picUrl: '',
//         sourceId: 'create',
//       },
//       createTime: Date.now(),
//     };
//     songCreateShelf.value.push(newShelf);
//     return newShelf;
//   };
//   const addSongToShelf = (song: SongInfo, shelfId?: string): boolean => {
//     let shelf: SongShelf | undefined;
//     if (!shelfId || shelfId === songLikeShelf.value?.playlist.id) {
//       shelf = songLikeShelf.value;
//     } else {
//       shelf = songCreateShelf.value.find(
//         (item) => item.playlist.id === shelfId
//       );
//     }
//     if (!shelf) {
//       showToast('收藏夹不存在');
//       return false;
//     }
//     shelf.playlist.list ||= {
//       list: [],
//       page: 1,
//       totalPage: 1,
//     };
//     if (shelf.playlist.list.list.find((item) => item.id === song.id)) {
//       showToast('已存在');
//       return false;
//     } else {
//       shelf.playlist.list.list.push(song);
//       showToast(`已添加到${shelf.playlist.name}`);
//       return true;
//     }
//   };
//   const removeSongFromShelf = (song: SongInfo, shelfId?: string): boolean => {
//     let shelf: SongShelf | undefined;
//     if (!shelfId || shelfId === songLikeShelf.value?.playlist.id) {
//       shelf = songLikeShelf.value;
//     } else {
//       shelf = songCreateShelf.value.find(
//         (item) => item.playlist.id === shelfId
//       );
//     }
//     if (!shelf) {
//       showToast('收藏夹不存在');
//       return false;
//     }
//     _.remove(shelf?.playlist.list?.list || [], (item) => item.id === song.id);
//     showToast(`已从 ${shelf.playlist.name} 移除`);
//     return true;
//   };
//   const addPlaylistToShelf = (playlist: PlaylistInfo): boolean => {
//     const find = songPlaylistShelf.value.find(
//       (item) => item.playlist.id === playlist.id
//     );
//     if (find) {
//       showToast('已存在');
//       return false;
//     }
//     songPlaylistShelf.value.push({
//       type: SongShelfType.playlist,
//       playlist,
//       createTime: Date.now(),
//     });
//     return true;
//   };
//   const removeSongShelf = (songShelfId: string): boolean => {
//     const removed = _.remove(
//       songCreateShelf.value,
//       (item) => item.playlist.id === songShelfId
//     );
//     if (removed.length) {
//       showToast('删除成功');
//       return true;
//     }
//     const removed2 = _.remove(
//       songPlaylistShelf.value,
//       (item) => item.playlist.id === songShelfId
//     );
//     if (removed2.length) {
//       showToast('删除成功');
//       return true;
//     }
//     return false;
//   };
//   const clear = () => {
//     songCreateShelf.value = [];
//     songPlaylistShelf.value = [];
//     songLikeShelf.value = {
//       type: SongShelfType.like,
//       playlist: {
//         id: nanoid(),
//         name: '我喜欢的音乐',
//         picUrl: HeartSVG,
//         sourceId: '',
//         list: {
//           list: [],
//           page: 1,
//           totalPage: 1,
//         },
//       },
//       createTime: Date.now(),
//     };
//   };
//   return {
//     songCreateShelf,
//     songPlaylistShelf,
//     songLikeShelf,
//     songInLikeShelf,
//     playlistInShelf,
//     createShelf,
//     addSongToShelf,
//     removeSongFromShelf,
//     addPlaylistToShelf,
//     removeSongShelf,
//     clear,
//   };
// });

// export const usePhotoShelfStore = defineStore('photoShelfStore', () => {
//   const kvStorage = createKVStore('photoShelfStore');

//   const photoShelf = useStorageAsync<PhotoShelf[]>(
//     'photoShelf',
//     [
//       {
//         id: nanoid(),
//         name: '默认收藏',
//         photos: [],
//         createTime: Date.now(),
//       },
//     ],
//     kvStorage.storage
//   );
//   const photoInShelf = (itemId: string, shelfId?: string): boolean => {
//     if (shelfId) {
//       return (
//         photoShelf.value
//           .find((item) => item.id === shelfId)
//           ?.photos.some((item) => item.id === itemId) || false
//       );
//     } else {
//       for (const shelf of photoShelf.value) {
//         if (shelf.photos.find((item) => item.id === itemId)) {
//           return true;
//         }
//       }
//     }
//     return false;
//   };
//   const addPhotoToShelf = (item: PhotoItem, shelfId?: string) => {
//     const shelf = shelfId
//       ? photoShelf.value.find((item) => item.id === shelfId)
//       : photoShelf.value[0];
//     if (!shelf) {
//       showToast('收藏夹不存在');
//       return false;
//     }

//     if (shelf.photos.find((i) => i.id === item.id)) {
//       showToast('已存在');
//       return false;
//     } else {
//       item.extra ||= {};
//       item.extra.selected ||= false; // 用作从书架中删除
//       shelf.photos.push(_.cloneDeep(item));
//       showToast(`已添加到 ${shelf.name}`);
//       return true;
//     }
//   };
//   const createShelf = (name: string): boolean => {
//     // 创建收藏
//     if (photoShelf.value.some((item) => item.name === name)) {
//       showToast('收藏夹已存在');
//       return false;
//     }
//     photoShelf.value.push({
//       id: nanoid(),
//       name,
//       photos: [],
//       createTime: Date.now(),
//     });
//     return true;
//   };
//   const removePhotoFromShelf = (item: PhotoItem, shelfId?: string): boolean => {
//     const shelf = shelfId
//       ? photoShelf.value.find((item) => item.id === shelfId)
//       : photoShelf.value[0];
//     if (!shelf) {
//       showToast('收藏夹不存在');
//       return false;
//     }
//     _.remove(shelf.photos, (i) => i.id === item.id);
//     return true;
//   };
//   const removeShelf = (shelfId: string) => {
//     if (photoShelf.value.length === 1) {
//       showToast('至少需要保留一个收藏夹');
//       return false;
//     }
//     _.remove(photoShelf.value, (item) => item.id === shelfId);
//     return true;
//   };
//   const clear = () => {
//     photoShelf.value = [
//       {
//         id: nanoid(),
//         name: '默认收藏',
//         photos: [],
//         createTime: Date.now(),
//       },
//     ];
//   };
//   return {
//     photoShelf,
//     photoInShelf,
//     addPhotoToShelf,
//     createShelf,
//     removePhotoFromShelf,
//     removeShelf,
//     clear,
//   };
// });

// export const useComicShelfStore = defineStore('comicShelfStore', () => {
//   const kvStorage = createKVStore('comicShelfStore');

//   // 漫画书架⬇️
//   const comicShelf = useStorageAsync<ComicShelf[]>(
//     'comicShelf',
//     [
//       {
//         id: nanoid(),
//         name: '默认书架',
//         comics: [],
//         createTime: Date.now(),
//       },
//     ],
//     kvStorage.storage
//   );
//   const comicChapterRefreshing = ref(false);

//   const createComicShelf = (name: string) => {
//     if (comicShelf.value.some((item) => item.name === name)) {
//       // 书架已存在
//       return;
//     } else {
//       comicShelf.value.push({
//         id: nanoid(),
//         name,
//         comics: [],
//         createTime: Date.now(),
//       });
//     }
//   };
//   const removeComicShelf = (shelfId: string) => {
//     if (comicShelf.value.length === 1) {
//       showToast('至少需要保留一个收藏夹');
//       return false;
//     }
//     _.remove(comicShelf.value, (item) => item.id === shelfId);
//     return true;
//   };
//   const isComicInShelf = (
//     comic: ComicItem | string,
//     shelfId?: string
//   ): boolean => {
//     let id: string;
//     if (typeof comic === 'string') {
//       id = comic;
//     } else {
//       id = comic.id;
//     }
//     if (shelfId) {
//       return !!comicShelf.value
//         .find((shelf) => shelf.id === shelfId)
//         ?.comics.find((b) => b.comic.id === id);
//     } else {
//       for (const shelf of comicShelf.value) {
//         const find = shelf.comics.find((b) => b.comic.id === id);
//         if (find) {
//           return true;
//         }
//       }
//     }
//     return false;
//   };
//   const addToComicSelf = (comicItem: ComicItem, shelfId?: string): boolean => {
//     if (!comicShelf.value.length) {
//       showToast('书架为空，请先创建书架');
//       return false;
//     }
//     const shelf = shelfId
//       ? comicShelf.value.find((item) => item.id === shelfId)
//       : comicShelf.value[0];
//     if (!shelf) {
//       showToast('书架不存在');
//       return false;
//     }
//     if (shelf.comics.find((item) => item.comic.id === comicItem.id)) {
//       showToast('书架中已存在此书');
//       return false;
//     }
//     shelf.comics.push({
//       comic: _.cloneDeep(comicItem),
//       createTime: Date.now(),
//     });
//     showToast(`已添加到 ${shelf.name}`);
//     return true;
//   };
//   const removeComicFromShelf = (comicItem: ComicItem, shelfId?: string) => {
//     if (!comicShelf.value.length) {
//       showToast('书架为空');
//       return;
//     }
//     if (!shelfId) shelfId = comicShelf.value[0].id;
//     const shelf = comicShelf.value.find((item) => item.id === shelfId);
//     if (!shelf) {
//       showToast('书架不存在');
//       return;
//     }
//     _.remove(shelf.comics, (item) => item.comic.id === comicItem.id);
//   };
//   const updateComicReadInfo = (comicItem: ComicItem, chapter: ComicChapter) => {
//     if (!comicShelf.value) return;
//     for (let shelf of comicShelf.value) {
//       for (let comic of shelf.comics) {
//         if (comic.comic.id === comicItem.id) {
//           if (comic.comic.chapters?.find((item) => item.id === chapter.id)) {
//             comic.lastReadChapter = chapter;
//             comic.lastReadTime = Date.now();
//           }
//         }
//       }
//     }
//   };
//   const deleteComicFromShelf = (comicItem: ComicItem, shelfId: string) => {
//     const shelf = comicShelf.value.find((item) => item.id === shelfId);
//     if (!shelf) return;
//     _.remove(shelf.comics, (item) => item.comic.id === comicItem.id);
//   };
//   const comicRefreshChapters = async () => {
//     if (comicChapterRefreshing.value) return;
//     comicChapterRefreshing.value = true;
//     const store = useStore();
//     await Promise.all(
//       comicShelf.value.map(async (shelf) => {
//         await Promise.all(
//           shelf.comics.map(async (comic) => {
//             const source = store.getComicSource(comic.comic.sourceId);
//             if (source) {
//               await store.comicDetail(source, comic.comic);
//             }
//           })
//         );
//       })
//     );
//     comicChapterRefreshing.value = false;
//     showToast('刷新章节完成');
//   };
//   const clear = () => {
//     comicShelf.value = [
//       {
//         id: nanoid(),
//         name: '默认书架',
//         comics: [],
//         createTime: Date.now(),
//       },
//     ];
//   };

//   return {
//     comicShelf,
//     comicChapterRefreshing,
//     createComicShelf,
//     removeComicShelf,
//     isComicInShelf,
//     addToComicSelf,
//     removeComicFromShelf,
//     updateComicReadInfo,
//     deleteComicFromShelf,
//     comicRefreshChapters,
//     clear,
//   };
// });

// export const useVideoShelfStore = defineStore('videoShelfStore', () => {
//   const kvStorage = createKVStore('videoShelfStore');

//   // 影视收藏⬇️
//   const videoShelf = useStorageAsync<VideoShelf[]>(
//     'videoShelf',
//     [
//       {
//         id: nanoid(),
//         name: '默认收藏',
//         videos: [],
//         createTime: Date.now(),
//       },
//     ],
//     kvStorage.storage
//   );

//   const createVideoShelf = (name: string) => {
//     if (videoShelf.value.some((item) => item.name === name)) {
//       // 收藏已存在
//       return;
//     } else {
//       videoShelf.value.push({
//         id: nanoid(),
//         name,
//         videos: [],
//         createTime: Date.now(),
//       });
//     }
//   };
//   const removeVideoShelf = (shelfId: string) => {
//     if (videoShelf.value.length === 1) {
//       showToast('至少需要保留一个收藏夹');
//       return false;
//     }
//     _.remove(videoShelf.value, (item) => item.id === shelfId);
//     return true;
//   };
//   const isVideoInShelf = (
//     video: VideoItem | string,
//     shelfId?: string
//   ): boolean => {
//     let id: string;
//     if (typeof video === 'string') {
//       id = video;
//     } else {
//       id = video.id;
//     }
//     if (shelfId) {
//       return !!videoShelf.value
//         .find((shelf) => shelf.id === shelfId)
//         ?.videos.find((b) => b.video.id === id);
//     } else {
//       for (const shelf of videoShelf.value) {
//         const find = shelf.videos.find((b) => b.video.id === id);
//         if (find) {
//           return true;
//         }
//       }
//     }
//     return false;
//   };
//   const addToViseoSelf = (videoItem: VideoItem, shelfId?: string): boolean => {
//     if (!videoShelf.value.length) {
//       showToast('收藏为空，请先创建收藏');
//       return false;
//     }
//     const shelf = shelfId
//       ? videoShelf.value.find((item) => item.id === shelfId)
//       : videoShelf.value[0];
//     if (!shelf) {
//       showToast('收藏夹不存在');
//       return false;
//     }
//     if (shelf.videos.find((item) => item.video.id === videoItem.id)) {
//       showToast('收藏中已存在此视频');
//       return false;
//     }
//     videoItem.extra ||= {};
//     videoItem.extra.selected ||= false; // 用作从书架中删除
//     shelf.videos.push({
//       video: _.cloneDeep(videoItem),
//       createTime: Date.now(),
//     });
//     showToast(`已添加到 ${shelf.name}`);
//     return true;
//   };
//   const getVideoFromShelf = (
//     videoItem: VideoItem,
//     shelfId?: string
//   ): VideoItemInShelf | undefined => {
//     if (shelfId) {
//       return videoShelf.value
//         .find((item) => item.id === shelfId)
//         ?.videos.find((b) => b.video.id === videoItem.id);
//     } else {
//       // 遍历所有videoShelf.value， 获取第一个
//       for (const shelf of videoShelf.value) {
//         const find = shelf.videos.find((b) => b.video.id === videoItem.id);
//         if (find) {
//           return find;
//         }
//       }
//     }
//   };
//   const removeVideoFromShelf = (videoItem: VideoItem, shelfId?: string) => {
//     if (!videoShelf.value.length) {
//       showToast('收藏为空');
//       return;
//     }
//     if (!shelfId) shelfId = videoShelf.value[0].id;
//     const shelf = videoShelf.value.find((item) => item.id === shelfId);
//     if (!shelf) {
//       showToast('收藏不存在');
//       return;
//     }
//     _.remove(shelf.videos, (item) => item.video.id === videoItem.id);
//   };
//   const updateVideoPlayInfo = (
//     videoItem: VideoItem,
//     options: {
//       episode: VideoEpisode;
//       resource: VideoResource;
//       position?: number;
//     }
//   ) => {
//     if (!videoShelf.value) return;
//     for (let shelf of videoShelf.value) {
//       for (let video of shelf.videos) {
//         if (video.video.id === videoItem.id) {
//           video.video.lastWatchEpisodeId = options.episode.id;
//           video.video.lastWatchResourceId = options.resource.id;
//           if (options.position) {
//             const r = video.video.resources?.find(
//               (item) => item.id === video.video.lastWatchResourceId
//             );
//             const e = r?.episodes?.find(
//               (item) => item.id === video.video.lastWatchEpisodeId
//             );
//             if (e) {
//               e.lastWatchPosition = options.position;
//             }
//           }
//         }
//       }
//     }
//   };
//   const deleteVideoFromShelf = (videoItem: VideoItem, shelfId: string) => {
//     const shelf = videoShelf.value.find((item) => item.id === shelfId);
//     if (!shelf) return;
//     _.remove(shelf.videos, (item) => item.video.id === videoItem.id);
//   };
//   const clear = () => {
//     videoShelf.value = [
//       {
//         id: nanoid(),
//         name: '默认收藏',
//         videos: [],
//         createTime: Date.now(),
//       },
//     ];
//   };

//   return {
//     videoShelf,
//     createVideoShelf,
//     removeVideoShelf,
//     isVideoInShelf,
//     addToViseoSelf,
//     removeVideoFromShelf,
//     getVideoFromShelf,
//     updateVideoPlayInfo,
//     deleteVideoFromShelf,
//     clear,
//   };
// });

// export const useBookChapterStore = defineStore('bookChapterStore', () => {
//   const baseDir = fs.BaseDirectory.AppCache;
//   const dirName = 'book_cache';
//   const baseFile = 'books.json';
//   const books = ref<
//     {
//       book_id: string;
//       book_name: string;
//       source_id: string;
//       chapter_id: string;
//       chapter_name: string;
//       cache_book_id: string;
//       cache_chapter_id: string;
//     }[]
//   >([]);
//   let inited = false;
//   watch(
//     books,
//     _.debounce(async (newValue) => {
//       if (!newValue) {
//         return;
//       }
//       if (!inited) {
//         await ensureBase();
//       }
//       await fs.writeFile(
//         `${dirName}/${baseFile}`,
//         new TextEncoder().encode(JSON.stringify(newValue)),
//         {
//           baseDir: baseDir,
//         }
//       );
//     }, 500),
//     {
//       deep: true,
//     }
//   );

//   const ensureBase = async () => {
//     if (!(await fs.exists(dirName, { baseDir: baseDir }))) {
//       await fs.mkdir(dirName, {
//         baseDir: baseDir,
//         recursive: true,
//       });
//     }
//     if (
//       !(await fs.exists(`${dirName}/${baseFile}`, {
//         baseDir: baseDir,
//       }))
//     ) {
//       await fs.writeFile(
//         `${dirName}/${baseFile}`,
//         new TextEncoder().encode('[]'),
//         {
//           baseDir: baseDir,
//         }
//       );
//     } else {
//       books.value = JSON.parse(
//         new TextDecoder().decode(
//           await fs.readFile(`${dirName}/${baseFile}`, {
//             baseDir: baseDir,
//           })
//         )
//       );
//     }
//     inited = true;
//   };
//   const genBookCacheId = (book: BookItem) => {
//     return (
//       CryptoJS.MD5(`${book.sourceId}_${book.id}`).toString() +
//       sanitizePathName(book.title)
//     );
//   };
//   const genChapterCacheId = (book: BookItem, chapter: BookChapter) => {
//     return (
//       CryptoJS.MD5(`${book.sourceId}_${book.id}_${chapter.id}`).toString() +
//       sanitizePathName(chapter.title)
//     );
//   };
//   const saveBookChapter = async (
//     book: BookItem,
//     chapter: BookChapter,
//     content: string,
//     force = false
//   ) => {
//     if (!inited) {
//       await ensureBase();
//     }
//     const cache_book_id = genBookCacheId(book);
//     const cache_chapter_id = genChapterCacheId(book, chapter);

//     const find = books.value.find(
//       (b) =>
//         b.cache_book_id === cache_book_id &&
//         b.cache_chapter_id === cache_chapter_id
//     );
//     if (find && !force) {
//       // 已经有了，不需要重复保存
//       return;
//     }
//     if (
//       !(await fs.exists(`${dirName}/${cache_book_id}`, { baseDir: baseDir }))
//     ) {
//       await fs.mkdir(`${dirName}/${cache_book_id}`, {
//         baseDir: baseDir,
//         recursive: true,
//       });
//     }
//     await fs.writeFile(
//       `${dirName}/${cache_book_id}/${cache_chapter_id}`,
//       new TextEncoder().encode(content),
//       {
//         baseDir: baseDir,
//       }
//     );
//     if (!find) {
//       books.value.unshift({
//         book_id: book.id,
//         book_name: book.title,
//         source_id: book.sourceId,
//         chapter_id: chapter.id,
//         chapter_name: chapter.title,
//         cache_book_id,
//         cache_chapter_id,
//       });
//     }
//   };
//   const getBookChapter = async (
//     book: BookItem,
//     chapter: BookChapter
//   ): Promise<string | undefined> => {
//     if (!inited) {
//       await ensureBase();
//     }
//     const cache_book_id = genBookCacheId(book);
//     const cache_chapter_id = genChapterCacheId(book, chapter);

//     const find = books.value.find(
//       (b) =>
//         b.cache_book_id === cache_book_id &&
//         b.cache_chapter_id === cache_chapter_id
//     );
//     if (find) {
//       try {
//         return new TextDecoder().decode(
//           await fs.readFile(`${dirName}/${cache_book_id}/${cache_chapter_id}`, {
//             baseDir: baseDir,
//           })
//         );
//       } catch (error) {}
//     }
//   };
//   const removeBookCache = async (book: BookItem) => {
//     if (!inited) {
//       await ensureBase();
//     }
//     const cache_book_id = genBookCacheId(book);
//     books.value = books.value.filter((b) => b.cache_book_id !== cache_book_id);
//     if (await fs.exists(`${dirName}/${cache_book_id}`, { baseDir: baseDir })) {
//       try {
//         await fs.remove(`${dirName}/${cache_book_id}`, {
//           baseDir: baseDir,
//           recursive: true,
//         });
//       } catch (error) {
//         console.warn('删除章节缓存失败:', JSON.stringify(book));
//       }
//     }
//   };
//   const clear = async () => {
//     if (!inited) {
//       await ensureBase();
//     }
//     await fs.remove(dirName, {
//       baseDir: baseDir,
//       recursive: true,
//     });
//     books.value = [];
//     inited = false;

//     // [...new Set(books.value.map((book) => book.cache_book_id))].forEach(
//     //   async (cache_book_id) => {
//     //     if (
//     //       await fs.exists(`${dirName}/${cache_book_id}`, {
//     //         baseDir: baseDir,
//     //       })
//     //     ) {
//     //       try {
//     //         await fs.remove(`${dirName}/${cache_book_id}`, {
//     //           baseDir: baseDir,
//     //           recursive: true,
//     //         });
//     //       } catch (error) {}
//     //     }
//     //   }
//     // );
//   };

//   const chapterInCache = (book: BookItem, chapter: BookChapter) => {
//     const cache_book_id = genBookCacheId(book);
//     const cache_chapter_id = genChapterCacheId(book, chapter);

//     const find = books.value.find(
//       (b) =>
//         b.cache_book_id === cache_book_id &&
//         b.cache_chapter_id === cache_chapter_id
//     );
//     return !!find;
//   };
//   return {
//     getBookChapter,
//     saveBookChapter,
//     removeBookCache,
//     clear,
//     chapterInCache,
//   };
// });

// export const useSongCacheStore = defineStore('songCacheStore', () => {
//   const displayStore = useDisplayStore();
//   const baseDir = fs.BaseDirectory.AppCache;
//   const dirName = 'song_cache';
//   const baseFile = 'songs.json';
//   const songs = ref<
//     {
//       song_id: string;
//       song_name: string;
//       source_id: string;
//       update_time: number;
//       cache_song_id: string;
//     }[]
//   >([]);
//   let inited = false;
//   watch(
//     songs,
//     _.debounce(async (newValue) => {
//       if (!newValue) {
//         return;
//       }
//       if (!inited) {
//         await ensureBase();
//       }
//       await fs.writeFile(
//         `${dirName}/${baseFile}`,
//         new TextEncoder().encode(JSON.stringify(newValue)),
//         {
//           baseDir: baseDir,
//         }
//       );
//     }, 500),
//     {
//       deep: true,
//     }
//   );

//   const ensureBase = async () => {
//     if (!(await fs.exists(dirName, { baseDir: baseDir }))) {
//       await fs.mkdir(dirName, {
//         baseDir: baseDir,
//         recursive: true,
//       });
//     }
//     if (
//       !(await fs.exists(`${dirName}/${baseFile}`, {
//         baseDir: baseDir,
//       }))
//     ) {
//       await fs.writeFile(
//         `${dirName}/${baseFile}`,
//         new TextEncoder().encode('[]'),
//         {
//           baseDir: baseDir,
//         }
//       );
//       songs.value = [];
//     } else {
//       songs.value = JSON.parse(
//         new TextDecoder().decode(
//           await fs.readFile(`${dirName}/${baseFile}`, {
//             baseDir: baseDir,
//           })
//         )
//       );
//     }
//     inited = true;
//     if (songs.value.length > 200) {
//       // 1. 获取update_time最小的20首歌曲
//       const minUpdateTimeSongs = [...songs.value]
//         .sort((a, b) => a.update_time - b.update_time)
//         .slice(0, 20);
//       // 2. 更新books.value
//       songs.value = songs.value.filter(
//         (song) => !minUpdateTimeSongs.includes(song)
//       );
//       // 3. 根据cache_song_id删除文件
//       for (const song of minUpdateTimeSongs) {
//         if (
//           await fs.exists(`${dirName}/${song.cache_song_id}`, {
//             baseDir: baseDir,
//           })
//         ) {
//           try {
//             await fs.remove(`${dirName}/${song.cache_song_id}`, {
//               baseDir: baseDir,
//               recursive: true,
//             });
//           } catch (error) {
//             console.warn('删除歌曲缓存失败:', JSON.stringify(song));
//           }
//         }
//         const cover_id = songIdToCoverId(song.cache_song_id);
//         if (
//           await fs.exists(`${dirName}/${cover_id}`, {
//             baseDir: baseDir,
//           })
//         ) {
//           try {
//             await fs.remove(`${dirName}/${cover_id}`, {
//               baseDir: baseDir,
//               recursive: true,
//             });
//           } catch (error) {
//             console.warn('删除封面缓存失败:', JSON.stringify(song));
//           }
//         }
//       }
//     }
//   };
//   const genCacheSongId = (song: SongInfo) => {
//     let a = '';
//     if (song.artists) {
//       if (Array.isArray(song.artists)) {
//         if (typeof song.artists[0] === 'string') {
//           // 处理 string[] 类型
//           a = '-' + song.artists.join(',');
//         } else {
//           // 处理 ArtistInfo[] 类型
//           a =
//             '-' +
//             song.artists.map((artist) => (artist as ArtistInfo).name).join(',');
//         }
//       }
//     }
//     return (
//       sanitizePathName(song.name || '') +
//       a +
//       sanitizePathName(song.sourceId) +
//       '.mp3'
//     );
//   };
//   const songIdToCoverId = (songId: string) => {
//     return `${songId}.png`;
//   };
//   const saveSong = async (
//     song: SongInfo,
//     url: string,
//     force = false
//   ): Promise<boolean> => {
//     if (!inited) {
//       await ensureBase();
//     }
//     const cache_song_id = genCacheSongId(song);

//     const find = songs.value.find(
//       (s) => s.song_id === song.id && s.source_id === song.sourceId
//     );
//     if (find && !force) {
//       // 已经有了，不需要重复保存
//       return true;
//     }
//     let blob: Blob;
//     const t = displayStore.showToast();
//     try {
//       if (url.startsWith('blob')) {
//         blob = await (await window.fetch(url)).blob();
//       } else {
//         blob = await (await fetch(url)).blob();
//       }
//       if (blob.size === 0) return false; // 获取失败

//       const unit: Uint8Array = await new Promise((resolve, reject) => {
//         const reader = new FileReader();

//         reader.onload = () => {
//           if (reader.result instanceof ArrayBuffer) {
//             const arrayBuffer = reader.result;
//             const uint8Array = new Uint8Array(arrayBuffer);
//             resolve(uint8Array);
//           } else {
//             reject(new Error('Failed to read blob as ArrayBuffer'));
//           }
//         };

//         reader.onerror = () => {
//           reject(reader.error);
//         };
//         reader.readAsArrayBuffer(blob);
//       });
//       await fs.writeFile(`${dirName}/${cache_song_id}`, unit, {
//         baseDir: baseDir,
//       });
//       if (!find) {
//         songs.value.unshift({
//           song_id: song.id,
//           song_name: song.name || '',
//           source_id: song.sourceId,
//           update_time: Date.now(),
//           cache_song_id,
//         });
//       } else {
//         find.update_time = Date.now();
//       }
//     } catch (error) {
//       console.warn('saveSong:', error);
//     }
//     await saveCover(song, cache_song_id);
//     displayStore.closeToast(t);
//     return true;
//   };

//   const saveSongv2 = async (
//     song: SongInfo,
//     url: string,
//     options: RequestInit & ClientOptions,
//     force = false
//   ) => {
//     if (!inited) {
//       await ensureBase();
//     }
//     const cache_song_id = genCacheSongId(song);

//     const find = songs.value.find(
//       (s) => s.song_id === song.id && s.source_id === song.sourceId
//     );
//     if (find && !force) {
//       // 已经有了，不需要重复保存
//       return true;
//     }
//     const t = displayStore.showToast();
//     try {
//       const option = {
//         ...options,
//         baseDir: baseDir,
//         path: `${dirName}/${cache_song_id}`,
//       };
//       const ret = await fs.fetchAndSave(url, option);
//       if (!ret) {
//         throw Error('fetchAndSave 失败');
//       }

//       if (!find) {
//         songs.value.unshift({
//           song_id: song.id,
//           song_name: song.name || '',
//           source_id: song.sourceId,
//           update_time: Date.now(),
//           cache_song_id,
//         });
//       } else {
//         find.update_time = Date.now();
//       }
//     } catch (error) {
//       console.warn('saveSongv2:', error);
//     }
//     await saveCover(song, cache_song_id);
//     displayStore.closeToast(t);
//     return true;
//   };

//   const replaceSongSrc = async (song: SongInfo, goodSong: SongInfo) => {
//     // 使用goodSong的播放地址覆盖song的播放地址
//     if (!inited) {
//       await ensureBase();
//     }
//     const find = songs.value.find(
//       (s) => s.song_id === song.id && s.source_id === song.sourceId
//     );

//     const cache_song_id = genCacheSongId(song);
//     const good_cache_song_id = genCacheSongId(goodSong);
//     await fs.copyFile(
//       `${dirName}/${good_cache_song_id}`,
//       `${dirName}/${cache_song_id}`,
//       {
//         fromPathBaseDir: baseDir,
//         toPathBaseDir: baseDir,
//       }
//     );
//     if (!find) {
//       songs.value.unshift({
//         song_id: song.id,
//         song_name: song.name || '',
//         source_id: song.sourceId,
//         update_time: Date.now(),
//         cache_song_id,
//       });
//     } else {
//       find.update_time = Date.now();
//     }
//   };

//   const saveCover = async (song: SongInfo, cache_song_id: string) => {
//     if (!inited) {
//       await ensureBase();
//     }
//     const cover_id = songIdToCoverId(cache_song_id);
//     if (await fs.exists(`${dirName}/${cover_id}`, { baseDir: baseDir })) {
//       if (
//         (await fs.stat(`${dirName}/${cover_id}`, { baseDir: baseDir })).size > 0
//       ) {
//         return;
//       }
//     }
//     if (song.picUrl) {
//       try {
//         const response = await fetch(song.picUrl, { headers: song.picHeaders });
//         const blob = await response.blob();
//         if (blob.size === 0) return;
//         const unit: Uint8Array = await new Promise((resolve, reject) => {
//           const reader = new FileReader();

//           reader.onload = () => {
//             if (reader.result instanceof ArrayBuffer) {
//               const arrayBuffer = reader.result;
//               const uint8Array = new Uint8Array(arrayBuffer);
//               resolve(uint8Array);
//             } else {
//               reject(new Error('Failed to read blob as ArrayBuffer'));
//             }
//           };

//           reader.onerror = () => {
//             reject(reader.error);
//           };

//           reader.readAsArrayBuffer(blob);
//         });
//         await fs.writeFile(`${dirName}/${cover_id}`, unit, {
//           baseDir: baseDir,
//         });
//       } catch (error) {}
//     }
//   };
//   const getSong = async (song: SongInfo): Promise<string | undefined> => {
//     if (!inited) {
//       await ensureBase();
//     }

//     const find = songs.value.find(
//       (s) => s.song_id === song.id && s.source_id === song.sourceId
//     );
//     if (
//       find &&
//       (await fs.exists(`${dirName}/${find.cache_song_id}`, {
//         baseDir: baseDir,
//       }))
//     ) {
//       try {
//         if (displayStore.isAndroid) {
//           return `file://${dirName}/${find.cache_song_id}`;
//         }

//         const buffer = await fs.readFile(`${dirName}/${find.cache_song_id}`, {
//           baseDir: baseDir,
//         });
//         if (buffer.byteLength === 0) {
//           await removeSong(song);
//           return undefined;
//         }
//         const blobUrl = URL.createObjectURL(
//           new Blob([buffer], { type: 'audio/mpeg' })
//         );
//         return blobUrl;
//       } catch (error) {}
//     }
//   };
//   const getCover = async (song: SongInfo): Promise<string | undefined> => {
//     if (!inited) {
//       await ensureBase();
//     }
//     const find = songs.value.find(
//       (s) => s.song_id === song.id && s.source_id === song.sourceId
//     );
//     if (find) {
//       const cover_id = songIdToCoverId(find.cache_song_id);
//       if (
//         await fs.exists(`${dirName}/${cover_id}`, {
//           baseDir: baseDir,
//         })
//       ) {
//         try {
//           if (displayStore.isAndroid) {
//             return `file://${dirName}/${cover_id}`;
//           }

//           const buffer = await fs.readFile(`${dirName}/${cover_id}`, {
//             baseDir: baseDir,
//           });
//           if (buffer.byteLength === 0) {
//             await removeCover(song);
//             return undefined;
//           }
//           const blobUrl = URL.createObjectURL(
//             new Blob([buffer], { type: 'image/png' })
//           );
//           return blobUrl;
//         } catch (error) {}
//       }
//     }
//   };
//   const removeSong = async (song: SongInfo) => {
//     if (!inited) {
//       await ensureBase();
//     }
//     const find = songs.value.find(
//       (s) => s.song_id === song.id && s.source_id === song.sourceId
//     );
//     if (find) {
//       if (
//         await fs.exists(`${dirName}/${find.cache_song_id}`, {
//           baseDir: baseDir,
//         })
//       ) {
//         try {
//           await fs.remove(`${dirName}/${find.cache_song_id}`, {
//             baseDir: baseDir,
//             recursive: true,
//           });
//           songs.value = songs.value.filter(
//             (s) => s.cache_song_id !== find.cache_song_id
//           );
//         } catch (error) {}
//       }
//     }
//     removeCover(song);
//   };

//   const removeCover = async (song: SongInfo) => {
//     if (!inited) {
//       await ensureBase();
//     }
//     const find = songs.value.find(
//       (s) => s.song_id === song.id && s.source_id === song.sourceId
//     );
//     if (find) {
//       const cover_id = songIdToCoverId(find.cache_song_id);
//       if (
//         await fs.exists(`${dirName}/${cover_id}`, {
//           baseDir: baseDir,
//         })
//       ) {
//         try {
//           await fs.remove(`${dirName}/${cover_id}`, {
//             baseDir: baseDir,
//             recursive: true,
//           });
//         } catch (error) {}
//       }
//     }
//   };

//   const clear = async () => {
//     if (!inited) {
//       await ensureBase();
//     }
//     try {
//       await fs.remove(`${dirName}`, {
//         baseDir: baseDir,
//         recursive: true,
//       });
//     } catch (error) {
//       console.warn('clear song cache:', error);
//     }

//     songs.value = [];
//     inited = false;
//     // [...songs.value.map((song) => song.cache_song_id)].forEach(
//     //   async (cache_song_id) => {
//     //     if (
//     //       await fs.exists(`${dirName}/${cache_song_id}`, {
//     //         baseDir: baseDir,
//     //       })
//     //     ) {
//     //       try {
//     //         await fs.remove(`${dirName}/${cache_song_id}`, {
//     //           baseDir: baseDir,
//     //           recursive: true,
//     //         });
//     //       } catch (error) {}
//     //     }
//     //     const cover_id = songIdToCoverId(cache_song_id);
//     //     if (
//     //       await fs.exists(`${dirName}/${cover_id}`, {
//     //         baseDir: baseDir,
//     //       })
//     //     ) {
//     //       try {
//     //         await fs.remove(`${dirName}/${cover_id}`, {
//     //           baseDir: baseDir,
//     //           recursive: true,
//     //         });
//     //       } catch (error) {}
//     //     }
//     //   }
//     // );
//   };
//   return {
//     songs,
//     saveSong,
//     saveSongv2,
//     saveCover,
//     getSong,
//     getCover,
//     removeSong,
//     removeCover,
//     clear,
//     replaceSongSrc,
//   };
// });

// export const useTTSStore = defineStore('ttsStore', () => {
// });
