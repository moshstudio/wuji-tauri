<script setup lang="ts">
import type {
  VideoEpisode,
  VideoItem,
  VideoResource,
  VideoUrlMap,
} from '@wuji-tauri/source-extension';
import type videojs from 'video.js';
import type { VideoSource } from '@/types';
import _ from 'lodash';
import { storeToRefs } from 'pinia';
import { keepScreenOn } from 'tauri-plugin-keep-screen-on-api';
import { showFailToast, showToast } from 'vant';
import {
  computed,
  onActivated,
  onDeactivated,
  onMounted,
  ref,
  watch,
} from 'vue';
import { useRoute } from 'vue-router';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import AppVideoDetail from '@/layouts/app/video/VideoDetail.vue';
import DesktopVideoDetail from '@/layouts/desktop/video/VideoDetail.vue';
import ResponsiveGrid2 from '@/components/grid/ResponsiveGrid2.vue';
import {
  useBackStore,
  useDisplayStore,
  useStore,
  useVideoShelfStore,
} from '@/store';
import { retryOnFalse } from '@/utils';
import { createCancellableFunction } from '@/utils/cancelableFunction';

type VideoJsPlayer = ReturnType<typeof videojs>;

const { videoId, sourceId } = defineProps<{
  videoId: string;
  sourceId: string;
}>();

const route = useRoute();
const store = useStore();
const backStore = useBackStore();
const displayStore = useDisplayStore();
const shelfStore = useVideoShelfStore();
const { videoShelf } = storeToRefs(shelfStore);
const { showVideoComponent } = storeToRefs(displayStore);

const videoPlayer = ref<VideoJsPlayer>();

const videoSource = ref<VideoSource>();
const videoItem = ref<VideoItem>();

const playingResource = ref<VideoResource>();
const playingEpisode = ref<VideoEpisode>();
const videoSrc = ref<VideoUrlMap>();
const videoSources = ref<import('video.js').default.Tech.SourceObject[]>([]);

watch(
  videoSrc,
  (_) => {
    if (videoSrc.value) {
      function getStreamType(): string | undefined {
        if (videoSrc.value?.type) {
          switch (videoSrc.value?.type) {
            case 'm3u8':
              return 'application/x-mpegURL';
            case 'mp4':
              return 'video/mp4';
            case 'hls':
              return 'application/x-mpegURL';
            case 'dash':
              return 'application/dash+xml';
            case 'rtmp':
              return 'rtmp/flv';
          }
        }
        let url = videoSrc.value?.url || '';
        if (typeof url === 'string') {
          const u = new URL(url);
          if (
            u?.host?.includes('127.0.0.1') ||
            u?.host?.includes('localhost')
          ) {
            // 使用了代理
            url = decodeURIComponent(url.split('/').pop() || '');
            console.log(url);
          }
          if (url.includes('.m3u8')) {
            return 'application/x-mpegURL'; // HLS
          } else if (url.includes('.mpd')) {
            return 'application/dash+xml'; // DASH
          } else if (url.includes('rtmp://')) {
            return 'rtmp/flv'; // RTMP
          } else if (url.includes('.flv')) {
            return 'video/x-flv'; // RTMP
            // } else if (videoSrc.value?.isLive) {
            //   return 'application/x-mpegURL'; // HLS
          } else if (url.includes('mp4')) {
            return 'video/mp4';
          }
        }
        return 'application/x-mpegURL';
      }
      videoSources.value = [
        {
          src: videoSrc.value.url,
          type: getStreamType(), // 根据你的直播流类型设置
        },
      ];
    } else {
      videoPlayer.value?.reset();
      // videoSources.value = [];
    }
  },
  { immediate: true },
);

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

