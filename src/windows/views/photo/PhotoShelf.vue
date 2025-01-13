<script setup lang="ts">
import { useStore, usePhotoShelfStore, useDisplayStore } from "@/store";
import _ from "lodash";
import { onMounted, onUnmounted, ref, watch } from "vue";
import AddPhotoShelfDialog from "@/windows/components/dialogs/AddPhotoShelf.vue";
import removePhotoShelfDialog from "@/windows/components/dialogs/removePhotoShelf.vue";
import { PhotoItem, PhotoShelf } from "@/extensions/photo";

const show = defineModel("show", { type: Boolean, default: false });

const displayStore = useDisplayStore();
const shelfStore = usePhotoShelfStore();
const removePhotoFromShelf = (photo: PhotoItem, shelf: PhotoShelf) => {
  shelfStore.removePhotoFromShelf(photo, shelf.id);
};

// 书架展示相关
const shelfAnchors = [0, Math.round(window.innerHeight)];
const shelfHeight = ref(0);
const hidePanel = () => {
  shelfHeight.value = shelfAnchors[0];
  show.value = false;
};
watch(
  show,
  (newValue) => {
    if (newValue) {
      shelfHeight.value = shelfAnchors[1];
    } else {
      shelfHeight.value = shelfAnchors[0];
    }
  },
  { immediate: true }
);
const updateAnchors = () => {
  shelfAnchors[1] = Math.round(window.innerHeight);
  if (show.value) {
    shelfHeight.value = shelfAnchors[1];
  }
};
onMounted(() => {
  window.addEventListener("resize", updateAnchors);
});
onUnmounted(() => {
  window.removeEventListener("resize", updateAnchors);
});
</script>

<template>
  <van-floating-panel
    v-model:height="shelfHeight"
    :anchors="shelfAnchors"
    :content-draggable="false"
    @height-change="
      (height) => {
        if (height.height === 0) {
          show = false;
        }
      }
    "
    class="left-[50px] right-[0px] w-auto rounded-none up-shadow"
    :style="show ? { height: `${shelfHeight}px` } : {}"
  >
    <template #header>
      <div class="flex justify-between items-center p-4 border-b">
        <h2 class="text-lg font-semibold">
          <slot name="title">
            <p class="text-[--van-text-color]">图片收藏</p>
          </slot>
        </h2>
        <div class="text-button" @click="hidePanel">关闭收藏</div>
      </div>
    </template>
    <div class="flex gap-2 m-2 p-1 shrink">
      <van-button
        icon="plus"
        size="small"
        round
        @click="() => (displayStore.showAddPhotoShelfDialog = true)"
      >
        新增收藏夹
      </van-button>
      <van-button
        icon="delete-o"
        size="small"
        round
        @click="() => (displayStore.showRemovePhotoShelfDialog = true)"
      >
        删除收藏夹
      </van-button>
    </div>
    <van-tabs shrink>
      <van-tab
        :title="shelf.name"
        v-for="shelf in shelfStore.photoShelf"
        :key="shelf.id"
      >
        <div class="flex flex-wrap gap-2">
          <PhotoCard
            :item="photo"
            v-for="photo in shelf.photos"
            :key="photo.id"
            removable
            @remove="() => removePhotoFromShelf(photo, shelf)"
          ></PhotoCard>
        </div>
      </van-tab>
    </van-tabs>
  </van-floating-panel>
  <AddPhotoShelfDialog></AddPhotoShelfDialog>
  <removePhotoShelfDialog></removePhotoShelfDialog>
</template>

<style scoped lang="less">
:deep(.van-card__thumb) {
  width: 80px;
  height: 100px;
}
</style>
