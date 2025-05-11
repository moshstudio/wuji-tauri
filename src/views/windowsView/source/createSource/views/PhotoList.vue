<script setup lang="ts">
import { PhotoExtension, PhotoList } from '@/extensions/photo';
import { showNotify } from 'vant';
import PHOTO_TEMPLATE from '@/components/codeEditor/templates/photoTemplate.txt?raw';
import { ref } from 'vue';
import SimplePagination from '@/components/pagination/SimplePagination.vue';
import ResponsiveGrid2 from '@/components/ResponsiveGrid2.vue';

enum RunStatus {
  not_running = 'not_running',
  running = 'running',
  success = 'success',
  error = 'error',
}

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
    page: 'list',
    result: PhotoList | undefined,
    padded: boolean,
  ) => void;
  close: () => void;
}>();

const runStatus = ref<RunStatus>(RunStatus.not_running);
const errorMessage = ref('运行失败');
const result = ref<PhotoList | undefined>();

async function initLoad() {
  return await load(1);
}

async function load(pageNo: number) {
  if (!findPage('constructor')?.code) {
    showNotify('《初始化》code未定义!');
    return;
  }
  if (!findPage('list')?.code) {
    showNotify('code未定义!');
    return;
  }
  const code = PHOTO_TEMPLATE.replace(
    'constructor() {}',
    findPage('constructor')!.code,
  ).replace('async getRecommendList(pageNo) {}', findPage('list')!.code);
  runStatus.value = RunStatus.running;
  try {
    const func = new Function('PhotoExtension', code);
    const extensionclass = func(PhotoExtension);
    const cls = new extensionclass() as PhotoExtension;
    if (!cls.baseUrl) {
      throw new Error('初始化中的baseUrl未定义!');
    }
    const res = await cls?.execGetRecommendList(pageNo);
    if (!res) {
      throw new Error('获取推荐列表失败! 返回结果为空');
    }
    result.value = res;
    props.updateResult('photo', 'list', result.value, true);
    runStatus.value = RunStatus.success;
  } catch (error) {
    errorMessage.value = String(error);
    runStatus.value = RunStatus.error;
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
      class="flex justify-center items-center"
    >
      <van-loading />
    </div>
    <div v-else-if="runStatus === RunStatus.error" class="text-red-500">
      {{ errorMessage }}
    </div>
    <div v-else>
      <div class="flex flex-nowrap px-2">
        <SimplePagination
          v-if="result && result.totalPage"
          v-model="result.page"
          :page-count="result.totalPage"
          @change="(page) => load(page)"
        />
      </div>
      <ResponsiveGrid2 :base-cols="2" :gap="2">
        <template v-for="photo in result?.list" :key="photo">
          <div
            class="relative flex flex-col rounded-lg transform transition-all duration-100 active:scale-[0.98] cursor-pointer select-none"
          >
            <LoadImage
              fit="cover"
              lazy-load
              :src="
                typeof photo.cover === 'string' ? photo.cover : photo.cover[0]
              "
              :headers="photo.coverHeaders || undefined"
              class="w-full h-full"
            />
            <p
              v-if="photo.title"
              class="text-xs text-[var(--van-text-color)] text-center truncate py-1"
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
