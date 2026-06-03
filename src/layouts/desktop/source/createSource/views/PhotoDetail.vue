<script setup lang="ts">
import type {
  PhotoDetail as PhotoDetailData,
  PhotoItem,
  PhotoList,
} from '@wuji-tauri/source-extension';
import type { FormItem } from '@/store/sourceCreateStore';
import { PhotoExtension } from '@wuji-tauri/source-extension';
import { showDialog } from 'vant';
import { computed, ref } from 'vue';
import PHOTO_TEMPLATE from '@/components/codeEditor/templates/photoTemplate.txt?raw';
import AppPhotoDetail from '@/layouts/app/photo/PhotoDetail.vue';
import CreateSourcePreviewShell from '../CreateSourcePreviewShell.vue';
import {
  CreateSourceRunStatus,
  isIncrementalCreateSourceLoad,
} from '../useCreateSourceListRunner';

const props = defineProps<{
  content: FormItem<PhotoList>;
  updateResult: (
    type: 'photo',
    page: 'detail',
    result: PhotoDetailData | undefined,
    padded: boolean,
  ) => void;
  close: () => void;
  log: (...args: unknown[]) => void;
}>();

const runStatus = ref<CreateSourceRunStatus>(
  CreateSourceRunStatus.not_running,
);
const errorMessage = ref('运行失败');
const result = ref<PhotoDetailData>();
const pageNo = ref(1);

const photoItem = computed<PhotoItem | undefined>(() => {
  return (
    findPage('list')?.result?.list?.[0]
    || findPage('searchList')?.result?.list?.[0]
  );
});

async function initLoad() {
  result.value = undefined;
  pageNo.value = 1;
  return await load(1);
}

async function load(nextPage: number) {
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
  const item = photoItem.value;
  if (!item) {
    showDialog({
      message: '请先保证《推荐图片》或《搜索图片》执行不为空',
      showCancelButton: false,
    });
    return;
  }
  const code = PHOTO_TEMPLATE.replace(
    '// @METHOD_CONSTRUCTOR',
    findPage('constructor')!.code,
  )
    .replace('// @METHOD_LIST', findPage('list')!.code)
    .replace('// @METHOD_SEARCH_LIST', findPage('searchList')!.code)
    .replace('// @METHOD_DETAIL', findPage('detail')!.code);
  const silent = isIncrementalCreateSourceLoad(
    result.value !== undefined,
    nextPage,
  );
  if (!silent) {
    runStatus.value = CreateSourceRunStatus.running;
  }
  try {
    const func = new Function('PhotoExtension', code);
    const ExtensionClass = func(PhotoExtension);
    const cls = new ExtensionClass() as PhotoExtension;
    if (cls.baseUrl === undefined) {
      throw new Error('初始化中的baseUrl未定义!');
    }
    cls.log = props.log;
    const res = await cls?.execGetPhotoDetail(item, nextPage);
    if (!res) {
      throw new Error('获取详情失败! 返回结果为空');
    }
    result.value = res;
    pageNo.value = nextPage;
    props.updateResult('photo', 'detail', result.value, true);
    runStatus.value = CreateSourceRunStatus.success;
  }
  catch (error) {
    errorMessage.value = String(error);
    runStatus.value = CreateSourceRunStatus.error;
    props.updateResult('photo', 'detail', result.value, false);
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
    <AppPhotoDetail
      v-if="photoItem && result"
      preview
      :photo-item="photoItem"
      :photo-detail="result"
      :page-no="pageNo"
      :to-page="(page) => load(page ?? 1)"
    />
  </CreateSourcePreviewShell>
</template>
