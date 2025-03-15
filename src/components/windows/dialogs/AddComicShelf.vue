<script setup lang="ts">
import { ref } from 'vue';
import { useDisplayStore, useComicShelfStore } from '@/store';
import { showToast } from 'vant';

const displayStore = useDisplayStore();
const shelfStore = useComicShelfStore();
const value = ref('');

// 只保留中文，英文，- _
const filter = (value: string) =>
  value.replace(/[^\u4e00-\u9fa5a-z0-9A-Z-_]/g, '');
const addComicShelf = () => {
  const name = value.value.trim();
  if (!name) return;
  if (shelfStore.comicShelf.some((item) => item.name === name)) {
    showToast('书架已存在');
    return;
  }
  shelfStore.createComicShelf(name);
  displayStore.showAddComicShelfDialog = false;
};
</script>

<template>
  <van-dialog
    v-model:show="displayStore.showAddComicShelfDialog"
    title="新增书架"
    show-cancel-button
    @confirm="addComicShelf"
  >
    <van-cell-group inset class="p-2">
      <van-field
        v-model="value"
        label="名称"
        placeholder="请输入书架名称"
        :formatter="filter"
      />
    </van-cell-group>
  </van-dialog>
</template>

<style scoped lang="less"></style>
