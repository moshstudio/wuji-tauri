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
import PlaylistButtonPlugin from '@/components/media/plugins/playlistButton';
import Fullscreen from 'xgplayer/es/plugins/fullscreen';
import VideoJsPlugin from '@/components/media/plugins/videoJs';

const { videoId, sourceId } = defineProps<{
  videoId: string;
  sourceId: string;
}>();

const route = useRoute();
const store = useStore();
const backStore = useBackStore();
const displayStore = useDisplayStore();
const shelfStore = useVideoShelfStore();
const { showVideoPlaylist: showPlaylist, videoPlayer } =
  storeToRefs(displayStore);
const { videoShelf } = storeToRefs(shelfStore);

const videoElement = ref<HTMLElement>();

const videoSource = ref<VideoSource>();
const videoItem = ref<VideoItem>();

const playingResource = ref<VideoResource>();
const playingEpisode = ref<VideoEpisode>();
const videoSrc = ref<VideoUrlMap>();

const loadData = retryOnFalse({
  onFailed: backStore.back,
})(
  createCancellableFunction(async (signal: AbortSignal, pageNo?: number) => {
    if (videoPlayer.value) {
      createPlayer();
    }

    videoSource.value = undefined;
    videoItem.value = undefined;
    videoSrc.value = undefined;
    playingResource.value = undefined;
    playingEpisode.value = undefined;

    if (!videoId || !sourceId) {
      return false;
    }
    const source = store.getVideoSource(sourceId);
    if (!source) {
      showToast('源不存在或未启用');
      return false;
    }
    videoSource.value = source;
    videoItem.value = store.getVideoItem(source, videoId!);
    if (!videoItem.value) {
      return false;
    }
    const t = displayStore.showToast();
    const detail =
      (await store.videoDetail(source!, videoItem.value)) || undefined;
    displayStore.closeToast(t);
    if (detail?.id != videoItem.value?.id) {
      return false;
    }
    Object.assign(videoItem.value, detail);
    if (!videoItem.value || signal.aborted) {
      return false;
    }

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
  for (const shelf of videoShelf.value) {
    if (shelf.videos.some((video) => video.video.id === videoId)) {
      return true;
    }
  }
  return false;
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
  videoPlayer.value?.destroy();
  await nextTick();
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
    volume: 1,
    isMobileSimulateMode: displayStore.isAndroid ? 'mobile' : 'pc',
    isLive: videoSrc.value?.isLive || false,
    height: '100%',
    width: '100%',
    plugins: [VideoJsPlugin],
    presets: [preset],
    videoAttributes: {
      crossOrigin: 'anonymous',
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
  videoPlayer.value.on(Events.FULLSCREEN_CHANGE, (isFullScreen) => {
    displayStore.fullScreenMode = isFullScreen;
  });
  videoPlayer.value.on(Events.ENDED, () => {
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
    createPlayer(newVideo);
  } else {
    videoPlayer.value?.resetState();
  }
});

let savedVideoSrc: VideoUrlMap | undefined;

watch(
  [() => videoId, () => sourceId],
  async () => {
    savedVideoSrc = undefined;
    loadData();
  },
  { immediate: true },
);

onMountedOrActivated(() => {
  if (displayStore.isAndroid) {
    keepScreenOn(true);
  }
  if (savedVideoSrc && savedVideoSrc.isLive) {
    videoSrc.value = savedVideoSrc;
    savedVideoSrc = undefined;
  }
});

onMounted(() => {
  createPlayer();
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
  if (videoSrc.value?.isLive) {
    savedVideoSrc = videoSrc.value;
    videoPlayer.value?.reset();
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
        :add-to-shelf="() => (showAddShelfSheet = true)"
        :show-search="() => (showSearchDialog = true)"
      >
        <div
          ref="videoElement"
          class="xg-video-player !relative !h-full !w-full flex-grow"
        ></div>
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
        :add-to-shelf="() => (showAddShelfSheet = true)"
        :show-search="() => (showSearchDialog = true)"
      >
        <div
          ref="videoElement"
          class="xg-video-player !relative !h-full !w-full flex-grow"
        ></div>
      </AppVideoDetail>
    </template>
    <van-action-sheet
      v-model:show="showAddShelfSheet"
      title="添加到收藏"
      :actions="addShelfActions"
    />
    <van-dialog
      v-model:show="showSearchDialog"
      title="搜索"
      width="85%"
      z-index="10001"
      :show-confirm-button="false"
      :show-cancel-button="true"
      close-on-click-overlay
      teleport="body"
    >
      <div class="flex w-full px-2">
        <van-field
          v-model="searchText"
          placeholder="请输入关键词搜索"
          autofocus
          clearable
          autocomplete="off"
          class="w-full"
        />
      </div>
      <div
        class="flex h-[60vh] w-full flex-col items-center overflow-y-auto p-4"
      >
        <!-- 搜索输入框 -->
        <ResponsiveGrid2 min-width="100" max-width="120">
          <van-button
            v-for="item in filterVideoItems"
            :key="item.resourceId + item.episodeId"
            type="default"
            size="small"
            block
            style="margin: 4px 0"
            @click="
              () => {
                playSearchedVideo(item.resourceId, item.episodeId);
              }
            "
          >
            <p class="truncate">{{ item.resourceTitle }}</p>
            <p class="truncate">{{ item.episodeTitle }}</p>
          </van-button>

          <!-- 无结果提示 -->
          <div
            v-if="!filterVideoItems?.length"
            class="flex items-center justify-center text-xs text-[var(--van-text-color-2)]"
          >
            无匹配结果
          </div>
        </ResponsiveGrid2>
      </div>
    </van-dialog>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
