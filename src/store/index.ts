import _ from "lodash";
import { HotItem } from "@/apis/hot/apiHot";
import {
  loadPhotoExtensionString,
  PhotoExtension,
  PhotoItem,
  PhotoShelf,
} from "@/extensions/photo";
import {
  SongSource,
  PhotoSource,
  Source,
  SourceType,
  SubscribeDetail,
  SubscribeSource,
  SubscribeItem,
  BookSource,
} from "@/types";
import {
  StorageLike,
  StorageLikeAsync,
  useDark,
  useStorage,
  useStorageAsync,
  useToggle,
} from "@vueuse/core";
import { defineStore } from "pinia";
import { showConfirmDialog, showNotify, showToast } from "vant";
import {
  computed,
  onBeforeMount,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  toRaw,
  triggerRef,
} from "vue";
import { Store } from "@tauri-apps/plugin-store";
import { fetch } from "@tauri-apps/plugin-http";
import { Toast, toast } from "vue3-toastify";
import {
  loadSongExtensionString,
  SongShelf,
  PlaylistInfo,
  SongExtension,
  SongInfo,
} from "@/extensions/song";
import { SongPlayMode, SongShelfType } from "@/types/song";
import { watch } from "vue";
import { sleep, tryCatchProxy } from "@/utils";
import {
  BookChapter,
  BookExtension,
  BookItem,
  BookShelf,
  loadBookExtensionString,
} from "@/extensions/book";
import { Extension } from "@/extensions/baseExtension";

import TestPhotoExtension from "@/extensions/photo/test";
import TestSongExtension from "@/extensions/song/test";
import TestBookExtension from "@/extensions/book/test";
import { nanoid } from "nanoid";
import { createCancellableFunction } from "@/utils/cancelableFunction";

