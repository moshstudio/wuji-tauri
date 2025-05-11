<script setup lang="ts">
import {
  SongInfo,
  SongExtension,
  SongList,
  SongUrlMap,
} from '@/extensions/song';
import { showDialog, showNotify } from 'vant';
import SONG_TEMPLATE from '@/components/codeEditor/templates/songTemplate.txt?raw';
import { nextTick, ref } from 'vue';
import SimplePagination from '@/components/pagination/SimplePagination.vue';
import ResponsiveGrid2 from '@/components/ResponsiveGrid2.vue';
import { joinSongArtists } from '@/utils';
import fetch from '@/utils/fetch';

enum RunStatus {
  not_running = 'not_running',
  running = 'running',
  success = 'success',
  error = 'error',
}

const runStatus = ref<RunStatus>(RunStatus.not_running);
const errorMessage = ref('运行失败');
const audioRef = ref<HTMLAudioElement>();
const item = ref<SongInfo>();
const result = ref<SongUrlMap | string>();

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
    page: 'playUrl',
    result: SongUrlMap | string | undefined,
    padded: boolean,
  ) => void;
  close: () => void;
}>();

async function initLoad() {
  return await load(1);
}

async function load(pageNo: number) {
  if (!findPage('constructor')?.code) {
    showNotify('《初始化》code未定义!');
    return;
  }
  if (!findPage('songList')?.passed) {
    showDialog({
      message: '请先执行通过《推荐歌曲》',
      showCancelButton: false,
    });
    return;
  }
  if (!findPage('searchSongList')?.passed) {
    showDialog({
      message: '请先执行通过《搜索歌曲》',
      showCancelButton: false,
    });
    return;
  }
  if (!findPage('songList')?.result && !findPage('searchSongList')?.result) {
    showDialog({
      message: '请先保证《推荐歌曲》或《搜索歌曲》执行不为空',
      showCancelButton: false,
    });
    return;
  }
  const code = SONG_TEMPLATE.replace(
    'constructor() {}',
    findPage('constructor')!.code,
  )
    .replace('async getRecommendSongs(pageNo) {}', findPage('songList')!.code)
    .replace(
      'async searchSongs(keyword, pageNo) {}',
      findPage('searchPlaylist')!.code,
    )
    .replace('async getSongUrl(item, size) {}', findPage('playUrl')!.code);
  runStatus.value = RunStatus.running;
  try {
    const func = new Function('SongExtension', code);
    const extensionclass = func(SongExtension);
    const cls = new extensionclass() as SongExtension;
    if (!cls.baseUrl) {
      throw new Error('初始化中的baseUrl未定义!');
    }
    item.value =
      findPage('songList')?.result?.list?.[0] ||
      findPage('searchSongList')?.result?.list?.[0];
    if (!item.value) {
      throw new Error('请先保证《推荐歌单》或《搜索歌单》执行不为空');
    }
    const res = await cls?.execGetSongUrl(item.value);
    if (!res) {
      throw new Error('获取播放地址失败! 返回结果为空');
    }
    const url = await parseUrl(res);
    if (!url) {
      throw new Error('获取播放地址失败!');
    }
    result.value = res;
    props.updateResult('song', 'playUrl', result.value, true);
    runStatus.value = RunStatus.success;
    nextTick(async () => {
      if (audioRef.value) {
        audioRef.value.src = await parseUrl(res);
      }
    });
  } catch (error) {
    errorMessage.value = String(error);
    runStatus.value = RunStatus.error;
  }
}

const parseUrl = async (src: SongUrlMap | string): Promise<string> => {
  if (typeof src === 'string') {
    return src;
  } else {
    const url =
      src['128k'] || src['128'] || src['320k'] || src['320'] || src.flac || '';
    if (src.headers) {
      const response = await fetch(url, {
        headers: src.headers,
      });
      return URL.createObjectURL(await response.blob());
    } else {
      return url;
    }
  }
};

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
      <div class="grow flex flex-col items-center overflow-y-auto select-none">
        <div v-if="item?.picUrl">
          <div class="w-[120px] h-[120px]">
            <LoadImage
              :width="120"
              :height="120"
              :radius="8"
              fit="cover"
              lazy-load
              :src="item?.picUrl"
              :headers="item?.picHeaders"
            >
              <template #loading>
                <div class="text-center text-lg p-1">
                  {{ item.name }}
                </div>
              </template>
            </LoadImage>
          </div>
          <div class="text-center text-lg p-1">
            {{ item.name }}
          </div>
          <div class="text-center text-sm p-1">
            {{ joinSongArtists(item.artists) }}
          </div>
        </div>
        <audio ref="audioRef" controls></audio>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less"></style>
