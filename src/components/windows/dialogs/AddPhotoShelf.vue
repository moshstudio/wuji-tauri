<script setup lang="ts">
import { ref } from 'vue';
import { useDisplayStore, usePhotoShelfStore } from '@/store';
import { showToast } from 'vant';

const displayStore = useDisplayStore();
const shelfStore = usePhotoShelfStore();
const value = ref('');

// 只保留中文，英文，- _
const filter = (value: string) =>
  value.replace(/[^\u4e00-\u9fa5a-z0-9A-Z-_]/g, '');
const addPhotoShelf = () => {
  const name = value.value.trim();
  if (!name) return;
  if (shelfStore.photoShelf.some((item) => item.name === name)) {
    showToast('收藏夹已存在');
    return;
  }
  shelfStore.createShelf(name);
  displayStore.showAddPhotoShelfDialog = false;
};
</script>

<template>
  <van-dialog
    v-model:show="displayStore.showAddPhotoShelfDialog"
    title="新增图片收藏夹"
    show-cancel-button
    @confirm="addPhotoShelf"
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
