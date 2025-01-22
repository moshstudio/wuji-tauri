<script setup lang="ts">
import { ref } from 'vue';
import { useDisplayStore, useBookShelfStore } from '@/store';
import { showToast } from 'vant';

const displayStore = useDisplayStore();
const shelfStore = useBookShelfStore();
const value = ref('');

// 只保留中文，英文，- _
const filter = (value: string) =>
  value.replace(/[^\u4e00-\u9fa5a-z0-9A-Z-_]/g, '');
const addBookShelf = () => {
  const name = value.value.trim();
  if (!name) return;
  if (shelfStore.bookShelf.some((item) => item.name === name)) {
    showToast('书架已存在');
    return;
  }
  shelfStore.createBookShelf(name);
  displayStore.showAddBookShelfDialog = false;
};
</script>

<template>
  <van-dialog
    v-model:show="displayStore.showAddBookShelfDialog"
    title="新增书架"
    show-cancel-button
    @confirm="addBookShelf"
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
