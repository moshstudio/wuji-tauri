<script setup lang="ts">
import {
  ref,
  watch,
  onDeactivated,
  computed,
  nextTick,
  onMounted,
  onUnmounted,
} from 'vue';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import AppVideoDetail from '@/layouts/app/video/VideoDetail.vue';
import DesktopVideoDetail from '@/layouts/desktop/video/VideoDetail.vue';
import SearchDialog from '@/components/media/SearchDialog.vue';
import {
  useStore,
  useBackStore,
  useDisplayStore,
  useVideoShelfStore,
} from '@/store';
import { storeToRefs } from 'pinia';
import { useRoute } from 'vue-router';
import { retryOnFalse, sleep } from '@/utils';
import { createCancellableFunction } from '@/utils/cancelableFunction';
import _ from 'lodash';
import { showFailToast, showNotify, showToast } from 'vant';
import {
  VideoSource,
  VideoItem,
  VideoResource,
  VideoEpisode,
  VideoUrlMap,
} from '@wuji-tauri/source-extension';
import Player, { Events } from 'xgplayer';
import MobilePreset from 'xgplayer/es/presets/mobile';
import DefaultPreset from 'xgplayer/es/presets/default';
import LivePreset from 'xgplayer/es/presets/live';
import 'xgplayer/dist/index.min.css';
import { keepScreenOn } from 'tauri-plugin-keep-screen-on-api';
import { onMountedOrActivated } from '@vant/use';
import BackButtonPlugin from '@/components/media/plugins/backButton';
import FavoriteButtonPlugin from '@/components/media/plugins/favoriteButton';
import PlaylistButtonPlugin from '@/components/media/plugins/playlistButton';
import LeftSpeedUpPlugin from '@/components/media/plugins/leftSpeedUp';
import RightSpeedUpPlugin from '@/components/media/plugins/rightSpeedUp';
import Fullscreen from 'xgplayer/es/plugins/fullscreen';
import VideoJsPlugin from '@/components/media/plugins/videoJs';
import VideoNamePlugin from '@/components/media/plugins/videoName';
import { router } from '@/router';

const { videoId, sourceId } = defineProps<{
  videoId: string;
  sourceId: string;
}>();

const route = useRoute();
const store = useStore();
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

const loadData = retryOnFalse({
  onFailed: () => {
    if (route.name === 'VideoDetail') {
      backStore.back();
    }
  },
})(
  createCancellableFunction(async (signal: AbortSignal, pageNo?: number) => {
    if (!videoPlayer.value) {
      createPlayer();
    }

    videoSource.value = undefined;
    videoItem.value = undefined;
    videoSrc.value = undefined;
    playingResource.value = undefined;
    playingEpisode.value = undefined;
    shouldReload.value = false;

    if (!videoId || !sourceId) {
      shouldReload.value = true;
      return false;
    }

    const source = store.getVideoSource(sourceId);
    if (!source) {
      showToast('源不存在或未启用');
      shouldReload.value = true;
      return false;
    }

    videoSource.value = source;
    videoItem.value = store.getVideoItem(source, videoId!);
    if (!videoItem.value) {
      shouldReload.value = true;
      return false;
    }

    const t = displayStore.showToast();
    const detail =
      (await store.videoDetail(source!, videoItem.value)) || undefined;
    displayStore.closeToast(t);

    if (detail?.id != videoItem.value?.id) {
      shouldReload.value = true;
      return false;
    }

    Object.assign(videoItem.value, detail);
    if (!videoItem.value || signal.aborted) {
      shouldReload.value = true;
      return false;
    }

    // 检查是否有资源和剧集
    const hasContent =
      videoItem.value.resources?.length &&
      videoItem.value.resources.some((r) => r.episodes?.length);
    shouldReload.value = !hasContent;

    playingResource.value ||=
      _.find(
        videoItem.value.resources,
        (resource) => resource.id == videoItem.value?.lastWatchResourceId,
      ) || videoItem.value.resources?.[0];
    playingEpisode.value ||=
      _.find(
        playingResource.value?.episodes,
        (episode) => episode.id == videoItem.value?.lastWatchEpisodeId,
      ) || playingResource.value?.episodes?.[0];

    if (signal.aborted) return false;

    if (playingResource.value && playingEpisode.value) {
      shelfStore.updateVideoPlayInfo(videoItem.value, {
        resource: playingResource.value,
        episode: playingEpisode.value,
      });
      await getPlayUrl();
    }

    return true;
  }),
);

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
  } catch (error) {
    console.error('get video play url error', error);
  }
  displayStore.closeToast(t);

  if (signal.aborted) return;
  if (url) {
    videoSrc.value = url;
  } else {
    showFailToast('播放地址获取失败');
  }
});

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
  const result = videoShelf.value.some((shelf) =>
    shelf.videos.some((video) => video.video.id === videoId),
  );
  return result;
});

