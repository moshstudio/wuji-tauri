<script setup lang="ts">
import type { SongList } from '@wuji-tauri/source-extension';
import { WSongCard } from '@wuji-tauri/components/src';
import { SongExtension } from '@wuji-tauri/source-extension';
import { showFailToast } from 'vant';
import { ref } from 'vue';
import SONG_TEMPLATE from '@/components/codeEditor/templates/songTemplate.txt?raw';
import ResponsiveGrid2 from '@/components/grid/ResponsiveGrid2.vue';
import MPagination from '@/components/pagination/MPagination.vue';
import SearchField from '@/components/search/SearchField.vue';
import { FormItem } from '@/store/sourceCreateStore';

const props = defineProps<{
  content: FormItem<SongList>;
  updateResult: (
    type: 'song',
    page: 'searchSongList',
    result: SongList | undefined,
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

const searchHistories = ref([]);
const runStatus = ref<RunStatus>(RunStatus.not_running);
const errorMessage = ref('运行失败');
const result = ref<SongList | undefined>();
const keyword = ref('你');

async function initLoad() {
  result.value = undefined;
  return await load(1);
}

async function load(pageNo: number) {
  if (!findPage('constructor')?.code) {
    showFailToast('《初始化》code未定义!');
    return;
  }
  if (!findPage('searchSongList')?.code) {
    showFailToast('code未定义!');
    return;
  }
  const code = SONG_TEMPLATE.replace(
    '// @METHOD_CONSTRUCTOR',
    findPage('constructor')!.code,
  ).replace(
    '// @METHOD_SEARCH_SONG_LIST',
    findPage('searchSongList')!.code,
  );
  runStatus.value = RunStatus.running;
  try {
    const func = new Function('SongExtension', code);
    const extensionclass = func(SongExtension);
    const cls = new extensionclass() as SongExtension;
    if (!cls.baseUrl) {
      throw new Error('初始化中的baseUrl未定义!');
    }
    cls.log = props.log;
    const res = await cls?.execSearchSongs(keyword.value, pageNo);
    if (!res) {
      throw new Error('获取搜索列表失败! 返回结果为空');
    }
    result.value = res;
    props.updateResult('song', 'searchSongList', result.value, true);
    runStatus.value = RunStatus.success;
  } catch (error) {
    errorMessage.value = String(error);
    runStatus.value = RunStatus.error;
    props.updateResult('song', 'searchSongList', result.value, false);
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
      <div class="flex items-center justify-center">
        <SearchField
          v-model:value="keyword"
          v-model:search-histories="searchHistories"
          :search="() => initLoad()"
        />
      </div>
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
            :show-more-options="() => {}"
          />
        </template>
      </ResponsiveGrid2>
    </div>
  </div>
</template>

<style scoped lang="less"></style>
