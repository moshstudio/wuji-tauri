<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { showConfirmDialog, showToast } from 'vant';
import { computed, ref, toRefs, watch } from 'vue';
import CastDeviceSheet from '@/components/media/CastDeviceSheet.vue';
import CastFloatingBubble from '@/components/media/CastFloatingBubble.vue';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import { useStatusBar } from '@/hooks/useStatusBar';
import {
  useDisplayStore,
  useDownloadStore,
  useVideoShelfStore,
} from '@/store';
import { activeCastDevice } from '@/utils/cast';
import VideoDetailPlatform from '@/views/video/components/VideoDetailPlatform.vue';
import { usePlaybackStateMachine } from '@/views/video/composables/usePlaybackStateMachine';
import { useVideoCast } from '@/views/video/composables/useVideoCast';
import { useVideoDetailLifecycle } from '@/views/video/composables/useVideoDetailLifecycle';
import { useVideoEpisodeNav } from '@/views/video/composables/useVideoEpisodeNav';
import { useVideoSearchPlaylist } from '@/views/video/composables/useVideoSearchPlaylist';
import { useVideoShelfActions } from '@/views/video/composables/useVideoShelfActions';
import { useXgVideoPlayer } from '@/views/video/composables/useXgVideoPlayer';

const props = defineProps<{
  videoId: string;
  sourceId: string;
}>();
const { videoId, sourceId } = toRefs(props);

const playbackKey = computed(() => `${sourceId.value}-${videoId.value}`);

const downloadStore = useDownloadStore();
const displayStore = useDisplayStore();
const shelfStore = useVideoShelfStore();
const { showVideoPlaylist: showPlaylist } = storeToRefs(displayStore);

const videoElement = ref<HTMLElement>();

// ─── 1. 状态机：数据加载 + URL 获取 + 重试决策 ───
const machine = usePlaybackStateMachine({ videoId, sourceId });

// 先声明，避免在 player callbacks 中触发 no-use-before-define。
let episodeNav!: ReturnType<typeof useVideoEpisodeNav>;
let onVideoSrcForCastWarmup!: (newVideo: unknown) => void;

// ─── 2. Player 渲染层：只负责创建/销毁播放器 + 上报事件 ───
const player = useXgVideoPlayer({
  videoElement,
  resolvedSrc: machine.resolvedSrc,
  videoItem: machine.videoItem,
  playingResource: machine.playingResource,
  playingEpisode: machine.playingEpisode,
  callbacks: {
    onError: () => {
      const action = machine.retryStrategy.value.decideOnError(machine.resolvedSrc.value);
      if (action) {
        void machine.retry(action);
      }
    },
    onEnded: () => episodeNav.playNext(),
    onRetryClick: () => void machine.retry({ type: 'refetch-url' }),
    onPlayNext: () => episodeNav.playNext(),
    onSrcApplied: newVideo => onVideoSrcForCastWarmup(newVideo),
  },
});

// ─── 3. 剧集导航 ───
episodeNav = useVideoEpisodeNav({
  videoItem: machine.videoItem,
  playingResource: machine.playingResource,
  playingEpisode: machine.playingEpisode,
  videoPlayer: player.videoPlayer,
  play: (resource, episode) => machine.playEpisode(resource, episode),
  shelfStore,
});

// ─── 4. 投屏 ───
const cast = useVideoCast({
  videoSrc: machine.resolvedSrc,
  castProxyMeta: machine.resolvedSrcMeta,
  videoItem: machine.videoItem,
  playingEpisode: machine.playingEpisode,
  videoPlayer: player.videoPlayer,
  nextEpisode: episodeNav.nextEpisode,
  playingResource: machine.playingResource,
  play: (resource, episode) => machine.playEpisode(resource, episode),
  refetchPlayUrl: () => machine.refetchPlayUrlForCast(),
});

onVideoSrcForCastWarmup = cast.onVideoSrcForCastWarmup as unknown as (
  newVideo: unknown,
) => void;

// ─── 5. 收藏 / 搜索 ───
const {
  inShelf,
  showAddShelfSheet,
  addShelfActions,
  onAddToShelf,
} = useVideoShelfActions(videoId, machine.videoItem);

const {
  showSearchDialog,
  searchText,
  filterVideoItems,
  playSearchedVideo,
} = useVideoSearchPlaylist(machine.videoItem, (r, e) => machine.playEpisode(r, e));

const {
  showCastSheet,
  castDevices,
  castSearching,
  openCastSheet,
  onCastDeviceSelect,
  refreshCastDevices,
  onStopCast,
} = cast;

const { videoPlayer } = player;
const { prevEpisode, nextEpisode, playPrevious, playNext } = episodeNav;

