<script setup lang="ts">
import type { VideoItem, VideosList } from '@wuji-tauri/source-extension';
import type { FormItem } from '@/store/sourceCreateStore';
import type { VideoSource } from '@/types';
import {
  CmsVideoExtension,
  SourceType,
  VideoExtension,
} from '@wuji-tauri/source-extension';
import { computed } from 'vue';
import CMS_VIDEO_TEMPLATE from '@/components/codeEditor/templates/cmsVideoTemplate.txt?raw';
import VIDEO_TEMPLATE from '@/components/codeEditor/templates/videoTemplate.txt?raw';
import WVideoTab from '@/components/tab/WVideoTab.vue';
import {
  CreateSourceRunStatus,
  useCreateSourceListRunner,
} from '../useCreateSourceListRunner';

const props = defineProps<{
  content: FormItem<VideosList>;
  updateResult: (
    type: 'video',
    page: 'list',
    result: VideosList | undefined,
    padded: boolean,
  ) => void;
  close: () => void;
  log: (...args: unknown[]) => void;
}>();

const { runStatus, errorMessage, result, load, initLoad }
  = useCreateSourceListRunner<VideosList>({
    getContent: () => props.content,
    updateResult: (r, p) => props.updateResult('video', 'list', r, p),
    buildAndFetch: async (findPage, pageNo, type) => {
      const template
        = props.content.mode === 'cms' ? CMS_VIDEO_TEMPLATE : VIDEO_TEMPLATE;
      const code = template
        .replace('// @METHOD_CONSTRUCTOR', findPage('constructor')!.code)
        .replace('// @METHOD_LIST', findPage('list')!.code);
      const func = new Function('VideoExtension', 'CmsVideoExtension', code);
      const ExtensionClass = func(VideoExtension, CmsVideoExtension);
      const cls = new ExtensionClass() as VideoExtension;
      if (cls.baseUrl === undefined) {
        throw new Error('初始化中的baseUrl未定义!');
      }
      cls.log = props.log;
      return (await cls.execGetRecommendVideos(pageNo, type)) ?? undefined;
    },
  });

const previewSource = computed<VideoSource>(() => ({
  item: {
    id: props.content.id || 'preview',
    name: props.content.name || 'preview',
    type: SourceType.Video,
    url: '',
  },
  list: result.value,
}));

function toPage(_source: VideoSource, pageNo?: number, type?: string) {
  return load(pageNo ?? 1, type);
}

function toDetail(_source: VideoSource, _item: VideoItem) {}

defineExpose({
  initLoad,
});
</script>

<template>
  <div>
    <div v-if="runStatus === CreateSourceRunStatus.not_running">
      未运行
    </div>
    <div
      v-else-if="runStatus === CreateSourceRunStatus.running"
      class="flex items-center justify-center"
    >
      <van-loading />
    </div>
    <div v-else-if="runStatus === CreateSourceRunStatus.error" class="text-red-500">
      {{ errorMessage }}
    </div>
    <div
      v-show="runStatus === CreateSourceRunStatus.success"
      class="flex flex-col overflow-auto"
    >
      <WVideoTab
        v-if="result"
        :source="previewSource"
        :to-page="toPage"
        :to-detail="toDetail"
      />
    </div>
  </div>
</template>

<style scoped lang="less"></style>
