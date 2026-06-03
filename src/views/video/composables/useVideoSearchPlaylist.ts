import type { VideoEpisode, VideoItem, VideoResource } from '@wuji-tauri/source-extension';
import type { Ref } from 'vue';
import { computed, ref } from 'vue';
import { showFailToast } from 'vant';

export function useVideoSearchPlaylist(
  videoItem: Ref<VideoItem | undefined>,
  play: (resource: VideoResource, episode: VideoEpisode) => Promise<void>,
) {
  const showSearchDialog = ref(false);
  const searchText = ref('');

  const flatVideoItems = computed(() =>
    videoItem.value?.resources
      ?.map((r) => {
        if (!r.episodes) {
          return undefined;
        }
        return r.episodes.map(e => ({
          resourceTitle: r.title,
          resourceId: r.id,
          episodeTitle: e.title,
          episodeId: e.id,
        }));
      })
      .flat()
      .filter(i => !!i),
  );

  const filterVideoItems = computed(() => {
    if (!searchText.value) {
      return flatVideoItems.value;
    }
    return flatVideoItems.value?.filter(i =>
      i.resourceTitle.includes(searchText.value)
      || i.episodeTitle.includes(searchText.value),
    );
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
    void play(resource, episode);
    showSearchDialog.value = false;
  }

  return {
    showSearchDialog,
    searchText,
    filterVideoItems,
    playSearchedVideo,
  };
}
