<script setup lang="ts">
const show = defineModel<boolean>('show', { required: true });
const searchText = defineModel<string>('searchText', { required: true });
defineProps<{
  playingResourceId: string | undefined;
  playingEpisodeId: string | undefined;
  filterVideoItems:
    | {
        resourceTitle: string;
        resourceId: string;
        episodeTitle: string;
        episodeId: string;
      }[]
    | undefined;
  onPlaySearchedVideo: (resourceId: string, episodeId: string) => void;
}>();
</script>

<template>
  <van-dialog
    v-model:show="show"
    title="搜索"
    width="85%"
    z-index="10001"
    :show-confirm-button="false"
    :show-cancel-button="true"
    close-on-click-overlay
    destroy-on-close
    head
    class="max-h-[88vh]"
  >
    <div class="flex w-full px-2">
      <van-field
        v-model="searchText"
        placeholder="请输入关键词搜索"
        autofocus
        clearable
        autocomplete="off"
        class="w-full"
      />
    </div>
    <div
      class="video-quick-search flex max-h-[60vh] w-full flex-col items-center overflow-y-auto p-4"
    >
      <ResponsiveGrid2 min-width="100" max-width="120">
        <van-button
          v-for="item in filterVideoItems"
          :key="item.resourceId + item.episodeId"
          :type="
            item.resourceId === playingResourceId &&
            item.episodeId === playingEpisodeId
              ? 'primary'
              : 'default'
          "
          size="small"
          block
          style="margin: 4px 0"
          @click="
            () => {
              onPlaySearchedVideo(item.resourceId, item.episodeId);
            }
          "
        >
          <p class="truncate">{{ item.resourceTitle }}</p>
          <p class="truncate">{{ item.episodeTitle }}</p>
        </van-button>

        <!-- 无结果提示 -->
        <div
          v-if="!filterVideoItems?.length"
          class="flex items-center justify-center text-xs text-[var(--van-text-color-2)]"
        >
          无匹配结果
        </div>
      </ResponsiveGrid2>
    </div>
  </van-dialog>
</template>

<style scoped lang="less">
:deep(.van-button__text) {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  justify-items: center;
}
</style>
