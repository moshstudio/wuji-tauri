<script setup lang="ts">
import type { ComicList, ComicsList } from '@wuji-tauri/source-extension';
import { MComicCard } from '@wuji-tauri/components/src';
import { ComicExtension } from '@wuji-tauri/source-extension';
import _ from 'lodash';
import { showFailToast } from 'vant';
import { ref } from 'vue';
import COMIC_TEMPLATE from '@/components/codeEditor/templates/comicTemplate.txt?raw';
import MPagination from '@/components/pagination/MPagination.vue';
import { FormItem } from '@/store/sourceCreateStore';
import { nanoid } from 'nanoid';

const props = defineProps<{
  content: FormItem<ComicsList>;
  updateResult: (
    type: 'comic',
    page: 'list',
    result: ComicsList | undefined,
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
const result = ref<ComicsList | undefined>();
const tabKey = ref(nanoid());

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
  if (!findPage('list')?.code) {
    showFailToast('code未定义!');
    return;
  }
  const code = COMIC_TEMPLATE.replace(
    '// @METHOD_CONSTRUCTOR',
    findPage('constructor')!.code,
  ).replace('// @METHOD_LIST', findPage('list')!.code);
  runStatus.value = RunStatus.running;
  try {
    const func = new Function('ComicExtension', code);
    const extensionclass = func(ComicExtension);
    const cls = new extensionclass() as ComicExtension;
    if (!cls.baseUrl) {
      throw new Error('初始化中的baseUrl未定义!');
    }
    cls.log = props.log;
    const res = await cls?.execGetRecommendComics(pageNo, type);
    if (!res) {
      throw new Error('获取推荐列表失败! 返回结果为空');
    }
    if (
      result.value &&
      _.isArray(result.value) &&
      !_.isArray(res) &&
      result.value.find((item) => item.type === res.type)
    ) {
      console.log(res);

      const index = result.value.findIndex((item) => item.type === res.type);
      Object.assign(result.value[index], res);
    } else {
      tabKey.value = nanoid();
      result.value = res;
    }
    props.updateResult('comic', 'list', result.value, true);
    runStatus.value = RunStatus.success;
  } catch (error) {
    errorMessage.value = String(error);
    runStatus.value = RunStatus.error;
    props.updateResult('comic', 'list', result.value, false);
  }
}

function loadTab(index: number, pageNo?: number) {
  console.log('load tab', index, pageNo);

  if (!result.value) return;
  let t: ComicList;
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
      <div v-if="!result" />
      <van-tabs
        v-else-if="Array.isArray(result)"
        :key="tabKey"
        v-model:active="tabActive"
        shrink
        animated
        @rendered="
          (index) => {
            console.log('van-tab render load tab', index);
            loadTab(index);
          }
        "
      >
        <van-tab
          v-for="(item, index) in result"
          :key="item.id || index"
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
          <van-loading v-if="!item.list.length" class="p-2" />
          <div class="flex flex-col">
            <MComicCard
              v-for="comic in item.list"
              :key="`${item.id}_${comic.id}`"
              :comic="comic"
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
        <van-loading v-if="!result.list.length" class="p-2" />
        <div class="flex flex-col">
          <template
            v-for="comic in result.list"
            :key="`${result.id}_${comic.id}`"
          >
            <MComicCard :comic="comic" :click="() => {}" />
          </template>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped lang="less"></style>
