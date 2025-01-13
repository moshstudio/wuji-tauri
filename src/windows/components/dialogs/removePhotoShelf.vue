<script setup lang="ts">
import { useDisplayStore, usePhotoShelfStore } from "@/store";
import { showToast } from "vant";

const displayStore = useDisplayStore();
const shelfStore = usePhotoShelfStore();

const removePhotoShelf = (shelfId: string) => {
  if (!shelfId) return;
  const res = shelfStore.removeShelf(shelfId);
  if (res) {
    showToast("收藏夹删除成功");
  }
};
</script>

<template>
  <van-dialog
    v-model:show="displayStore.showRemovePhotoShelfDialog"
    title="删除图片收藏夹"
  >
    <van-cell-group inset class="max-h-[50vh] overflow-y-auto">
      <van-cell
        v-for="shelf in shelfStore.photoShelf"
        :key="shelf.id"
        :title="shelf.name"
        :label="`共有 ${shelf.photos.length || 0} 个相册`"
        center
      >
        <template #value>
          <van-button
            icon="delete"
            size="small"
            type="danger"
            round
            @click="removePhotoShelf(shelf.id)"
          >
          </van-button>
        </template>
      </van-cell>
    </van-cell-group>
  </van-dialog>
</template>

<style scoped lang="less"></style>
