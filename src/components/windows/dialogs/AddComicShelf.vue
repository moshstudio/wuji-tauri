<script setup lang="ts">
import { useComicShelfStore, useDisplayStore } from '@/store';
import { showToast } from 'vant';
import { ref } from 'vue';

const displayStore = useDisplayStore();
const shelfStore = useComicShelfStore();
const value = ref('');

// 只保留中文，英文，- _
function filter(value: string) {
  return value.replace(/[^\u4E00-\u9FA5\w-]/g, '');
}
function addComicShelf() {
  const name = value.value.trim();
  if (!name)
    return;
  if (shelfStore.comicShelf.some(item => item.name === name)) {
    showToast('书架已存在');
    return;
  }
  shelfStore.createComicShelf(name);
  displayStore.showAddComicShelfDialog = false;
}
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
