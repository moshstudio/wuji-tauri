<script setup lang="ts">
import type {
  VideoEpisode,
  VideoItem,
  VideoResource,
  VideoSource,
  VideoUrlMap,
} from '@wuji-tauri/source-extension';
import type Player from 'xgplayer';
import SearchDialog from '@/components/media/SearchDialog.vue';
import VideoSwiper from '@/components/media/VideoSwiper.vue';
import AppVideoDetail from '@/layouts/app/video/VideoDetail.vue';
import DesktopVideoDetail from '@/layouts/desktop/video/VideoDetail.vue';

defineProps<{
  variant: 'app' | 'desktop';
  playbackKey?: string;
  player?: Player;
  videoItem?: VideoItem;
  videoSource?: VideoSource;
  playingResource?: VideoResource;
  playingEpisode?: VideoEpisode;
  videoSrc?: VideoUrlMap;
  inShelf?: boolean;
  play: (resource: VideoResource, episode: VideoEpisode) => Promise<void>;
  addToShelf: () => void;
  showSearch: () => void;
  onDownload: () => void;
  onCast: () => void;
  prevEpisode: VideoEpisode | null | undefined;
  nextEpisode: VideoEpisode | null | undefined;
  onPlayPrevious: () => void | Promise<void>;
  onPlayNext: () => void | Promise<void>;
  filterVideoItems: Array<{
    resourceTitle: string;
    resourceId: string;
    episodeTitle: string;
    episodeId: string;
  }> | undefined;
  onPlaySearchedVideo: (resourceId: string, episodeId: string) => void;
}>();

const showPlaylist = defineModel<boolean>('showPlaylist', { required: true });
const showSearchDialog = defineModel<boolean>('showSearchDialog', {
  required: true,
});
const searchText = defineModel<string>('searchText', { required: true });
const videoElement = defineModel<HTMLElement | undefined>('videoElement');

function setVideoEl(el: Element | null | { $el?: Element } | undefined) {
  const node = el && '$el' in el ? el.$el : el;
  videoElement.value = (node as HTMLElement) || undefined;
}
</script>

<template>
  <component
    :is="variant === 'app' ? AppVideoDetail : DesktopVideoDetail"
    v-model:show-playlist="showPlaylist"
    :player="player"
    :video-item="videoItem"
    :video-source="videoSource"
    :playing-resource="playingResource"
    :playing-episode="playingEpisode"
    :video-src="videoSrc"
    :play="play"
    :in-shelf="inShelf"
    :add-to-shelf="addToShelf"
    :show-search="showSearch"
    :on-download="onDownload"
    :on-cast="onCast"
  >
    <VideoSwiper
      :prev-episode="prevEpisode ?? null"
      :next-episode="nextEpisode ?? null"
      :on-play-previous="async () => { await onPlayPrevious() }"
      :on-play-next="async () => { await onPlayNext() }"
    >
      <div
        :key="playbackKey"
        :ref="setVideoEl"
        class="xg-video-player !relative !h-full !w-full flex-grow"
      />
    </VideoSwiper>
    <SearchDialog
      v-model:show="showSearchDialog"
      v-model:search-text="searchText"
      :playing-resource-id="playingResource?.id"
      :playing-episode-id="playingEpisode?.id"
      :filter-video-items="filterVideoItems"
      @play-searched-video="onPlaySearchedVideo"
    />
  </component>
</template>
