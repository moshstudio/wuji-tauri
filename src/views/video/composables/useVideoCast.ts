import type {
  VideoEpisode,
  VideoItem,
  VideoResource,
  VideoUrlMap,
} from '@wuji-tauri/source-extension';
import type { ComputedRef, Ref } from 'vue';
import type Player from 'xgplayer';
import type { CastDevice, CastProxyAlignOptions } from '@/utils/cast';
import type { ResolvedSrcMeta } from '@/views/video/composables/usePlaybackStateMachine';
import {
  showFailToast,
  showLoadingToast,
  showToast,
} from 'vant';
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import {
  useDisplayStore,
  useServerStore,
} from '@/store';
import {
  activeCastDevice,
  castContinueMedia,
  endCastSession,
  markCastReconnectHandledByAutoNext,
  reconnectCast,
  searchCastDevices,
  setCastAutoNextHandler,
  shouldSkipCastReconnectFromVideoSrc,
  startDlnaCast,
  warmupCastDiscovery,
} from '@/utils/cast';
import { formatEpisodeTitle } from '@/utils/videoEpisode';
import { showVipDialog } from '@/utils/vip';

function toCastProxyAlignOpts(
  meta?: ResolvedSrcMeta,
): CastProxyAlignOptions | undefined {
  if (!meta?.rawUrl) {
    return undefined;
  }
  return { pageUrl: meta.rawUrl, webviewUsed: meta.webviewUsed };
}

