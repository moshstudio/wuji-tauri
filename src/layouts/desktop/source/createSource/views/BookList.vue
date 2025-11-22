<script setup lang="ts">
import type { BookList, BooksList } from '@wuji-tauri/source-extension';
import { MBookCard } from '@wuji-tauri/components/src';
import { BookExtension } from '@wuji-tauri/source-extension';
import _ from 'lodash';
import { showFailToast } from 'vant';
import { ref } from 'vue';
import BOOK_TEMPLATE from '@/components/codeEditor/templates/bookTemplate.txt?raw';
import MPagination from '@/components/pagination/MPagination.vue';
import { FormItem } from '@/store/sourceCreateStore';

const props = defineProps<{
  content: FormItem<BooksList>;
  updateResult: (
    type: 'book',
    page: 'list',
    result: BooksList | undefined,
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
const result = ref<BooksList | undefined>();
const tabActive = ref('');

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
  const code = BOOK_TEMPLATE.replace(
    '// @METHOD_CONSTRUCTOR',
    findPage('constructor')!.code,
  ).replace('// @METHOD_LIST', findPage('list')!.code);
  runStatus.value = RunStatus.running;
  try {
    // const blob = new Blob([`BookExtension; (${code})()`], {
    //   type: 'application/javascript',
    // });
    // const url = URL.createObjectURL(blob);
    // const module = await import(url);
    // const Cls = module.default;
    // const cls = new Cls() as BookExtension;
    const func = new Function('BookExtension', code);
    const Extensionclass = func(BookExtension);
    const cls = new Extensionclass() as BookExtension;
    if (!cls.baseUrl) {
      throw new Error('初始化中的baseUrl未定义!');
    }
    cls.log = props.log;
    const res = await cls?.getRecommendBooks(pageNo, type);
    if (!res) {
      throw new Error('获取推荐列表失败! 返回结果为空');
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
    props.updateResult('book', 'list', result.value, true);
    runStatus.value = RunStatus.success;
  } catch (error) {
    errorMessage.value = String(error);
    runStatus.value = RunStatus.error;
    props.updateResult('book', 'list', result.value, false);
  }
}

function loadTab(index: number, pageNo?: number) {
  if (!result.value) return;
  let t: BookList;
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
      <van-loading v-if="!result" class="p-2" />
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
          <div class="flex flex-col">
            <MBookCard
              v-for="book in item.list"
              :key="`${item.id}_${book.id}`"
              :book="book"
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
          <template v-for="book in result.list" :key="`${item.id}_${book.id}`">
            <MBookCard :book="book" :click="() => {}" />
          </template>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped lang="less"></style>
