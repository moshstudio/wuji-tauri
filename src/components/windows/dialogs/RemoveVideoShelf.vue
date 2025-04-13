<script setup lang="ts">
import { useDisplayStore, useVideoShelfStore } from '@/store';
import { showToast } from 'vant';

const displayStore = useDisplayStore();
const shelfStore = useVideoShelfStore();

function removeVideoShelf(shelfId: string) {
  if (!shelfId)
    return;
  const res = shelfStore.removeVideoShelf(shelfId);
  if (res) {
    showToast('收藏夹删除成功');
  }
}
</script>

<template>
  <van-dialog
    v-model:show="displayStore.showRemoveVideoShelfDialog"
    title="删除视频收藏夹"
  >
    <van-cell-group inset class="max-h-[50vh] overflow-y-auto">
      <van-cell
        v-for="shelf in shelfStore.videoShelf"
        :key="shelf.id"
        :title="shelf.name"
        :label="`共有 ${shelf.videos.length || 0} 个相册`"
        center
      >
        <template #value>
          <van-button
            icon="delete"
            size="small"
            type="danger"
            round
            @click="removeVideoShelf(shelf.id)"
          />
        </template>
      </van-cell>
    </van-cell-group>
  </van-dialog>
</template>

<style scoped lang="less"></style>
