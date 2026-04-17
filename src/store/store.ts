import type { HotItem } from '@wuji-tauri/hot-api';
import { defineStore, storeToRefs } from 'pinia';
import { showLoadingToast, showSuccessToast } from 'vant';
import { ref } from 'vue';
import { useBookChapterStore } from './bookChaptersStore';
import { useBookShelfStore } from './bookShelfStore';
import { useBookStore } from './bookStore';
import { useComicShelfStore } from './comicShelfStore';
import { useComicStore } from './comicStore';
import { useExtensionStore } from './extensionStore';
import { usePhotoShelfStore } from './photoShelfStore';
import { usePhotoStore } from './photoStore';
import { useServerStore } from './serverStore';
import { useSongCacheStore } from './songCacheStore';
import { useSongShelfStore } from './songShelfStore';
import { useSongStore } from './songStore';
import { useSourceCreateStore } from './sourceCreateStore';
import { useSubscribeSourceStore } from './subscribeSourceStore';
import { useTTSStore } from './ttsStore';
import { createKVStore } from './utils';
import { useVideoShelfStore } from './videoShelfStore';
import { useVideoStore } from './videoStore';

export const useStore = defineStore('store', () => {
  const hotItems = ref<HotItem[]>([]); // 热搜榜

  const kvStorage = createKVStore();
  const bookChapterStore = useBookChapterStore();
  const bookShelfStore = useBookShelfStore();
  const bookStore = useBookStore();
  const comicShelfStore = useComicShelfStore();
  const comicStore = useComicStore();
  const photoShelfStore = usePhotoShelfStore();
  const photoStore = usePhotoStore();
  const serverStore = useServerStore();
  const songCacheStore = useSongCacheStore();
  const songShelfStore = useSongShelfStore();
  const songStore = useSongStore();
  const subscribeSourceStore = useSubscribeSourceStore();
  const ttsStore = useTTSStore();
  const videoShelfStore = useVideoShelfStore();
  const videoStore = useVideoStore();
  const extensionStore = useExtensionStore();

  const { photoSources } = storeToRefs(photoStore);
  const { songSources } = storeToRefs(songStore);
  const { bookSources } = storeToRefs(bookStore);
  const { comicSources } = storeToRefs(comicStore);
  const { videoSources } = storeToRefs(videoStore);
  const { subscribeSources } = storeToRefs(subscribeSourceStore);

  const clearData = async () => {
    const loading = showLoadingToast({
      message: '清空中',
      duration: 0,
      closeOnClick: true,
      closeOnClickOverlay: false,
    });
    // 清空订阅源
    await subscribeSourceStore.clearSubscribeSources();
    subscribeSourceStore.loadSubscribeSources(true);

    await photoShelfStore.clear(); // 清空图片收藏
    await songShelfStore.clear(); // 清空音乐收藏
    await bookShelfStore.clear(); // 清空书架
    await comicShelfStore.clear(); // 清空漫画收藏
    await videoShelfStore.clear(); // 清空视频收藏

    // 清空serverStore
    await serverStore.clear();

    // 清空create source
    const createSourceStore = useSourceCreateStore();
    await createSourceStore.clear();

    // 清空章节缓存
    await bookChapterStore.clear();
    // 清空音乐缓存
    await songCacheStore.clear();
    // 清空localstorage
    localStorage.clear();
    // 清空页面显示内容
    await kvStorage.storage.clear();
    loading.close();
    showSuccessToast('数据已清空');
  };

  const clearCache = async () => {
    const toast = showLoadingToast({
      message: '请稍候',
      duration: 0,
      closeOnClick: true,
      closeOnClickOverlay: false,
    });
    await songCacheStore.clear();
    await bookChapterStore.clear();
    toast.close();
    showSuccessToast('缓存已清空');
  };

  return {
    hotItems,
    photoSources,
    songSources,
    bookSources,
    comicSources,
    videoSources,
    subscribeSources,

    // Photo Actions
    photoRecommendList: photoStore.photoRecommendList,
    photoSearchList: photoStore.photoSearchList,
    photoDetail: photoStore.photoDetail,
    getPhotoSource: photoStore.getPhotoSource,
    getPhotoItem: photoStore.getPhotoItem,

    // Song Actions
    songRecommendPlayist: songStore.songRecommendPlayist,
    songPlaylistDetail: songStore.songPlaylistDetail,
    songPlaylistPlayAll: songStore.songPlaylistPlayAll,
    songRecommendSong: songStore.songRecommendSong,
    songSearchSong: songStore.songSearchSong,
    songSearchPlaylist: songStore.songSearchPlaylist,
    getPlaylistInfo: songStore.getPlaylistInfo,
    getSongSource: songStore.getSongSource,

    // Book Actions
    bookRecommendList: bookStore.bookRecommendList,
    bookSearch: bookStore.bookSearch,
    bookDetail: bookStore.bookDetail,
    bookRead: bookStore.bookRead,
    cacheBookChapters: bookStore.cacheBookChapters,
    getBookSource: bookStore.getBookSource,
    getBookItem: bookStore.getBookItem,

    // Comic Actions
    comicRecommendList: comicStore.comicRecommendList,
    comicSearch: comicStore.comicSearch,
    comicDetail: comicStore.comicDetail,
    comicRead: comicStore.comicRead,
    getComicSource: comicStore.getComicSource,
    getComicItem: comicStore.getComicItem,

    // Video Actions
    videoRecommendList: videoStore.videoRecommendList,
    videoSearch: videoStore.videoSearch,
    videoDetail: videoStore.videoDetail,
    videoPlay: videoStore.videoPlay,
    getVideoSource: videoStore.getVideoSource,
    getVideoItem: videoStore.getVideoItem,

    // Subscribe Actions
    addSubscribeSource: subscribeSourceStore.addSubscribeSourceAction,
    addMarketSource: subscribeSourceStore.addMarketSource,
    addLocalSubscribeSource: subscribeSourceStore.addLocalSubscribeSource,
    updateSubscribeSources: subscribeSourceStore.updateSubscribeSources,
    loadSubscribeSources: subscribeSourceStore.loadSubscribeSources,
    addToSource: subscribeSourceStore.addToSource,
    removeFromSource: subscribeSourceStore.removeFromSource,
    getSource: subscribeSourceStore.getSource,
    removeSource: subscribeSourceStore.removeSource,
    localSourceId: subscribeSourceStore.localSourceId,

    // Extension Actions
    sourceClass: extensionStore.getSourceClass,

    clearData,
    clearCache,

    // Legacy check call
    checkAfterSubscribeLoaded: subscribeSourceStore.onLoaded,
  };
});
