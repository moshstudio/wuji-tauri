<script setup lang="ts">
import { showFailToast, showNotify } from 'vant';
import SONG_TEMPLATE from '@/components2/codeEditor/templates/songTemplate.txt?raw';
import { ref } from 'vue';
import MPagination from '@/components2/pagination/MPagination.vue';
import ResponsiveGrid2 from '@/components2/grid/ResponsiveGrid2.vue';
import { SongExtension, SongList } from '@wuji-tauri/source-extension';
import { joinSongArtists } from '@/utils';
import { WSongCard } from '@wuji-tauri/components/src';

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
      result: SongList | undefined;
    }[];
  };
  updateResult: (
    type: 'song',
    page: 'songList',
    result: SongList | undefined,
    padded: boolean,
  ) => void;
  close: () => void;
}>();

const runStatus = ref<RunStatus>(RunStatus.not_running);
const errorMessage = ref('运行失败');
const result = ref<SongList | undefined>();

async function initLoad() {
  return await load(1);
}

async function load(pageNo: number) {
  if (!findPage('constructor')?.code) {
    showFailToast('《初始化》code未定义!');
    return;
  }
  if (!findPage('songList')?.code) {
    showFailToast('code未定义!');
    return;
  }
  const code = SONG_TEMPLATE.replace(
    'constructor() {}',
    findPage('constructor')!.code,
  ).replace('async getRecommendSongs(pageNo) {}', findPage('songList')!.code);
  runStatus.value = RunStatus.running;
  try {
    const func = new Function('SongExtension', code);
    const extensionclass = func(SongExtension);
    const cls = new extensionclass() as SongExtension;
    if (!cls.baseUrl) {
      throw new Error('初始化中的baseUrl未定义!');
    }
    const res = await cls?.execGetRecommendSongs(pageNo);
    if (!res) {
      throw new Error('获取推荐列表失败! 返回结果为空');
    }
    result.value = res;
    props.updateResult('song', 'songList', result.value, true);
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
      <ResponsiveGrid2>
        <template v-for="song in result?.list" :key="song.id">
          <WSongCard
            :song="song"
            :shelfs="[]"
            :is-playing="false"
            :is-playing-song="false"
            :play="() => {}"
            :pause="() => {}"
            :in-like-shelf="false"
            :add-to-like-shelf="() => {}"
            :remove-from-like-shelf="() => {}"
            :add-to-shelf="() => {}"
          ></WSongCard>
        </template>
      </ResponsiveGrid2>
    </div>
  </div>
</template>

<style scoped lang="less"></style>
