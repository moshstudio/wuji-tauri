<script setup lang="ts">
import type { ComicItem, ComicsList } from '@wuji-tauri/source-extension';
import type { FormItem } from '@/store/sourceCreateStore';
import type { ComicSource } from '@/types';
import { ComicExtension, SourceType } from '@wuji-tauri/source-extension';
import { computed } from 'vue';
import COMIC_TEMPLATE from '@/components/codeEditor/templates/comicTemplate.txt?raw';
import WComicTab from '@/components/tab/WComicTab.vue';
import {
  CreateSourceRunStatus,
  useCreateSourceListRunner,
} from '../useCreateSourceListRunner';

const props = defineProps<{
  content: FormItem<ComicsList>;
  updateResult: (
    type: 'comic',
    page: 'list',
    result: ComicsList | undefined,
    padded: boolean,
  ) => void;
  close: () => void;
  log: (...args: unknown[]) => void;
}>();

const { runStatus, errorMessage, result, load, initLoad }
  = useCreateSourceListRunner<ComicsList>({
    getContent: () => props.content,
    updateResult: (r, p) => props.updateResult('comic', 'list', r, p),
    buildAndFetch: async (findPage, pageNo, type) => {
      const code = COMIC_TEMPLATE.replace(
        '// @METHOD_CONSTRUCTOR',
        findPage('constructor')!.code,
      ).replace('// @METHOD_LIST', findPage('list')!.code);
      const func = new Function('ComicExtension', code);
      const ExtensionClass = func(ComicExtension);
      const cls = new ExtensionClass() as ComicExtension;
      if (cls.baseUrl === undefined) {
        throw new Error('初始化中的baseUrl未定义!');
      }
      cls.log = props.log;
      return (await cls.execGetRecommendComics(pageNo, type)) ?? undefined;
    },
  });

const previewSource = computed<ComicSource>(() => ({
  item: {
    id: props.content.id || 'preview',
    name: props.content.name || 'preview',
    type: SourceType.Comic,
    url: '',
  },
  list: result.value,
}));

function toPage(_source: ComicSource, pageNo?: number, type?: string) {
  return load(pageNo ?? 1, type);
}

function toDetail(_source: ComicSource, _item: ComicItem) {}

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
      <WComicTab
        v-if="result"
        :source="previewSource"
        :to-page="toPage"
        :to-detail="toDetail"
      />
    </div>
  </div>
</template>

<style scoped lang="less"></style>
