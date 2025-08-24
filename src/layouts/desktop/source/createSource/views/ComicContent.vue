<script setup lang="ts">
import {
  ComicItem,
  ComicExtension,
  ComicContent,
} from '@wuji-tauri/source-extension';
import { showDialog } from 'vant';
import COMIC_TEMPLATE from '@/components/codeEditor/templates/comicTemplate.txt?raw';
import { ref } from 'vue';
import _ from 'lodash';
import LoadImage from '@wuji-tauri/components/src/components/LoadImage.vue';

enum RunStatus {
  not_running = 'not_running',
  running = 'running',
  success = 'success',
  error = 'error',
}

const runStatus = ref<RunStatus>(RunStatus.not_running);
const errorMessage = ref('运行失败');
const result = ref<ComicContent>();

const props = defineProps<{
  content: {
    type: string;
    chineseName: string;
    id: string;
    name: string;
    version: string;
    pages: {
      type: string;
      chineseName: string;
      code: string;
      passed: boolean;
      result: ComicItem | undefined;
    }[];
  };
  updateResult: (
    type: 'comic',
    page: 'content',
    result: ComicContent | undefined,
    padded: boolean,
  ) => void;
  close: () => void;
  log: (...args: any[]) => void;
}>();

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
  const code = COMIC_TEMPLATE.replace(
    'constructor() {}',
    findPage('constructor')!.code,
  )
    .replace(
      'async getRecommendComics(pageNo, type) {}',
      findPage('list')!.code,
    )
    .replace('async search(keyword, pageNo) {}', findPage('searchList')!.code)
    .replace('async getComicDetail(item, pageNo) {}', findPage('detail')!.code)
    .replace('async getContent(item, chapter) {}', findPage('content')!.code);
  runStatus.value = RunStatus.running;
  try {
    const func = new Function('ComicExtension', code);
    const extensionclass = func(ComicExtension);
    const cls = new extensionclass() as ComicExtension;
    if (!cls.baseUrl) {
      throw new Error('初始化中的baseUrl未定义!');
    }
    cls.log = props.log;
    let item = findPage('detail')?.result;
    if (!item?.chapters?.length) {
      throw new Error('请先保证《书籍详情》中章节不为空');
    }
    const res = await cls?.execGetContent(item, item.chapters[0]);
    if (!res) {
      throw new Error('获取详情失败! 返回结果为空');
    }
    result.value = res;
    props.updateResult('comic', 'content', result.value, true);
    runStatus.value = RunStatus.success;
  } catch (error) {
    errorMessage.value = String(error);
    runStatus.value = RunStatus.error;
    props.updateResult('comic', 'content', result.value, false);
  }
}

const findPage = (name: string) => {
  return props.content.pages.find((page) => page.type === name);
};

defineExpose({
  initLoad,
});
</script>

<template>
  <div>
    <div v-if="runStatus === RunStatus.not_running">未运行</div>
    <div
      v-else-if="runStatus === RunStatus.running"
      class="flex items-center justify-center"
    >
      <van-loading />
    </div>
    <div v-else-if="runStatus === RunStatus.error" class="text-red-500">
      {{ errorMessage }}
    </div>
    <div v-else class="flex flex-col overflow-auto">
      <div
        v-for="(item, index) in result?.photos"
        :key="index"
        class="min-h-[50px] w-full text-center leading-[0]"
      >
        <LoadImage :src="item" :headers="result?.photosHeaders" fit="contain" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="less"></style>
