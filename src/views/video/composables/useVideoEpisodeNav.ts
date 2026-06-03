import type {
  VideoEpisode,
  VideoItem,
  VideoResource,
} from '@wuji-tauri/source-extension';
import type Player from 'xgplayer';
import type { Ref } from 'vue';
import { computed } from 'vue';
import _ from 'lodash';
import { showToast } from 'vant';
import { getAdjacentEpisode } from '@/utils/videoEpisode';

export function useVideoEpisodeNav(options: {
  videoItem: Ref<VideoItem | undefined>;
  playingResource: Ref<VideoResource | undefined>;
  playingEpisode: Ref<VideoEpisode | undefined>;
  videoPlayer: Ref<Player | undefined>;
  play: (resource: VideoResource, episode: VideoEpisode) => Promise<void>;
  shelfStore: {
    updateVideoPlayInfo: (
      item: VideoItem,
      info: {
        resource: VideoResource;
        episode: VideoEpisode;
        position?: number;
      },
    ) => void;
  };
}) {
  const {
    videoItem,
    playingResource,
    playingEpisode,
    videoPlayer,
    play,
    shelfStore,
  } = options;

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

  const prevEpisode = computed(() =>
    getAdjacentEpisode(
      playingResource.value?.episodes,
      playingEpisode.value?.id,
      -1,
    ),
  );

  const nextEpisode = computed(() =>
    getAdjacentEpisode(
      playingResource.value?.episodes,
      playingEpisode.value?.id,
      1,
    ),
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
    const episodes = playingResource.value.episodes;
    const index = episodes.findIndex(
      item => item.id === playingEpisode.value!.id,
    );
    if (index === -1) {
      return;
    }
    if (index === episodes.length - 1) {
      showToast('没有下一集了');
      return;
    }
    await play(playingResource.value, episodes[index + 1]);
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
    const episodes = playingResource.value.episodes;
    const index = episodes.findIndex(
      item => item.id === playingEpisode.value!.id,
    );
    if (index === -1) {
      return;
    }
    if (index === 0) {
      showToast('已经是第一集了');
      return;
    }
    await play(playingResource.value, episodes[index - 1]);
  }

  return {
    updateVideoPlayInfo,
    prevEpisode,
    nextEpisode,
    playNext,
    playPrevious,
  };
}
