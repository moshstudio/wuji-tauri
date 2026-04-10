<script setup lang="ts">
import type {
  PhotoDetail as PhotoDetailType,
  PhotoItem,
} from '@wuji-tauri/source-extension';
import type { PhotoSource } from '@/types';
import { BaseDirectory } from '@tauri-apps/plugin-fs';
import _ from 'lodash';
import { showFailToast, showSuccessToast } from 'vant';
import { computed, onActivated, ref, watch } from 'vue';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import AppPhotoDetail from '@/layouts/app/photo/PhotoDetail.vue';
import DesktopPhotoDetail from '@/layouts/desktop/photo/PhotoDetail.vue';
import { useDisplayStore, usePhotoShelfStore, useStore, useDownloadStore } from '@/store';
import { useBackStore } from '@/store/backStore';
import { downloadFile } from '@/utils';
import { usePageDataLoader } from '@/hooks/usePageDataLoader';

const downloadStore = useDownloadStore();

const { id, sourceId } = defineProps({
  id: String,
  sourceId: String,
});

const store = useStore();
const backStore = useBackStore();
const displayStore = useDisplayStore();
const shelfStore = usePhotoShelfStore();

const photoSource = ref<PhotoSource>();
const photoItem = ref<PhotoItem>();
const photoDetail = ref<PhotoDetailType>();
const currentPage = ref<number>(1);
const shouldReload = ref(false);
const showSelectShelf = ref(false);
const selectShelfActions = computed(() => {
  return shelfStore.photoShelf.map((shelf) => {
    return {
      name: shelf.name,
      subname: `${shelf.photos.length || 0} 个相册`,
      callback: () => {
        if (photoItem.value) {
          shelfStore.addPhotoToShelf(photoItem.value, shelf.id);
          showSelectShelf.value = false;
        }
      },
    };
  });
});

const { run: loadPage, isActive } = usePageDataLoader({
  onFailed: () => showFailToast('图集详情加载失败，请重试'),
});

function back() {
  if (isActive.value) {
    backStore.back();
  }
}

function clear() {
  photoSource.value = undefined;
  photoItem.value = undefined;
  photoDetail.value = undefined;
  currentPage.value = 1;
  shouldReload.value = false;
}

async function toPage(pageNo?: number) {
  await loadPage(async (signal) => {
    clear();
    if (!id || !sourceId) {
      shouldReload.value = true;
      return false;
    }

    photoSource.value = store.getPhotoSource(sourceId!);
    if (!photoSource.value) {
      shouldReload.value = true;
      return false;
    }

    photoItem.value = store.getPhotoItem(photoSource.value, id!);
    if (!photoItem.value) {
      shouldReload.value = true;
      return false;
    }

    if (photoItem.value.noDetail) {
      photoDetail.value = {
        item: photoItem.value,
        photos: [..._.castArray(photoItem.value.cover)],
        totalPage: 1,
        page: 1,
        sourceId: photoItem.value.sourceId,
      };
      currentPage.value = 1;
      shouldReload.value = !photoDetail.value.photos.length;
      return true;
    }

    const detail = await store.photoDetail(
      photoSource.value!,
      photoItem.value!,
      pageNo,
    );

    if (signal.aborted) return true;

    photoDetail.value = detail || undefined;
    currentPage.value = detail?.page || 1;
    shouldReload.value = !detail || !detail.photos?.length;

    return !!detail;
  });
}

function toShelf() {
  if (!photoItem.value) {
    return;
  }
  if (shelfStore.photoShelf.length === 1) {
    addPhotoToShelf(shelfStore.photoShelf[0].id);
  } else {
    showSelectShelf.value = true;
  }
}
function addPhotoToShelf(shelfId: string) {
  const res = shelfStore.addPhotoToShelf(photoItem.value!, shelfId);
  if (res) {
    showSelectShelf.value = false;
  }
}

async function savePic(url: string, headers?: Record<string, string>) {
  const baseDir = displayStore.isAndroid
    ? BaseDirectory.Picture
    : BaseDirectory.Download;
  const res = await downloadFile(url, {
    headers,
    suffix: 'png',
    baseDir,
  });
  if (!res) {
    showFailToast('保存失败');
  } else {
    showSuccessToast('已保存');
  }
}

watch(
  [() => id, () => sourceId],
  () => {
    toPage(1);
  },
  { immediate: true },
);

async function onDownload() {
  if (photoItem.value && photoSource.value) {
    await downloadStore.startPhotoAlbumDownload(
      photoItem.value,
      photoSource.value,
    );
    showSuccessToast('已加入下载任务');
  }
}

async function onDownloadSingle(url: string, headers?: Record<string, string>) {
  if (photoItem.value && photoSource.value) {
    await downloadStore.startPhotoDownload(
      photoItem.value,
      photoSource.value,
      url,
      headers,
    );
    showSuccessToast('已加入下载任务');
  }
}

onActivated(() => {
  if (shouldReload.value) {
    toPage(currentPage.value || 1);
  }
});
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppPhotoDetail
        :photo-item="photoItem"
        :photo-detail="photoDetail"
        :page-no="currentPage"
        :back="back"
        :to-page="toPage"
        :to-shelf="toShelf"
        :save-pic="savePic"
        :on-download="onDownload"
      />
    </template>
    <template #desktop>
      <DesktopPhotoDetail
        :photo-item="photoItem"
        :photo-detail="photoDetail"
        :page-no="currentPage"
        :back="back"
        :to-page="toPage"
        :to-shelf="toShelf"
        :save-pic="savePic"
        :on-download="onDownload"
      />
    </template>
    <van-action-sheet
      v-model:show="showSelectShelf"
      :actions="selectShelfActions"
      cancel-text="取消"
      title="选择收藏夹"
      teleport="body"
    />
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