const showAddShelfSheet = ref(false);
const addShelfActions = computed(() => {
  return videoShelf.value.map((shelf) => ({
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

const onAddToShelf = () => {
  if (inShelf.value) {
    router.push({ name: 'VideoShelf' });
  } else {
    showAddShelfSheet.value = true;
  }
};

const flatVideoItems = computed(() => {
  return videoItem.value?.resources
    ?.map((r) => {
      if (!r.episodes) return undefined;
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
    .filter((i) => !!i);
});

const filterVideoItems = computed(() => {
  if (!searchText.value) return flatVideoItems.value;
  return flatVideoItems.value?.filter((i) => {
    return (
      i.resourceTitle.includes(searchText.value) ||
      i.episodeTitle.includes(searchText.value)
    );
  });
});

const playSearchedVideo = (resourceId: string, episodeId: string) => {
  const resource = videoItem.value?.resources?.find((i) => i.id === resourceId);
  if (!resource) {
    showFailToast('没有找到该资源');
    return;
  }
  const episode = resource.episodes?.find((i) => i.id === episodeId);
  if (!episode) {
    showFailToast('没有找到该集');
    return;
  }
  play(resource, episode);
  showSearchDialog.value = false;
};

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

const playNext = async () => {
  if (
    !playingResource.value?.episodes ||
    !playingEpisode.value ||
    !videoItem.value
  ) {
    return;
  }
  updateVideoPlayInfo(0);
  const index = playingResource.value.episodes.findIndex(
    (item) => item.id == playingEpisode.value!.id,
  );

  if (index === undefined || index === -1) return;
  if (index === playingResource.value.episodes.length - 1) {
    showToast('没有下一集了');
    return;
  }
  await play(playingResource.value, playingResource.value.episodes[index + 1]);
};

const createPlayer = async (video?: VideoUrlMap) => {
  const volume = videoVolume.value || 1;
  const rate = videoPlaybackRate.value || 1;
  videoPlayer.value?.destroy();
  videoPlayer.value?.offAll();
  await nextTick();
  const item = videoItem.value;
  const resource = playingResource.value;
  const episode = playingEpisode.value;
  if (!item || !resource || !episode) {
    return;
  }
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
    nullUrlStart: !video?.url,
    autoplay: true,
    loop: false,
    playsinline: true,
    cssFullscreen: false,
    volume: volume,
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
  });
  // 注册左右长按倍速插件
  videoPlayer.value.registerPlugin(LeftSpeedUpPlugin);
  videoPlayer.value.registerPlugin(RightSpeedUpPlugin);
  videoPlayer.value.registerPlugin(BackButtonPlugin, {
    onClick: () => {
      backStore.back(true);
    },
  });
  const videoName = `${item.title || ''} - ${episode.title || ''}`;
  videoPlayer.value.registerPlugin(VideoNamePlugin, {
    videoName,
  });
  // videoPlayer.value.registerPlugin(FavoriteButtonPlugin, {
  //   isFavorited: inShelf.value,
  //   onClick: onAddToShelf,
  // });
  videoPlayer.value.registerPlugin(PlaylistButtonPlugin, {
    onClick: () => {
      showPlaylist.value = !showPlaylist.value;
    },
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
  videoPlayer.value.on(Events.ERROR, (error) => {
    console.warn(`播放失败: ${JSON.stringify(error)}`);
  });
  if (displayStore.isAndroid) {
    videoPlayer.value
      .getPlugin('fullscreen')
      .useHooks('fullscreenChange', (plugin: Fullscreen, event: TouchEvent) => {
        displayStore.fullScreenMode = !displayStore.fullScreenMode;
        plugin.animate(displayStore.fullScreenMode);
      });
  }
  videoPlayer.value.getPlugin('error').useHooks('showError', () => {
    videoPlayer.value?.controls?.show();
  });
};

watch(videoSrc, (newVideo) => {
  if (newVideo) {
    if (route.name !== 'VideoDetail') {
      // 页面已切换
      return;
    }
    console.log('load video src:', newVideo);
    createPlayer(newVideo);
  } else {
    videoPlayer.value?.resetState();
  }
});

watch(
  inShelf,
  (newInShelf) => {
    const favoritePlugin = videoPlayer.value?.getPlugin(
      'favoriteButtonPlugin',
    ) as FavoriteButtonPlugin | undefined;
    if (favoritePlugin) {
      favoritePlugin.setFavorited(newInShelf);
    } else {
      console.warn('[VideoDetail] 未找到 favoritePlugin');
    }
  },
  { flush: 'post' },
);

let savedVideoSrc: VideoUrlMap | undefined;

watch(
  [() => videoId, () => sourceId],
  async () => {
    savedVideoSrc = undefined;
    loadData();
  },
  { immediate: true },
);

onMounted(async () => {
  await nextTick();
  videoPlayer.value = new Player({
    el: videoElement.value,
    fullscreenTarget: document.querySelector(
      '.xgplayer-container',
    ) as HTMLElement,
    nullUrlStart: true,
    cssFullscreen: false,
    volume: videoVolume.value || 1,
    isMobileSimulateMode: displayStore.isAndroid ? 'mobile' : 'pc',
    height: '100%',
    width: '100%',
    plugins: [VideoJsPlugin],
    ignores: ['fullscreen', 'keyboard'],
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
  videoPlayer.value.on(Events.FULLSCREEN_CHANGE, (isFullScreen) => {
    displayStore.fullScreenMode = isFullScreen;
  });
  videoPlayer.value.controls?.show();
});

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
  if (savedVideoSrc && savedVideoSrc.isLive) {
    videoSrc.value = savedVideoSrc;
    savedVideoSrc = undefined;
  }
  if (shouldReload.value) {
    loadData();
  }
});

onDeactivated(() => {
  if (displayStore.isAndroid) {
    keepScreenOn(false);
  }
  try {
    videoPlayer.value?.pause();
  } catch (error) {
    console.warn('video player pause error', error);
  }
  if (videoPlayer.value) {
    const keyboard = videoPlayer.value.getPlugin('keyboard');
    if (keyboard) {
      keyboard.disable = true;
      keyboard.config.disable = true;
    }
  }
  if (videoSrc.value?.isLive) {
    savedVideoSrc = videoSrc.value;
    videoPlayer.value?.destroy();
    videoSrc.value = undefined;
  }
});

onUnmounted(() => {
  videoPlayer.value?.destroy();
});
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
      >
        <div
          ref="videoElement"
          class="xg-video-player !relative !h-full !w-full flex-grow"
        ></div>
        <SearchDialog
          v-model:show="showSearchDialog"
          v-model:search-text="searchText"
          :playing-resource-id="playingResource?.id"
          :playing-episode-id="playingEpisode?.id"
          :filter-video-items="filterVideoItems"
          @play-searched-video="playSearchedVideo"
        ></SearchDialog>
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
      >
        <div
          ref="videoElement"
          class="xg-video-player !relative !h-full !w-full flex-grow"
        ></div>
        <SearchDialog
          v-model:show="showSearchDialog"
          v-model:search-text="searchText"
          :playing-resource-id="playingResource?.id"
          :playing-episode-id="playingEpisode?.id"
          :filter-video-items="filterVideoItems"
          @play-searched-video="playSearchedVideo"
        ></SearchDialog>
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
