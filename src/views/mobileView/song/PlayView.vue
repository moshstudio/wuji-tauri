<script lang="ts" setup>
import { ref, CSSProperties, PropType } from 'vue';
import { useDisplayStore, useSongShelfStore, useSongStore } from '@/store';
import { storeToRefs } from 'pinia';
import { Lyric } from '@/utils/lyric';
import { transTime } from '@/utils';
import MoreOptionsSheet from '@/components/actionSheets/MoreOptions.vue';
import SongSelectShelfSheet from '@/components/actionSheets/SongSelectShelf.vue';
import LoadImage from '@/components/LoadImage.vue';
import CDSVG from '@/assets/cd.svg';

const songStore = useSongStore();
const { playingSong, isPlaying } = storeToRefs(songStore);

const show = defineModel('show', { type: Boolean, default: false });
const lyric = defineModel('lyric', { type: Object as PropType<Lyric> });
const activeIndex = defineModel('activeIndex', { type: Number, default: 0 }); //高亮Index
const transformStyle = defineModel('transformStyle', {
  type: String,
  default: '',
}); //偏移量
const panelBackgroundStyle = defineModel('panelBackgroundStyle', {
  type: Object as PropType<CSSProperties>,
  default: { 'background-color': 'rgba(0, 0, 0, 0.1)' },
});
const shelfAnchors = defineModel('shelfAnchors', {
  type: Array as PropType<number[]>,
  required: true,
});
const shelfHeight = defineModel('shelfHeight', { type: Number, default: 0 });

const emit = defineEmits<{
  (e: 'hidePanel'): void;
}>();

const shelfStore = useSongShelfStore();

const isFlipped = ref(false);
const showMoreOptions = ref(false);
const showAddToShelfSheet = ref(false);

const flipCard = () => {
  isFlipped.value = !isFlipped.value;
};
const addSongToShelf = (shelfId: string) => {
  shelfStore.addSongToShelf(playingSong.value, shelfId);
};
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
    class="absolute z-[1000] left-[0px] right-[0px] w-auto h-full rounded-none up-shadow bottom-[110px] overflow-hidden playing-bg"
    :style="show ? { height: `${shelfHeight}px` } : {}"
  >
    <template #header>
      <van-row class="absolute p-4 z-[1001]">
        <van-icon
          name="arrow-left"
          class="text-white van-haptics-feedback"
          @click.self="() => (show = false)"
        />
      </van-row>
    </template>
    <div class="flip-card" :class="{ flipped: isFlipped }" v-if="playingSong">
      <div class="front flex flex-col gap-2" @click="flipCard">
        <div
          class="relative animate-spin-slow w-[200px] h-[200px] sm:w-[250px] sm:h-[250px] md:w-[300px] md:h-[300px] lg:w-[350px] lg:h-[350px]"
          :class="{ 'pause-spin': !isPlaying }"
        >
          <div class="absolute top-0 right-0 w-full h-full border-box p-3">
            <LoadImage
              round
              :src="playingSong.picUrl || ''"
              :headers="playingSong.picHeaders"
              class="w-full h-full"
            >
              <template #loading>
                <van-image fit="cover" :src="CDSVG" class="w-full h-full" />
              </template>
              <template #error>
                <van-image fit="cover" :src="CDSVG" class="w-full h-full" />
              </template>
            </LoadImage>
          </div>

          <span
            class="mask absolute top-0 left-0 w-full h-full bg-cover"
          ></span>
        </div>
        <div class="flex gap-2 px-4 w-full items-center justify-between mt-12">
          <div class="left flex gap-1 items-center text-xs text-gray-400">
            <span>
              {{ transTime(songStore.audioCurrent) }}
            </span>
            /
            <span>
              {{ transTime(songStore.audioDuration) }}
            </span>
          </div>
          <div class="right flex gap-2">
            <div class="clickable p-1">
              <van-icon
                class="text-red-600"
                name="like"
                size="20"
                @click.stop="() => shelfStore.removeSongFromShelf(playingSong)"
                v-if="shelfStore.songInLikeShelf(playingSong)"
              />
              <van-icon
                name="like-o"
                class="text-gray-400"
                size="20"
                @click.stop="() => shelfStore.addSongToShelf(playingSong)"
                v-else
              />
            </div>
            <div
              class="clickable p-1"
              @click.stop="() => (showMoreOptions = true)"
            >
              <van-icon
                name="ellipsis"
                class="clickable text-gray-400"
                size="16"
              />
            </div>
          </div>
        </div>
      </div>
      <div class="back" @click="flipCard">
        <div class="w-[90%]" v-if="lyric">
          <ul
            class="flex flex-col gap-[10px] justify-start items-center text-center p-6 mt-[30vh] transition ease-in-out duration-500"
            :style="transformStyle"
          >
            <li
              class="lyric-line list-none text-sm text-white leading-1 cursor-pointer transition ease-in-out duration-500"
              :class="activeIndex === index ? 'active-line' : ''"
              :data-index="index"
              v-for="(item, index) in lyric"
              :key="item.position"
            >
              {{ item.lyric }}
            </li>
          </ul>
        </div>
        <div v-else class="text-sm text-white mt-[30vh]">没有歌词</div>
      </div>
    </div>
    <MoreOptionsSheet
      v-model="showMoreOptions"
      :actions="[
        {
          name: '添加到收藏夹',
          color: '#1989fa',
          callback: () => {
            showMoreOptions = false;
            showAddToShelfSheet = true;
          },
        },
      ]"
    ></MoreOptionsSheet>
    <SongSelectShelfSheet
      v-model:show="showAddToShelfSheet"
      :song="songStore.playingSong"
      title="选择收藏夹"
      :show-confirm-button="false"
      teleport="body"
      show-cancel-button
      v-if="songStore.playingSong"
    >
    </SongSelectShelfSheet>
  </van-floating-panel>
