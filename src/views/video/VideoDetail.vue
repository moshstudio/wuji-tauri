<script setup lang="ts">
import type {
  VideoEpisode,
  VideoItem,
  VideoResource,
  VideoSource,
  VideoUrlMap,
} from '@wuji-tauri/source-extension';
import type Fullscreen from 'xgplayer/es/plugins/fullscreen';
import type FavoriteButtonPlugin from '@/components/media/plugins/favoriteButton';
import type { FetchWebviewResult } from '@/utils/webview';
import { onMountedOrActivated } from '@vant/use';
import _ from 'lodash';
import { storeToRefs } from 'pinia';
import { keepScreenOn } from 'tauri-plugin-keep-screen-on-api';
import { showConfirmDialog, showFailToast, showToast } from 'vant';
import {
  computed,
  nextTick,
  onDeactivated,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from 'vue';
import { useRoute } from 'vue-router';
import Player, { Events } from 'xgplayer';
import DefaultPreset from 'xgplayer/es/presets/default';
import LivePreset from 'xgplayer/es/presets/live';
import MobilePreset from 'xgplayer/es/presets/mobile';
import BackButtonPlugin from '@/components/media/plugins/backButton';
import PlaylistButtonPlugin from '@/components/media/plugins/playlistButton';
import VideoJsPlugin from '@/components/media/plugins/videoJs';
import VideoNamePlugin from '@/components/media/plugins/videoName';
import SearchDialog from '@/components/media/SearchDialog.vue';
import VideoSwiper from '@/components/media/VideoSwiper.vue';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import { usePageDataLoader } from '@/hooks/usePageDataLoader';
import { useStatusBar } from '@/hooks/useStatusBar';
import AppVideoDetail from '@/layouts/app/video/VideoDetail.vue';
import DesktopVideoDetail from '@/layouts/desktop/video/VideoDetail.vue';
import { router } from '@/router';
import {
  useBackStore,
  useDisplayStore,
  useDownloadStore,
  useStore,
  useSubscribeSourceStore,
  useVideoShelfStore,
} from '@/store';
import { createCancellableFunction } from '@/utils/cancelableFunction';
import { fetWebview } from '@/utils/webview';
import 'xgplayer/dist/index.min.css';

const { videoId, sourceId } = defineProps<{
  videoId: string;
  sourceId: string;
}>();

const downloadStore = useDownloadStore();

const route = useRoute();
const store = useStore();
const subscribeStore = useSubscribeSourceStore();
const backStore = useBackStore();
const displayStore = useDisplayStore();
const shelfStore = useVideoShelfStore();
const {
  showVideoPlaylist: showPlaylist,
  videoPlayer,
  videoVolume,
  videoPlaybackRate,
} = storeToRefs(displayStore);
const { videoShelf } = storeToRefs(shelfStore);

const videoElement = ref<HTMLElement>();

const videoSource = ref<VideoSource>();
const videoItem = ref<VideoItem>();
const shouldReload = ref(false);

const playingResource = ref<VideoResource>();
const playingEpisode = ref<VideoEpisode>();
const videoSrc = ref<VideoUrlMap>();
const webviewFallbackTriedUrls = new Set<string>();
const webviewFallbackRunning = ref(false);

function normalizeVideoTypeByUrl(url: string): VideoUrlMap['type'] {
  const lower = url.toLowerCase();
  if (lower.includes('.m3u8'))
    return 'm3u8';
  if (lower.includes('.mp4'))
    return 'mp4';
  if (lower.includes('.mpd'))
    return 'dash';
  return 'm3u8';
}

function extractPlayableUrlFromWebviewResult(ret: FetchWebviewResult): string | null {
  const resources = Array.isArray(ret?.resources) ? ret.resources : [];
  const mediaResource = resources.find((item) => {
    const rawUrl = item.url;
    if (typeof rawUrl !== 'string' || !rawUrl)
      return false;
    const lowerUrl = rawUrl.toLowerCase();
    const contentType = String(item.contentType || '').toLowerCase();
    return (
      lowerUrl.includes('.m3u8')
      || lowerUrl.includes('.mp4')
      || lowerUrl.includes('.mpd')
      || contentType.includes('application/x-mpegurl')
      || contentType.includes('application/vnd.apple.mpegurl')
      || contentType.includes('video/mp4')
      || contentType.includes('application/dash+xml')
    );
  });
  if (mediaResource?.url)
    return mediaResource.url;

  const content = String(ret?.content || '');
  if (!content)
    return null;
  const match = content.match(/https?:\/\/[^\s"'<>\\]+?\.(m3u8|mp4|mpd)(\?[^\s"'<>\\]*)?/i);
  return match?.[0] || null;
}

async function tryWebviewFallbackPlay(originalUrl?: string) {
  if (!originalUrl || webviewFallbackRunning.value)
    return;
  if (webviewFallbackTriedUrls.has(originalUrl))
    return;

  webviewFallbackTriedUrls.add(originalUrl);
  webviewFallbackRunning.value = true;
  try {
    const ret = await fetWebview(originalUrl, {
      timeout: 15000,
      waitForResources: 'video',
      useSavedCookie: true,
    });
    if (!ret)
      return;

    const playableUrl = extractPlayableUrlFromWebviewResult(ret);
    if (!playableUrl || playableUrl === originalUrl)
      return;

    const nextSrc: VideoUrlMap = {
      ...(videoSrc.value || {}),
      url: playableUrl,
      type: normalizeVideoTypeByUrl(playableUrl),
    };
    console.log('[VideoDetail] webview fallback resolved url', nextSrc.url);
    videoSrc.value = nextSrc;
  }
  catch (error) {
    console.warn('[VideoDetail] webview fallback failed', error);
  }
  finally {
    webviewFallbackRunning.value = false;
  }
}

const { run: runLoader } = usePageDataLoader({
  onFailed: () => showFailToast('加载失败，请检查网络或订阅源状态'),
});

const getPlayUrl = createCancellableFunction(async (signal: AbortSignal) => {
  if (!playingResource.value || !playingEpisode.value || !videoItem.value) {
    return;
  }
  let url;
  const t = displayStore.showToast();
  try {
    url = await store.videoPlay(
      videoSource.value!,
      videoItem.value,
      playingResource.value,
      playingEpisode.value,
    );
  }
  catch (error) {
    console.error('get video play url error', error);
  }
  displayStore.closeToast(t);

  if (signal.aborted)
    return;
  if (url) {
    videoSrc.value = url;
  }
  else {
    showFailToast('播放地址获取失败');
  }
});

async function loadData() {
  await runLoader(async (signal) => {
    createPlayer();

    videoSource.value = undefined;
    videoItem.value = undefined;
    videoSrc.value = undefined;
    playingResource.value = undefined;
    playingEpisode.value = undefined;
    shouldReload.value = false;

    if (!videoId || !sourceId) {
      showFailToast('跳转参数错误');
      shouldReload.value = true;
      return true;
    }

    const loaded = await subscribeStore.waitForLoaded();
    if (signal.aborted)
      return true;
    if (!loaded) {
      showFailToast('订阅源加载超时，请稍后重试');
      shouldReload.value = true;
      return true;
    }

    const source = store.getVideoSource(sourceId);
    if (!source) {
      const subscribeSource = subscribeStore.subscribeSources.find(s =>
        s.detail.urls.some(u => u.id === sourceId),
      );
      const urlItem = subscribeSource?.detail.urls.find(u => u.id === sourceId);

      if (urlItem && (urlItem.disable || subscribeSource?.disable)) {
        showFailToast('视频源已禁用，请在订阅源管理中启用');
      }
      else if (!urlItem) {
        showFailToast('视频源不存在或已删除');
      }
      else {
        showFailToast('视频源加载失败，请检查订阅源配置');
      }
      shouldReload.value = true;
      return true;
    }

    videoSource.value = source;
    videoItem.value = store.getVideoItem(source, videoId!);
    if (!videoItem.value) {
      shouldReload.value = true;
      return false;
    }

    const t = displayStore.showToast();
    const detail
      = (await store.videoDetail(source!, videoItem.value, { silent: true })) || undefined;
    displayStore.closeToast(t);

    if (signal.aborted)
      return true;

    if (detail?.id !== videoItem.value?.id) {
      shouldReload.value = true;
      return false;
    }

    Object.assign(videoItem.value, detail);
    if (!videoItem.value) {
      shouldReload.value = true;
      return false;
    }

    // 检查是否有资源和剧集
    const hasContent
      = videoItem.value.resources?.length
        && videoItem.value.resources.some(r => r.episodes?.length);
    shouldReload.value = !hasContent;

    playingResource.value
      ||= _.find(
        videoItem.value.resources,
        resource => resource.id === videoItem.value?.lastWatchResourceId,
      ) || videoItem.value.resources?.[0];
    playingEpisode.value
      ||= _.find(
        playingResource.value?.episodes,
        episode => episode.id === videoItem.value?.lastWatchEpisodeId,
      ) || playingResource.value?.episodes?.[0];

    if (signal.aborted)
      return true;

    if (playingResource.value && playingEpisode.value) {
      shelfStore.updateVideoPlayInfo(videoItem.value, {
        resource: playingResource.value,
        episode: playingEpisode.value,
      });
      await getPlayUrl();
    }

    return true;
  });
}

async function play(resource: VideoResource, episode: VideoEpisode) {
  videoSrc.value = undefined;
  playingResource.value = resource;
  playingEpisode.value = episode;
  shelfStore.updateVideoPlayInfo(videoItem.value!, {
    resource,
    episode,
  });
  await getPlayUrl();
}

const inShelf = computed(() => {
  const result = videoShelf.value.some(shelf =>
    shelf.videos.some(video => video.video.id === videoId),
  );
  return result;
});

const showAddShelfSheet = ref(false);
const addShelfActions = computed(() => {
  return videoShelf.value.map(shelf => ({
    name: shelf.name,
    subname: `共 ${shelf.videos.length || 0} 个视频`,
    callback: () => {
      if (videoItem.value) {
        shelfStore.addToViseoSelf(videoItem.value, shelf.id);
      }
      showAddShelfSheet.value = false;
    },
  }));
});

const showSearchDialog = ref(false);
const searchText = ref('');

function onAddToShelf() {
  if (inShelf.value) {
    router.push({ name: 'VideoShelf' });
  }
  else {
    showAddShelfSheet.value = true;
  }
}

const flatVideoItems = computed(() => {
  return videoItem.value?.resources
    ?.map((r) => {
      if (!r.episodes)
        return undefined;
      return r.episodes.map((e) => {
        return {
          resourceTitle: r.title,
          resourceId: r.id,
          episodeTitle: e.title,
          episodeId: e.id,
        };
      });
    })
    .flat()
    .filter(i => !!i);
});

const filterVideoItems = computed(() => {
  if (!searchText.value)
    return flatVideoItems.value;
  return flatVideoItems.value?.filter((i) => {
    return (
      i.resourceTitle.includes(searchText.value)
      || i.episodeTitle.includes(searchText.value)
    );
  });
});

function playSearchedVideo(resourceId: string, episodeId: string) {
  const resource = videoItem.value?.resources?.find(i => i.id === resourceId);
  if (!resource) {
    showFailToast('没有找到该资源');
    return;
  }
  const episode = resource.episodes?.find(i => i.id === episodeId);
  if (!episode) {
    showFailToast('没有找到该集');
    return;
  }
  play(resource, episode);
  showSearchDialog.value = false;
}

const updateVideoPlayInfo = _.throttle(
  (position?: number) => {
    if (position === undefined) {
      position = videoPlayer.value?.currentTime();
    }
    if (videoItem.value && playingEpisode.value && playingResource.value) {
      playingEpisode.value.lastWatchPosition = position;
      shelfStore.updateVideoPlayInfo(videoItem.value, {
        resource: playingResource.value,
        episode: playingEpisode.value,
        position,
      });
    }
  },
  1000,
  { leading: true, trailing: false },
);

async function playNext() {
  if (
    !playingResource.value?.episodes
    || !playingEpisode.value
    || !videoItem.value
  ) {
    return;
  }
  updateVideoPlayInfo(0);
  const index = playingResource.value.episodes.findIndex(
    item => item.id === playingEpisode.value!.id,
  );

  if (index === undefined || index === -1)
    return;
  if (index === playingResource.value.episodes.length - 1) {
    showToast('没有下一集了');
    return;
  }
  await play(playingResource.value, playingResource.value.episodes[index + 1]);
}

async function playPrevious() {
  if (
    !playingResource.value?.episodes
    || !playingEpisode.value
    || !videoItem.value
  ) {
    return;
  }
  updateVideoPlayInfo(0);
  const index = playingResource.value.episodes.findIndex(
    item => item.id === playingEpisode.value!.id,
  );

  if (index === undefined || index === -1)
    return;
  if (index === 0) {
    showToast('已经是第一集了');
    return;
  }
  await play(playingResource.value, playingResource.value.episodes[index - 1]);
}

const prevEpisode = computed(() => {
  if (!playingResource.value?.episodes || !playingEpisode.value) {
    return null;
  }
  const index = playingResource.value.episodes.findIndex(
    item => item.id === playingEpisode.value!.id,
  );
  if (index <= 0)
    return null;
  return playingResource.value.episodes[index - 1];
});

const nextEpisode = computed(() => {
  if (!playingResource.value?.episodes || !playingEpisode.value) {
    return null;
  }
  const index = playingResource.value.episodes.findIndex(
    item => item.id === playingEpisode.value!.id,
  );
  if (index === -1 || index === playingResource.value.episodes.length - 1) {
    return null;
  }
  return playingResource.value.episodes[index + 1];
});

async function createPlayer(video?: VideoUrlMap) {
  const volume = videoVolume.value || 1;
  const rate = videoPlaybackRate.value || 1;
  videoPlayer.value?.destroy();
  videoPlayer.value?.offAll();
  await nextTick();
  const item = videoItem.value;
  const resource = playingResource.value;
  const episode = playingEpisode.value;
  const preset = video?.isLive
    ? LivePreset
    : displayStore.isAndroid
      ? MobilePreset
      : DefaultPreset;
  videoPlayer.value = new Player({
    el: videoElement.value,
    fullscreenTarget: document.querySelector(
      '.xgplayer-container',
    ) as HTMLElement,
    url: video?.url,
    videoType: video?.type,
    nullUrlStart: !video?.url,
    autoplay: true,
    loop: false,
    playsinline: true,
    cssFullscreen: false,
    volume,
    defaultPlaybackRate: rate,
    isMobileSimulateMode: displayStore.isAndroid ? 'mobile' : 'pc',
    isLive: videoSrc.value?.isLive || false,
    startTime: playingEpisode.value?.lastWatchPosition || 0,
    height: '100%',
    width: '100%',
    plugins: [VideoJsPlugin],
    presets: [preset],
    videoAttributes: {
      crossOrigin: 'anonymous',
    },
    keyboard: {
      checkVisible: true,
      disable: false,
    },
    mobile: {
      disablePress: false,
      darkness: false,
      gestureY: false,
      gestureX: true,
    },
    controls: {
      initShow: true,
      autoHide: !!video?.url,
    },
  });
  videoPlayer.value.registerPlugin(BackButtonPlugin, {
    onClick: () => {
      backStore.back(true);
    },
  });
  videoPlayer.value.registerPlugin(PlaylistButtonPlugin, {
    onClick: () => {
      showPlaylist.value = !showPlaylist.value;
    },
  });
  videoPlayer.value.controls?.show();
  if (item && resource && episode) {
    const videoName = `${item.title || ''} - ${episode.title || ''}`;
    videoPlayer.value.registerPlugin(VideoNamePlugin, {
      videoName,
    });
    videoPlayer.value.on(Events.FULLSCREEN_CHANGE, (isFullScreen) => {
      displayStore.fullScreenMode = isFullScreen;
    });
    videoPlayer.value.on(Events.PLAY, () => {
      if (route.name !== 'VideoDetail') {
        // 页面已切换
        videoPlayer.value?.pause();
      }
    });
    videoPlayer.value.on(Events.PLAYNEXT, () => {
      playNext();
    });
    // 监听音量和倍速变化，保存到 store
    videoPlayer.value.on(Events.VOLUME_CHANGE, () => {
      const currentVolume = videoPlayer.value?.volume;
      if (currentVolume !== undefined) {
        videoVolume.value = currentVolume;
      }
    });
    videoPlayer.value.on(Events.RATE_CHANGE, () => {
      const currentRate = videoPlayer.value?.playbackRate;
      if (currentRate !== undefined) {
        videoPlaybackRate.value = currentRate;
      }
    });
    const updateTime = _.throttle((position: number) => {
      episode.lastWatchPosition = position;
      if (video) {
        shelfStore.updateVideoPlayInfo(item, {
          resource,
          episode,
          position,
        });
      }
    }, 500);
    videoPlayer.value.on(Events.TIME_UPDATE, () => {
      if (route.name !== 'VideoDetail') {
        // 页面已切换
        videoPlayer.value?.pause();
        return;
      }
      const position = videoPlayer.value?.currentTime;
      updateTime(position);
    });
    videoPlayer.value.on(Events.ENDED, () => {
      updateTime(0);
      playNext();
    });
  }

  videoPlayer.value.on(Events.ERROR, (error) => {
    console.warn(`播放失败: ${JSON.stringify(error)}`);
    tryWebviewFallbackPlay(video?.url);
  });
  videoPlayer.value.getPlugin('error').useHooks('errorRetry', () => {
    getPlayUrl();
    return false;
  });
  if (displayStore.isAndroid) {
    videoPlayer.value
      .getPlugin('fullscreen')
      .useHooks('fullscreenChange', (plugin: Fullscreen) => {
        displayStore.fullScreenMode = !displayStore.fullScreenMode;
        plugin.animate(displayStore.fullScreenMode);
      });
  }
  videoPlayer.value.getPlugin('error').useHooks('showError', () => {
    videoPlayer.value?.controls?.show();
  });
}

watch(videoSrc, (newVideo) => {
  if (route.name !== 'VideoDetail') {
    // 页面已切换
    if (videoPlayer.value?.isPlaying) {
      videoPlayer.value?.pause();
    }
    return;
  }
  console.log('load video src:', newVideo);
  createPlayer(newVideo);
});

watch(
  inShelf,
  (newInShelf) => {
    const favoritePlugin = videoPlayer.value?.getPlugin(
      'favoriteButtonPlugin',
    ) as FavoriteButtonPlugin | undefined;
    if (favoritePlugin) {
      favoritePlugin.setFavorited(newInShelf);
    }
    else {
      console.warn('[VideoDetail] 未找到 favoritePlugin');
    }
  },
  { flush: 'post' },
);

let savedVideoSrc: VideoUrlMap | undefined;

watch(
  [() => videoId, () => sourceId],
  async () => {
    webviewFallbackTriedUrls.clear();
    savedVideoSrc = undefined;
    loadData();
  },
  { immediate: true },
);

onMounted(async () => {
  await nextTick();
  await createPlayer();
});

// 声明式状态栏控制：视频详情页强制全黑背景
useStatusBar('#000000', 'light');

onMountedOrActivated(() => {
  if (displayStore.isAndroid) {
    keepScreenOn(true);
  }
  if (videoPlayer.value) {
    const keyboard = videoPlayer.value.getPlugin('keyboard');
    if (keyboard) {
      keyboard.disable = false;
      keyboard.config.disable = false;
    }
  }
  // if (savedVideoSrc && savedVideoSrc.isLive) {
  //   videoSrc.value = savedVideoSrc;
  //   savedVideoSrc = undefined;
  // }
  if (shouldReload.value) {
    loadData();
  }
  else if (savedVideoSrc) {
    videoSrc.value = savedVideoSrc;
    savedVideoSrc = undefined;
  }
  else {
    createPlayer();
  }
});

onDeactivated(() => {
  if (displayStore.isAndroid) {
    keepScreenOn(false);
  }
  // try {
  //   videoPlayer.value?.pause();
  // } catch (error) {
  //   console.warn('video player pause error', error);
  // }
  if (videoPlayer.value) {
    const keyboard = videoPlayer.value.getPlugin('keyboard');
    if (keyboard) {
      keyboard.disable = true;
      keyboard.config.disable = true;
    }
  }
  // if (videoSrc.value?.isLive) {
  //   savedVideoSrc = videoSrc.value;
  //   videoPlayer.value?.destroy();
  //   videoSrc.value = undefined;
  // }
  savedVideoSrc = videoSrc.value;
  videoPlayer.value?.destroy();
  videoSrc.value = undefined;
});

onUnmounted(() => {
  videoPlayer.value?.destroy();
});
async function onDownload() {
  const targetResource
    = playingResource.value || videoItem.value?.resources?.[0];
  if (!targetResource || !videoItem.value || !videoSource.value) {
    showToast('无法获取资源信息');
    return;
  }

  // 检查当前播放视频是否为直播
  if (videoSrc.value?.isLive) {
    showConfirmDialog({
      title: '提示',
      message: '直播流暂不支持下载，请尝试点播资源。',
      showCancelButton: false,
    });
    return;
  }

  await downloadStore.startVideoCollectionDownload(
    videoItem.value,
    videoSource.value,
    targetResource,
  );
}
</script>

<template>
  <PlatformSwitch>
    <template #desktop>
      <DesktopVideoDetail
        v-model:show-playlist="showPlaylist"
        :player="videoPlayer"
        :video-item="videoItem"
        :video-source="videoSource"
        :playing-resource="playingResource"
        :playing-episode="playingEpisode"
        :video-src="videoSrc"
        :play="play"
        :in-shelf="inShelf"
        :add-to-shelf="onAddToShelf"
        :show-search="() => (showSearchDialog = true)"
        :on-download="onDownload"
      >
        <VideoSwiper
          :prev-episode="prevEpisode"
          :next-episode="nextEpisode"
          :on-play-previous="playPrevious"
          :on-play-next="playNext"
        >
          <div
            ref="videoElement"
            class="xg-video-player !relative !h-full !w-full flex-grow"
          />
        </VideoSwiper>
        <SearchDialog
          v-model:show="showSearchDialog"
          v-model:search-text="searchText"
          :playing-resource-id="playingResource?.id"
          :playing-episode-id="playingEpisode?.id"
          :filter-video-items="filterVideoItems"
          @play-searched-video="playSearchedVideo"
        />
      </DesktopVideoDetail>
    </template>
    <template #app>
      <AppVideoDetail
        v-model:show-playlist="showPlaylist"
        :player="videoPlayer"
        :video-item="videoItem"
        :video-source="videoSource"
        :playing-resource="playingResource"
        :playing-episode="playingEpisode"
        :video-src="videoSrc"
        :play="play"
        :in-shelf="inShelf"
        :add-to-shelf="onAddToShelf"
        :show-search="() => (showSearchDialog = true)"
        :on-download="onDownload"
      >
        <VideoSwiper
          :prev-episode="prevEpisode"
          :next-episode="nextEpisode"
          :on-play-previous="playPrevious"
          :on-play-next="playNext"
        >
          <div
            ref="videoElement"
            class="xg-video-player !relative !h-full !w-full flex-grow"
          />
        </VideoSwiper>
        <SearchDialog
          v-model:show="showSearchDialog"
          v-model:search-text="searchText"
          :playing-resource-id="playingResource?.id"
          :playing-episode-id="playingEpisode?.id"
          :filter-video-items="filterVideoItems"
          @play-searched-video="playSearchedVideo"
        />
      </AppVideoDetail>
    </template>
    <van-action-sheet
      v-model:show="showAddShelfSheet"
      title="添加到收藏"
      :actions="addShelfActions"
    />
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>

<style lang="less">
.xg-top-bar {
  width: 100% !important;
}
</style>
