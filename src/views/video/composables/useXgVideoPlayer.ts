import type {
  VideoEpisode,
  VideoItem,
  VideoResource,
  VideoUrlMap,
} from '@wuji-tauri/source-extension';
import type { Ref } from 'vue';
import type Fullscreen from 'xgplayer/es/plugins/fullscreen';
import _ from 'lodash';
import { storeToRefs } from 'pinia';
import { nextTick, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import Player, { Events, STATE_CLASS } from 'xgplayer';
import DefaultPreset from 'xgplayer/es/presets/default';
import LivePreset from 'xgplayer/es/presets/live';
import MobilePreset from 'xgplayer/es/presets/mobile';
import BackButtonPlugin from '@/components/media/plugins/backButton';
import PlaylistButtonPlugin from '@/components/media/plugins/playlistButton';
import VideoJsPlugin from '@/components/media/plugins/videoJs';
import VideoNamePlugin from '@/components/media/plugins/videoName';
import {
  useBackStore,
  useDisplayStore,
  useVideoShelfStore,
} from '@/store';
import { activeCastDevice } from '@/utils/cast';
import { formatEpisodeTitle } from '@/utils/videoEpisode';
import 'xgplayer/dist/index.min.css';

// ─── 事件回调接口 ───

export interface VideoPlayerCallbacks {
  onError: () => void;
  onEnded: () => void;
  onRetryClick: () => void;
  onPlayNext: () => void;
  onSrcApplied?: (src: VideoUrlMap | undefined) => void;
}

export interface VideoPlayerDeps {
  videoElement: Ref<HTMLElement | undefined>;
  resolvedSrc: Ref<VideoUrlMap | undefined>;
  videoItem: Ref<VideoItem | undefined>;
  playingResource: Ref<VideoResource | undefined>;
  playingEpisode: Ref<VideoEpisode | undefined>;
  callbacks: VideoPlayerCallbacks;
}

// ─── 组合式函数 ───

export function useXgVideoPlayer(deps: VideoPlayerDeps) {
  const route = useRoute();
  const backStore = useBackStore();
  const displayStore = useDisplayStore();
  const shelfStore = useVideoShelfStore();
  const {
    showVideoPlaylist: showPlaylist,
    videoPlayer,
    videoVolume,
    videoPlaybackRate,
  } = storeToRefs(displayStore);

  let playerSetupGen = 0;
  /** true = 控件常驻；false = 仅在实际播放中允许自动隐藏 */
  const controlsPinned = ref(true);

  // ─── Player 内部工具 ───

  function cleanupMediaIn(root?: ParentNode | null) {
    root?.querySelectorAll('video, audio').forEach((el) => {
      const media = el as HTMLMediaElement;
      media.pause();
      media.removeAttribute('src');
      try {
        media.load();
      }
      catch { /* ignore */ }
    });
  }

  function isStaleSetup(setupGen: number) {
    return setupGen !== playerSetupGen;
  }

  function stopVideoPlayer() {
    const player = videoPlayer.value;
    if (player) {
      try {
        player.pause();
      }
      catch { /* ignore */ }
      try {
        cleanupMediaIn(player.root);
      }
      catch { /* ignore */ }
      try {
        (player.getPlugin('VideoJsPlugin') as { destroy?: () => void } | undefined)?.destroy?.();
      }
      catch { /* ignore */ }
      try {
        player.destroy();
      }
      catch { /* ignore */ }
      try {
        player.offAll();
      }
      catch { /* ignore */ }
    }
    videoPlayer.value = undefined;
    cleanupMediaIn(deps.videoElement.value);
  }

  // ─── Controls 管理 ───

  function applyControlsVisibility() {
    const player = videoPlayer.value;
    if (!player)
      return;
    const controls = player.controls;
    const pinned = controlsPinned.value;
    const autoHide = !pinned;
    if (controls?.root) {
      controls.config.autoHide = autoHide;
      if (pinned) {
        controls.pauseAutoHide?.();
      }
      else {
        controls.recoverAutoHide?.();
      }
      try {
        controls.show();
      }
      catch { /* ignore */ }
    }
    try {
      player.removeClass(STATE_CLASS.INACTIVE);
      const innerStates = (player as typeof player & {
        innerStates?: { isActiveLocked?: boolean };
      }).innerStates;
      if (pinned) {
        if (innerStates)
          innerStates.isActiveLocked = true;
        player.focus({ autoHide: false, isLock: true });
      }
      else {
        if (innerStates)
          innerStates.isActiveLocked = false;
        player.focus({ autoHide: true, isLock: false });
      }
    }
    catch { /* ignore */ }
  }

  function pinControls() {
    controlsPinned.value = true;
    applyControlsVisibility();
  }

  function unpinControls() {
    controlsPinned.value = false;
    applyControlsVisibility();
  }

  // ─── Player 创建 ───

  async function createPlayer(video?: VideoUrlMap) {
    pinControls();
    const setupGen = ++playerSetupGen;
    const volume = videoVolume.value || 1;
    const rate = videoPlaybackRate.value || 1;
    stopVideoPlayer();
    await nextTick();

    if (
      isStaleSetup(setupGen)
      || route.name !== 'VideoDetail'
      || !deps.videoElement.value
    ) {
      return;
    }

    const item = deps.videoItem.value;
    const resource = deps.playingResource.value;
    const episode = deps.playingEpisode.value;
    const preset = video?.isLive
      ? LivePreset
      : displayStore.isAndroid
        ? MobilePreset
        : DefaultPreset;
    const casting = !!activeCastDevice.value;

    videoPlayer.value = new Player({
      el: deps.videoElement.value,
      fullscreenTarget: document.querySelector('.xgplayer-container') as HTMLElement,
      url: video?.url,
      videoType: video?.type,
      nullUrlStart: !video?.url,
      autoplay: !casting,
      loop: false,
      playsinline: true,
      cssFullscreen: false,
      volume,
      defaultPlaybackRate: rate,
      isMobileSimulateMode: displayStore.isAndroid ? 'mobile' : 'pc',
      isLive: video?.isLive || false,
      startTime: episode?.lastWatchPosition || 0,
      height: '100%',
      width: '100%',
      plugins: [VideoJsPlugin],
      presets: [preset],
      videoAttributes: { crossOrigin: 'anonymous' },
      keyboard: { checkVisible: true, disable: false },
      mobile: { disablePress: false, darkness: false, gestureY: false, gestureX: true },
      controls: { initShow: true, autoHide: false },
    });

    // 注册插件
    videoPlayer.value.registerPlugin(BackButtonPlugin, {
      onClick: () => backStore.back(true),
    });
    videoPlayer.value.registerPlugin(PlaylistButtonPlugin, {
      onClick: () => { showPlaylist.value = !showPlaylist.value; },
    });
    videoPlayer.value.registerPlugin(VideoNamePlugin, {
      videoName: formatEpisodeTitle(item, episode),
    });
    applyControlsVisibility();

    // 底部 controls 与顶部 xg-top-bar 走不同隐藏机制，需在 blur 后重新固定
    videoPlayer.value.on(Events.PLAYER_BLUR, () => {
      if (isStaleSetup(setupGen))
        return;
      if (controlsPinned.value)
        applyControlsVisibility();
    });

    if (casting) {
      videoPlayer.value.pause();
    }

    // ─── 事件绑定 ───
    if (item && resource && episode) {
      if (!displayStore.isAndroid) {
        videoPlayer.value.on(Events.FULLSCREEN_CHANGE, (isFullScreen) => {
          if (isStaleSetup(setupGen))
            return;
          displayStore.fullScreenMode = isFullScreen;
        });
      }

      let lastPlaybackTime: number | undefined;

      function maybeUnpinControlsOnProgress(currentTime: number | undefined) {
        if (
          currentTime === undefined
          || !videoPlayer.value?.isPlaying
          || activeCastDevice.value
          || !controlsPinned.value
        ) {
          return;
        }
        if (
          lastPlaybackTime !== undefined
          && currentTime > lastPlaybackTime
        ) {
          unpinControls();
        }
        lastPlaybackTime = currentTime;
      }

      videoPlayer.value.on(Events.PLAY, () => {
        if (isStaleSetup(setupGen) || route.name !== 'VideoDetail' || activeCastDevice.value) {
          videoPlayer.value?.pause();
          return;
        }
        lastPlaybackTime = undefined;
        // xgplayer 内置 onPlay 会 focus 并触发 top-bar 自动隐藏，需重新固定
        if (controlsPinned.value)
          applyControlsVisibility();
      });

      videoPlayer.value.on(Events.PAUSE, () => {
        if (isStaleSetup(setupGen))
          return;
        pinControls();
        lastPlaybackTime = undefined;
      });

      // 直播等 currentTime 可能不递增，退化为画面真正开始播放时再允许自动隐藏
      videoPlayer.value.on(Events.PLAYING, () => {
        if (
          isStaleSetup(setupGen)
          || route.name !== 'VideoDetail'
          || activeCastDevice.value
          || !video?.isLive
        ) {
          return;
        }
        unpinControls();
      });

      videoPlayer.value.on(Events.PLAYNEXT, () => deps.callbacks.onPlayNext());
      videoPlayer.value.on(Events.VOLUME_CHANGE, () => {
        const v = videoPlayer.value?.volume;
        if (v !== undefined)
          videoVolume.value = v;
      });
      videoPlayer.value.on(Events.RATE_CHANGE, () => {
        const r = videoPlayer.value?.playbackRate;
        if (r !== undefined)
          videoPlaybackRate.value = r;
      });

      const updateTime = _.throttle((position: number) => {
        episode.lastWatchPosition = position;
        if (video) {
          shelfStore.updateVideoPlayInfo(item, { resource, episode, position });
        }
      }, 500);

      videoPlayer.value.on(Events.TIME_UPDATE, () => {
        if (isStaleSetup(setupGen) || route.name !== 'VideoDetail') {
          videoPlayer.value?.pause();
          return;
        }
        const currentTime = videoPlayer.value?.currentTime;
        updateTime(currentTime);
        maybeUnpinControlsOnProgress(currentTime);
      });

      videoPlayer.value.on(Events.ENDED, () => {
        if (isStaleSetup(setupGen))
          return;
        pinControls();
        updateTime(0);
        deps.callbacks.onEnded();
      });
    }

    // 播放错误：上报给状态机
    videoPlayer.value.on(Events.ERROR, (error) => {
      if (isStaleSetup(setupGen))
        return;
      console.warn(`[Player] error: ${JSON.stringify(error)}`);
      pinControls();
      deps.callbacks.onError();
    });

    // 用户点重试按钮
    videoPlayer.value.getPlugin('error').useHooks('errorRetry', () => {
      if (isStaleSetup(setupGen))
        return false;
      deps.callbacks.onRetryClick();
      return false;
    });

    videoPlayer.value.getPlugin('error').useHooks('showError', () => {
      if (isStaleSetup(setupGen))
        return;
      pinControls();
    });

    // Android fullscreen hook
    if (displayStore.isAndroid) {
      videoPlayer.value
        .getPlugin('fullscreen')
        .useHooks('fullscreenChange', (plugin: Fullscreen) => {
          if (isStaleSetup(setupGen))
            return false;
          const next = !displayStore.fullScreenMode;
          displayStore.fullScreenMode = next;
          plugin.animate(next);
        });
    }
  }

  // ─── 公开 API ───

  function destroyVideoPlayer() {
    playerSetupGen++;
    stopVideoPlayer();
  }

  async function initPlayerShell() {
    await nextTick();
    if (route.name !== 'VideoDetail')
      return;
    if (!deps.videoElement.value)
      await nextTick();
    if (route.name !== 'VideoDetail' || !deps.videoElement.value)
      return;
    await createPlayer(undefined);
  }

  function resetForRouteSwitch() {
    controlsPinned.value = true;
    destroyVideoPlayer();
  }

  /** 启动 watch：resolvedSrc 变化时重建 Player */
  function setupSrcWatch() {
    watch(deps.resolvedSrc, async (newVideo) => {
      if (route.name !== 'VideoDetail') {
        if (videoPlayer.value?.isPlaying)
          videoPlayer.value?.pause();
        return;
      }
      await createPlayer(newVideo);
      if (activeCastDevice.value) {
        videoPlayer.value?.pause();
      }
      deps.callbacks.onSrcApplied?.(newVideo);
    });
  }

  /** 启动 watch：视频名称变化时更新 */
  function setupNameWatch() {
    watch(
      [deps.videoItem, deps.playingEpisode],
      ([newItem, newEpisode]) => {
        const namePlugin = videoPlayer.value?.getPlugin('videoNamePlugin') as VideoNamePlugin | undefined;
        if (!namePlugin)
          return;
        namePlugin.setVideoName(formatEpisodeTitle(newItem, newEpisode));
      },
      { flush: 'post' },
    );
  }

  function setKeyboardEnabled(enabled: boolean) {
    if (!videoPlayer.value)
      return;
    const keyboard = videoPlayer.value.getPlugin('keyboard');
    if (keyboard) {
      keyboard.disable = !enabled;
      keyboard.config.disable = !enabled;
    }
  }

  return {
    videoPlayer,
    showPlaylist,
    controlsPinned,
    pinControls,
    unpinControls,
    destroyVideoPlayer,
    resetForRouteSwitch,
    initPlayerShell,
    setupSrcWatch,
    setupNameWatch,
    setKeyboardEnabled,
  };
}
