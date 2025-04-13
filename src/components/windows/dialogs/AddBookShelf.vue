<script setup lang="ts">
import { useBookShelfStore, useDisplayStore } from '@/store';
import { showToast } from 'vant';
import { ref } from 'vue';

const displayStore = useDisplayStore();
const shelfStore = useBookShelfStore();
const value = ref('');

// 只保留中文，英文，- _
function filter(value: string) {
  return value.replace(/[^\u4E00-\u9FA5\w-]/g, '');
}
function addBookShelf() {
  const name = value.value.trim();
  if (!name)
    return;
  if (shelfStore.bookShelf.some(item => item.name === name)) {
    showToast('书架已存在');
    return;
  }
  shelfStore.createBookShelf(name);
  displayStore.showAddBookShelfDialog = false;
}
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
