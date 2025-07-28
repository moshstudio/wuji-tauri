<script setup lang="ts">
import { WPhotoShelfCard } from '@wuji-tauri/components/src';
import ResponsiveGrid2 from '@/components2/grid/ResponsiveGrid2.vue';
import WNavbar from '@/components2/header/WNavbar.vue';
import { useDisplayStore, usePhotoShelfStore, useStore } from '@/store';
import { storeToRefs } from 'pinia';
import { router } from '@/router';
import { showPromptDialog } from '@/utils/usePromptDialog';

const activeIndex = defineModel<number>('activeIndex', {
  required: true,
});
const selecteMode = defineModel<boolean>('selecteMode', {
  default: false,
});
defineProps<{
  createShelf: (name: string) => void;
  deleteShelf: () => void;
  deleteSelected: () => void;
}>();

const store = useStore();
const displayStore = useDisplayStore();
const shelfStore = usePhotoShelfStore();
const { photoShelf } = storeToRefs(shelfStore);
</script>

<template>
  <div
    class="w-ull sticky bottom-0 left-0 right-0 top-0 flex h-full flex-col overflow-hidden"
  >
    <WNavbar title="图片收藏"></WNavbar>
    <div class="flex h-[44px] w-full shrink-0 gap-2 px-4 pt-2">
      <van-button
        icon="plus"
        size="small"
        round
        @click="
          () => {
            selecteMode = false;
            showPromptDialog({
              title: '创建图片收藏夹',
              message: '请输入收藏夹名称',
              placeholder: '请输入收藏夹名称',
              defaultValue: '',
              confirmText: '创建',
              cancelText: '取消',
            }).then((name) => {
              if (name) {
                createShelf(name);
              }
            });
          }
        "
      />
      <van-button
        icon="delete-o"
        size="small"
        round
        @click="
          () => {
            selecteMode = false;
            deleteShelf();
          }
        "
      />
      <van-button
        icon="edit"
        size="small"
        round
        @click="() => (selecteMode = !selecteMode)"
      />
      <van-button
        v-if="selecteMode"
        size="small"
        type="danger"
        round
        @click="() => deleteSelected()"
      >
        删除所选
      </van-button>
    </div>
    <van-tabs
      shrink
      animated
      sticky
      :offset-top="90"
      :active="activeIndex"
      class="h-full w-full overflow-y-scroll"
    >
      <van-tab v-for="shelf in photoShelf" :key="shelf.id" :title="shelf.name">
        <ResponsiveGrid2
          min-width="80"
          max-width="100"
          v-if="shelf.photos.length"
        >
          <WPhotoShelfCard
            v-for="photo in shelf.photos"
            :key="photo.id"
            v-model:selected="photo.extra.selected"
            :item="photo"
            :selecte-mode="selecteMode"
            :source="store.getPhotoSource(photo.sourceId)"
            @click="
              (item) => {
                router.push({
                  name: 'PhotoDetail',
                  params: { id: item.id, sourceId: item.sourceId },
                });
              }
            "
          />
        </ResponsiveGrid2>
      </van-tab>
    </van-tabs>
  </div>
</template>

<style scoped lang="less">
:deep(.van-card__thumb) {
  width: 80px;
  height: 100px;
}
</style>
