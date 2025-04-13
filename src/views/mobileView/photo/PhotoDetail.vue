<script setup lang="ts">
import type { PhotoDetail, PhotoItem } from '@/extensions/photo';
import type { PropType } from 'vue';
import MoreOptionsSheet from '@/components/actionSheets/MoreOptions.vue';
import LoadImage from '@/components/LoadImage.vue';
import SimplePagination from '@/components/pagination/SimplePagination.vue';
import { usePhotoShelfStore } from '@/store';
import { downloadFile } from '@/utils';
import { showNotify } from 'vant';
import { ref, watch } from 'vue';

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'loadData', pageNo?: number): void;
  (e: 'toPage', pageNo?: number): void;
  (e: 'collect'): void;
  (e: 'addPhotoToShelf', shelfId: string): void;
}>();

const shelfStore = usePhotoShelfStore();

const photoItem = defineModel('photoItem', {
  type: Object as PropType<PhotoItem>,
});
const photoDetail = defineModel('photoDetail', {
  type: Object as PropType<PhotoDetail>,
});
const currentPage = defineModel('currentPage', { type: Number, default: 1 });
const content = defineModel('content', { type: HTMLElement });
const showAddDialog = defineModel('showAddDialog', {
  type: Boolean,
  default: false,
});

const showMoreOptions = ref(false);
const clickedItem = ref<string>();
async function showMoreOptionsSheet(url: string) {
  clickedItem.value = url;
  showMoreOptions.value = true;
}
const bubbleOffset = ref({
  x: document.querySelector('body')!.clientWidth - 130,
  y: document.querySelector('body')!.clientHeight - 100,
});
watch(bubbleOffset, (offset) => {
  const ch = document.querySelector('body')!.clientHeight;
  if (offset.y > ch - 90) {
    offset.y = ch - 90;
  }
});
</script>

<template>
  <div class="relative h-full flex flex-col">
    <van-nav-bar
      :title="photoItem?.title || '图片详情'"
      right-text="收藏"
      left-arrow
      @click-left="() => emit('back')"
      @click-right="() => emit('collect')"
    />
    <main
      ref="content"
      class="photo-detail grow flex flex-col overflow-y-auto bg-[--van-background-3] select-none"
    >
      <template v-for="(item, index) in photoDetail?.photos" :key="index">
        <LoadImage
          :src="item"
          :headers="photoDetail?.photosHeaders"
          fit="contain"
          lazy-load
          @click="() => showMoreOptionsSheet(item)"
        />
      </template>
      <van-floating-bubble
        v-if="photoDetail?.totalPage && photoDetail?.totalPage > 1"
        v-model:offset="bubbleOffset"
        axis="xy"
        magnetic="x"
        :gap="6"
        teleport=".photo-detail"
      >
        <SimplePagination
          v-model="currentPage"
          :page-count="Number(photoDetail.totalPage)"
          @change="(pageNo) => emit('toPage', pageNo)"
        />
      </van-floating-bubble>
    </main>
  </div>
  <van-dialog
    v-model:show="showAddDialog"
    title="选择收藏夹"
    :show-confirm-button="false"
    teleport="body"
    show-cancel-button
  >
    <van-cell-group>
      <van-cell
        v-for="item in shelfStore.photoShelf"
        :key="item.id"
        :title="item.name"
        center
        clickable
        @click="() => emit('addPhotoToShelf', item.id)"
      />
    </van-cell-group>
  </van-dialog>
  <MoreOptionsSheet
    v-model="showMoreOptions"
    :actions="[
      {
        name: '保存图片',
        color: '#1989fa',
        callback: async () => {
          if (!clickedItem) return;
          showMoreOptions = false;
          const res = await downloadFile(clickedItem, {
            headers: photoDetail?.photosHeaders || undefined,
            suffix: 'png',
          });
          if (!res) {
            showNotify('保存失败');
          }
          else {
            showNotify({
              message: '保存成功',
              type: 'success',
              duration: 5000,
            });
          }
        },
      },
    ]"
  />
</template>

<style scoped lang="less">
:deep(.van-floating-bubble) {
  height: 40px;
  width: 120px;
  border: none;
  border-radius: 4px;
  background-color: rgb(from var(--van-background) r g b / 50%);
}
:deep(.van-floating-bubble:active) {
  opacity: 1;
}
</style>
