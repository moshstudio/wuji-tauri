<script setup lang="ts">
import { ref } from 'vue';
import { useDisplayStore, useVideoShelfStore } from '@/store';
import { showToast } from 'vant';

const displayStore = useDisplayStore();
const shelfStore = useVideoShelfStore();
const value = ref('');

// 只保留中文，英文，- _
const filter = (value: string) =>
  value.replace(/[^\u4e00-\u9fa5a-z0-9A-Z-_]/g, '');
const addVideoShelf = () => {
  const name = value.value.trim();
  if (!name) return;
  if (shelfStore.videoShelf.some((item) => item.name === name)) {
    showToast('收藏夹已存在');
    return;
  }
  shelfStore.createVideoShelf(name);
  displayStore.showAddVideoShelfDialog = false;
};
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
