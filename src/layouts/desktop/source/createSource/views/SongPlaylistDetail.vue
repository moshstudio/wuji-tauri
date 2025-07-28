<script setup lang="ts">
import {
  PlaylistInfo,
  SongExtension,
  PlaylistList,
} from '@wuji-tauri/source-extension';
import { showDialog, showFailToast, showNotify } from 'vant';
import SONG_TEMPLATE from '@/components2/codeEditor/templates/songTemplate.txt?raw';
import { ref } from 'vue';
import MPagination from '@/components2/pagination/MPagination.vue';
import ResponsiveGrid2 from '@/components2/grid/ResponsiveGrid2.vue';
import { joinSongArtists } from '@/utils';
import { WSongCard } from '@wuji-tauri/components/src';

enum RunStatus {
  not_running = 'not_running',
  running = 'running',
  success = 'success',
  error = 'error',
}

const runStatus = ref<RunStatus>(RunStatus.not_running);
const errorMessage = ref('运行失败');
const result = ref<PlaylistInfo>();

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
    page: 'playlistDetail',
    result: PlaylistInfo | undefined,
    padded: boolean,
  ) => void;
  close: () => void;
}>();

async function initLoad() {
  return await load(1);
}

async function load(pageNo: number) {
  if (!findPage('constructor')?.code) {
    showFailToast('《初始化》code未定义!');
    return;
  }
  if (!findPage('playlist')?.passed) {
    showDialog({
      message: '请先执行通过《推荐歌单》',
      showCancelButton: false,
    });
    return;
  }
  if (!findPage('searchPlaylist')?.passed) {
    showDialog({
      message: '请先执行通过《搜索歌单》',
      showCancelButton: false,
    });
    return;
  }
  if (!findPage('playlist')?.result && !findPage('searchPlaylist')?.result) {
    showDialog({
      message: '请先保证《推荐歌单》或《搜索歌单》执行不为空',
      showCancelButton: false,
    });
    return;
  }
  const code = SONG_TEMPLATE.replace(
    'constructor() {}',
    findPage('constructor')!.code,
  )
    .replace(
      'async getRecommendPlaylists(pageNo) {}',
      findPage('playlist')!.code,
    )
    .replace(
      'async searchPlaylists(keyword, pageNo) {}',
      findPage('searchPlaylist')!.code,
    )
    .replace(
      'async getPlaylistDetail(item, pageNo) {}',
      findPage('playlistDetail')!.code,
    );
  runStatus.value = RunStatus.running;
  try {
    const func = new Function('SongExtension', code);
    const extensionclass = func(SongExtension);
    const cls = new extensionclass() as SongExtension;
    if (!cls.baseUrl) {
      throw new Error('初始化中的baseUrl未定义!');
    }
    const item =
      findPage('playlist')?.result?.list?.[0] ||
      findPage('searchPlaylist')?.result?.list?.[0];
    if (!item) {
      throw new Error('请先保证《推荐歌单》或《搜索歌单》执行不为空');
    }
    const res = await cls?.execGetPlaylistDetail(item, pageNo);
    if (!res) {
      throw new Error('获取详情失败! 返回结果为空');
    }
    result.value = res;
    props.updateResult('song', 'playlistDetail', result.value, true);
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
      <div class="flex grow select-none flex-col overflow-y-auto">
        <div class="head flex flex-col items-center gap-2 rounded p-4 shadow">
          <div class="flex items-center justify-center gap-2">
            <div class="h-[120px] w-[120px]">
              <LoadImage
                v-if="result?.picUrl"
                :width="120"
                :height="120"
                :radius="8"
                fit="cover"
                :src="result?.picUrl"
                :headers="result?.picHeaders"
              >
                <template #loading>
                  <div class="p-1 text-center text-lg">
                    {{ result.name }}
                  </div>
                </template>
              </LoadImage>
            </div>

            <div class="line-clamp-3 text-lg font-bold text-[--van-text-color]">
              {{ result?.name }}
            </div>
          </div>
          <van-text-ellipsis
            :content="result?.desc"
            rows="3"
            expand-text="展开"
            collapse-text="收起"
            class="text-xs text-gray-400"
          />
        </div>

        <div class="flex flex-nowrap px-2">
          <MPagination
            v-if="result?.list?.totalPage"
            :page-no="result.list.page"
            :page-count="result.list.totalPage"
            class="p-1"
            :to-page="(pageNo) => load(pageNo)"
          />
        </div>
        <ResponsiveGrid2>
          <template v-for="song in result?.list?.list" :key="song.id">
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
  </div>
</template>

<style scoped lang="less"></style>
