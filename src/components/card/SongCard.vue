<script setup lang="ts">
import { SongInfo } from '@/extensions/song';
import { PropType, ref, toRaw } from 'vue';
import { useSongStore, useSongShelfStore, useDisplayStore } from '@/store';
import { Icon } from '@iconify/vue';
import { joinSongArtists } from '@/utils';

const props = defineProps({
  song: {
    type: Object as PropType<SongInfo>,
    required: true,
  },
  class: {
    type: [String, Array, Object],
    default: '',
  },
});
const song = props.song;
const emit = defineEmits(['play']);

const displayStore = useDisplayStore();
const songStore = useSongStore();
const shelfStore = useSongShelfStore();

const playButtonVisible = ref(false);
const showHint = ref(false);
const showAddDialog = ref(false);

function onMouseEnter() {
  if (!displayStore.isMobile) {
    playButtonVisible.value = true;
    showHint.value = true;
  }
}
function onMouseLeave() {
  if (!displayStore.isMobile) {
    playButtonVisible.value = false;
    showHint.value = false;
  }
}

const onPlay = () => {
  emit('play');
};
const onPause = () => {
  songStore.onPause();
};
const onClick = () => {
  if (displayStore.isMobile) {
    onPlay();
  }
};
const onDbClick = () => {
  if (!displayStore.isMobile) {
    if (songStore.playingSong?.id === song.id && songStore.isPlaying) {
      onPause();
    } else {
      onPlay();
    }
  }
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
    @click="onClick"
    @dblclick="onDbClick"
  >
    <div class="relative flex items-center justify-center">
      <van-image
        width="40"
        height="40"
        radius="4"
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
          @click.stop="onPause"
          v-if="songStore.playingSong?.id === song.id && songStore.isPlaying"
        />
        <van-icon
          name="play"
          class="text-white"
          size="16"
          @click.stop="onPlay"
          v-else
        />
      </div>
    </div>

    <div
      class="grow flex flex-col w-full pl-2 text-xs min-w-[10px] justify-around truncate"
    >
      <span class="text-[--van-text-color] font-bold truncate">
        {{ song.name }}
      </span>
      <span class="text-[gray] truncate">
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
          :label="`${item.playlist.list?.list.length || 0}首音乐`"
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
