<script setup lang="ts">
import { SongInfo } from "@/extensions/song";
import { ref, toRaw } from "vue";
import { useSongStore, useSongShelfStore } from "@/store";
import { Icon } from "@iconify/vue";
import { joinSongArtists } from "@/utils";

const props = defineProps({
  song: {
    type: Object as () => SongInfo,
    required: true,
  },
  class: {
    type: [String, Array, Object],
    default: "",
  },
});
const song = props.song;
const emit = defineEmits(["play"]);

const songStore = useSongStore();
const shelfStore = useSongShelfStore();

const playButtonVisible = ref(false);
const showHint = ref(false);
const showAddDialog = ref(false);

function onMouseEnter() {
  playButtonVisible.value = true;
  showHint.value = true;
}
function onMouseLeave() {
  playButtonVisible.value = false;
  showHint.value = false;
}

const onPlay = () => {
  emit("play");
};
const onPause = () => {
  songStore.onPause();
};

const addSongToShelf = (shelfId: string) => {
  const res = shelfStore.addSongToShelf(song, shelfId);
  if (res) {
    showAddDialog.value = false;
  }
};
</script>

<template>
  <div
    class="relative flex items-center max-w-[400px] p-1 hover:bg-[--van-background] hover:shadow-md rounded-lg select-none"
    :class="props.class"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @dblclick="
      () => {
        if (songStore.playingSong?.id === song.id && songStore.isPlaying) {
          onPause();
        } else {
          onPlay();
        }
      }
    "
  >
    <div class="relative flex items-center justify-center">
      <van-image
        width="40"
        height="40"
        radius="8"
        fit="cover"
        lazy-load
        :src="song.picUrl"
      >
        <template v-slot:loading>
          <Icon icon="basil:music-solid" width="24" height="24" />
        </template>
        <template v-slot:error>
          <Icon icon="basil:music-solid" width="24" height="24" />
        </template>
      </van-image>
      <div
        class="absolute leading-[16px] rounded-[50%] bg-black/50 p-1 hover:scale-110 cursor-pointer"
        v-if="
          playButtonVisible ||
          (songStore.playingSong?.id === song.id && songStore.isPlaying)
        "
      >
        <van-icon
          name="pause"
          class="text-white"
          size="16"
          @click="onPause"
          v-if="songStore.playingSong?.id === song.id && songStore.isPlaying"
        />
        <van-icon
          name="play"
          class="text-white"
          size="16"
          @click="onPlay"
          v-else
        />
      </div>
    </div>

    <div class="flex flex-col grow justify-around w-full">
      <span
        class="pl-2 text-xs text-[--van-text-color] font-bold w-[calc(100%-40px)] min-w-[100px] truncate"
      >
        {{ song.name }}
      </span>
      <span class="pl-2 text-xs text-[gray] w-[calc(100%-40px)] truncate">
        {{ joinSongArtists(song.artists) }}
      </span>
    </div>
    <div
      class="absolute right-0 px-2 flex gap-2 h-full items-center justify-center bg-[--van-background]"
      v-if="showHint"
    >
      <div class="clickable">
        <van-icon
          class="text-red-600"
          name="like"
          size="20"
          @click="() => shelfStore.removeSongFromShelf(song)"
          v-if="shelfStore.songInLikeShelf(song)"
        />
        <van-icon
          class="text-[--van-text-color]"
          name="like-o"
          size="20"
          @click="() => shelfStore.addSongToShelf(song)"
          v-else
        />
      </div>
      <van-icon
        name="ellipsis"
        class="clickable text-[--van-text-color]"
        size="16"
        @click="() => (showAddDialog = true)"
      />
    </div>
    <van-dialog
      v-model:show="showAddDialog"
      title="选择收藏夹"
      :show-confirm-button="false"
      teleport="body"
      show-cancel-button
    >
      <van-cell-group>
        <van-cell
          v-for="item in [
            shelfStore.songLikeShelf,
            ...shelfStore.songCreateShelf,
          ]"
          :key="item.playlist.id"
          :title="item.playlist.name"
          :label="`${item.playlist.list?.list.length}首音乐`"
          center
          clickable
          @click="addSongToShelf(item.playlist.id)"
        >
        </van-cell>
      </van-cell-group>
    </van-dialog>
  </div>
</template>

<style scoped lang="less">
:deep(.van-image__img) {
  border-radius: 0.5rem 0.5rem 0 0;
}
</style>
