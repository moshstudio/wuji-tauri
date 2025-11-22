<script setup lang="ts">
import type {
  SongInfo,
  SongList,
  SongUrlMap,
} from '@wuji-tauri/source-extension';
import { LoadImage } from '@wuji-tauri/components/src';
import { joinSongArtists } from '@wuji-tauri/components/src/components/cards/song';
import fetch from '@wuji-tauri/fetch';
import { SongExtension } from '@wuji-tauri/source-extension';
import { showDialog, showFailToast } from 'vant';
import { nextTick, ref } from 'vue';
import SONG_TEMPLATE from '@/components/codeEditor/templates/songTemplate.txt?raw';
import { FormItem } from '@/store/sourceCreateStore';

const props = defineProps<{
  content: FormItem<SongList>;
  updateResult: (
    type: 'song',
    page: 'playUrl',
    result: SongUrlMap | string | undefined,
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
const audioRef = ref<HTMLAudioElement>();
const item = ref<SongInfo>();
const result = ref<SongUrlMap | string>();

async function initLoad() {
  result.value = undefined;
  return await load(1);
}

async function load(pageNo: number) {
  if (!findPage('constructor')?.code) {
    showFailToast('《初始化》code未定义!');
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
    '// @METHOD_CONSTRUCTOR',
    findPage('constructor')!.code,
  )
    .replace('// @METHOD_SONG_LIST', findPage('songList')!.code)
    .replace(
      '// @METHOD_SEARCH_SONG_LIST',
      findPage('searchSongList')!.code,
    )
    .replace('// @METHOD_PLAY_URL', findPage('playUrl')!.code);
  runStatus.value = RunStatus.running;
  try {
    const func = new Function('SongExtension', code);
    const extensionclass = func(SongExtension);
    const cls = new extensionclass() as SongExtension;
    if (!cls.baseUrl) {
      throw new Error('初始化中的baseUrl未定义!');
    }
    cls.log = props.log;
    const aPage = findPage('songList');
    const bPage = findPage('searchSongList');
    if (!aPage?.result?.list.length) {
      item.value = bPage?.result?.list?.[0];
    } else if (!bPage?.result?.list.length) {
      item.value = aPage?.result?.list?.[0];
    } else {
      item.value =
        (aPage.ts || 0) > (bPage.ts || 0)
          ? aPage.result?.list?.[0]
          : bPage.result?.list?.[0];
    }
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
    props.updateResult('song', 'playUrl', result.value, false);
  }
}

async function parseUrl(src: SongUrlMap | string): Promise<string> {
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
      <div class="flex grow select-none flex-col items-center overflow-y-auto">
        <div v-if="item?.picUrl">
          <div class="h-[120px] w-[120px]">
            <LoadImage
              :width="120"
              :height="120"
              :radius="8"
              fit="cover"
              :src="item?.picUrl"
              :headers="item?.picHeaders"
            >
              <template #loading>
                <div class="p-1 text-center text-lg">
                  {{ item.name }}
                </div>
              </template>
            </LoadImage>
          </div>
          <div class="p-1 text-center text-lg">
            {{ item.name }}
          </div>
          <div class="p-1 text-center text-sm">
            {{ joinSongArtists(item.artists) }}
          </div>
        </div>
        <audio ref="audioRef" controls />
      </div>
    </div>
  </div>
</template>

<style scoped lang="less"></style>
