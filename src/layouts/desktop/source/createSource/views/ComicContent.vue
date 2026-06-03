<script setup lang="ts">
import type { ComicContent, ComicItem } from '@wuji-tauri/source-extension';
import type { FormItem } from '@/store/sourceCreateStore';
import { LoadImage } from '@wuji-tauri/components';
import { ComicExtension } from '@wuji-tauri/source-extension';
import { showDialog } from 'vant';
import { ref } from 'vue';
import COMIC_TEMPLATE from '@/components/codeEditor/templates/comicTemplate.txt?raw';
import CreateSourcePreviewShell from '../CreateSourcePreviewShell.vue';
import { CreateSourceRunStatus } from '../useCreateSourceListRunner';

const props = defineProps<{
  content: FormItem<ComicItem>;
  updateResult: (
    type: 'comic',
    page: 'content',
    result: ComicContent | undefined,
    padded: boolean,
  ) => void;
  close: () => void;
  log: (...args: unknown[]) => void;
}>();

const runStatus = ref<CreateSourceRunStatus>(
  CreateSourceRunStatus.not_running,
);
const errorMessage = ref('运行失败');
const result = ref<ComicContent>();

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
      message: '请先执行通过《漫画详情》',
      showCancelButton: false,
    });
    return;
  }
  if (!findPage('detail')?.result?.chapters?.length) {
    showDialog({
      message: '请先保证《漫画详情》执行结果不为空',
      showCancelButton: false,
    });
    return;
  }
  const code = COMIC_TEMPLATE.replace(
    '// @METHOD_CONSTRUCTOR',
    findPage('constructor')!.code,
  )
    .replace('// @METHOD_LIST', findPage('list')!.code)
    .replace('// @METHOD_SEARCH_LIST', findPage('searchList')!.code)
    .replace('// @METHOD_DETAIL', findPage('detail')!.code)
    .replace('// @METHOD_CONTENT', findPage('content')!.code);
  runStatus.value = CreateSourceRunStatus.running;
  try {
    const func = new Function('ComicExtension', code);
    const ExtensionClass = func(ComicExtension);
    const cls = new ExtensionClass() as ComicExtension;
    if (cls.baseUrl === undefined) {
      throw new Error('初始化中的baseUrl未定义!');
    }
    cls.log = props.log;
    const item = findPage('detail')?.result;
    if (!item?.chapters?.length) {
      throw new Error('请先保证《漫画详情》中章节不为空');
    }
    const res = await cls?.execGetContent(item, item.chapters[0]);
    if (!res) {
      throw new Error('获取详情失败! 返回结果为空');
    }
    result.value = res;
    props.updateResult('comic', 'content', result.value, true);
    runStatus.value = CreateSourceRunStatus.success;
  }
  catch (error) {
    errorMessage.value = String(error);
    runStatus.value = CreateSourceRunStatus.error;
    props.updateResult('comic', 'content', result.value, false);
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
      class="comic-content-preview flex flex-col items-center bg-[--van-background-3]"
    >
      <div
        v-for="(item, index) in result?.photos"
        :key="index"
        class="min-h-[50px] w-full text-center leading-[0]"
      >
        <LoadImage
          :src="item"
          :headers="result?.photosHeaders"
          fit="contain"
          :compress="false"
        />
      </div>
    </main>
  </CreateSourcePreviewShell>
</template>
