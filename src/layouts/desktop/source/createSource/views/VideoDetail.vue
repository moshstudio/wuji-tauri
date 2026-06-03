<script setup lang="ts">

import type {

  VideoItem,

  VideoResource,

  VideosList,

} from '@wuji-tauri/source-extension';

import type { FormItem } from '@/store/sourceCreateStore';

import {

  CmsVideoExtension,

  VideoExtension,

} from '@wuji-tauri/source-extension';

import _ from 'lodash';

import { showDialog } from 'vant';

import { ref } from 'vue';

import CMS_VIDEO_TEMPLATE from '@/components/codeEditor/templates/cmsVideoTemplate.txt?raw';

import VIDEO_TEMPLATE from '@/components/codeEditor/templates/videoTemplate.txt?raw';

import AppVideoDetail from '@/layouts/app/video/VideoDetail.vue';

import CreateSourcePreviewShell from '../CreateSourcePreviewShell.vue';

import { CreateSourceRunStatus } from '../useCreateSourceListRunner';



const props = defineProps<{

  content: FormItem<VideosList>;

  updateResult: (

    type: 'video',

    page: 'detail',

    result: VideoItem | undefined,

    padded: boolean,

  ) => void;

  close: () => void;

  log: (...args: unknown[]) => void;

}>();



const runStatus = ref<CreateSourceRunStatus>(

  CreateSourceRunStatus.not_running,

);

const errorMessage = ref('运行失败');

const result = ref<VideoItem>();

const selectedResource = ref<VideoResource>();

const showPlaylist = ref(true);



async function initLoad() {

  result.value = undefined;

  selectedResource.value = undefined;

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

      message: '请先执行通过《推荐影视》',

      showCancelButton: false,

    });

    return;

  }

  if (!findPage('searchList')?.passed) {

    showDialog({

      message: '请先执行通过《搜索影视》',

      showCancelButton: false,

    });

    return;

  }

  if (!findPage('list')?.result && !findPage('searchList')?.result) {

    showDialog({

      message: '请先保证《推荐影视》或《搜索影视》执行不为空',

      showCancelButton: false,

    });

    return;

  }

  const template

    = props.content.mode === 'cms' ? CMS_VIDEO_TEMPLATE : VIDEO_TEMPLATE;

  const code = template

    .replace('// @METHOD_CONSTRUCTOR', findPage('constructor')!.code)

    .replace('// @METHOD_LIST', findPage('list')!.code)

    .replace('// @METHOD_SEARCH_LIST', findPage('searchList')!.code)

    .replace('// @METHOD_DETAIL', findPage('detail')!.code);

  runStatus.value = CreateSourceRunStatus.running;

  try {

    const func = new Function('VideoExtension', 'CmsVideoExtension', code);

    const ExtensionClass = func(VideoExtension, CmsVideoExtension);

    const cls = new ExtensionClass() as VideoExtension;

    if (cls.baseUrl === undefined) {

      throw new Error('初始化中的baseUrl未定义!');

    }

    cls.log = props.log;

    function getItem(p?: FormItem<VideosList>['pages'][0]) {

      let item: VideoItem | undefined;

      if (p?.result) {

        if (_.isArray(p.result)) {

          item = _.findLast(p.result, item => !!item.list?.length)?.list?.[0];

        }

        else {

          item = p.result.list?.[0];

        }

      }

      return item;

    }

    const listPage = findPage('list');

    const listItem = getItem(listPage);

    const searchPage = findPage('searchList');

    const searchItem = getItem(searchPage);

    const item

      = (searchPage?.ts || 0) > (listPage?.ts || 0) && searchItem

        ? searchItem

        : listItem;



    if (!item) {

      throw new Error('请先保证《推荐影视》或《搜索影视》执行不为空');

    }

    const res = await cls?.execGetVideoDetail(item);

    if (!res) {

      throw new Error('获取详情失败! 返回结果为空');

    }

    if (!res.resources?.length) {

      throw new Error('获取详情失败! 获取的剧集列表为空');

    }

    if (!res.resources?.find(item => !!item.episodes?.length)) {

      throw new Error('获取详情失败! 获取的播放列表为空');

    }

    result.value = res;

    selectedResource.value = res.resources[0];

    props.updateResult('video', 'detail', result.value, true);

    runStatus.value = CreateSourceRunStatus.success;

  }

  catch (error) {

    errorMessage.value = String(error);

    runStatus.value = CreateSourceRunStatus.error;

    props.updateResult('video', 'detail', result.value, false);

  }

}



function findPage(name: string) {

  return props.content.pages.find(page => page.type === name);

}

function onPreviewResource(resource: VideoResource) {
  selectedResource.value = resource;
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

    <AppVideoDetail

      v-if="result"

      v-model:show-playlist="showPlaylist"

      preview

      :video-item="result"

      :playing-resource="selectedResource"
      :on-preview-resource="onPreviewResource"
    />

  </CreateSourcePreviewShell>

</template>