// ─── 6. 启动 watches ───
player.setupSrcWatch();
player.setupNameWatch();
cast.setupCastReconnectWatch();

// ─── 7. 生命周期管理 ───
const lifecycle = useVideoDetailLifecycle({
  videoId,
  sourceId,
  videoSrc: machine.resolvedSrc,
  shouldReload: machine.shouldReload,
  loadData: () => machine.loadVideo(),
  pinControls: player.pinControls,
  resetControlsPinned: () => { player.controlsPinned.value = true; },
  destroyVideoPlayer: player.destroyVideoPlayer,
  initPlayerShell: () => player.initPlayerShell(),
  registerCastAutoNextHandler: cast.registerCastAutoNextHandler,
  teardownCast: cast.teardownCast,
  setKeyboardEnabled: player.setKeyboardEnabled,
});

// ─── 8. 路由参数变化 → 切换视频 ───
watch(
  [videoId, sourceId],
  () => {
    player.resetForRouteSwitch();
    videoElement.value = undefined;
    lifecycle.clearSavedPlayback();
    player.pinControls();
    void machine.switchVideo();
  },
  { immediate: true },
);

useStatusBar('#000000', 'light');

function openSearchDialog() {
  showSearchDialog.value = true;
}

async function onDownload() {
  const targetResource = machine.playingResource.value || machine.videoItem.value?.resources?.[0];
  if (!targetResource || !machine.videoItem.value || !machine.videoSource.value) {
    showToast('无法获取资源信息');
    return;
  }
  if (machine.resolvedSrc.value?.isLive) {
    showConfirmDialog({
      title: '提示',
      message: '直播流暂不支持下载，请尝试点播资源。',
      showCancelButton: false,
    });
    return;
  }
  await downloadStore.startVideoCollectionDownload(
    machine.videoItem.value,
    machine.videoSource.value,
    targetResource,
  );
}
</script>

<template>
  <PlatformSwitch>
    <template #desktop>
      <VideoDetailPlatform
        v-model:show-playlist="showPlaylist"
        v-model:video-element="videoElement"
        v-model:show-search-dialog="showSearchDialog"
        v-model:search-text="searchText"
        variant="desktop"
        :playback-key="playbackKey"
        :player="videoPlayer"
        :video-item="machine.videoItem.value"
        :video-source="machine.videoSource.value"
        :playing-resource="machine.playingResource.value"
        :playing-episode="machine.playingEpisode.value"
        :video-src="machine.resolvedSrc.value"
        :play="(r, e) => machine.playEpisode(r, e)"
        :in-shelf="inShelf"
        :add-to-shelf="onAddToShelf"
        :show-search="openSearchDialog"
        :on-download="onDownload"
        :on-cast="openCastSheet"
        :prev-episode="prevEpisode"
        :next-episode="nextEpisode"
        :on-play-previous="playPrevious"
        :on-play-next="playNext"
        :filter-video-items="filterVideoItems"
        :on-play-searched-video="playSearchedVideo"
      />
    </template>
    <template #app>
      <VideoDetailPlatform
        v-model:show-playlist="showPlaylist"
        v-model:video-element="videoElement"
        v-model:show-search-dialog="showSearchDialog"
        v-model:search-text="searchText"
        variant="app"
        :playback-key="playbackKey"
        :player="videoPlayer"
        :video-item="machine.videoItem.value"
        :video-source="machine.videoSource.value"
        :playing-resource="machine.playingResource.value"
        :playing-episode="machine.playingEpisode.value"
        :video-src="machine.resolvedSrc.value"
        :play="(r, e) => machine.playEpisode(r, e)"
        :in-shelf="inShelf"
        :add-to-shelf="onAddToShelf"
        :show-search="openSearchDialog"
        :on-download="onDownload"
        :on-cast="openCastSheet"
        :prev-episode="prevEpisode"
        :next-episode="nextEpisode"
        :on-play-previous="playPrevious"
        :on-play-next="playNext"
        :filter-video-items="filterVideoItems"
        :on-play-searched-video="playSearchedVideo"
      />
    </template>
    <van-action-sheet
      v-model:show="showAddShelfSheet"
      title="添加到收藏"
      :actions="addShelfActions"
    />
    <CastFloatingBubble
      v-if="displayStore.isAndroid && activeCastDevice && !showCastSheet"
      @click="openCastSheet"
    />
    <CastDeviceSheet
      v-if="displayStore.isAndroid"
      v-model:show="showCastSheet"
      :devices="castDevices"
      :loading="castSearching"
      :casting="!!activeCastDevice"
      :casting-device-name="activeCastDevice?.name"
      @select="onCastDeviceSelect"
      @refresh="refreshCastDevices"
      @stop="onStopCast"
    />
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>

<style lang="less">
.xg-top-bar {
  width: 100% !important;
}
</style>
