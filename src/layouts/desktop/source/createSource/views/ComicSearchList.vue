<script setup lang="ts">
import type { ComicItem, ComicsList } from '@wuji-tauri/source-extension';
import type { FormItem } from '@/store/sourceCreateStore';
import type { ComicSource } from '@/types';
import { ComicExtension, SourceType } from '@wuji-tauri/source-extension';
import { computed, ref } from 'vue';
import COMIC_TEMPLATE from '@/components/codeEditor/templates/comicTemplate.txt?raw';
import SearchField from '@/components/search/SearchField.vue';
import WComicTab from '@/components/tab/WComicTab.vue';
import { CreateSourceRunStatus } from '../useCreateSourceListRunner';
import { useCreateSourceSearchListRunner } from '../useCreateSourceSearchListRunner';

const props = defineProps<{
  content: FormItem<ComicsList>;
  updateResult: (
    type: 'comic',
    page: 'searchList',
    result: ComicsList | undefined,
    padded: boolean,
  ) => void;
  close: () => void;
  log: (...args: unknown[]) => void;
}>();

const keyword = ref('你');
const searchHistories = ref<string[]>([]);

const { runStatus, errorMessage, result, load, initLoad }
  = useCreateSourceSearchListRunner<ComicsList>({
    getContent: () => props.content,
    prereqDialogMessage: '请先执行通过《推荐漫画》',
    updateResult: (r, p) => props.updateResult('comic', 'searchList', r, p),
    buildAndFetch: async (findPage, pageNo) => {
      const code = COMIC_TEMPLATE.replace(
        '// @METHOD_CONSTRUCTOR',
        findPage('constructor')!.code,
      )
        .replace('// @METHOD_LIST', findPage('list')!.code)
        .replace('// @METHOD_SEARCH_LIST', findPage('searchList')!.code);
      const func = new Function('ComicExtension', code);
      const ExtensionClass = func(ComicExtension);
      const cls = new ExtensionClass() as ComicExtension;
      if (cls.baseUrl === undefined) {
        throw new Error('初始化中的baseUrl未定义!');
      }
      cls.log = props.log;
      return (await cls.execSearch(keyword.value, pageNo)) ?? undefined;
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
      <div class="flex items-center justify-center">
        <SearchField
          v-model:value="keyword"
          v-model:search-histories="searchHistories"
          :search="() => initLoad()"
        />
      </div>
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
