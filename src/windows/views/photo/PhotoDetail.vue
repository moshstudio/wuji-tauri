<script setup lang="ts">
import { PhotoDetail, PhotoItem } from "@/extensions/photo";
import { router } from "@/router";
import { onMounted, ref, watch, onActivated } from "vue";
import { useStore, usePhotoShelfStore } from "@/store";
import { showLoadingToast, showToast } from "vant";
import { PhotoSource } from "@/types";
import _, { debounce } from "lodash";
import { createCancellableFunction } from "@/utils/cancelableFunction";
import { retryOnFalse, sleep } from "@/utils";
import LoadImage from "@/components/LoadImage.vue";

const { id, sourceId } = defineProps({
  id: String,
  sourceId: String,
});

const store = useStore();
const shelfStore = usePhotoShelfStore();
const photoSource = ref<PhotoSource>();
const photoItem = ref<PhotoItem>();
const photoDetail = ref<PhotoDetail>();
const currentPage = ref(1);
const content = ref<HTMLElement>();
const shouldLoad = ref(true);
const showAddDialog = ref(false);

function back() {
  shouldLoad.value = true;
  router.push({ name: "Photo" });
}

const loadData = retryOnFalse({ onFailed: back })(
  createCancellableFunction(async (pageNo?: number) => {
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
      showToast("源不存在或未启用");
      return false;
    }
    photoSource.value = source;
    const item = await store.getPhotoItem(source, id!);
    if (!item) {
      return false;
    }
    photoItem.value = item;
    if (item.noDetail) {
      photoDetail.value = {
        item: item,
        photos: [..._.castArray(item.cover)],
        totalPage: 1,
        page: 1,
        sourceId: item.sourceId,
      };
      currentPage.value = 1;
      content.value!.scrollTop = 0;
      return true;
    }

    const toast = showLoadingToast({
      message: "加载中",
      duration: 0,
      closeOnClick: true,
      closeOnClickOverlay: false,
    });
    const detail = await store.photoDetail(
      source!,
      photoItem.value!,
      currentPage.value
    );

    photoDetail.value = detail || undefined;
    currentPage.value = detail?.page || 1;
    toast.close();
    content.value!.scrollTop = 0;
    return true;
  })
);

const toPage = debounce(loadData, 600);

const collect = () => {
  if (!photoItem.value) {
    return;
  }
  if (shelfStore.photoShelf.length === 1) {
    addPhotoToShelf(shelfStore.photoShelf[0].id);
  } else {
    showAddDialog.value = true;
  }
};
const addPhotoToShelf = (shelfId: string) => {
  const res = shelfStore.addPhotoToShelf(photoItem.value!, shelfId);
  if (res) {
    showAddDialog.value = false;
  }
};

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
  <div class="relative h-full flex flex-col">
    <van-nav-bar
      :title="photoItem?.title || '图片详情'"
      right-text="收藏"
      left-arrow
      @click-left="back"
      @click-right="collect"
    />
    <main
      ref="content"
      class="grow flex flex-col overflow-y-auto p-4 bg-[--van-background-3] select-none"
    >
      <van-skeleton :loading="!photoDetail">
        <template #template>
          <div class="flex justify-center items-center mt-2 w-full">
            <van-skeleton-image />
          </div>
        </template>
        <LoadImage
          v-for="(item, index) in photoDetail!.photos"
          :key="index"
          :src="item"
          :headers="photoDetail?.photosHeaders"
          fit="contain"
          lazy-load
          class="rounded-lg max-w-[100%] max-h-[100%]"
        />
      </van-skeleton>
    </main>
    <van-row
      justify="center"
      v-if="photoDetail?.totalPage && photoDetail?.totalPage > 1"
      class="w-full bg-[--van-background-2]"
    >
      <van-pagination
        v-model="currentPage"
        :page-count="Number(photoDetail.totalPage)"
        class="p-1"
        force-ellipses
        @change="(pageNo) => toPage(pageNo)"
      />
    </van-row>
  </div>
  <van-dialog
    v-model:show="showAddDialog"
    title="选择收藏夹"
    :show-confirm-button="false"
    teleport="body"
    show-cancel-button
  >
    <van-cell-group>
      <van-cell
        v-for="item in shelfStore.photoShelf"
        :key="item.id"
        :title="item.name"
        center
        clickable
        @click="addPhotoToShelf(item.id)"
      >
      </van-cell>
    </van-cell-group>
  </van-dialog>
</template>

<style scoped lang="less"></style>