export function useVideoCast(options: {
  videoSrc: Ref<VideoUrlMap | undefined>;
  castProxyMeta: Ref<ResolvedSrcMeta | undefined>;
  videoItem: Ref<VideoItem | undefined>;
  playingEpisode: Ref<VideoEpisode | undefined>;
  videoPlayer: Ref<Player | undefined>;
  nextEpisode: ComputedRef<VideoEpisode | null>;
  playingResource: Ref<VideoResource | undefined>;
  play: (resource: VideoResource, episode: VideoEpisode) => Promise<void>;
  refetchPlayUrl: () => Promise<boolean>;
}) {
  const route = useRoute();
  const serverStore = useServerStore();
  const displayStore = useDisplayStore();

  const showCastSheet = ref(false);
  const castDevices = ref<CastDevice[]>([]);
  const castSearching = ref(false);

  function getCastAlignOpts(): CastProxyAlignOptions | undefined {
    return toCastProxyAlignOpts(options.castProxyMeta.value);
  }

  function getCastTitle() {
    return formatEpisodeTitle(
      options.videoItem.value,
      options.playingEpisode.value,
    );
  }

  async function refreshCastDevices() {
    castSearching.value = true;
    try {
      let result = await searchCastDevices();
      let devices = Array.isArray(result?.devices) ? result.devices : [];
      if (!devices.length && !result?.error) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        result = await searchCastDevices();
        devices = Array.isArray(result?.devices) ? result.devices : [];
      }
      castDevices.value = devices;
      if (result?.error) {
        showFailToast(result.error);
      }
      else if (!devices.length) {
        showToast({
          message:
            '未发现设备。请确认：①电视已开机并连接同一 Wi-Fi；②小米电视在「设置→投屏」中开启无线投屏/DLNA；③关闭路由器 AP 隔离',
          duration: 5000,
        });
      }
    }
    catch (error) {
      console.warn('search cast devices failed', error);
      const msg = error instanceof Error ? error.message : '搜索投屏设备失败';
      showFailToast(msg);
      castDevices.value = [];
    }
    finally {
      castSearching.value = false;
    }
  }

  async function openCastSheet() {
    if (!serverStore.hasFeature('video_cast')) {
      showVipDialog('投屏功能为会员专属，是否前往查看会员方案？');
      return;
    }
    if (!options.videoSrc.value?.url) {
      showToast('请先等待视频加载');
      return;
    }
    if (options.videoSrc.value.isLive) {
      showToast('直播暂不支持投屏');
      return;
    }
    showCastSheet.value = true;
    await refreshCastDevices();
  }

  async function onStopCast() {
    await endCastSession();
    showCastSheet.value = false;
    showToast('已停止投屏');
  }

  async function castToDevice(
    device: CastDevice,
    videoSrc: VideoUrlMap,
    title: string,
    alignOpts?: CastProxyAlignOptions,
  ) {
    return startDlnaCast(device, videoSrc, title, alignOpts);
  }

  async function onCastDeviceSelect(device: CastDevice) {
    if (!options.videoSrc.value?.url) {
      showToast('当前没有可投屏的地址');
      return;
    }
    const title = getCastTitle();

    let loadingToast = showLoadingToast({
      message: '正在连接电视…',
      forbidClick: true,
      duration: 0,
    });
    try {
      let src = options.videoSrc.value;
      let alignOpts = getCastAlignOpts();
      let result = await castToDevice(device, src, title, alignOpts);

      if (!result.success) {
        loadingToast.close();
        loadingToast = showLoadingToast({
          message: '正在重新获取播放地址…',
          forbidClick: true,
          duration: 0,
        });
        const refetched = await options.refetchPlayUrl();
        if (refetched && options.videoSrc.value?.url) {
          src = options.videoSrc.value;
          alignOpts = getCastAlignOpts();
          result = await castToDevice(device, src, title, alignOpts);
        }
      }

      if (!result.success) {
        showFailToast(result.error || '投屏失败，请重试');
        return;
      }
      activeCastDevice.value = device;
      options.videoPlayer.value?.pause();
      showCastSheet.value = false;
      showToast(`已投屏到 ${device.name}`);
    }
    catch (error) {
      console.warn('cast failed', error);
      showFailToast(error instanceof Error ? error.message : '投屏失败');
    }
    finally {
      loadingToast.close();
    }
  }

  function registerCastAutoNextHandler() {
    setCastAutoNextHandler(async () => {
      const next = options.nextEpisode.value;
      const resource = options.playingResource.value;
      const item = options.videoItem.value;
      if (!next || !resource || !item) {
        console.warn('[cast] auto next skipped: no next episode');
        return false;
      }
      markCastReconnectHandledByAutoNext();
      await options.play(resource, next);
      if (!options.videoSrc.value?.url || options.videoSrc.value.isLive) {
        console.warn('[cast] auto next skipped: play url missing');
        return false;
      }
      const continued = await castContinueMedia(
        options.videoSrc.value,
        getCastTitle(),
        getCastAlignOpts(),
      );
      if (continued) {
        options.videoPlayer.value?.pause();
      }
      return continued;
    });
  }

  function setupCastReconnectWatch() {
    watch(
      options.videoSrc,
      async (newSrc) => {
        if (!activeCastDevice.value?.id || !newSrc?.url || newSrc.isLive) {
          return;
        }
        if (route.name !== 'VideoDetail') {
          return;
        }
        if (shouldSkipCastReconnectFromVideoSrc()) {
          return;
        }
        try {
          const success = await reconnectCast(
            newSrc,
            getCastTitle(),
            getCastAlignOpts(),
          );
          if (success) {
            options.videoPlayer.value?.pause();
          }
        }
        catch (error) {
          console.warn('reconnect cast failed', error);
        }
      },
      { flush: 'post' },
    );
  }

  function onVideoSrcForCastWarmup(newVideo: VideoUrlMap | undefined) {
    if (
      displayStore.isAndroid
      && newVideo?.url
      && !newVideo.isLive
      && serverStore.hasFeature('video_cast')
    ) {
      warmupCastDiscovery();
    }
  }

  function teardownCast() {
    setCastAutoNextHandler(null);
  }

  return {
    showCastSheet,
    castDevices,
    castSearching,
    getCastTitle,
    refreshCastDevices,
    openCastSheet,
    onStopCast,
    onCastDeviceSelect,
    registerCastAutoNextHandler,
    setupCastReconnectWatch,
    onVideoSrcForCastWarmup,
    teardownCast,
  };
}