export const useStore = defineStore("store", () => {
  const hotItems = ref<HotItem[]>([]); // 热搜榜

  const subscribeSourceStore = useSubscribeSourceStore();
  const kvStorage = createKVStore();

  const sourceClasses = new Map<String, Extension | null>();
  const sourceClass = async (
    item: SubscribeItem
  ): Promise<Extension | null | undefined> => {
    if (sourceClasses.has(item.id)) {
      return sourceClasses.get(item.id);
    }
    // for test
    if (item.code === "test") {
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
        default:
          break;
      }
      return sourceClasses.get(item.id);
    }
    if (!item.code) {
      try {
        item.code = await (await fetch(item.url)).text();
      } catch (error) {
        console.log("加载扩展失败:", item);
        sourceClasses.set(item.id, null);
        return null;
      }
    }
    let extensionClass:
      | PhotoExtension
      | SongExtension
      | BookExtension
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
      default:
        extensionClass = undefined;
        break;
    }
    if (!extensionClass) {
      toast(`添加 ${item.name} 订阅源失败`);
      sourceClasses.set(item.id, null);
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
    "photoSources",
    [],
    kvStorage.storage
  );
  // const photoSources = ref<PhotoSource[]>([]);
  const songSources = useStorageAsync<SongSource[]>(
    "songSources",
    [],
    kvStorage.storage
  );
  // const songSources = ref<SongSource[]>([]);
  const bookSources = useStorageAsync<BookSource[]>(
    "bookSources",
    [],
    kvStorage.storage
  );
  const keepTest = ref(true);

  // const bookSources = ref<BookSource[]>([]);

  /**
   * 获取推荐列表
   */
  const photoRecommendList = async (
    source: PhotoSource,
    pageNo: number = 1
  ) => {
    const sc = (await sourceClass(source.item)) as PhotoExtension;
    const res = await sc?.getRecommendList(pageNo);
    console.log(res);

    if (res) {
      res.list.forEach((item) => {
        item.sourceId = source.item.id;
      });
      source.list = res;
    } else {
      toast(`${source.item.name} 推荐结果为空`);
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
    pageNo: number = 1
  ) => {
    const sc = (await sourceClass(source.item)) as PhotoExtension;
    const res = await sc?.search(keyword, pageNo);

    if (res) {
      res.list.forEach((item) => {
        item.sourceId = source.item.id;
      });
      source.list = res;
    } else {
      toast(`${source.item.name} 搜索结果为空`);
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
    pageNo: number = 1
  ) => {
    const sc = (await sourceClass(source.item)) as PhotoExtension;
    const res = await sc?.getPhotoDetail(item, pageNo);
    if (res) {
      res.sourceId = source.item.id;
      return res;
    } else {
      showNotify(`${source.item.name} 获取内容失败`);
      return null;
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
      default:
        return undefined;
    }
  };
  const getPhotoSource = (sourceId: string): PhotoSource | undefined => {
    return photoSources.value.find((item) => item.item.id === sourceId);
  };
  const getSongSource = (sourceId: string): SongSource | undefined => {
    return songSources.value.find((source) => source.item.id === sourceId);
  };
  /**
   * 根据id获取图片
   */
  const getPhotoItem = (
    source: PhotoSource,
    itemId: string
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
  // 音乐
  const songRecommendPlayist = async (
    source: SongSource,
    pageNo: number = 1
  ) => {
    const sc = (await sourceClass(source.item)) as SongExtension;
    const res = await sc?.getRecommendPlaylists(pageNo);
    if (res) {
      res.list.forEach((item) => {
        item.sourceId = source.item.id;
      });
      source.playlist = res;
    } else {
      source.playlist = undefined;
    }
    triggerRef(songSources);
  };
  const songPlaylistDetail = async (
    source: SongSource,
    item: PlaylistInfo,
    pageNo: number = 1
  ) => {
    const sc = (await sourceClass(source.item)) as SongExtension;
    const res = await sc?.getPlaylistDetail(item, pageNo);
    if (res) {
      res.list?.list.forEach((item) => {
        item.sourceId = source.item.id;
      });
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
      const res = await sc?.getPlaylistDetail(
        _.cloneDeep(item), // 不修改原对象
        pageNo
      );
      res?.list?.list.forEach((item) => {
        item.sourceId = source.item.id;
      });

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
      return;
    } else {
      const songStore = useSongStore();
      await songStore.setPlayingList(songs, songs[0]);
    }
  };
  const songRecommendSong = async (source: SongSource, pageNo: number = 1) => {
    const sc = (await sourceClass(source.item)) as SongExtension;
    const res = await sc?.getRecommendSongs(pageNo);
    if (res) {
      res.list.forEach((item) => {
        item.sourceId = source.item.id;
      });
      source.songList = res;
    } else {
      source.songList = undefined;
    }
    triggerRef(songSources);
  };
  const songSearchSong = async (
    source: SongSource,
    keyword: string,
    pageNo: number = 1
  ) => {
    const sc = (await sourceClass(source.item)) as SongExtension;
    const res = await sc?.searchSongs(keyword, pageNo);
    if (res) {
      res.list.forEach((item) => {
        item.sourceId = source.item.id;
      });
      source.songList = res;
    } else {
      source.songList = undefined;
    }
    triggerRef(songSources);
  };
  const songSearchPlaylist = async (
    source: SongSource,
    keyword: string,
    pageNo: number = 1
  ) => {
    const sc = (await sourceClass(source.item)) as SongExtension;
    const res = await sc?.searchPlaylists(keyword, pageNo);
    if (res) {
      res.list.forEach((item) => {
        item.sourceId = source.item.id;
      });
      source.playlist = res;
    } else {
      source.playlist = undefined;
    }
    triggerRef(songSources);
  };
  const getPlaylistInfo = (
    source: SongSource,
    playlistId: string
  ): PlaylistInfo | undefined => {
    return source.playlist?.list.find((item) => item.id === playlistId);
  };
  /**
   * 获取推荐列表
   */
  const bookRecommendList = async (
    source: BookSource,
    pageNo: number = 1,
    type?: string
  ) => {
    const sc = (await sourceClass(source.item)) as BookExtension;
    const res = await sc?.getRecommendBooks(pageNo, type);

    if (res) {
      _.castArray(res).forEach((book) => {
        book.list.forEach((item) => {
          item.sourceId = source.item.id;
        });
      });

      if (!type) {
        // 1. 获取的不是指定type类型的数据，直接赋值
        source.list = res;
      } else {
        // 2. 获取的是指定type类型的数据，判断是否已经存在，不存在则添加
        const find = _.castArray(source.list).find(
          (item) => item.type === type
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
    pageNo: number = 1
  ) => {
    const sc = (await sourceClass(source.item)) as BookExtension;
    const res = await sc?.search(keyword, pageNo);
    if (res) {
      _.castArray(res).forEach((book) => {
        book.list.forEach((item) => {
          item.sourceId = source.item.id;
        });
      });
      source.list = res;
    } else {
      source.list = undefined;
    }
  };
  const bookDetail = async (source: BookSource, book: BookItem) => {
    const sc = (await sourceClass(source.item)) as BookExtension;
    const res = await sc?.getBookDetail(book);
    if (res) {
      res.sourceId = source.item.id;
      return res;
    } else {
      showNotify(`${source.item.name} 获取内容失败`);
      return null;
    }
  };
  const bookRead = async (
    source: BookSource,
    book: BookItem,
    chapter: BookChapter
  ): Promise<string | null> => {
    const sc = (await sourceClass(source.item)) as BookExtension;
    const res = await sc?.getContent(book, chapter);

    return res;
  };
  const getBookSource = (sourceId: string): BookSource | undefined => {
    return bookSources.value.find((item) => item.item.id === sourceId);
  };
  const getBookItem = (
    source: BookSource,
    bookId: string
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
        for (let bookList of _.castArray(source.list)) {
          for (let bookItem of bookList.list) {
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

  /**
   * 添加订阅源
   */
  const addSubscribeSource = async (url: string, raise: boolean = false) => {
    try {
      // 1. 从网址获取内容
      const subscribeResponse = await fetch(url);
      const res: SubscribeDetail = await subscribeResponse.json();
      // 2. 检查是否已存在，然后同步disable状态
      const oldSource = subscribeSourceStore.getSubscribeSource(res.id);
      // 3.测试是否可用，然后添加
      const source: SubscribeSource = {
        url: url,
        detail: {
          id: res.id,
          name: res.name,
          version: res.version,
          requireVersion: res.requireVersion,
          urls: [],
        },
        disable: oldSource?.disable || false,
      };
      for (let item of res.urls) {
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
          true
        );
        source.detail.urls.push(item);
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
      subscribeSourceStore.addSubscribeSource(source); //保存
    } catch (error) {
      showToast("添加订阅源失败");
      if (raise) {
        throw error;
      }
    }
  };
  const updateSubscribeSources = async () => {
    const t = toast.loading("更新订阅源中", {
      onClick: () => {
        toast.remove(t);
      },
    });
    const failed: string[] = [];
    for (const source of subscribeSourceStore.subscribeSources) {
      const url = source.url;
      try {
        await addSubscribeSource(url, true);
      } catch (error) {
        console.log(error);
        failed.push(source.detail.name);
      }
    }

    if (failed.length > 0) {
      showNotify(`${failed.join(",")} 订阅源更新失败`);
    } else {
      showNotify({
        type: "success",
        message: "更新订阅源成功",
        duration: 2000,
      });
    }
    toast.remove(t);
    await subscribeSourceStore.saveSubscribeSources();
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
          (item) => item.item.id === source.item.id
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
          (item) => item.item.id === source.item.id
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
          (item) => item.item.id === source.item.id
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
      default:
        console.log("暂未实现", source);
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
      default:
        console.log("暂未实现 removeFromSource", sourceType);
    }
  };
  const loadSubscribeSources = (load?: boolean) => {
    load ??= false;

    const added: string[] = [];

    for (const source of subscribeSourceStore.subscribeSources) {
      if (source.detail) {
        for (let item of source.detail.urls) {
          if (!item.disable) {
            const found = getSource(item);
            if (found) {
              found.item = item;
            } else {
              addToSource(
                {
                  item,
                },
                load
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
    for (const sources of [
      photoSources.value,
      songSources.value,
      bookSources.value,
    ]) {
      for (const source of sources) {
        if (!added.includes(source.item.id)) {
          if (source.item.id.includes("test") && keepTest.value) {
            continue;
          }
          removeFromSource(source.item.id, source.item.type);
        }
      }
    }
  };

  const addTestSource = (extension: Extension, type: SourceType) => {
    const item = {
      id: extension.id,
      name: extension.name,
      type: "",
      url: "",
      code: "test",
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
      default:
        break;
    }
    if (!item.type) return;
    const found = getSource(item as SubscribeItem);
    if (found) {
      found.item = item as SubscribeItem;
    } else {
      addToSource(
        {
          item: item as SubscribeItem,
        },
        true
      );
    }
  };

  onBeforeMount(async () => {
    await subscribeSourceStore.init();
    if (!subscribeSourceStore.isEmpty) {
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
          message: "您需要添加订阅源才能正常使用，\n是否立即导入默认源？",
        });
        if (dialog === "confirm") {
          await addSubscribeSource(
            "https://raw.githubusercontent.com/moshstudio/test/refs/heads/main/default_source.json"
          );
          showToast("默认源已导入");
        }
      } catch (error) {}
    }
    // addTestSource(new TestBookExtension(), SourceType.Book);
    addTestSource(new TestPhotoExtension(), SourceType.Photo);
    // keepTest.value = false;
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

    addSubscribeSource,
    loadSubscribeSources,
    updateSubscribeSources,
    removeFromSource,
  };
});

export const useDisplayStore = defineStore("display", () => {
  const taichiAnimateRandomized = ref(false);
  const isDark = useDark();
  const toggleDark = useToggle(isDark);

  const showAddSubscribeDialog = ref(false);
  const showManageSubscribeDialog = ref(false);

  const showAddBookShelfDialog = ref(false);
  const showRemoveBookShelfDialog = ref(false);

  const showAddSongShelfDialog = ref(false);
  const showRemoveSongShelfDialog = ref(false);

  const showAddPhotoShelfDialog = ref(false);
  const showRemovePhotoShelfDialog = ref(false);

  const showAboutDialog = ref(false);

  const readBgColor = useStorageAsync("readbgColor", "");
  const readFontSize = useStorageAsync("readFontSize", "20");

  return {
    taichiAnimateRandomized,
    isDark,
    toggleDark,
    showAddSubscribeDialog,
    showManageSubscribeDialog,

    showAddBookShelfDialog,
    showRemoveBookShelfDialog,

    showAddSongShelfDialog,
    showRemoveSongShelfDialog,

    showAddPhotoShelfDialog,
    showRemovePhotoShelfDialog,

    showAboutDialog,

    readBgColor,
    readFontSize,
  };
});

export const useSubscribeSourceStore = defineStore("subscribeSource", () => {
  let store: Store | undefined = undefined;
  const subscribeSources = reactive<SubscribeSource[]>([]);
  const init = async () => {
    store = await Store.load("subscribeSourceStore.json");
    const stored = await store?.get<SubscribeSource[]>("subscribeSources");
    if (stored) {
      subscribeSources.push(...stored);
    }
  };
  const addSubscribeSource = async (source: SubscribeSource) => {
    const index = subscribeSources.findIndex(
      (item) => item.detail.id === source.detail.id
    );
    if (index != -1) {
      subscribeSources[index] = source;
    } else {
      subscribeSources.push(source);
    }
    await saveSubscribeSources();
  };
  const removeSubscribeSource = async (source: SubscribeSource) => {
    _.remove(subscribeSources, (s) => s.detail.id === source.detail.id);
    await saveSubscribeSources();
  };
  const getSubscribeSource = (
    sourceId: string
  ): SubscribeSource | undefined => {
    return subscribeSources.find((item) => item.detail.id === sourceId);
  };
  const saveSubscribeSources = async () => {
    await store?.set("subscribeSources", subscribeSources);
  };
  const clearSubscribeSources = async () => {
    subscribeSources.length = 0;
    await store?.clear();
  };
  const isEmpty = computed(() => subscribeSources.length === 0);

  return {
    store,
    init,
    subscribeSources,
    addSubscribeSource,
    removeSubscribeSource,
    getSubscribeSource,
    saveSubscribeSources,
    clearSubscribeSources,
    isEmpty,
  };
});

export const useSongStore = defineStore("song", () => {
  const volumeVisible = ref<boolean>(false); // 设置音量弹窗
  const audioRef = ref<HTMLAudioElement>(); // 音频标签对象

  const playlist = useStorage<SongInfo[]>("songPlaylist", []);
  const playingPlaylist = useStorage<SongInfo[]>("songPlayingPlaylist", []); // 当前播放列表
  const playingSong = useStorage<SongInfo>("songPlayingSong", null, undefined, {
    serializer: {
      read: (raw: string) => {
        return JSON.parse(raw);
      },
      write: (value: SongInfo) => {
        return JSON.stringify(value);
      },
    },
  }); // 当前播放

  const audioDuration = ref(0); // 音频总时长
  const audioCurrent = ref(0); // 音频当前播放时间
  const audioVolume = useStorageAsync<number>("songVolume", 1); // 音频声音，范围 0-1
  const isPlaying = ref<boolean>(false); // 音频播放状态：true 播放，false 暂停
  const playMode = useStorageAsync<SongPlayMode>(
    "songPlayMode",
    SongPlayMode.list
  );
  const playProgress = ref(0); // 音频播放进度

  onMounted(() => {
    audioRef.value = document.createElement("audio");
    audioRef.value.style.width = "0px";
    audioRef.value.style.height = "0px";
    document.body.appendChild(audioRef.value);
    audioRef.value.volume = audioVolume.value;

    // audioRef.value.oncanplay = () => {
    //   onPlay();
    // };
    audioRef.value.onplay = () => {
      isPlaying.value = true;
    };
    audioRef.value.onpause = () => {
      isPlaying.value = false;
    };
    audioRef.value.onloadedmetadata = () => {
      audioDuration.value = audioRef.value!.duration;
    };
    audioRef.value.ondurationchange = () => {
      audioDuration.value = audioRef.value!.duration;
    };
    audioRef.value.ontimeupdate = () => {
      audioCurrent.value = audioRef.value!.currentTime;
    };
    audioRef.value.onended = () => {
      if (playMode.value === SongPlayMode.single) {
        onPlay();
      } else {
        nextSong();
      }
    };
  });

  watch(
    playlist,
    (newValue) => {
      // 播放列表变化时，重置播放列表索引
      if (playMode.value === SongPlayMode.random) {
        playingPlaylist.value = _.shuffle(newValue);
        return;
      } else {
        playingPlaylist.value = [...newValue];
      }
    },
    {
      deep: true,
      immediate: true,
    }
  );
  // watch(
  //   playingSong,
  //   async (newValue) => {
  //     console.log("watch playingsong");
  //     console.log(newValue);

  //     if (!audioRef.value || !newValue) return;

  //     // 暂停并重置音频
  //     audioRef.value.pause();
  //     audioRef.value.src = "";
  //     audioRef.value.srcObject = null;
  //     audioRef.value.currentTime = 0;

  //     let src = null;
  //     let headers = null;
  //     let t: number | string | null = null;

  //     // 获取歌曲URL和headers
  //     if (!newValue.url) {
  //       t = toast.loading("歌曲加载中", {
  //         onClick: () => {
  //           if (t) toast.remove(t);
  //         },
  //       });
  //       const store = useStore();
  //       const source = store.getSongSource(newValue.sourceId);
  //       if (!source) {
  //         toast(`${newValue.name} 所属源丢失`);
  //         return;
  //       }
  //       const sc = (await store.sourceClass(source?.item)) as SongExtension;
  //       const newUrl = await sc?.getSongUrl(newValue);

  //       if (typeof newUrl === "string") {
  //         src = newUrl;
  //       } else if (newUrl instanceof Object) {
  //         src = newUrl["128k"] || newUrl["320k"] || newUrl.flac || "";
  //         headers = newUrl.headers || null;
  //       }
  //     } else {
  //       if (typeof newValue.url === "string") {
  //         src = newValue.url;
  //       } else if (newValue.url instanceof Object) {
  //         src =
  //           newValue.url["128k"] ||
  //           newValue.url["320k"] ||
  //           newValue.url.flac ||
  //           "";
  //         headers = newValue.url.headers || null;
  //       }
  //     }

  //     if (!src) {
  //       showNotify(`歌曲 ${newValue.name} 无法播放`);
  //       onPause();
  //       if (t) toast.remove(t);
  //       return;
  //     }
  //     console.log("src is ", src);

  //     try {
  //       if (headers) {
  //         const response = await fetch(src, { headers });
  //         const blob = await response.blob();
  //         const blobUrl = URL.createObjectURL(blob);
  //         audioRef.value.src = blobUrl;
  //       } else {
  //         audioRef.value.src = src;
  //       }
  //       playProgress.value = 0;
  //     } catch (error) {
  //       console.error("加载歌曲失败:", error);
  //       showNotify(`歌曲 ${newValue.name} 加载失败`);
  //       onPause();
  //     }
  //     if (t) toast.remove(t);
  //   },
  //   {
  //     immediate: true,
  //   }
  // );
  watch(
    playMode,
    (__) => {
      // 播放模式变化时，重置播放列表索引
      if (playMode.value === SongPlayMode.random) {
        playingPlaylist.value = _.shuffle(playlist.value);
        return;
      } else {
        playingPlaylist.value = [...playlist.value];
      }
    },
    {
      immediate: true,
    }
  );
  watch(
    audioVolume,
    (newValue) => {
      if (!audioRef.value) return;
      audioRef.value.volume = newValue;
    },
    {
      immediate: true,
    }
  );
  const playingSongSetSrc = async (song: SongInfo) => {
    if (!audioRef.value || !song) return;

    // 暂停并重置音频
    // audioRef.value.pause();
    audioRef.value.removeAttribute("src");
    audioRef.value.srcObject = null;
    audioRef.value.currentTime = 0;
    audioCurrent.value = 0;
    audioDuration.value = 0;
    isPlaying.value = false;

    let src = null;
    let headers = null;
    let t: number | string | null = null;

    // 获取歌曲URL和headers
    if (!song.url) {
      const store = useStore();
      const source = store.getSongSource(song.sourceId);
      if (!source) {
        showToast(`${song.name} 所属源不存在或未启用`);
        return;
      }
      t = toast.loading("歌曲加载中", {
        onClick: () => {
          if (t) toast.remove(t);
        },
      });
      const sc = (await store.sourceClass(source?.item)) as SongExtension;
      const newUrl = await sc?.getSongUrl(song);

      if (typeof newUrl === "string") {
        src = newUrl;
      } else if (newUrl instanceof Object) {
        src = newUrl["128k"] || newUrl["320k"] || newUrl.flac || "";
        headers = newUrl.headers || null;
        if (newUrl.lyric) {
          song.lyric = newUrl.lyric;
        }
      }
    } else {
      if (typeof song.url === "string") {
        src = song.url;
      } else if (song.url instanceof Object) {
        src = song.url["128k"] || song.url["320k"] || song.url.flac || "";
        headers = song.url.headers || null;
      }
    }

    if (!src) {
      showNotify(`歌曲 ${song.name} 无法播放`);
      onPause();
      if (t) toast.remove(t);
      return;
    }

    try {
      if (headers) {
        const response = await fetch(src, { headers });
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        audioRef.value.src = blobUrl;
      } else {
        audioRef.value.src = src;
      }
      playProgress.value = 0;
    } catch (error) {
      console.error("加载歌曲失败:", error);
      showNotify(`歌曲 ${song.name} 加载失败`);
      onPause();
    }
    if (t) toast.remove(t);
    if (!song.lyric) {
      const store = useStore();
      const source = store.getSongSource(song.sourceId);
      if (source) {
        const sc = (await store.sourceClass(source?.item)) as SongExtension;
        song.lyric = (await sc?.getLyric(song)) || undefined;
      }
    }
  };
  const setPlayingList = async (list: SongInfo[], firstSong: SongInfo) => {
    if (list != playlist.value) {
      playlist.value = list;
    }
    console.log(1);

    if (firstSong.id !== playingSong.value?.id) {
      if (audioRef.value) {
        audioRef.value.pause();
        audioRef.value.removeAttribute("src");
        audioRef.value.srcObject = null;
        audioRef.value.currentTime = 0;
      }
      playingSong.value = firstSong;
      audioCurrent.value = 0;
      audioDuration.value = 0;
      isPlaying.value = false;
    }
    await onPlay();
  };

  const onPlay = async () => {
    if (!audioRef.value) return;
    if (!audioRef.value.src && !audioRef.value.srcObject) {
      await playingSongSetSrc(playingSong.value);
    }

    if (!audioRef.value.src && !audioRef.value.srcObject) {
      // 经过上步的playingSongSetSrc，还是没有，就说明这首歌无法播放
      toast("歌曲无法播放");
      return;
    }

    await audioRef.value.play();
  };
  const onPause = () => {
    if (!audioRef.value) return;
    audioRef.value.pause();
  };

  const nextSong = createCancellableFunction(async () => {
    // 下一首
    if (!playingPlaylist.value) return;
    const index = playingPlaylist.value.findIndex(
      (item) => item.id === playingSong.value?.id
    );
    if (index === -1) return;
    if (index + 1 === playingPlaylist.value.length) {
      playingSong.value = playingPlaylist.value[0];
    } else {
      playingSong.value = playingPlaylist.value[index + 1];
    }
    await playingSongSetSrc(playingSong.value);
    await onPlay();
  });
  const prevSong = createCancellableFunction(async () => {
    // 上一首
    if (!playingPlaylist.value) return;
    const index = playingPlaylist.value.findIndex(
      (item) => item.id === playingSong.value?.id
    );
    if (index === -1) return;
    if (index === 0) {
      playingSong.value =
        playingPlaylist.value[playingPlaylist.value.length - 1];
    } else {
      playingSong.value = playingPlaylist.value[index - 1];
    }
    await playingSongSetSrc(playingSong.value);
    await onPlay();
  });
  // 设置音量
  const onSetVolume = (value: number) => {
    if (!audioRef.value) return;
    audioRef.value.volume = value;
    audioVolume.value = value;
  };
  const seek = (value: number) => {
    if (!audioRef.value) return;
    audioRef.value.currentTime = value;
  };

  return {
    volumeVisible,
    audioRef,
    playlist,
    playingPlaylist,
    playingSong,
    audioDuration,
    audioCurrent,
    audioVolume,
    isPlaying,
    playMode,
    playProgress,
    onPlay,
    onPause,
    nextSong,
    prevSong,
    onSetVolume,
    setPlayingList,
    seek,
  };
});

// 定义一个工厂函数来创建 store // 注意：此函数没有优化成单例函数，注意重复定义出错
const createKVStore = (name?: string) => {
  return defineStore(`KVStore${name}`, () => {
    let store: Store | undefined = undefined;
    class KVStorage implements StorageLikeAsync {
      loaded = false;
      middleware = new Map<string, string>();
      constructor() {
        this.load();
      }
      async load() {
        const data = await Store.load(`${name ? name : "KVStore"}.json`);
        store = data;
        const entries = await data.entries<string>();
        for (const [key, value] of entries) {
          this.middleware.set(key, value);
        }
        this.loaded = true;
      }
      async getItem(key: string): Promise<string | null> {
        if (!this.loaded) {
          await this.load();
        }
        return this.middleware.get(key) || null;
      }

      async setItem(key: string, value: string): Promise<void> {
        this.middleware.set(key, value);
        store?.set(key, value);
      }

      async removeItem(key: string): Promise<void> {
        this.middleware.delete(key);
        store?.delete(key);
      }
    }
    const storage = new KVStorage();

    return {
      storage,
    };
  })();
};

export const useBookShelfStore = defineStore("bookShelfStore", () => {
  const kvStorage = createKVStore("bookShelfStore");

  // 书籍书架⬇️
  const bookShelf = useStorageAsync<BookShelf[]>(
    "bookShelf",
    [
      {
        id: nanoid(),
        name: "默认书架",
        books: [],
        createTime: Date.now(),
      },
    ],
    kvStorage.storage
  );
  const bookChapterRefreshing = ref(false);

  const createBookShelf = (name: string) => {
    if (bookShelf.value.some((item) => item.name === name)) {
      // 书架已存在
      return;
    } else {
      bookShelf.value.push({
        id: nanoid(),
        name,
        books: [],
        createTime: Date.now(),
      });
    }
  };
  const removeBookShelf = (shelfId: string) => {
    bookShelf.value = bookShelf.value.filter((item) => item.id !== shelfId);
  };
  const isBookInShelf = (
    book: BookItem | string,
    shelfId?: string
  ): boolean => {
    let id: string;
    if (typeof book === "string") {
      id = book;
    } else {
      id = book.id;
    }
    if (shelfId) {
      return !!bookShelf.value
        .find((shelf) => shelf.id === shelfId)
        ?.books.find((b) => b.book.id === id);
    } else {
      for (const shelf of bookShelf.value) {
        const find = shelf.books.find((b) => b.book.id === id);
        if (find) {
          return true;
        }
      }
    }
    return false;
  };
  const addToBookSelf = (bookItem: BookItem, shelfId?: string) => {
    if (!bookShelf.value.length) {
      showToast("书架为空，请先创建书架");
      return;
    }
    if (!shelfId) shelfId = bookShelf.value[0].id;
    const shelf = bookShelf.value.find((item) => item.id === shelfId);
    if (!shelf) {
      showToast("书架不存在");
      return;
    }
    if (shelf.books.find((item) => item.book.id === bookItem.id)) {
      showToast("书架中已存在此书");
      return;
    }
    shelf.books.push({
      book: bookItem,
      createTime: Date.now(),
    });
  };
  const removeBookFromShelf = (bookItem: BookItem, shelfId?: string) => {
    if (!bookShelf.value.length) {
      showToast("书架为空");
      return;
    }
    if (!shelfId) shelfId = bookShelf.value[0].id;
    const shelf = bookShelf.value.find((item) => item.id === shelfId);
    if (!shelf) {
      showToast("书架不存在");
      return;
    }
    _.remove(shelf.books, (item) => item.book.id === bookItem.id);
  };
  const updateBookReadInfo = (bookItem: BookItem, chapter: BookChapter) => {
    if (!bookShelf.value) return;
    for (let shelf of bookShelf.value) {
      for (let book of shelf.books) {
        if (book.book.id === bookItem.id) {
          book.lastReadChapter = chapter;
          book.lastReadTime = Date.now();
          break;
        }
      }
    }
  };
  const deleteBookFromShelf = (bookItem: BookItem, shelfId: string) => {
    const shelf = bookShelf.value.find((item) => item.id === shelfId);
    if (!shelf) return;
    _.remove(shelf.books, (item) => item.book.id === bookItem.id);
  };
  const bookRefreshChapters = async () => {
    if (bookChapterRefreshing.value) return;
    bookChapterRefreshing.value = true;
    const store = useStore();
    await Promise.all(
      bookShelf.value.map(async (shelf) => {
        await Promise.all(
          shelf.books.map(async (book) => {
            const source = store.getBookSource(book.book.sourceId);
            if (source) {
              await store.bookDetail(source, book.book);
            }
          })
        );
      })
    );
    bookChapterRefreshing.value = false;
    showToast("刷新章节完成");
  };

  return {
    bookShelf,
    bookChapterRefreshing,
    createBookShelf,
    removeBookShelf,
    isBookInShelf,
    addToBookSelf,
    removeBookFromShelf,
    updateBookReadInfo,
    deleteBookFromShelf,
    bookRefreshChapters,
  };
});

export const useSongShelfStore = defineStore("songShelfStore", () => {
  const kvStorage = createKVStore("songShelfStore");

  const songCreateShelf = useStorageAsync<SongShelf[]>(
    "songShelf",
    [],
    kvStorage.storage
  );
  const songPlaylistShelf = useStorageAsync<SongShelf[]>(
    "songPlaylistShelf",
    [],
    kvStorage.storage
  );
  const songLikeShelf = useStorageAsync<SongShelf>("songLikeShelf", {
    type: SongShelfType.like,
    playlist: {
      id: nanoid(),
      name: "我喜欢的音乐",
      picUrl: "",
      sourceId: "",
      list: {
        list: [],
        page: 1,
        totalPage: 1,
      },
    },
    createTime: Date.now(),
  });
  const songInLikeShelf = (song: SongInfo) => {
    return (
      songLikeShelf.value?.playlist.list?.list.some(
        (item) => item.id === song.id
      ) || false
    );
  };
  const playlistInShelf = (playlist?: PlaylistInfo) => {
    if (!playlist) return false;
    return songPlaylistShelf.value.some(
      (item) => item.playlist.id === playlist.id
    );
  };

  const createShelf = (name: string): boolean => {
    // 创建收藏
    if (songCreateShelf.value.some((item) => item.playlist.name === name)) {
      showToast("收藏夹已存在");
      return false;
    }
    songCreateShelf.value.push({
      type: SongShelfType.create,
      playlist: {
        id: nanoid(),
        name,
        picUrl: "",
        sourceId: "",
      },
      createTime: Date.now(),
    });
    return true;
  };
  const addSongToShelf = (song: SongInfo, shelfId?: string): boolean => {
    let shelf: SongShelf | undefined;
    if (!shelfId || shelfId === songLikeShelf.value?.playlist.id) {
      shelf = songLikeShelf.value;
    } else {
      shelf = songCreateShelf.value.find(
        (item) => item.playlist.id === shelfId
      );
    }
    if (!shelf) {
      showToast("收藏夹不存在");
      return false;
    }
    shelf.playlist.list ||= {
      list: [],
      page: 1,
      totalPage: 1,
    };
    if (shelf.playlist.list.list.find((item) => item.id === song.id)) {
      showToast("已存在");
      return false;
    } else {
      shelf.playlist.list.list.push(song);
      showToast(`已添加到${shelf.playlist.name}`);
      return true;
    }
  };
  const removeSongFromShelf = (song: SongInfo, shelfId?: string): boolean => {
    let shelf: SongShelf | undefined;
    if (!shelfId || shelfId === songLikeShelf.value?.playlist.id) {
      shelf = songLikeShelf.value;
    } else {
      shelf = songCreateShelf.value.find(
        (item) => item.playlist.id === shelfId
      );
    }
    if (!shelf) {
      showToast("收藏夹不存在");
      return false;
    }
    _.remove(shelf?.playlist.list?.list || [], (item) => item.id === song.id);
    showToast(`已从 ${shelf.playlist.name} 移除`);
    return true;
  };
  const addPlaylistToShelf = (playlist: PlaylistInfo): boolean => {
    const find = songPlaylistShelf.value.find(
      (item) => item.playlist.id === playlist.id
    );
    if (find) {
      showToast("已存在");
      return false;
    }
    songPlaylistShelf.value.push({
      type: SongShelfType.playlist,
      playlist,
      createTime: Date.now(),
    });
    return true;
  };
  const removeSongShelf = (songShelfId: string): boolean => {
    const removed = _.remove(
      songCreateShelf.value,
      (item) => item.playlist.id === songShelfId
    );
    if (removed.length) {
      showToast("删除成功");
      return true;
    }
    const removed2 = _.remove(
      songPlaylistShelf.value,
      (item) => item.playlist.id === songShelfId
    );
    if (removed2.length) {
      showToast("删除成功");
      return true;
    }
    return false;
  };
  return {
    songCreateShelf,
    songPlaylistShelf,
    songLikeShelf,
    songInLikeShelf,
    playlistInShelf,
    createShelf,
    addSongToShelf,
    removeSongFromShelf,
    addPlaylistToShelf,
    removeSongShelf,
  };
});

export const usePhotoShelfStore = defineStore("photoShelfStore", () => {
  const kvStorage = createKVStore("photoShelfStore");

  const photoShelf = useStorageAsync<PhotoShelf[]>(
    "photoShelf",
    [
      {
        id: nanoid(),
        name: "默认收藏",
        photos: [],
        createTime: Date.now(),
      },
    ],
    kvStorage.storage
  );
  const photoInShelf = (itemId: string, shelfId?: string): boolean => {
    if (shelfId) {
      return (
        photoShelf.value
          .find((item) => item.id === shelfId)
          ?.photos.some((item) => item.id === itemId) || false
      );
    } else {
      for (const shelf of photoShelf.value) {
        if (shelf.photos.find((item) => item.id === itemId)) {
          return true;
        }
      }
    }
    return false;
  };
  const addPhotoToShelf = (item: PhotoItem, shelfId?: string) => {
    const shelf = shelfId
      ? photoShelf.value.find((item) => item.id === shelfId)
      : photoShelf.value[0];
    if (!shelf) {
      showToast("收藏夹不存在");
      return false;
    }

    if (shelf.photos.find((i) => i.id === item.id)) {
      showToast("已存在");
      return false;
    } else {
      shelf.photos.push(item);
      showToast(`已添加到 ${shelf.name}`);
      return true;
    }
  };
  const createShelf = (name: string): boolean => {
    // 创建收藏
    if (photoShelf.value.some((item) => item.name === name)) {
      showToast("收藏夹已存在");
      return false;
    }
    photoShelf.value.push({
      id: nanoid(),
      name,
      photos: [],
      createTime: Date.now(),
    });
    return true;
  };
  const removePhotoFromShelf = (item: PhotoItem, shelfId?: string): boolean => {
    const shelf = shelfId
      ? photoShelf.value.find((item) => item.id === shelfId)
      : photoShelf.value[0];
    if (!shelf) {
      showToast("收藏夹不存在");
      return false;
    }
    _.remove(shelf.photos, (i) => i.id === item.id);
    return true;
  };
  const removeShelf = (shelfId: string) => {
    if (photoShelf.value.length === 1) {
      showToast("至少需要保留一个收藏夹");
      return false;
    }
    _.remove(photoShelf.value, (item) => item.id === shelfId);
    return true;
  };
  return {
    photoShelf,
    photoInShelf,
    addPhotoToShelf,
    createShelf,
    removePhotoFromShelf,
    removeShelf,
  };
});