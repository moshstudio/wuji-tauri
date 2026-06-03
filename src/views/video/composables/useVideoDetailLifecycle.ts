import type { VideoUrlMap } from '@wuji-tauri/source-extension';
import type { Ref } from 'vue';
import { onMountedOrActivated } from '@vant/use';
import { keepScreenOn } from 'tauri-plugin-keep-screen-on-api';
import { onDeactivated, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useDisplayStore } from '@/store';
import { endCastSession } from '@/utils/cast';

export interface SavedPlayback {
  videoId: string;
  sourceId: string;
  src: VideoUrlMap;
}

export function useVideoDetailLifecycle(options: {
  videoId: Ref<string>;
  sourceId: Ref<string>;
  videoSrc: Ref<VideoUrlMap | undefined>;
  shouldReload: Ref<boolean>;
  loadData: () => Promise<void>;
  pinControls: () => void;
  resetControlsPinned: () => void;
  destroyVideoPlayer: () => void;
  initPlayerShell: () => Promise<void>;
  registerCastAutoNextHandler: () => void;
  teardownCast: () => void;
  setKeyboardEnabled: (enabled: boolean) => void;
}) {
  const route = useRoute();
  const displayStore = useDisplayStore();

  let savedPlayback: SavedPlayback | undefined;

  function savePlaybackOnDeactivate() {
    if (options.videoSrc.value) {
      savedPlayback = {
        videoId: options.videoId.value,
        sourceId: options.sourceId.value,
        src: options.videoSrc.value,
      };
    }
    else {
      savedPlayback = undefined;
    }
  }

  onUnmounted(() => {
    options.teardownCast();
    options.destroyVideoPlayer();
    displayStore.fullScreenMode = false;
  });

  onMountedOrActivated(() => {
    displayStore.fullScreenMode = false;
    options.registerCastAutoNextHandler();
    if (displayStore.isAndroid) {
      keepScreenOn(true);
    }
    options.setKeyboardEnabled(true);

    const ensureEmptyPlayerShell = async () => {
      if (route.name !== 'VideoDetail')
        return;
      options.pinControls();
      await options.initPlayerShell();
    };

    const loadDataAndEnsureShell = async () => {
      await options.loadData();
      if (!options.videoSrc.value) {
        await ensureEmptyPlayerShell();
      }
    };

    if (options.shouldReload.value) {
      void loadDataAndEnsureShell();
    }
    else if (
      savedPlayback
      && savedPlayback.videoId === options.videoId.value
      && savedPlayback.sourceId === options.sourceId.value
    ) {
      options.pinControls();
      options.videoSrc.value = savedPlayback.src;
      savedPlayback = undefined;
    }
    else if (savedPlayback) {
      savedPlayback = undefined;
      void loadDataAndEnsureShell();
    }
    else if (route.name === 'VideoDetail') {
      void ensureEmptyPlayerShell();
    }
  });

  onDeactivated(() => {
    options.resetControlsPinned();
    displayStore.fullScreenMode = false;
    if (displayStore.isAndroid) {
      keepScreenOn(false);
      void endCastSession();
    }
    options.setKeyboardEnabled(false);
    savePlaybackOnDeactivate();
    options.destroyVideoPlayer();
    options.videoSrc.value = undefined;
  });

  return {
    clearSavedPlayback: () => { savedPlayback = undefined; },
    getSavedPlayback: () => savedPlayback,
    setSavedPlayback: (v: SavedPlayback | undefined) => { savedPlayback = v; },
  };
}
