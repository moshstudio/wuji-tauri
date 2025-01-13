<script setup lang="ts">
import { router } from "@/router";
import {
  useStore,
  useSongStore,
  useSongShelfStore,
  useDisplayStore,
} from "@/store";
import _ from "lodash";
import { storeToRefs } from "pinia";
import { showLoadingToast, showToast } from "vant";
import { Icon } from "@iconify/vue";
import { onMounted, onUnmounted, ref, watch } from "vue";
import SongCard from "@/components/card/SongCard.vue";
import ResponsiveGrid from "@/components/ResponsiveGrid.vue";
import SimplePagination from "@/components/SimplePagination.vue";
import AddSongShelfDialog from "@/windows/components/dialogs/AddSongShelf.vue";
import RemoveSongShelfDialog from "@/windows/components/dialogs/RemoveSongShelf.vue";
import { SongShelfType } from "@/types/song";
import { PlaylistInfo, SongShelf } from "@/extensions/song";

const show = defineModel("show", { type: Boolean, default: false });

const store = useStore();
const displayStore = useDisplayStore();
const songStore = useSongStore();
const shelfStore = useSongShelfStore();

const loadPage = async (id: String, pageNo?: number) => {
  const shelf = shelfStore.songPlaylistShelf.find((s) => s.playlist.id === id);
  if (!shelf) return;
  const source = store.getSongSource(shelf.playlist.sourceId);
  if (!source) {
    showToast("找不到歌曲源");
    return;
  }
  const t = showLoadingToast({
    duration: 0,
    closeOnClick: true,
    closeOnClickOverlay: false,
  });
  await store.songPlaylistDetail(source, shelf.playlist, pageNo);
  t.close();
};

const playAll = async (playlist: PlaylistInfo) => {
  if (!playlist) {
    return;
  }
  const t = showLoadingToast({
    message: "加载中",
    duration: 0,
    closeOnClick: true,
    closeOnClickOverlay: false,
  });
  await store.songPlaylistPlayAll(playlist);
  t.close();
};

// 收藏展示相关
const offset = -80;
const shelfAnchors = [offset, Math.round(window.innerHeight) + offset];
const shelfHeight = ref(0);
const hidePanel = () => {
  shelfHeight.value = shelfAnchors[0];
  show.value = false;
};
watch(
  show,
  (newValue) => {
    if (newValue) {
      shelfHeight.value = shelfAnchors[1];
    } else {
      shelfHeight.value = shelfAnchors[0];
    }
  },
  { immediate: true }
);
const updateAnchors = () => {
  shelfAnchors[1] = Math.round(window.innerHeight) + offset;
  if (show.value) {
    shelfHeight.value = shelfAnchors[1];
  }
};
onMounted(() => {
  window.addEventListener("resize", updateAnchors);
});
onUnmounted(() => {
  window.removeEventListener("resize", updateAnchors);
});
</script>

<template>
  <van-floating-panel
    v-model:height="shelfHeight"
    :anchors="shelfAnchors"
    :content-draggable="false"
    @height-change="
      (height) => {
        if (height.height === shelfAnchors[0]) {
          show = false;
        }
      }
    "
    class="absolute left-[50px] right-[0px] w-auto rounded-none up-shadow bottom-[80px]"
    :style="show ? { height: `${shelfHeight}px` } : {}"
  >
    <template #header>
      <div class="flex justify-between items-center p-4 border-b">
        <h2 class="text-lg font-semibold">
          <slot name="title">
            <p class="text-[--van-text-color]">音乐收藏</p>
          </slot>
        </h2>
        <div class="text-button" @click="hidePanel">关闭收藏</div>
      </div>
    </template>
    <div class="flex flex-col w-full h-full">
      <div class="flex gap-2 m-2 p-1 shrink">
        <van-button
          icon="plus"
          size="small"
          round
          @click="() => (displayStore.showAddSongShelfDialog = true)"
        >
          新增收藏夹
        </van-button>
        <van-button
          icon="delete-o"
          size="small"
          round
          @click="() => (displayStore.showRemoveSongShelfDialog = true)"
        >
          删除收藏夹
        </van-button>
      </div>

      <van-tabs shrink @rendered="(id) => loadPage(id)" class="grow">
        <template
          v-for="collection in [
            shelfStore.songLikeShelf,
            ...shelfStore.songCreateShelf,
            ...shelfStore.songPlaylistShelf,
          ]"
          :key="collection.playlist.id"
        >
          <van-tab :name="collection.playlist.id">
            <template #title>
              <span class="max-w-[40px] truncate">
                {{ collection.playlist.name }}
              </span>
            </template>
            <van-row
              align="center"
              class="mt-2"
              v-if="
                collection.type === SongShelfType.playlist &&
                collection.playlist.list?.page &&
                collection.playlist.list?.totalPage &&
                collection.playlist.list?.totalPage > 1
              "
            >
              <SimplePagination
                v-model="collection.playlist.list.page"
                :page-count="collection.playlist.list.totalPage"
                @change="
                  (page: number) => loadPage(collection.playlist.id, page)
                "
              ></SimplePagination>
              <van-button
                size="small"
                @click="() => playAll(collection.playlist)"
              >
                播放全部
              </van-button>
            </van-row>
            <ResponsiveGrid class="pb-4">
              <SongCard
                :song="song"
                v-for="song in collection.playlist.list?.list"
                :key="song.id"
                @play="
                  () =>
                    songStore.setPlayingList(
                      collection.playlist.list?.list || [],
                      song
                    )
                "
              ></SongCard>
            </ResponsiveGrid>
          </van-tab>
        </template>
      </van-tabs>
    </div>
  </van-floating-panel>
  <AddSongShelfDialog></AddSongShelfDialog>
  <RemoveSongShelfDialog></RemoveSongShelfDialog>
</template>

<style scoped lang="less">
:deep(.van-card__thumb) {
  width: 80px;
  height: 100px;
}
</style>
