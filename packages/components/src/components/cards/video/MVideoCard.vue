<script setup lang="ts">
import type { VideoItem } from '@wuji-tauri/source-extension';
import { castArray } from 'lodash';
import { computed } from 'vue';
import LoadImage from '../../LoadImage.vue';

const props = defineProps<{
  video: VideoItem;
  click: (video: VideoItem) => void;
}>();

const hasCover = computed(() => !!props.video.cover?.trim());

const tagsText = computed(() => {
  return castArray(props.video.tags).join(',');
});
</script>

<template>
  <div
    v-tooltip="video.title"
    class="active-bg-scale relative flex flex-col rounded-lg"
    @click="() => click(video)"
  >
    <!-- 有封面 URL 时使用 LoadImage 加载 -->
    <LoadImage
      v-if="hasCover"
      fit="cover"
      :src="video.cover!"
      :headers="video.coverHeaders || undefined"
      class="video-cover w-full"
      lazy-load
    >
      <!-- 加载中占位 -->
      <template #loading>
        <div class="video-placeholder">
          <van-icon name="video-o" size="36" class="placeholder-icon" />
        </div>
      </template>
      <!-- 加载失败占位 -->
      <template #error>
        <div class="video-placeholder">
          <van-icon name="video-o" size="36" class="placeholder-icon" />
        </div>
      </template>
    </LoadImage>

    <!-- 无封面 URL 时直接显示默认占位 -->
    <div v-else class="video-cover video-placeholder w-full">
      <van-icon name="video-o" size="36" class="placeholder-icon" />
    </div>

    <p
      v-if="video.title"
      class="flex-shrink-0 truncate py-1 text-center text-xs"
    >
      {{ video.title }}
    </p>
    <p
      v-if="video.tags"
      class="absolute bottom-[22px] left-0 max-w-full truncate rounded bg-gray-800/60 p-1 text-xs text-gray-200"
    >
      {{ tagsText }}
    </p>
  </div>
</template>

<style scoped lang="less">
.video-cover {
  aspect-ratio: 3 / 4;
  border-radius: v-bind('video.title ? "0.5rem 0.5rem 0 0" : "0.5rem"');
  overflow: hidden;
}

.video-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: var(--van-gray-2);
  border-radius: inherit;

  .placeholder-icon {
    color: var(--van-gray-5);
  }
}

// dark 主题适配
.van-theme-dark & {
  .video-placeholder {
    background: var(--van-gray-7);

    .placeholder-icon {
      color: var(--van-gray-5);
    }
  }
}

:deep(.van-image) {
  width: 100%;
  height: 100%;
}

:deep(.van-image__img) {
  border-radius: v-bind('video.title ? "0.5rem 0.5rem 0 0" : "0.5rem"');
}
</style>
