<script lang="ts" setup>
import type { Lyric } from '@/utils/lyric';
import type { CSSProperties, PropType } from 'vue';
import CDSVG from '@/assets/cd.svg';
import LoadImage from '@/components/LoadImage.vue';
import { useSongStore } from '@/store';
import { storeToRefs } from 'pinia';

const songStore = useSongStore();
const { playingSong, isPlaying } = storeToRefs(songStore);

const show = defineModel('show', { type: Boolean, default: false });
const lyric = defineModel('lyric', { type: Object as PropType<Lyric> });
const activeIndex = defineModel('activeIndex', { type: Number, default: 0 }); // 高亮Index
const transformStyle = defineModel('transformStyle', {
  type: String,
  default: '',
}); // 偏移量
const panelBackgroundStyle = defineModel('panelBackgroundStyle', {
  type: Object as PropType<CSSProperties>,
  default: { 'background-color': 'rgba(0, 0, 0, 0.1)' },
});
</script>

<template>
  <van-popup
    v-model:show="show"
    position="bottom"
    z-index="1000"
    class="playing-bg overflow-hidden sticky left-0 top-0 right-0 bottom-0 w-full h-full"
    :overlay="false"
  >
    <div class="flex px-6 pt-3 absolute">
      <van-button icon="arrow-down" plain size="small" @click="show = false" />
    </div>
    <template v-if="playingSong">
      <div
        class="flex w-full h-full justify-around px-10 overflow-hidden select-none"
      >
        <div
          v-if="playingSong.picUrl"
          class="cover-area flex flex-col justify-center items-center w-[50%] mr-4"
        >
          <div
            class="relative animate-spin-slow w-[200px] h-[200px] sm:w-[250px] sm:h-[250px] md:w-[300px] md:h-[300px] lg:w-[350px] lg:h-[350px]"
            :class="{ 'pause-spin': !isPlaying }"
          >
            <div class="absolute top-0 right-0 w-full h-full border-box p-3">
              <LoadImage
                round
                :src="playingSong.picUrl"
                :headers="playingSong.picHeaders"
                class="w-full h-full"
              >
                <template #loading>
                  <van-image fit="cover" :src="CDSVG" class="w-full h-full" />
                </template>
                <template #error>
                  <van-image fit="cover" :src="CDSVG" class="w-full h-full" />
                  <!-- <Icon
                    icon="pepicons-pop:music-note-double"
                    class="min-w-[min(15vh, 15vw)] min-h-[min(15vh, 15vw)]"
                    width="min(15vh, 15vw)"
                    height="min(15vh, 15vw)"
                  /> -->
                </template>
              </LoadImage>
            </div>

            <span class="mask absolute top-0 left-0 w-full h-full bg-cover" />
          </div>
        </div>
        <div v-if="lyric" class="w-[80%] sm:w-[50%]">
          <ul
            class="flex flex-col gap-[10px] justify-start items-center text-center p-6 mt-[30vh] transition ease-in-out duration-500"
            :style="transformStyle"
          >
            <li
              v-for="(item, index) in lyric"
              :key="item.position"
              class="lyric-line list-none text-gray-200 leading-1 cursor-pointer transition ease-in-out duration-500"
              :class="activeIndex === index ? 'active-line' : ''"
              :data-index="index"
            >
              {{ item.lyric }}
            </li>
          </ul>
        </div>
        <div
          v-else
          class="w-[80%] sm:w-[50%] mt-[30vh] flex flex-col justify-start items-center text-gray-200"
        >
          暂无歌词
        </div>
      </div>
    </template>
    <template v-else>
      <div class="overflow-hidden select-none">
        {{ lyric }}
      </div>
    </template>
  </van-popup>
</template>

<style scoped lang="less">
:deep(.van-floating-panel__content) {
  background-color: transparent;
}
.lyric-line {
  &.active-line {
    color: greenyellow;
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
</style>
