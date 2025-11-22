<script setup lang="ts">
import type {
  VideoItem,
  VideoResource,
  VideosList,
} from '@wuji-tauri/source-extension';
import { VideoExtension } from '@wuji-tauri/source-extension';
import _ from 'lodash';
import { showDialog } from 'vant';
import { ref } from 'vue';
import BOOK_TEMPLATE from '@/components/codeEditor/templates/videoTemplate.txt?raw';
import ResponsiveGrid2 from '@/components/grid/ResponsiveGrid2.vue';
import { FormItem } from '@/store/sourceCreateStore';

const props = defineProps<{
  content: FormItem<VideosList>;
  updateResult: (
    type: 'video',
    page: 'detail',
    result: VideoItem | undefined,
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
const result = ref<VideoItem>();
const selectedResource = ref<VideoResource>();

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
  const code = BOOK_TEMPLATE.replace(
    '// @METHOD_CONSTRUCTOR',
    findPage('constructor')!.code,
  )
    .replace(
      '// @METHOD_LIST',
      findPage('list')!.code,
    )
    .replace('// @METHOD_SEARCH_LIST', findPage('searchList')!.code)
    .replace('// @METHOD_DETAIL', findPage('detail')!.code);
  runStatus.value = RunStatus.running;
  try {
    const func = new Function('VideoExtension', code);
    const extensionclass = func(VideoExtension);
    const cls = new extensionclass() as VideoExtension;
    if (!cls.baseUrl) {
      throw new Error('初始化中的baseUrl未定义!');
    }
    cls.log = props.log;
    function getItem(p?: FormItem<VideosList>['pages'][0]) {
      let item: VideoItem | undefined;
      if (p?.result) {
        if (_.isArray(p.result)) {
          item = _.findLast(p.result, (item) => !!item.list?.length)?.list?.[0];
        } else {
          item = p.result.list?.[0];
        }
      }
      return item;
    }
    const listPage = findPage('list');
    const listItem = getItem(listPage);
    const searchPage = findPage('searchList');
    const searchItem = getItem(searchPage);
    const item =
      (searchPage?.ts || 0) > (listPage?.ts || 0) && searchItem
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
    if (!res.resources?.find((item) => !!item.episodes?.length)) {
      throw new Error('获取详情失败! 获取的播放列表为空');
    }
    result.value = res;
    selectedResource.value = res.resources[0];
    props.updateResult('video', 'detail', result.value, true);
    runStatus.value = RunStatus.success;
  } catch (error) {
    errorMessage.value = String(error);
    runStatus.value = RunStatus.error;
    props.updateResult('video', 'detail', result.value, false);
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
          <div
            class="flex w-full flex-shrink-0 items-center justify-start gap-2 overflow-hidden"
          >
            <div class="flex min-w-[100px] flex-col gap-1">
              <h2 class="font-bold">
                {{ result?.title }}
              </h2>
              <div class="flex gap-1 overflow-x-auto">
                <van-tag
                  v-for="tag in _.castArray(result?.tags)"
                  plain
                  color="rgba(100,100,100,0.3)"
                  text-color="var(--van-text-color-2)"
                  class="flex-shrink-0"
                >
                  {{ tag }}
                </van-tag>
              </div>
              <div class="flex gap-1 overflow-x-auto">
                <van-tag
                  v-if="result?.releaseDate"
                  color="rgba(100,100,100,0.3)"
                  text-color="var(--van-text-color-2)"
                >
                  {{ result?.releaseDate }}
                </van-tag>
                <van-tag
                  v-if="result?.country"
                  color="rgba(100,100,100,0.3)"
                  text-color="var(--van-text-color-2)"
                >
                  {{ result?.country }}
                </van-tag>
                <van-tag
                  v-if="result?.duration"
                  color="rgba(100,100,100,0.3)"
                  text-color="var(--van-text-color-2)"
                >
                  {{ result?.duration }}
                </van-tag>
              </div>
              <div
                v-if="result?.director"
                class="min-w-0 truncate text-xs text-[var(--van-text-color-2)]"
              >
                导演: {{ result?.director }}
              </div>
            </div>
          </div>
          <div
            v-if="result?.intro"
            class="line-clamp-3 flex-shrink-0 text-xs text-[var(--van-text-color-2)]"
          >
            介绍: {{ result?.intro }}
          </div>
          <div
            class="flex flex-shrink-0 gap-2 overflow-x-auto overflow-y-hidden pb-2"
          >
            <van-button
              v-for="resource in result?.resources"
              :key="`resource${resource.id}`"
              class="flex-shrink-0"
              size="small"
              :type="
                resource.id === selectedResource?.id ? 'primary' : 'default'
              "
              :class="
                resource.id === selectedResource?.id
                  ? 'video-playing-resource'
                  : ''
              "
              @click="
                (e) => {
                  selectedResource = resource;
                  e.target.scrollIntoView({
                    behavior: 'smooth', // 可选：平滑滚动
                    block: 'nearest', // 垂直方向不强制滚动
                    inline: 'center', // 水平方向居中
                  });
                }
              "
            >
              {{ resource.title }}
            </van-button>
          </div>

          <ResponsiveGrid2
            min-width="40"
            class="episode-show-list flex w-full flex-col overflow-y-auto overflow-x-hidden"
          >
            <van-button
              v-for="episode in selectedResource?.episodes"
              :key="`episode${episode.id}`"
              class="flex-shrink-0"
              size="small"
              type="default"
              @click="() => {}"
            >
              {{ episode.title }}
            </van-button>
          </ResponsiveGrid2>
        </div>
        <div v-if="!result" class="flex w-full items-center justify-center">
          <van-loading />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less"></style>
