<script setup lang="ts">
import { useDisplayStore, useVideoShelfStore } from '@/store';
import { showToast } from 'vant';
import { ref } from 'vue';

const displayStore = useDisplayStore();
const shelfStore = useVideoShelfStore();
const value = ref('');

// 只保留中文，英文，- _
function filter(value: string) {
  return value.replace(/[^\u4E00-\u9FA5\w-]/g, '');
}
function addVideoShelf() {
  const name = value.value.trim();
  if (!name)
    return;
  if (shelfStore.videoShelf.some(item => item.name === name)) {
    showToast('收藏夹已存在');
    return;
  }
  shelfStore.createVideoShelf(name);
  displayStore.showAddVideoShelfDialog = false;
}
</script>

<template>
  <van-dialog
    v-model:show="displayStore.showAddVideoShelfDialog"
    title="新增视频收藏夹"
    show-cancel-button
    @confirm="addVideoShelf"
  >
    <van-cell-group inset class="p-2">
      <van-field
        v-model="value"
        label="名称"
        placeholder="请输入收藏夹名称"
        :formatter="filter"
      />
    </van-cell-group>
  </van-dialog>
</template>

<style scoped lang="less"></style>
