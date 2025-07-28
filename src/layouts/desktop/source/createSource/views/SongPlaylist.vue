<script setup lang="ts">
import { showFailToast, showNotify } from 'vant';
import SONG_TEMPLATE from '@/components2/codeEditor/templates/songTemplate.txt?raw';
import { ref } from 'vue';
import MPagination from '@/components2/pagination/MPagination.vue';
import ResponsiveGrid2 from '@/components2/grid/ResponsiveGrid2.vue';
import { SongExtension, PlaylistList } from '@wuji-tauri/source-extension';
import { LoadImage } from '@wuji-tauri/components/src';
import { Icon } from '@iconify/vue';

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
      result: PlaylistList | undefined;
    }[];
  };
  updateResult: (
    type: 'song',
    page: 'playlist',
    result: PlaylistList | undefined,
    padded: boolean,
  ) => void;
  close: () => void;
}>();

const runStatus = ref<RunStatus>(RunStatus.not_running);
const errorMessage = ref('运行失败');
const result = ref<PlaylistList | undefined>();

async function initLoad() {
  return await load(1);
}

async function load(pageNo: number) {
  if (!findPage('constructor')?.code) {
    showFailToast('《初始化》code未定义!');
    return;
  }
  if (!findPage('playlist')?.code) {
    showFailToast('code未定义!');
    return;
  }
  const code = SONG_TEMPLATE.replace(
    'constructor() {}',
    findPage('constructor')!.code,
  ).replace(
    'async getRecommendPlaylists(pageNo) {}',
    findPage('playlist')!.code,
  );
  runStatus.value = RunStatus.running;
  try {
    const func = new Function('SongExtension', code);
    const extensionclass = func(SongExtension);
    const cls = new extensionclass() as SongExtension;
    if (!cls.baseUrl) {
      throw new Error('初始化中的baseUrl未定义!');
    }
    const res = await cls?.execGetRecommendPlaylists(pageNo);
    if (!res) {
      throw new Error('获取推荐歌单失败! 返回结果为空');
    }
    result.value = res;
    props.updateResult('song', 'playlist', result.value, true);
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
      class="flex items-center justify-center"
    >
      <van-loading />
    </div>
    <div v-else-if="runStatus === RunStatus.error" class="text-red-500">
      {{ errorMessage }}
    </div>
    <div v-else>
      <div class="flex flex-nowrap px-2">
        <MPagination
          v-if="result && result.totalPage"
          :page-no="result.page"
          :page-count="result.totalPage"
          :to-page="(page) => load(page)"
        />
      </div>
      <ResponsiveGrid2 min-width="80" max-width="100">
        <template v-for="playlist in result?.list" :key="photo">
          <div
            class="active-bg-scale flex transform cursor-pointer select-none flex-col rounded-lg transition-all duration-100"
          >
            <LoadImage
              fit="cover"
              :src="playlist.picUrl"
              :headers="playlist.picHeaders"
              class="rounded-t-lg"
            >
              <template #loading>
                <div class="p-1 text-center text-lg">
                  {{ playlist.name }}
                </div>
              </template>
              <template #error>
                <Icon icon="mdi:playlist-music" width="60" height="60" />
              </template>
            </LoadImage>
            <p
              v-if="playlist.name"
              class="truncate py-1 text-center text-xs text-[--van-text-color]"
            >
              {{ playlist.name }}
            </p>
          </div>
        </template>
      </ResponsiveGrid2>
    </div>
  </div>
</template>

<style scoped lang="less"></style>
