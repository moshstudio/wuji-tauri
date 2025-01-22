<script setup lang="ts">
import { useDisplayStore, useBookShelfStore } from '@/store';
import { showToast } from 'vant';

const displayStore = useDisplayStore();
const shelfStore = useBookShelfStore();

const removeBookShelf = (name: string) => {
  if (!name) return;
  if (shelfStore.bookShelf.length === 1) {
    showToast('书架至少需要一个');
    return;
  }
  shelfStore.removeBookShelf(name);
  showToast('书架删除成功');
};
</script>

<template>
  <van-dialog
    v-model:show="displayStore.showRemoveBookShelfDialog"
    title="删除书架"
  >
    <van-cell-group inset>
      <van-cell
        v-for="shelf in shelfStore.bookShelf"
        :key="shelf.id"
        :title="shelf.name"
        :label="`共有 ${shelf.books.length} 本书`"
        center
      >
        <template #value>
          <van-button
            icon="delete"
            size="small"
            type="danger"
            round
            @click="removeBookShelf(shelf.id)"
          >
          </van-button>
        </template>
      </van-cell>
    </van-cell-group>
  </van-dialog>
</template>

<style scoped lang="less"></style>
