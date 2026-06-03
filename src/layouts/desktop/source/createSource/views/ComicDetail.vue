<script setup lang="ts">
import type { ComicItem, ComicsList } from '@wuji-tauri/source-extension';
import type { FormItem } from '@/store/sourceCreateStore';
import { ComicExtension } from '@wuji-tauri/source-extension';
import _ from 'lodash';
import { showDialog } from 'vant';
import { ref } from 'vue';
import COMIC_TEMPLATE from '@/components/codeEditor/templates/comicTemplate.txt?raw';
import AppComicDetail from '@/layouts/app/comic/ComicDetail.vue';
import CreateSourcePreviewShell from '../CreateSourcePreviewShell.vue';
import { CreateSourceRunStatus } from '../useCreateSourceListRunner';

const props = defineProps<{
  content: FormItem<ComicsList>;
  updateResult: (
    type: 'comic',
    page: 'detail',
    result: ComicItem | undefined,
    padded: boolean,
  ) => void;
  close: () => void;
  log: (...args: unknown[]) => void;
}>();

const runStatus = ref<CreateSourceRunStatus>(
  CreateSourceRunStatus.not_running,
);
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
      message: '请先执行通过《推荐漫画》',
      showCancelButton: false,
    });
    return;
  }
  if (!findPage('searchList')?.passed) {
    showDialog({
      message: '请先执行通过《搜索漫画》',
      showCancelButton: false,
    });
    return;
  }
  if (!findPage('list')?.result && !findPage('searchList')?.result) {
    showDialog({
      message: '请先保证《推荐漫画》或《搜索漫画》执行不为空',
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
    .replace('// @METHOD_DETAIL', findPage('detail')!.code);
  runStatus.value = CreateSourceRunStatus.running;
  try {
    const func = new Function('ComicExtension', code);
    const ExtensionClass = func(ComicExtension);
    const cls = new ExtensionClass() as ComicExtension;
    if (cls.baseUrl === undefined) {
      throw new Error('初始化中的baseUrl未定义!');
    }
    cls.log = props.log;
    let item: ComicItem | undefined;
    const page = findPage('list');
    if (page?.result) {
      if (_.isArray(page.result)) {
        item = page.result[0]?.list[0];
      }
      else {
        item = page.result.list[0];
      }
    }
    if (!item) {
      const searchPage = findPage('searchList');
      if (searchPage?.result) {
        if (_.isArray(searchPage.result)) {
          item = searchPage.result[0]?.list[0];
        }
        else {
          item = searchPage.result.list[0];
        }
      }
    }
    if (!item) {
      throw new Error('请先保证《推荐漫画》或《搜索漫画》执行不为空');
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
    runStatus.value = CreateSourceRunStatus.success;
  }
  catch (error) {
    errorMessage.value = String(error);
    runStatus.value = CreateSourceRunStatus.error;
    props.updateResult('comic', 'detail', result.value, false);
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
    <AppComicDetail v-if="result" preview :comic="result" />
  </CreateSourcePreviewShell>
</template>
