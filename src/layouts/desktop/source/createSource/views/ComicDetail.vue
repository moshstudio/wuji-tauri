<script setup lang="ts">
import type { ComicItem, ComicsList } from '@wuji-tauri/source-extension';
import { LoadImage } from '@wuji-tauri/components/src';
import { ComicExtension } from '@wuji-tauri/source-extension';
import _ from 'lodash';
import { showDialog } from 'vant';
import { ref } from 'vue';
import COMIC_TEMPLATE from '@/components/codeEditor/templates/comicTemplate.txt?raw';
import ResponsiveGrid2 from '@/components/grid/ResponsiveGrid2.vue';

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
      result: ComicsList | undefined;
    }[];
  };
  updateResult: (
    type: 'comic',
    page: 'detail',
    result: ComicItem | undefined,
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
const result = ref<ComicItem>();

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
  if (!findPage('list')?.passed) {
    showDialog({
      message: '请先执行通过《推荐书籍》',
      showCancelButton: false,
    });
    return;
  }
  if (!findPage('searchList')?.passed) {
    showDialog({
      message: '请先执行通过《搜索书籍》',
      showCancelButton: false,
    });
    return;
  }
  if (!findPage('list')?.result && !findPage('searchList')?.result) {
    showDialog({
      message: '请先保证《推荐书籍》或《搜索书籍》执行不为空',
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
    .replace('async getComicDetail(item, pageNo) {}', findPage('detail')!.code);
  runStatus.value = RunStatus.running;
  try {
    const func = new Function('ComicExtension', code);
    const extensionclass = func(ComicExtension);
    const cls = new extensionclass() as ComicExtension;
    if (!cls.baseUrl) {
      throw new Error('初始化中的baseUrl未定义!');
    }
    cls.log = props.log;
    let item: ComicItem | undefined;
    const page = findPage('list');
    if (page?.result) {
      if (_.isArray(page.result)) {
        item = page.result[0]?.list[0];
      } else {
        item = page.result.list[0];
      }
    }
    if (!item) {
      const page = findPage('searchList');
      if (page?.result) {
        if (_.isArray(page.result)) {
          item = page.result[0]?.list[0];
        } else {
          item = page.result.list[0];
        }
      }
    }
    if (!item) {
      throw new Error('请先保证《推荐图片》或《搜索图片》执行不为空');
    }
    const res = await cls?.execGetComicDetail(item);
    if (!res) {
      throw new Error('获取详情失败! 返回结果为空');
    }
    if (!res.chapters?.length) {
      throw new Error('获取详情失败! 获取的章节为空');
    }
    result.value = res;
    props.updateResult('comic', 'detail', result.value, true);
    runStatus.value = RunStatus.success;
  } catch (error) {
    errorMessage.value = String(error);
    runStatus.value = RunStatus.error;
    props.updateResult('comic', 'detail', result.value, false);
  }
}

function findPage(name: string) {
  return props.content.pages.find((page) => page.type === name);
}

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
        <div
          v-if="result"
          class="flex w-full flex-col gap-1 rounded p-2 shadow-md"
        >
          <div class="flex flex-nowrap items-center justify-center gap-2">
            <div v-if="result.cover" class="h-[100px] w-[80px]">
              <LoadImage
                width="80px"
                height="100px"
                radius="4"
                :src="result.cover"
                :Headers="result.coverHeaders"
                class="mr-4"
              />
            </div>

            <div
              class="flex flex-col justify-start gap-1 text-sm text-[--van-text-color]"
            >
              <div class="font-bold">
                {{ result.title }}
              </div>
              <p class="flex gap-2 text-xs">
                <span>{{ result.author }}</span>
                <span>{{ _.castArray(result.tags)?.join(',') }}</span>
                <span>{{ result.status }}</span>
              </p>

              <p>
                <span class="text-xs">{{ result.latestChapter }}</span>
              </p>
            </div>
          </div>
          <van-text-ellipsis
            :content="result.intro"
            class="self-center text-xs text-gray-400"
            rows="3"
            expand-text="展开"
            collapse-text="收起"
          />
        </div>

        <div
          v-if="result?.chapters"
          class="mt-4 w-full text-[--van-text-color]"
        >
          <div class="flex w-full items-center justify-between">
            <p class="font-bold">共有{{ result.chapters.length }} 章</p>
          </div>
          <van-tabs shrink animated>
            <van-tab
              v-for="index of Array(
                Math.ceil(result.chapters.length / 200),
              ).keys()"
              :title="`${index * 200 + 1}-${Math.min(result.chapters.length, (index + 1) * 200)}`"
            >
              <ResponsiveGrid2>
                <p
                  v-for="chapter in result.chapters.slice(
                    index * 200,
                    Math.min(result.chapters.length, (index + 1) * 200 - 1),
                  )"
                  :key="chapter.id"
                  class="van-haptics-feedback cursor-pointer select-none truncate rounded-lg text-sm"
                  @click="() => {}"
                >
                  {{ chapter.title }}
                </p>
              </ResponsiveGrid2>
            </van-tab>
          </van-tabs>
        </div>
        <div v-if="!result" class="flex w-full items-center justify-center">
          <van-loading />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less"></style>
