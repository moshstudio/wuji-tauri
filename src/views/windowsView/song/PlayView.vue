<script lang="ts" setup>
import { ref, CSSProperties, PropType } from 'vue';
import { useSongStore } from '@/store';
import { storeToRefs } from 'pinia';
import { Icon } from '@iconify/vue';
import { Lyric } from '@/utils/lyric';

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
    class="absolute left-[50px] right-[0px] w-auto rounded-none up-shadow bottom-[80px] playing-bg"
    :style="show ? { height: `${shelfHeight}px` } : {}"
  >
    <template #header>
      <div class="flex px-6 pt-3 absolute">
        <van-button
          icon="arrow-down"
          plain
          size="small"
          @click="() => emit('hidePanel')"
        ></van-button>
      </div>
    </template>
    <template v-if="playingSong">
      <div
        class="flex w-full h-full justify-around px-10 overflow-hidden select-none"
      >
        <div
          class="cover-area flex flex-col justify-center items-center w-[50%] mr-4"
          v-if="playingSong.picUrl"
        >
          <div
            class="relative animate-spin-slow w-[200px] h-[200px] sm:w-[250px] sm:h-[250px] md:w-[300px] md:h-[300px] lg:w-[350px] lg:h-[350px]"
            :class="{ 'pause-spin': !isPlaying }"
          >
            <van-image
              width="100%"
              height="100%"
              round
              :src="playingSong.picUrl"
              class="p-5"
            >
              <template #loading>
                <Icon
                  icon="pepicons-pop:music-note-double"
                  width="min(15vh, 15vw)"
                  height="min(15vh, 15vw)"
                />
              </template>
              <template #error>
                <Icon
                  icon="pepicons-pop:music-note-double"
                  width="min(15vh, 15vw)"
                  height="min(15vh, 15vw)"
                />
              </template>
            </van-image>
            <span
              class="mask absolute top-0 left-0 w-full h-full bg-cover"
            ></span>
          </div>
        </div>
        <div class="w-[80%] sm:w-[50%]" v-if="lyric">
          <ul
            class="flex flex-col gap-[10px] justify-start items-center text-center p-6 mt-[30vh] transition ease-in-out duration-500"
            :style="transformStyle"
          >
            <li
              class="lyric-line list-none text-gray-200 leading-1 cursor-pointer transition ease-in-out duration-500"
              :class="activeIndex === index ? 'active-line' : ''"
              :data-index="index"
              v-for="(item, index) in lyric"
              :key="item.position"
            >
              {{ item.lyric }}
            </li>
          </ul>
        </div>
        <div
          class="w-[80%] sm:w-[50%] mt-[30vh] flex flex-col justify-start items-center text-gray-200"
          v-else
        >
          暂无歌词
        </div>
      </div>
    </template>
    <template v-else>
      <div class="overflow-hidden select-none">{{ lyric }}</div>
    </template>
  </van-floating-panel>
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
  background-color: rgba(0, 0, 0, 0.5); /* 变暗效果，0.5表示50%的透明度 */
  z-index: -1; /* 确保伪元素在内容下方 */
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
