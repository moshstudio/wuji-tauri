<script setup lang="ts">
import { PhotoDetail, PhotoItem } from '@/extensions/photo';
import { PropType, ref } from 'vue';
import { usePhotoShelfStore } from '@/store';
import LoadImage from '@/components/LoadImage.vue';
import SimplePagination from '@/components/pagination/SimplePagination.vue';
import MoreOptionsSheet from '@/components/actionSheets/MoreOptions.vue';
import { downloadFile } from '@/utils';
import { showNotify } from 'vant';

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

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'loadData', pageNo?: number): void;
  (e: 'toPage', pageNo?: number): void;
  (e: 'collect'): void;
  (e: 'addPhotoToShelf', shelfId: string): void;
}>();

const showMoreOptions = ref(false);
const clickedItem = ref<string>();
const showMoreOptionsSheet = async (url: string) => {
  clickedItem.value = url;
  showMoreOptions.value = true;
};
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
      class="grow flex flex-col overflow-y-auto p-2 bg-[--van-background-3] select-none"
    >
      <div
        class="w-full text-center"
        v-for="(item, index) in photoDetail?.photos"
        :key="index"
      >
        <LoadImage
          :src="item"
          :headers="photoDetail?.photosHeaders"
          fit="contain"
          lazy-load
          class="rounded-lg max-w-[100%] max-h-[100%]"
          @click="() => showMoreOptionsSheet(item)"
        />
      </div>
    </main>
    <div
      v-if="photoDetail?.totalPage && photoDetail?.totalPage > 1"
      class="flex items-center justify-center w-full py-1 bg-[--van-background-2]"
    >
      <SimplePagination
        v-model="currentPage"
        :page-count="Number(photoDetail.totalPage)"
        @change="(pageNo) => emit('toPage', pageNo)"
      >
      </SimplePagination>
    </div>
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
      >
      </van-cell>
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
          } else {
            showNotify({
              message: '保存成功',
              type: 'success',
              duration: 5000,
            });
          }
        },
      },
    ]"
  ></MoreOptionsSheet>
</template>

<style scoped lang="less"></style>
