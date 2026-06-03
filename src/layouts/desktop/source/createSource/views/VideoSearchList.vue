<script setup lang="ts">
import type { VideoItem, VideosList } from '@wuji-tauri/source-extension';
import type { FormItem } from '@/store/sourceCreateStore';
import type { VideoSource } from '@/types';
import {
  CmsVideoExtension,
  SourceType,
  VideoExtension,
} from '@wuji-tauri/source-extension';
import { computed, ref } from 'vue';
import CMS_VIDEO_TEMPLATE from '@/components/codeEditor/templates/cmsVideoTemplate.txt?raw';
import VIDEO_TEMPLATE from '@/components/codeEditor/templates/videoTemplate.txt?raw';
import SearchField from '@/components/search/SearchField.vue';
import WVideoTab from '@/components/tab/WVideoTab.vue';
import { CreateSourceRunStatus } from '../useCreateSourceListRunner';
import { useCreateSourceSearchListRunner } from '../useCreateSourceSearchListRunner';

const props = defineProps<{
  content: FormItem<VideosList>;
  updateResult: (
    type: 'video',
    page: 'searchList',
    result: VideosList | undefined,
    padded: boolean,
  ) => void;
  close: () => void;
  log: (...args: unknown[]) => void;
}>();

const keyword = ref('你');
const searchHistories = ref<string[]>([]);

const { runStatus, errorMessage, result, load, initLoad }
  = useCreateSourceSearchListRunner<VideosList>({
    getContent: () => props.content,
    prereqDialogMessage: '请先执行通过《推荐影视》',
    updateResult: (r, p) => props.updateResult('video', 'searchList', r, p),
    buildAndFetch: async (findPage, pageNo, type) => {
      const template
        = props.content.mode === 'cms' ? CMS_VIDEO_TEMPLATE : VIDEO_TEMPLATE;
      const code = template
        .replace('// @METHOD_CONSTRUCTOR', findPage('constructor')!.code)
        .replace('// @METHOD_LIST', findPage('list')!.code)
        .replace('// @METHOD_SEARCH_LIST', findPage('searchList')!.code);
      const func = new Function('VideoExtension', 'CmsVideoExtension', code);
      const ExtensionClass = func(VideoExtension, CmsVideoExtension);
      const cls = new ExtensionClass() as VideoExtension;
      if (cls.baseUrl === undefined) {
        throw new Error('初始化中的baseUrl未定义!');
      }
      cls.log = props.log;
      if (type) {
        return (await cls.execGetRecommendVideos(pageNo, type)) ?? undefined;
      }
      return (await cls.execSearch(keyword.value, pageNo)) ?? undefined;
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
      <div class="flex items-center justify-center">
        <SearchField
          v-model:value="keyword"
          v-model:search-histories="searchHistories"
          :search="() => initLoad()"
        />
      </div>
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