const loadData = retryOnFalse({
  onFailed: backStore.back,
})(
  createCancellableFunction(async (signal: AbortSignal, pageNo?: number) => {
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

function playOrPause() {
  videoPlayer.value?.paused()
    ? videoPlayer.value.play()
    : videoPlayer.value?.pause();
}

async function play(resource: VideoResource, episode: VideoEpisode) {
  videoSrc.value = undefined;
  videoPlayer.value?.reset();
  playingResource.value = resource;
  playingEpisode.value = episode;
  shelfStore.updateVideoPlayInfo(videoItem.value!, {
    resource,
    episode,
  });
  await getPlayUrl();
}
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

async function onCanPlay(args: any) {
  if (playingEpisode.value?.lastWatchPosition) {
    videoPlayer.value?.currentTime(playingEpisode.value.lastWatchPosition);
  }
  if (route.name === 'VideoDetail') {
    // 判断是否还在当前页面
    await videoPlayer.value?.play();
  } else {
    videoPlayer.value?.pause();
  }
}

async function playPrev(args: any) {
  if (
    !playingResource.value?.episodes ||
    !playingEpisode.value ||
    !videoItem.value
  ) {
    return;
  }
  updateVideoPlayInfo(0);
  const index = playingResource.value.episodes.findIndex(
    (item) => item.id === playingEpisode.value!.id,
  );

  if (index === undefined || index === -1) return;
  if (index === 0) {
    showToast('已经是第一集了');
    return;
  }
  await play(playingResource.value, playingResource.value.episodes[index - 1]);
}

async function playNext(args: any) {
  await onPlayFinished(args);
}

async function seek(offset: number) {
  if (!videoPlayer.value) return;
  videoPlayer.value?.currentTime(
    Math.max(
      Math.min(
        videoPlayer.value.duration(),
        videoPlayer.value.currentTime() + offset,
      ),
      0,
    ),
  );
}

async function toggleFullScreen(fullscreen: boolean) {
  displayStore.fullScreenMode = fullscreen;
}

async function onPlayFinished(args: any) {
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
}
function onTimeUpdate(args: any) {
  updateVideoPlayInfo();
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

let savedVideoSrc: VideoUrlMap | undefined;

watch(
  [() => videoId, () => sourceId],
  async () => {
    savedVideoSrc = undefined;
    loadData();
  },
  { immediate: true },
);

onMounted(() => {
  if (displayStore.isAndroid) {
    keepScreenOn(true);
  }
});

onActivated(() => {
  if (displayStore.isAndroid) {
    keepScreenOn(true);
  }
  if (savedVideoSrc && savedVideoSrc.isLive) {
    videoSrc.value = savedVideoSrc;
    savedVideoSrc = undefined;
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
  if (videoSrc.value?.isLive) {
    savedVideoSrc = videoSrc.value;
    videoPlayer.value?.reset();
    videoSrc.value = undefined;
  }
});
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppVideoDetail
        v-model:player="videoPlayer"
        v-model:show-video-component="showVideoComponent"
        :video-sources="videoSources"
        :video-source="videoSource"
        :video-item="videoItem"
        :playing-resource="playingResource"
        :playing-episode="playingEpisode"
        :video-src="videoSrc"
        :play-or-pause="playOrPause"
        :play="play"
        :in-shelf="inShelf"
        :add-to-shelf="() => (showAddShelfSheet = true)"
        :show-search="() => (showSearchDialog = true)"
        :play-prev="playPrev"
        :play-next="playNext"
        :seek="seek"
        :toggle-full-screen="toggleFullScreen"
        :on-can-play="onCanPlay"
        :on-play-finished="onPlayFinished"
      />
    </template>
    <template #desktop>
      <DesktopVideoDetail
        v-model:player="videoPlayer"
        v-model:show-video-component="showVideoComponent"
        :video-sources="videoSources"
        :video-source="videoSource"
        :video-item="videoItem"
        :playing-resource="playingResource"
        :playing-episode="playingEpisode"
        :video-src="videoSrc"
        :play-or-pause="playOrPause"
        :play="play"
        :in-shelf="inShelf"
        :add-to-shelf="() => (showAddShelfSheet = true)"
        :show-search="() => (showSearchDialog = true)"
        :play-prev="playPrev"
        :play-next="playNext"
        :seek="seek"
        :toggle-full-screen="toggleFullScreen"
        :on-can-play="onCanPlay"
        :on-play-finished="onPlayFinished"
      />
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

<style scoped lang="less">
:deep(.van-button__content) {
  overflow: hidden;
}
</style>
