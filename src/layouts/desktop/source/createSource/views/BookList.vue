<script setup lang="ts">
import type { BookItem, BooksList } from '@wuji-tauri/source-extension';
import type { FormItem } from '@/store/sourceCreateStore';
import type { BookSource } from '@/types';
import { BookExtension, SourceType } from '@wuji-tauri/source-extension';
import { computed } from 'vue';
import BOOK_TEMPLATE from '@/components/codeEditor/templates/bookTemplate.txt?raw';
import WBookTab from '@/components/tab/WBookTab.vue';
import {
  CreateSourceRunStatus,
  useCreateSourceListRunner,
} from '../useCreateSourceListRunner';

const props = defineProps<{
  content: FormItem<BooksList>;
  updateResult: (
    type: 'book',
    page: 'list',
    result: BooksList | undefined,
    padded: boolean,
  ) => void;
  close: () => void;
  log: (...args: unknown[]) => void;
}>();

const { runStatus, errorMessage, result, load, initLoad }
  = useCreateSourceListRunner<BooksList>({
    getContent: () => props.content,
    updateResult: (r, p) => props.updateResult('book', 'list', r, p),
    buildAndFetch: async (findPage, pageNo, type) => {
      const code = BOOK_TEMPLATE.replace(
        '// @METHOD_CONSTRUCTOR',
        findPage('constructor')!.code,
      ).replace('// @METHOD_LIST', findPage('list')!.code);
      const func = new Function('BookExtension', code);
      const ExtensionClass = func(BookExtension);
      const cls = new ExtensionClass() as BookExtension;
      if (cls.baseUrl === undefined) {
        throw new Error('初始化中的baseUrl未定义!');
      }
      cls.log = props.log;
      return (await cls.getRecommendBooks(pageNo, type)) ?? undefined;
    },
  });

const previewSource = computed<BookSource>(() => ({
  item: {
    id: props.content.id || 'preview',
    name: props.content.name || 'preview',
    type: SourceType.Book,
    url: '',
  },
  list: result.value,
}));

function toPage(_source: BookSource, pageNo?: number, type?: string) {
  return load(pageNo ?? 1, type);
}

function toDetail(_source: BookSource, _item: BookItem) {}

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
      <WBookTab
        v-if="result"
        :source="previewSource"
        :to-page="toPage"
        :to-detail="toDetail"
      />
    </div>
  </div>
</template>

<style scoped lang="less"></style>