</template>
<style scoped lang="less">
:deep(.van-floating-panel__content) {
  background-color: transparent;
}
.lyric-line {
  &.active-line {
    color: greenyellow !important;
    transform: scale(1.2);
  }
}
.playing-bg {
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-size: cover;
    background-position: center;
    background-image: v-bind('panelBackgroundStyle.backgroundImage');
    filter: blur(10px); /* 高斯模糊效果 */
    z-index: -1; /* 确保伪元素在内容下方 */
  }
}

.playing-bg::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    135deg,
    #4b6cb7 0%,
    #182848 100%
  ); /* 变暗效果，0.5表示50%的透明度 */
  opacity: 0.5;
  z-index: -1; /* 确保伪元素在内容下方 */
}
.dark .playing-bg::after {
  background: linear-gradient(
    135deg,
    #1e3c72 0%,
    #2a5298 100%
  ); /* 变暗效果，0.5表示50%的透明度 */
}

@media screen and (max-width: 640px) {
  .cover-area {
    display: none;
  }
}
.pause-spin {
  animation-play-state: paused;
}
.mask {
  background: no-repeat url(@/assets/coverall.png);
  background-size: contain;
}

.flip-card {
  width: 100%;
  height: 100%;
  perspective: 10000px;
  cursor: pointer;
  transform-style: preserve-3d; /* 确保子元素在 3D 空间内渲染 */
  position: relative; /* 确保子元素的绝对定位相对于此容器 */
  will-change: transform; /* 优化渲染性能 */
  overflow: hidden;
}

.flipped .front {
  transform: rotateY(180deg);
}

.flipped .back {
  transform: rotateY(0deg);
}

.front,
.back {
  width: 100%;
  height: 100%;
  position: absolute;
  backface-visibility: hidden;
  transition: transform 0.6s;
  clip-path: inset(0 0 0 0); /* 裁剪内容 */
  transform: translateZ(1px); /* 强制分层 */
}

.front {
  display: flex;
  justify-content: center;
  align-items: center;
  transform: rotateY(0deg);
}

.back {
  display: flex;
  justify-content: center;
  align-items: start;
  transform: rotateY(-180deg);
}
</style>
