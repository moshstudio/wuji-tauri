<script setup lang="ts">
import type { VideoList, VideosList } from '@wuji-tauri/source-extension';
import { MVideoCard } from '@wuji-tauri/components/src';
import { VideoExtension } from '@wuji-tauri/source-extension';
import _ from 'lodash';
import { showDialog, showFailToast } from 'vant';
import { ref } from 'vue';
import BOOK_TEMPLATE from '@/components/codeEditor/templates/videoTemplate.txt?raw';
import MPagination from '@/components/pagination/MPagination.vue';
import SearchField from '@/components/search/SearchField.vue';

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
      result: VideosList | undefined;
    }[];
  };
  updateResult: (
    type: 'video',
    page: 'searchList',
    result: VideosList | undefined,
    padded: boolean,
  ) => void;
  close: () => void;
  log: (...args: any[]) => void;
}>();

enum RunStatus {
  not_running = 'not_running',
  running = 'running',
  success = 'success',
  error = 'error',
}

const runStatus = ref<RunStatus>(RunStatus.not_running);
const errorMessage = ref('运行失败');
const result = ref<VideosList>();
const keyword = ref('你');

const searchHistories = ref<string[]>([]);

async function initLoad() {
  result.value = undefined;
  tabActive.value = '';
  return await load(1);
}

async function load(pageNo?: number, type?: string) {
  if (!findPage('constructor')?.code) {
    showFailToast('《初始化》code未定义!');
    return;
  }
  if (!findPage('list')?.passed) {
    showDialog({
      message: '请先执行通过《推荐书籍》',
      showCancelButton: false,
    });
    return;
  }
  if (!findPage('searchList')?.code) {
    showFailToast('code未定义!');
    return;
  }
  const code = BOOK_TEMPLATE.replace(
    'constructor() {}',
    findPage('constructor')!.code,
  )
    .replace(
      'async getRecommendVideos(pageNo, type) {}',
      findPage('list')!.code,
    )
    .replace('async search(keyword, pageNo) {}', findPage('searchList')!.code);
  runStatus.value = RunStatus.running;
  try {
    const func = new Function('VideoExtension', code);
    const extensionclass = func(VideoExtension);
    const cls = new extensionclass() as VideoExtension;
    if (!cls.baseUrl) {
      throw new Error('初始化中的baseUrl未定义!');
    }
    cls.log = props.log;
    const res = await cls?.execSearch(keyword.value, pageNo);
    if (!res) {
      throw new Error('获取搜索列表失败! 返回结果为空');
    }
    if (
      result.value &&
      _.isArray(result.value) &&
      !_.isArray(res) &&
      result.value.find((item) => item.type === res.type)
    ) {
      const index = result.value.findIndex((item) => item.type === res.type);
      Object.assign(result.value[index], res);
    } else {
      result.value = res;
    }
    props.updateResult('video', 'searchList', result.value, true);
    runStatus.value = RunStatus.success;
  } catch (error) {
    errorMessage.value = String(error);
    runStatus.value = RunStatus.error;
    props.updateResult('video', 'searchList', result.value, false);
  }
}

function loadTab(index: number, pageNo?: number) {
  if (!result.value) return;
  let t: VideoList;
  if (Array.isArray(result.value)) {
    t = result.value[index];
  } else {
    t = result.value;
  }
  load(pageNo ?? 1, t.type);
}

function findPage(name: string) {
  return props.content.pages.find((page) => page.type === name);
}
const tabActive = ref('');
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
    <div
      v-show="runStatus === RunStatus.success"
      class="flex flex-col overflow-auto"
    >
      <div class="flex items-center justify-center">
        <SearchField
          v-model:value="keyword"
          v-model:search-histories="searchHistories"
          :search="() => initLoad()"
        />
      </div>
      <div v-if="!result" />
      <van-tabs
        v-else-if="Array.isArray(result)"
        v-model:active="tabActive"
        shrink
        animated
        @rendered="(index) => loadTab(index)"
      >
        <van-tab
          v-for="(item, index) in result"
          :key="index"
          :title="item.type"
        >
          <van-row
            v-if="item.page && item.totalPage && item.totalPage > 1"
            class="px-2 py-1"
          >
            <MPagination
              :page-no="item.page"
              :page-count="item.totalPage"
              :to-page="(page: number) => loadTab(index, page)"
            />
          </van-row>
          <van-loading v-if="!item.list?.length" class="p-2" />
          <div class="flex flex-col">
            <MVideoCard
              v-for="video in item.list"
              :key="video.id"
              :video="video"
              :click="() => {}"
            />
          </div>
        </van-tab>
      </van-tabs>

      <template v-else>
        <van-row
          v-if="result?.page && result?.totalPage && result.totalPage > 1"
        >
          <MPagination
            :page-no="result.page"
            :page-count="result.totalPage"
            :to-page="(page: number) => loadTab(0, page)"
          />
        </van-row>
        <van-loading v-if="!result.list?.length" class="p-2" />
        <div class="flex flex-col">
          <template v-for="video in result.list" :key="video.id">
            <MVideoCard :video="video" :click="() => {}" />
          </template>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped lang="less"></style>
