<script setup lang="ts">
import { MVideoShelfCard } from '@wuji-tauri/components/src';
import MNavBar from '@/components2/header/MNavBar.vue';
import ResponsiveGrid2 from '@/components2/grid/ResponsiveGrid2.vue';
import { useStore, useVideoShelfStore } from '@/store';
import { showPromptDialog } from '@/utils/usePromptDialog';
import { router } from '@/router';

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
const shelfStore = useVideoShelfStore();
</script>

<template>
  <div class="flex h-full w-full flex-col overflow-hidden">
    <MNavBar title="视频收藏"></MNavBar>
    <div class="flex h-[44px] w-full shrink-0 gap-2 px-4 pt-2">
      <van-button
        icon="plus"
        size="small"
        round
        @click="
          () => {
            selecteMode = false;
            showPromptDialog({
              title: '创建视频收藏夹',
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
      :active="activeIndex"
      class="h-full w-full overflow-y-scroll"
    >
      <van-tab
        v-for="shelf in shelfStore.videoShelf"
        :key="shelf.id"
        :title="shelf.name"
      >
        <ResponsiveGrid2 min-width="80" max-width="100">
          <MVideoShelfCard
            v-for="video in shelf.videos"
            :key="video.video.id"
            v-model:selected="video.video.extra!.selected"
            :video="video"
            :source="store.getVideoSource(video.video.sourceId)"
            :select-mode="selecteMode"
            :click="
              () => {
                router.push({
                  name: 'VideoDetail',
                  params: {
                    videoId: video.video.id,
                    sourceId: video.video.sourceId,
                  },
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
