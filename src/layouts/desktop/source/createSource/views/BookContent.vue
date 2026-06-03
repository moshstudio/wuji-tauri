<script setup lang="ts">
import type { BookItem } from '@wuji-tauri/source-extension';
import type { FormItem } from '@/store/sourceCreateStore';
import { BookExtension } from '@wuji-tauri/source-extension';
import { showDialog } from 'vant';
import { computed, ref } from 'vue';
import BOOK_TEMPLATE from '@/components/codeEditor/templates/bookTemplate.txt?raw';
import CreateSourcePreviewShell from '../CreateSourcePreviewShell.vue';
import { CreateSourceRunStatus } from '../useCreateSourceListRunner';

const props = defineProps<{
  content: FormItem<BookItem>;
  updateResult: (
    type: 'book',
    page: 'content',
    result: string | undefined,
    padded: boolean,
  ) => void;
  close: () => void;
  log: (...args: unknown[]) => void;
}>();

const runStatus = ref<CreateSourceRunStatus>(
  CreateSourceRunStatus.not_running,
);
const errorMessage = ref('运行失败');
const result = ref<string>();

const paragraphs = computed(() =>
  result.value?.split('\n').filter(line => line.trim()),
);

async function initLoad() {
  result.value = undefined;
  return await load();
}

async function load() {
  if (!findPage('constructor')?.code) {
    showDialog({
      message: '《初始化》code未定义!',
      showCancelButton: false,
    });
    return;
  }
  if (!findPage('detail')?.passed) {
    showDialog({
      message: '请先执行通过《书籍详情》',
      showCancelButton: false,
    });
    return;
  }
  if (!findPage('detail')?.result?.chapters?.length) {
    showDialog({
      message: '请先保证《书籍详情》执行结果不为空',
      showCancelButton: false,
    });
    return;
  }
  const code = BOOK_TEMPLATE.replace(
    '// @METHOD_CONSTRUCTOR',
    findPage('constructor')!.code,
  )
    .replace('// @METHOD_LIST', findPage('list')!.code)
    .replace('// @METHOD_SEARCH_LIST', findPage('searchList')!.code)
    .replace('// @METHOD_DETAIL', findPage('detail')!.code)
    .replace('// @METHOD_CONTENT', findPage('content')!.code);
  runStatus.value = CreateSourceRunStatus.running;
  try {
    const func = new Function('BookExtension', code);
    const ExtensionClass = func(BookExtension);
    const cls = new ExtensionClass() as BookExtension;
    if (cls.baseUrl === undefined) {
      throw new Error('初始化中的baseUrl未定义!');
    }
    cls.log = props.log;
    const item = findPage('detail')?.result;
    if (!item?.chapters?.length) {
      throw new Error('请先保证《书籍详情》中章节不为空');
    }
    const res = await cls?.execGetContent(item, item.chapters[0]);
    if (!res) {
      throw new Error('获取详情失败! 返回结果为空');
    }
    result.value = res;
    props.updateResult('book', 'content', result.value, true);
    runStatus.value = CreateSourceRunStatus.success;
  }
  catch (error) {
    errorMessage.value = String(error);
    runStatus.value = CreateSourceRunStatus.error;
    props.updateResult('book', 'content', result.value, false);
  }
}

function findPage(name: string) {
  return props.content.pages.find(page => page.type === name);
}

defineExpose({
  initLoad,
});
</script>

<template>
  <CreateSourcePreviewShell
    :run-status="runStatus"
    :error-message="errorMessage"
  >
    <main
      class="book-content-preview flex flex-col gap-3 p-3 text-[--van-text-color]"
    >
      <p
        v-for="(line, index) in paragraphs"
        :key="index"
        class="text-justify text-sm leading-relaxed"
      >
        {{ line }}
      </p>
    </main>
  </CreateSourcePreviewShell>
</template>
