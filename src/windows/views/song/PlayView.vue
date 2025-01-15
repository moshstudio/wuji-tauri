<script lang="ts" setup>
import { onMounted, onUnmounted, ref, watch, CSSProperties } from "vue";
import { useSongStore } from "@/store";
import { storeToRefs } from "pinia";
import { Icon } from "@iconify/vue";
import { getLyric, Lyric, parseLyric } from "@/utils/lyric";

const show = defineModel("show", { type: Boolean, default: false });

const songStore = useSongStore();
const { playingSong, isPlaying, audioCurrent } = storeToRefs(songStore);
const lyric = ref<Lyric>();
const activeIndex = ref<number>(0); //高亮Index
const transformStyle = ref<string>(""); //偏移量
const panelBackgroundStyle = ref<CSSProperties>({
  "background-color": "rgba(0, 0, 0, 0.1)",
});

watch(
  playingSong,
  async (newSong) => {
    if (!newSong) {
      return;
    }
    if (newSong.picUrl || newSong.bigPicUrl) {
      panelBackgroundStyle.value.backgroundColor = "";
      panelBackgroundStyle.value.backgroundImage = `url(${newSong.bigPicUrl || newSong.picUrl})`;
    } else {
      //background-color: #4158D0;
      //background-image: linear-gradient(43deg, #4158D0 0%, #C850C0 46%, #FFCC70 100%);

      // 定义渐变方向
      const direction = "43deg";
      // 定义颜色停止点
      const colorStops = [
        { color: "#4158D0", position: 0 },
        { color: "#C850C0", position: 46 },
        { color: "#FFCC70", position: 100 },
      ];
      panelBackgroundStyle.value.backgroundColor = "#4158D0";
      panelBackgroundStyle.value.backgroundImage = `linear-gradient(${direction}, ${colorStops
        .map((colorStop) => `${colorStop.color} ${colorStop.position}%`)
        .join(", ")})`;
    }
    lyric.value = undefined;
    if (newSong.lyric) {
      lyric.value = parseLyric(newSong.lyric);
    } else if (newSong.name) {
      const singer = newSong.artists
        ?.map((artist) => (typeof artist === "object" ? artist.name : artist))
        .join(",");
      lyric.value = await getLyric(newSong.name, singer);
    }
  },
  { immediate: true, deep: true }
);

watch(audioCurrent, (newVal) => {
  newVal = newVal * 1000 + 500;
  if (lyric.value) {
    for (let i = 0; i < lyric.value.length; i++) {
      if (
        lyric.value[i].position < +newVal &&
        (lyric.value[i + 1]?.position || 9999999999) > +newVal
      ) {
        let offset = 0;
        // 从0到i，计算元素高度
        for (let j = 0; j <= i; j++) {
          const element = document.querySelector(
            `.lyric-line[data-index="${j}"]`
          );
          offset += element?.clientHeight || 0;
          offset += 10;
        }
        activeIndex.value = i;
        transformStyle.value = `transform: translateY(${-offset}px)`;
      }
    }
  }
});

// 展示相关
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
    panelBackgroundStyle.value.height = `${shelfHeight}px`;
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
    class="absolute left-[50px] right-[0px] w-auto rounded-none up-shadow bottom-[80px] playing-bg"
    :style="show ? { height: `${shelfHeight}px` } : {}"
  >
    <template #header>
      <div class="flex px-6 pt-3 absolute">
        <van-button
          icon="arrow-down"
          plain
          size="small"
          @click="hidePanel"
        ></van-button>
      </div>
    </template>
    <template v-if="playingSong">
      <div
        class="flex w-full h-full justify-around px-10 overflow-hidden select-none"
      >
        <div
          class="cover-area flex flex-col justify-center items-center w-[50%]"
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
              class="lyric-line list-none text-white leading-1 cursor-pointer transition ease-in-out duration-500"
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
          class="w-[80%] sm:w-[50%] mt-[30vh] flex flex-col justify-start items-center text-white"
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
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-size: cover;
    background-position: center;
    background-image: v-bind("panelBackgroundStyle.backgroundImage");
    filter: blur(10px); /* 高斯模糊效果 */
    z-index: -1; /* 确保伪元素在内容下方 */
  }
}

.playing-bg::after {
  content: "";
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
