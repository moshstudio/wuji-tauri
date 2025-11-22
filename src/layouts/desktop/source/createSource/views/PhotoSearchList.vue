<script setup lang="ts">
import type { PhotoList } from '@wuji-tauri/source-extension';
import { LoadImage } from '@wuji-tauri/components/src';
import { PhotoExtension } from '@wuji-tauri/source-extension';
import { showDialog, showFailToast } from 'vant';
import { ref } from 'vue';
import PHOTO_TEMPLATE from '@/components/codeEditor/templates/photoTemplate.txt?raw';
import ResponsiveGrid2 from '@/components/grid/ResponsiveGrid2.vue';
import MPagination from '@/components/pagination/MPagination.vue';
import SearchField from '@/components/search/SearchField.vue';
import { FormItem } from '@/store/sourceCreateStore';

const props = defineProps<{
  content: FormItem<PhotoList>;
  updateResult: (
    type: 'photo',
    page: 'searchList',
    result: PhotoList | undefined,
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
const result = ref<PhotoList>();
const keyword = ref('你');

const searchHistories = ref<string[]>([]);

async function initLoad() {
  result.value = undefined;
  return await load(1);
}

async function load(pageNo: number) {
  if (!findPage('constructor')?.code) {
    showFailToast('《初始化》code未定义!');
    return;
  }
  if (!findPage('list')?.passed) {
    showDialog({
      message: '请先执行通过《推荐图片》',
      showCancelButton: false,
    });
    return;
  }
  if (!findPage('searchList')?.code) {
    showFailToast('code未定义!');
    return;
  }
  const code = PHOTO_TEMPLATE.replace(
    '// @METHOD_CONSTRUCTOR',
    findPage('constructor')!.code,
  )
    .replace('// @METHOD_LIST', findPage('list')!.code)
    .replace('// @METHOD_SEARCH_LIST', findPage('searchList')!.code);
  runStatus.value = RunStatus.running;
  try {
    const func = new Function('PhotoExtension', code);
    const extensionclass = func(PhotoExtension);
    const cls = new extensionclass() as PhotoExtension;
    if (!cls.baseUrl) {
      throw new Error('初始化中的baseUrl未定义!');
    }
    cls.log = props.log;
    const res = await cls?.execSearch(keyword.value, pageNo);
    if (!res) {
      throw new Error('获取搜索列表失败! 返回结果为空');
    }
    result.value = res;
    props.updateResult('photo', 'searchList', result.value, true);
    runStatus.value = RunStatus.success;
  } catch (error) {
    errorMessage.value = String(error);
    runStatus.value = RunStatus.error;
    props.updateResult('photo', 'searchList', result.value, false);
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
      <div class="flex items-center justify-center">
        <SearchField
          v-model:value="keyword"
          v-model:search-histories="searchHistories"
          :search="() => initLoad()"
        />
      </div>
      <div class="flex flex-nowrap px-2">
        <MPagination
          v-if="result && result.totalPage"
          :page-no="result.page"
          :page-count="result.totalPage"
          :to-page="(page) => load(page)"
        />
      </div>
      <ResponsiveGrid2 min-width="80" max-width="100">
        <template v-for="photo in result?.list" :key="photo">
          <div
            class="relative flex transform cursor-pointer select-none flex-col rounded-lg transition-all duration-100 active:scale-[0.98]"
          >
            <LoadImage
              fit="cover"
              :src="
                typeof photo.cover === 'string' ? photo.cover : photo.cover[0]
              "
              :headers="photo.coverHeaders || undefined"
              class="h-full w-full"
            />
            <p
              v-if="photo.title"
              class="truncate py-1 text-center text-xs text-[var(--van-text-color)]"
            >
              {{ photo.title }}
            </p>
          </div>
        </template>
      </ResponsiveGrid2>
    </div>
  </div>
</template>

<style scoped lang="less"></style>
