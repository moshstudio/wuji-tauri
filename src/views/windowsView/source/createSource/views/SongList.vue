<script setup lang="ts">
import { showNotify } from 'vant';
import SONG_TEMPLATE from '@/components/codeEditor/templates/songTemplate.txt?raw';
import { ref } from 'vue';
import SimplePagination from '@/components/pagination/SimplePagination.vue';
import ResponsiveGrid2 from '@/components/ResponsiveGrid2.vue';
import { SongExtension, SongList } from '@/extensions/song';
import { joinSongArtists } from '@/utils';

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
    showNotify('《初始化》code未定义!');
    return;
  }
  if (!findPage('songList')?.code) {
    showNotify('code未定义!');
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
      <ResponsiveGrid2 :base-cols="1" :gap="2">
        <template v-for="song in result?.list" :key="photo">
          <div
            class="relative flex items-center p-1 active:scale-[0.98] rounded-lg select-none"
          >
            <SongCardPhoto
              :url="song.picUrl"
              :headers="song.picHeaders"
              :is-hover="false"
              :is-playing-song="false"
              :is-playing="false"
              :width="36"
              :height="36"
              @play="() => {}"
              @pause="() => {}"
            />
            <div
              class="grow flex flex-col pl-2 text-xs min-w-[10px] justify-around truncate"
            >
              <span class="font-bold" :class="'text-[--van-text-color]'">
                {{ song.name }}
              </span>
              <span class="text-[gray]">
                {{ joinSongArtists(song.artists) }}
              </span>
            </div>
          </div>
        </template>
      </ResponsiveGrid2>
    </div>
  </div>
</template>

<style scoped lang="less"></style>
