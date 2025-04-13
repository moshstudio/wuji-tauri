<script setup lang="ts">
import { useComicShelfStore, useDisplayStore } from '@/store';
import { showToast } from 'vant';

const displayStore = useDisplayStore();
const shelfStore = useComicShelfStore();

function removeComicShelf(name: string) {
  if (!name)
    return;
  if (shelfStore.comicShelf.length === 1) {
    showToast('书架至少需要一个');
    return;
  }
  shelfStore.removeComicShelf(name);
  showToast('书架删除成功');
}
</script>

<template>
  <van-dialog
    v-model:show="displayStore.showRemoveComicShelfDialog"
    title="删除书架"
  >
    <van-cell-group inset>
      <van-cell
        v-for="shelf in shelfStore.comicShelf"
        :key="shelf.id"
        :title="shelf.name"
        :label="`共有 ${shelf.comics.length} 本书`"
        center
      >
        <template #value>
          <van-button
            icon="delete"
            size="small"
            type="danger"
            round
            @click="removeComicShelf(shelf.id)"
          />
        </template>
      </van-cell>
    </van-cell-group>
  </van-dialog>
</template>

<style scoped lang="less"></style>
