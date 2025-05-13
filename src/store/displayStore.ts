import type { SongShelf } from '@/extensions/song';

import type { PluginListener } from '@tauri-apps/api/core';

import { getCurrentWindow } from '@tauri-apps/api/window';
import { type as osType } from '@tauri-apps/plugin-os';
import { useDark, useStorage, useStorageAsync, useToggle } from '@vueuse/core';
import { defineStore } from 'pinia';
import { showToast as vanShowToast } from 'vant';
import * as commands from 'tauri-plugin-commands-api';

import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { tauriAddPluginListener } from './utils';
import _ from 'lodash';

export const useDisplayStore = defineStore('display', () => {
  const showTabBar = ref(true);

  // 检测是否为手机尺寸
  const mobileMediaQuery = window.matchMedia('(max-width: 420px)');
  // 检测是否为横屏
  const landscapeMediaQuery = window.matchMedia('(orientation: landscape)');

  const isMobileView = ref(osType() == 'android' || mobileMediaQuery.matches);
  const isWindows = ref(osType() == 'windows');
  const isAndroid = ref(osType() == 'android');
  const isLandscape = ref(landscapeMediaQuery.matches);

  const fullScreenMode = ref(false);
  onMounted(async () => {
    showTabBar.value = true;
    if (isAndroid.value) {
      await commands.set_screen_orientation('portrait');
    } else {
      await getCurrentWindow().setFullscreen(false);
    }
  });

  const checkMobile = (event: MediaQueryListEvent) => {
    // 全屏状态下就不刷新`isMobile`了
    if (fullScreenMode.value) return;
    isMobileView.value = osType() == 'android' || event.matches;
  };
  const checklanscape = (event: MediaQueryListEvent) => {
    isLandscape.value = event.matches;
  };

  onMounted(() => {
    // 监听变化
    mobileMediaQuery.addEventListener('change', checkMobile);

    landscapeMediaQuery.addEventListener('change', checklanscape);
  });
  onUnmounted(() => {
    mobileMediaQuery.removeEventListener('change', checkMobile);
    landscapeMediaQuery.removeEventListener('change', checklanscape);
  });

  const taichiAnimateRandomized = ref(false);

  const isDark = useDark();
  const toggleDark = useToggle(isDark);

  const showAddSubscribeDialog = ref(false);
  const showManageSubscribeDialog = useStorageAsync('manageSubscribe', false);
  const showCreateSubscribeDialog = useStorageAsync('createSubscribe', false);

  const showAddBookShelfDialog = ref(false);
  const showRemoveBookShelfDialog = ref(false);

  const showAddSongShelfDialog = ref(false);
  const showRemoveSongShelfDialog = ref(false);

  const showAddPhotoShelfDialog = ref(false);
  const showRemovePhotoShelfDialog = ref(false);

  const showAddComicShelfDialog = ref(false);
  const showRemoveComicShelfDialog = ref(false);

  const showAddVideoShelfDialog = ref(false);
  const showRemoveVideoShelfDialog = ref(false);

  const showAboutDialog = ref(false);

  const showSettingDialog = ref(false);
  const showLeftPopup = ref(false);

  // 仅移动端有效
  const bookKeepScreenOn = useStorageAsync('bookKeepScreenOn', false);
  const comicKeepScreenOn = useStorageAsync('comicKeepScreenOn', false);

  const trayId = ref('');

  const toastActive = ref(false);
  const toastId = ref('');

  const photoCollapse = useStorageAsync('photoCollapse', []);
  const songCollapse = useStorageAsync('songCollapse', []);
  const bookCollapse = useStorageAsync('bookCollapse', []);
  const comicCollapse = useStorageAsync('comicCollapse', []);
  const videoCollapse = useStorageAsync('videoCollapse', []);

  const routerCurrPath = useStorage('routerCurrPath', '/');
  const photoPath = useStorageAsync('photoPath', '/photo');
  const songPath = useStorageAsync('songPath', '/song');
  const bookPath = useStorageAsync('bookPath', '/book');
  const comicPath = useStorageAsync('comicPath', '/comic');
  const videoPath = useStorageAsync('videoPath', '/video');

  const showPhotoShelf = useStorageAsync('showPhotoShelf', false);
  const showSongShelf = useStorageAsync('showSongShelf', false);
  const showSongShelfDetail = useStorageAsync('showSongShelfDetail', false);
  const selectedSongShelf = useStorageAsync<SongShelf | undefined>(
    'selectedSongShelf',
    undefined,
    undefined,
    {
      serializer: {
        read: async (raw: string) => {
          if (!raw) return undefined;
          return JSON.parse(raw);
        },
        write: async (value: SongShelf | undefined) => {
          if (!value) return '';
          return JSON.stringify(value);
        },
      },
    },
  );
  const showImportPlaylistDialog = useStorageAsync(
    'showImportPlaylistDialog',
    false,
  );
  const showBookShelf = useStorageAsync('showBookShelf', false);
  const showComicShelf = useStorageAsync('showComicShelf', false);
  const showVideoShelf = useStorageAsync('showVideoShelf', false);
  const showPlayView = useStorageAsync('showPlayView', false);
  const showPlayingPlaylist = useStorageAsync('showPlayingPlaylist', false);
  const showUserPage = useStorageAsync('showUserPage', false);

  watch(
    showPlayingPlaylist,
    (val) => {
      if (val) {
        nextTick(() => {
          document
            .querySelector('.playing-song')
            ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        });
      }
    },
    {
      immediate: true,
    },
  );

  const searchHistories = useStorageAsync<string[]>('searchHistories', []);
  onMounted(() => {
    if (searchHistories.value.length > 100) {
      searchHistories.value = searchHistories.value.slice(0, 100);
    }
  });

  const showToast = () => {
    toastActive.value = true;
    toastId.value = String(Date.now());
    return toastId.value;
  };
  const closeToast = (id?: string) => {
    if (!id || !toastId.value) {
      toastActive.value = false;
      toastId.value = '';
      return;
    }
    if (id && Number(id) >= Number(toastId.value)) {
      if (toastActive.value) {
        toastActive.value = false;
      }

      toastId.value = '';
    }
  };

  const tabBarPages = useStorageAsync('tabBarPages', [
    {
      name: 'Home',
      chineseName: '首页',
      enable: true,
    },
    {
      name: 'Photo',
      chineseName: '图片',
      enable: true,
    },
    {
      name: 'Song',
      chineseName: '歌曲',
      enable: true,
    },
    {
      name: 'Book',
      chineseName: '书籍',
      enable: true,
    },
    {
      name: 'Comic',
      chineseName: '漫画',
      enable: true,
    },
    {
      name: 'Video',
      chineseName: '影视',
      enable: true,
    },
  ]);

  /** 监听安卓的屏幕方向 */
  const androidOrientation = ref<'landscape' | 'portrait' | 'auto'>();
  const androidPlugins: PluginListener[] = [];
  if (isAndroid.value) {
    onMounted(async () => {
      const orientation = await commands.get_screen_orientation();
      androidOrientation.value = orientation;
      tauriAddPluginListener(
        'commands',
        'orientationChanged',
        async (payload: any) => {
          androidOrientation.value = payload.orientation;
        },
      ).then((listener) => {
        androidPlugins.push(listener);
      });
    });
    onUnmounted(() => {
      for (const plugin of androidPlugins) {
        plugin.unregister();
      }
    });
  }

  const _backTs = ref(Date.now());
  const checkExitApp = async () => {
    const now = Date.now();
    if (now - _backTs.value > 1000) {
      _backTs.value = now;
      vanShowToast('再按一次返回');
    } else {
      await commands.return_to_home();
    }
  };

  // 进行返回时的调用
  const backCallbacks: Record<string, Function[]> = {};
  const addBackCallback = (pathName: string, cb: Function) => {
    backCallbacks[pathName] = backCallbacks[pathName] || [];
    if (backCallbacks[pathName].includes(cb)) {
      return;
    }
    backCallbacks[pathName].push(cb);
  };
  const removeBackCallback = (pathName: string, cb: Function) => {
    if (!backCallbacks[pathName]) {
      return;
    }
    _.remove(backCallbacks[pathName], (item) => item === cb);
  };
  const triggerBackCallbacks = async (pathName: string) => {
    if (!backCallbacks[pathName]) {
      return;
    }

    for (const callback of backCallbacks[pathName]) {
      try {
        await Promise.resolve(callback());
      } catch (error) {
        console.error(`Error executing callback for ${pathName}:`, error);
      }
    }
  };
  onUnmounted(() => {
    Object.keys(backCallbacks).forEach((key) => {
      delete backCallbacks[key];
    });
  });

  return {
    fullScreenMode,
    isMobileView,
    isAndroid,
    isWindows,
    androidOrientation,

    taichiAnimateRandomized,
    isDark,
    toggleDark,
    showTabBar,
    showAddSubscribeDialog,
    showManageSubscribeDialog,
    showCreateSubscribeDialog,

    showAddBookShelfDialog,
    showRemoveBookShelfDialog,

    showAddSongShelfDialog,
    showRemoveSongShelfDialog,
    showImportPlaylistDialog,

    showAddPhotoShelfDialog,
    showRemovePhotoShelfDialog,

    showAddComicShelfDialog,
    showRemoveComicShelfDialog,

    showAddVideoShelfDialog,
    showRemoveVideoShelfDialog,

    showAboutDialog,

    showSettingDialog,
    showLeftPopup,

    bookKeepScreenOn,
    comicKeepScreenOn,

    trayId,
    toastActive,
    showToast,
    closeToast,

    photoCollapse,
    songCollapse,
    bookCollapse,
    comicCollapse,
    videoCollapse,

    routerCurrPath,
    photoPath,
    songPath,
    bookPath,
    comicPath,
    videoPath,

    showPhotoShelf,
    showSongShelf,
    showSongShelfDetail,
    selectedSongShelf,
    showBookShelf,
    showComicShelf,
    showVideoShelf,
    showPlayView,
    showPlayingPlaylist,

    showUserPage,

    searchHistories,

    tabBarPages,

    checkExitApp,
    addBackCallback,
    removeBackCallback,
    triggerBackCallbacks,
  };
});
