<script setup lang="ts">
import type {
  PhotoDetail as PhotoDetailType,
  PhotoItem,
} from '@wuji-tauri/source-extension';
import type { PhotoSource } from '@/types';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import { useDisplayStore, usePhotoShelfStore, useStore } from '@/store';
import { downloadFile, retryOnFalse } from '@/utils';
import { createCancellableFunction } from '@/utils/cancelableFunction';
import _ from 'lodash';
import { showFailToast, showSuccessToast, showToast } from 'vant';
import { computed, ref, watch } from 'vue';
import AppPhotoDetail from '@/layouts/app/photo/PhotoDetail.vue';
import DesktopPhotoDetail from '@/layouts/desktop/photo/PhotoDetail.vue';
import { useBackStore } from '@/store/backStore';
import { BaseDirectory } from '@tauri-apps/plugin-fs';

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

function back() {
  backStore.back();
}
function clear() {
  photoSource.value = undefined;
  photoItem.value = undefined;
  photoDetail.value = undefined;
  currentPage.value = 1;
}

const toPage = retryOnFalse({ onFailed: back })(
  createCancellableFunction(async (signal: AbortSignal, pageNo?: number) => {
    clear();
    if (!id || !sourceId) {
      return false;
    }
    photoSource.value = store.getPhotoSource(sourceId!);
    if (!photoSource.value) {
      showToast('源不存在或未启用');
      return false;
    }

    photoItem.value = store.getPhotoItem(photoSource.value, id!);
    if (!photoItem.value) {
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
      return true;
    }

    const detail = await store.photoDetail(
      photoSource.value!,
      photoItem.value!,
      pageNo,
    );
    if (signal.aborted) return false;
    photoDetail.value = detail || undefined;
    currentPage.value = detail?.page || 1;

    return true;
  }),
);

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
    headers: headers,
    suffix: 'png',
    baseDir: baseDir,
  });
  if (!res) {
    showFailToast('保存失败');
    return;
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
