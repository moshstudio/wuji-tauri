<script setup lang="ts">
import {
  PhotoDetail,
  PhotoExtension,
  PhotoList,
} from '@wuji-tauri/source-extension';
import { showDialog, showNotify } from 'vant';
import PHOTO_TEMPLATE from '@/components/codeEditor/templates/photoTemplate.txt?raw';
import { ref } from 'vue';
import MPagination from '@/components/pagination/MPagination.vue';
import { LoadImage } from '@wuji-tauri/components/src';

enum RunStatus {
  not_running = 'not_running',
  running = 'running',
  success = 'success',
  error = 'error',
}

const runStatus = ref<RunStatus>(RunStatus.not_running);
const errorMessage = ref('运行失败');
const result = ref<PhotoDetail>();

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
      result: PhotoList | undefined;
    }[];
  };
  updateResult: (
    type: 'photo',
    page: 'detail',
    result: PhotoDetail | undefined,
    padded: boolean,
  ) => void;
  close: () => void;
  log: (...args: any[]) => void;
}>();

async function initLoad() {
  result.value = undefined;
  return await load(1);
}

async function load(pageNo: number) {
  if (!findPage('constructor')?.code) {
    showDialog({
      message: '《初始化》code未定义!',
      showCancelButton: false,
    });
    return;
  }
  if (!findPage('list')?.passed) {
    showDialog({
      message: '请先执行通过《推荐图片》',
      showCancelButton: false,
    });
    return;
  }
  if (!findPage('searchList')?.passed) {
    showDialog({
      message: '请先执行通过《搜索图片》',
      showCancelButton: false,
    });
    return;
  }
  if (!findPage('list')?.result && !findPage('searchList')?.result) {
    showDialog({
      message: '请先保证《推荐图片》或《搜索图片》执行不为空',
      showCancelButton: false,
    });
    return;
  }
  const code = PHOTO_TEMPLATE.replace(
    'constructor() {}',
    findPage('constructor')!.code,
  )
    .replace('async getRecommendList(pageNo) {}', findPage('list')!.code)
    .replace('async search(keyword, pageNo) {}', findPage('searchList')!.code)
    .replace('async getPhotoDetail(item, pageNo) {}', findPage('detail')!.code);
  runStatus.value = RunStatus.running;
  try {
    const func = new Function('PhotoExtension', code);
    const extensionclass = func(PhotoExtension);
    const cls = new extensionclass() as PhotoExtension;
    if (!cls.baseUrl) {
      throw new Error('初始化中的baseUrl未定义!');
    }
    cls.log = props.log;
    const item =
      findPage('list')?.result?.list?.[0] ||
      findPage('searchList')?.result?.list?.[0];
    if (!item) {
      throw new Error('请先保证《推荐图片》或《搜索图片》执行不为空');
    }
    const res = await cls?.execGetPhotoDetail(item, pageNo);
    if (!res) {
      throw new Error('获取详情失败! 返回结果为空');
    }
    result.value = res;
    props.updateResult('photo', 'detail', result.value, true);
    runStatus.value = RunStatus.success;
  } catch (error) {
    errorMessage.value = String(error);
    runStatus.value = RunStatus.error;
    props.updateResult('photo', 'detail', result.value, false);
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
    <div v-else>
      <div class="flex grow select-none flex-col overflow-y-auto">
        <div class="flex flex-nowrap px-2">
          <MPagination
            v-if="result && result.totalPage"
            :page-no="result.page"
            :page-count="result.totalPage"
            :to-page="(page) => load(page)"
          />
        </div>
        <template v-for="(item, index) in result?.photos" :key="index">
          <LoadImage
            :src="item"
            :headers="result?.photosHeaders"
            fit="contain"
          />
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less"></style>
