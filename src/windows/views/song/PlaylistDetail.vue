<script setup lang="ts">
import { PlaylistInfo } from "@/extensions/song";
import { router } from "@/router";
import { useStore, useSongStore, useSongShelfStore } from "@/store";
import { SongSource } from "@/types";
import { showLoadingToast, showToast } from "vant";
import { ref, triggerRef, onActivated, watch } from "vue";
import SongCard from "@/components/card/SongCard.vue";
import SongBar from "@/windows/components/SongBar.vue";
import SongShelf from "./SongShelf.vue";
import SimplePagination from "@/components/SimplePagination.vue";
import { debounce } from "lodash";
import { retryOnFalse, sleep } from "@/utils";

const { playlistId, sourceId } = defineProps({
  playlistId: String,
  sourceId: String,
});

const store = useStore();
const songStore = useSongStore();
const shelfStore = useSongShelfStore();
const songSource = ref<SongSource>();
const playlist = ref<PlaylistInfo>();

const showShelf = ref(false);
const currentPage = ref(1);
const content = ref<HTMLElement>();
const shouldLoad = ref(true);
function back() {
  shouldLoad.value = true;
  router.push({ name: "Song" });
}

const loadData = retryOnFalse({ onFailed: back })(async (pageNo?: number) => {
  songSource.value = undefined;
  playlist.value = undefined;
  currentPage.value = 1;

  if (pageNo) {
    currentPage.value = pageNo;
  }
  if (!playlistId || !sourceId) {
    return false;
  }
  const source = store.getSongSource(sourceId);
  if (!source) {
    shouldLoad.value = true;
    return false;
  }
  songSource.value = source;

  const item = await store.getPlaylistInfo(source, playlistId);
  if (!item) {
    return false;
  }

  playlist.value = item;

  const toast = showLoadingToast({
    message: "加载中",
    duration: 0,
    closeOnClick: true,
    closeOnClickOverlay: false,
  });
  const detail = await store.songPlaylistDetail(
    source!,
    playlist.value!,
    currentPage.value
  );
  toast.close();
  if (detail) {
    playlist.value = detail;
    triggerRef(playlist);
  }
  if (!detail?.list?.list) {
    showToast("播放列表为空");
  }
  currentPage.value = detail?.list?.page || 1;
  content.value!.scrollTop = 0;
  return true;
});
const toPage = debounce(loadData, 600);

const playAll = async () => {
  if (!playlist.value) {
    return;
  }
  const t = showLoadingToast({
    message: "加载中",
    duration: 0,
    closeOnClick: true,
    closeOnClickOverlay: false,
  });
  await store.songPlaylistPlayAll(playlist.value);
  t.close();
};
const addToShelf = () => {
  if (!playlist.value) return;
  const res = shelfStore.addPlaylistToShelf(playlist.value);
  if (res) {
    showToast("收藏成功");
  }
};

watch([() => playlistId, () => sourceId], () => {
  shouldLoad.value = false; // watch这里优先load
  loadData();
});
onActivated(async () => {
  await sleep(200);
  if (shouldLoad.value) {
    shouldLoad.value = false;
    loadData();
  }
});
</script>

<template>
  <div class="flex flex-col h-full">
    <van-nav-bar left-arrow @click-left="back" />
    <div
      ref="content"
      class="flex flex-col px-4 pb-12 bg-[--van-background-2] grow gap-2 w-full overflow-y-auto"
    >
      <div class="head flex justify-center my-4">
        <van-image
          v-if="playlist?.picUrl"
          width="120"
          height="120"
          radius="8"
          fit="cover"
          lazy-load
          :src="playlist?.picUrl"
        >
          <template v-slot:loading>
            <div class="text-center text-lg p-1">
              {{ playlist.name }}
            </div>
          </template>
        </van-image>
        <div class="p-4 flex flex-col min-w-[100px] max-w-[50%] justify-around">
          <van-text-ellipsis
            :content="playlist?.name"
            rows="3"
            class="text-[--van-text-color] text-lg font-bold"
          />
          <van-text-ellipsis
            :content="playlist?.desc"
            rows="3"
            expand-text="展开"
            collapse-text="收起"
            class="text-xs min-w-[100px] max-w-[50%] text-gray-400"
          />
        </div>
      </div>
      <van-row
        justify="end"
        align="center"
        v-if="playlist?.list?.list"
        class="w-[80%] bg-[--van-background-2] gap-2"
      >
        <template v-if="shelfStore.playlistInShelf(playlist)">
          <van-button
            size="small"
            type="primary"
            @click="() => (showShelf = !showShelf)"
          >
            已收藏
          </van-button>
        </template>
        <template v-else>
          <van-button size="small" type="primary" @click="addToShelf">
            收藏
          </van-button>
        </template>

        <van-button size="small" @click="playAll"> 播放全部 </van-button>

        <SimplePagination
          v-model="currentPage"
          :page-count="playlist.list.totalPage"
          class="p-1"
          @change="(pageNo) => toPage(pageNo)"
          v-if="playlist.list.totalPage"
        />
      </van-row>
      <template v-for="item in playlist?.list?.list" :key="item.id">
        <SongCard
          :song="item"
          @play="songStore.setPlayingList(playlist!.list!.list, item)"
          class="mx-auto w-[80%]"
        ></SongCard>
      </template>
    </div>
    <SongBar></SongBar>
    <SongShelf v-model:show="showShelf"></SongShelf>
  </div>
</template>

<style scoped lang="less"></style>
