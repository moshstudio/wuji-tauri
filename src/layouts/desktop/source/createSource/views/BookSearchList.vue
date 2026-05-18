<script setup lang="ts">
import type { BookItem, BooksList } from '@wuji-tauri/source-extension';
import type { FormItem } from '@/store/sourceCreateStore';
import type { BookSource } from '@/types';
import { BookExtension, SourceType } from '@wuji-tauri/source-extension';
import { computed, ref } from 'vue';
import BOOK_TEMPLATE from '@/components/codeEditor/templates/bookTemplate.txt?raw';
import SearchField from '@/components/search/SearchField.vue';
import WBookTab from '@/components/tab/WBookTab.vue';
import { CreateSourceRunStatus } from '../useCreateSourceListRunner';
import { useCreateSourceSearchListRunner } from '../useCreateSourceSearchListRunner';

const props = defineProps<{
  content: FormItem<BooksList>;
  updateResult: (
    type: 'book',
    page: 'searchList',
    result: BooksList | undefined,
    padded: boolean,
  ) => void;
  close: () => void;
  log: (...args: unknown[]) => void;
}>();

const keyword = ref('你');
const searchHistories = ref<string[]>([]);

const { runStatus, errorMessage, result, load, initLoad }
  = useCreateSourceSearchListRunner<BooksList>({
    getContent: () => props.content,
    prereqDialogMessage: '请先执行通过《推荐书籍》',
    updateResult: (r, p) => props.updateResult('book', 'searchList', r, p),
    buildAndFetch: async (findPage, pageNo) => {
      const code = BOOK_TEMPLATE.replace(
        '// @METHOD_CONSTRUCTOR',
        findPage('constructor')!.code,
      )
        .replace('// @METHOD_LIST', findPage('list')!.code)
        .replace('// @METHOD_SEARCH_LIST', findPage('searchList')!.code);
      const func = new Function('BookExtension', code);
      const ExtensionClass = func(BookExtension);
      const cls = new ExtensionClass() as BookExtension;
      if (cls.baseUrl === undefined) {
        throw new Error('初始化中的baseUrl未定义!');
      }
      cls.log = props.log;
      return (await cls.execSearch(keyword.value, pageNo)) ?? undefined;
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
      <div class="flex items-center justify-center">
        <SearchField
          v-model:value="keyword"
          v-model:search-histories="searchHistories"
          :search="() => initLoad()"
        />
      </div>
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
