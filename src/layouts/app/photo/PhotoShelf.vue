<script setup lang="ts">
import { MPhotoShelfCard } from '@wuji-tauri/components/src';
import ResponsiveGrid2 from '@/components/grid/ResponsiveGrid2.vue';
import MNavBar from '@/components/header/MNavBar.vue';
import { router } from '@/router';
import { usePhotoShelfStore, useStore } from '@/store';
import { showPromptDialog } from '@/utils/usePromptDialog';

defineProps<{
  createShelf: (name: string) => void;
  deleteShelf: () => void;
  deleteSelected: () => void;
}>();
const activeIndex = defineModel<number>('activeIndex', {
  required: true,
});
const selecteMode = defineModel<boolean>('selecteMode', {
  default: false,
});
const store = useStore();
const shelfStore = usePhotoShelfStore();
</script>

<template>
  <div class="flex h-full w-full flex-col overflow-hidden">
    <MNavBar title="图片收藏" />
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
      v-model:active="activeIndex"
      class="h-full w-full overflow-y-scroll"
    >
      <van-tab
        v-for="shelf in shelfStore.photoShelf"
        :key="shelf.id"
        :title="shelf.name"
      >
        <ResponsiveGrid2 min-width="80" max-width="100">
          <MPhotoShelfCard
            v-for="photo in shelf.photos"
            :key="shelf.id + photo.id"
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
