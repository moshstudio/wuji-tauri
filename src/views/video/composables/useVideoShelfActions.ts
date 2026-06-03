import type { VideoItem } from '@wuji-tauri/source-extension';
import type { Ref } from 'vue';
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { router } from '@/router';
import { useVideoShelfStore } from '@/store';

export function useVideoShelfActions(videoId: Ref<string>, videoItem: Ref<VideoItem | undefined>) {
  const shelfStore = useVideoShelfStore();
  const { videoShelf } = storeToRefs(shelfStore);

  const inShelf = computed(() =>
    videoShelf.value.some(shelf =>
      shelf.videos.some(video => video.video.id === videoId.value),
    ),
  );

  const showAddShelfSheet = ref(false);
  const addShelfActions = computed(() =>
    videoShelf.value.map(shelf => ({
      name: shelf.name,
      subname: `共 ${shelf.videos.length || 0} 个视频`,
      callback: () => {
        if (videoItem.value) {
          shelfStore.addToViseoSelf(videoItem.value, shelf.id);
        }
        showAddShelfSheet.value = false;
      },
    })),
  );

  function onAddToShelf() {
    if (inShelf.value) {
      router.push({ name: 'VideoShelf' });
    }
    else {
      showAddShelfSheet.value = true;
    }
  }

  return {
    inShelf,
    showAddShelfSheet,
    addShelfActions,
    onAddToShelf,
  };
}
