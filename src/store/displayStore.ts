import type { PluginListener } from '@tauri-apps/api/core';

import type { TrayIcon } from '@tauri-apps/api/tray';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { type as osType } from '@tauri-apps/plugin-os';
import { useDark, useStorage, useStorageAsync, useToggle } from '@vueuse/core';
import { defineStore } from 'pinia';

import * as commands from 'tauri-plugin-commands-api';
import { onMounted, onUnmounted, ref, watch } from 'vue';
import buildTray from '@/utils/tray';
import { tauriAddPluginListener } from './utils';
import Player from 'xgplayer';

export const useDisplayStore = defineStore('display', () => {
  const showNews = useStorage('showNews', true);
  const showTabBar = ref(true);
  const fullScreenMode = ref(false);

  // 检测是否为手机尺寸
  const mobileMediaQuery = window.matchMedia('(max-width: 420px)');
  // 检测是否为横屏
  const landscapeMediaQuery = window.matchMedia('(orientation: landscape)');

  const isAppView = ref(osType() == 'android' || mobileMediaQuery.matches);
  const isWindows = ref(osType() == 'windows');
  const isAndroid = ref(osType() == 'android');
  const isLandscape = ref(landscapeMediaQuery.matches);

  const checkMobile = (event: MediaQueryListEvent) => {
    // 全屏状态下就不刷新`isMobile`了
    if (fullScreenMode.value) return;
    isAppView.value = osType() == 'android' || event.matches;
  };
  const checklanscape = (event: MediaQueryListEvent) => {
    isLandscape.value = event.matches;
  };

  watch(
    fullScreenMode,
    async (val) => {
      fullScreenMode.value = val;
      if (val) {
        showTabBar.value = false;
        if (isAndroid.value) {
          // 横屏
          await commands.set_screen_orientation('landscape');
        } else if (isWindows.value) {
          await getCurrentWindow().setFullscreen(true);
        }
      } else {
        showTabBar.value = true;
        if (isAndroid.value) {
          await commands.set_screen_orientation('portrait');
        } else if (isWindows.value) {
          await getCurrentWindow().setFullscreen(false);
        }
      }
    },
    { immediate: true },
  );

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

  const showVideoPlaylist = ref(false);
  const showSongPlayingList = ref(false);
  const showLeftPopup = ref(false);

  // 书籍阅读界面弹窗状态
  const showChapters = ref(false);
  const showSettingDialog = ref(false);
  const showViewSettingDialog = ref(false);
  const showVoiceSelectSheet = ref(false);

  // 仅移动端有效
  const bookKeepScreenOn = useStorageAsync('bookKeepScreenOn', false);
  const comicKeepScreenOn = useStorageAsync('comicKeepScreenOn', false);

  const tray = ref<TrayIcon>();
  if (isWindows.value) {
    onMounted(async () => {
      tray.value = await buildTray();
      window.addEventListener('beforeunload', () => {
        tray.value?.close();
      });
    });
  }

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
  const videoPath = ref('/video');

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

  const exitApp = async () => {
    await commands.return_to_home();
  };

  const songAutoSwitchSource = useStorageAsync('songAutoSwitchSource', true);
  const showViewHistory = useStorageAsync('showViewHistory', true);
  const autoUpdateSubscribeSource = useStorage(
    'autoUpdateSubscribeSource',
    false,
  );

  const videoPlayer = ref<Player>();

  return {
    showNews,
    fullScreenMode,
    isAppView,
    isAndroid,
    isWindows,
    androidOrientation,

    taichiAnimateRandomized,
    isDark,
    toggleDark,
    showTabBar,

    showVideoPlaylist,
    showSongPlayingList,
    showLeftPopup,

    showChapters,
    showSettingDialog,
    showViewSettingDialog,
    showVoiceSelectSheet,

    bookKeepScreenOn,
    comicKeepScreenOn,

    tray,
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

    searchHistories,
    tabBarPages,

    exitApp,

    songAutoSwitchSource,
    showViewHistory,
    autoUpdateSubscribeSource,

    videoPlayer,
  };
});
