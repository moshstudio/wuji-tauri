<script setup lang="ts">
import type { PhotoDetail as PhotoDetailType, PhotoItem } from '@/extensions/photo';
import type { PhotoSource } from '@/types';
import PlatformSwitch from '@/components/PlatformSwitch.vue';
import { router } from '@/router';
import { usePhotoShelfStore, useStore } from '@/store';
import { retryOnFalse, sleep } from '@/utils';
import { createCancellableFunction } from '@/utils/cancelableFunction';
import _, { debounce } from 'lodash';
import { showLoadingToast, showToast } from 'vant';
import { onActivated, ref, watch } from 'vue';
import MobilePhotoDetail from '../mobileView/photo/PhotoDetail.vue';
import WinPhotoDetail from '../windowsView/photo/PhotoDetail.vue';

const { id, sourceId } = defineProps({
  id: String,
  sourceId: String,
});

const store = useStore();
const shelfStore = usePhotoShelfStore();
const photoSource = ref<PhotoSource>();
const photoItem = ref<PhotoItem>();
const photoDetail = ref<PhotoDetailType>();
const currentPage = ref(1);
const content = ref<HTMLElement>();
const shouldLoad = ref(true);
const showAddDialog = ref(false);

function back() {
  shouldLoad.value = true;
  router.push({ name: 'Photo' });
}

const loadData = retryOnFalse({ onFailed: back })(
  createCancellableFunction(async (signal: AbortSignal, pageNo?: number) => {
    photoSource.value = undefined;
    photoItem.value = undefined;
    photoDetail.value = undefined;
    currentPage.value = 1;
    if (pageNo) {
      currentPage.value = pageNo;
    }
    if (!id) {
      return false;
    }
    const source = store.getPhotoSource(sourceId!);
    if (!source) {
      showToast('源不存在或未启用');
      return false;
    }
    photoSource.value = source;
    const item = await store.getPhotoItem(source, id!);
    if (signal.aborted)
      return false;
    if (!item) {
      return false;
    }
    photoItem.value = item;
    if (item.noDetail) {
      photoDetail.value = {
        item,
        photos: [..._.castArray(item.cover)],
        totalPage: 1,
        page: 1,
        sourceId: item.sourceId,
      };
      currentPage.value = 1;
      if (content.value)
        content.value.scrollTop = 0;
      return true;
    }

    const toast = showLoadingToast({
      message: '加载中',
      duration: 0,
      closeOnClick: true,
      closeOnClickOverlay: false,
    });
    const detail = await store.photoDetail(
      source!,
      photoItem.value!,
      currentPage.value,
    );

    photoDetail.value = detail || undefined;
    currentPage.value = detail?.page || 1;
    toast.close();
    if (content.value)
      content.value.scrollTop = 0;
    return true;
  }),
);

const toPage = debounce(loadData, 600);

function collect() {
  if (!photoItem.value) {
    return;
  }
  if (shelfStore.photoShelf.length === 1) {
    addPhotoToShelf(shelfStore.photoShelf[0].id);
  }
  else {
    showAddDialog.value = true;
  }
}
function addPhotoToShelf(shelfId: string) {
  const res = shelfStore.addPhotoToShelf(photoItem.value!, shelfId);
  if (res) {
    showAddDialog.value = false;
  }
}

watch([() => id, () => sourceId], () => {
  shouldLoad.value = false; // watch这里优先load
  loadData();
});
onActivated(async () => {
  await sleep(200);
  if (shouldLoad.value) {
    shouldLoad.value = false;
    loadData();
  }
});
</script>

<template>
  <PlatformSwitch>
    <template #mobile>
      <MobilePhotoDetail
        v-model:photo-item="photoItem"
        v-model:photo-detail="photoDetail"
        v-model:current-page="currentPage"
        v-model:content="content"
        v-model:show-add-dialog="showAddDialog"
        @back="back"
        @load-data="loadData"
        @to-page="toPage"
        @collect="collect"
        @add-photo-to-shelf="addPhotoToShelf"
      />
    </template>
    <template #windows>
      <WinPhotoDetail
        v-model:photo-item="photoItem"
        v-model:photo-detail="photoDetail"
        v-model:current-page="currentPage"
        v-model:content="content"
        v-model:show-add-dialog="showAddDialog"
        @back="back"
        @load-data="loadData"
        @to-page="toPage"
        @collect="collect"
        @add-photo-to-shelf="addPhotoToShelf"
      />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
