<script setup lang="ts">
import WinPlayView from '../windowsView/song/PlayView.vue';
import MobilePlayView from '../mobileView/song/PlayView.vue';
import PlatformSwitch from '@/components/PlatformSwitch.vue';
import {
  onMounted,
  onUnmounted,
  ref,
  watch,
  CSSProperties,
  computed,
} from 'vue';
import { useDisplayStore, useSongStore } from '@/store';
import { storeToRefs } from 'pinia';
import { getLyric, Lyric, parseLyric } from '@/utils/lyric';

const show = defineModel('show', { type: Boolean, default: false });

const songStore = useSongStore();
const displayStore = useDisplayStore();
const { playingSong, isPlaying, audioCurrent } = storeToRefs(songStore);
const lyric = ref<Lyric>();
const activeIndex = ref<number>(0); //高亮Index
const transformStyle = ref<string>(''); //偏移量
const panelBackgroundStyle = ref<CSSProperties>({
  'background-color': 'rgba(0, 0, 0, 0.1)',
});

watch(
  playingSong,
  async (newSong) => {
    if (!newSong) {
      return;
    }
    if (newSong.picUrl || newSong.bigPicUrl) {
      panelBackgroundStyle.value.backgroundColor = '';
      panelBackgroundStyle.value.backgroundImage = `url(${newSong.bigPicUrl || newSong.picUrl})`;
    } else {
      //background-color: #4158D0;
      //background-image: linear-gradient(43deg, #4158D0 0%, #C850C0 46%, #FFCC70 100%);

      // 定义渐变方向
      const direction = '43deg';
      // 定义颜色停止点
      const colorStops = [
        { color: '#4158D0', position: 0 },
        { color: '#C850C0', position: 46 },
        { color: '#FFCC70', position: 100 },
      ];
      panelBackgroundStyle.value.backgroundColor = '#4158D0';
      panelBackgroundStyle.value.backgroundImage = `linear-gradient(${direction}, ${colorStops
        .map((colorStop) => `${colorStop.color} ${colorStop.position}%`)
        .join(', ')})`;
    }
    lyric.value = undefined;
    audioCurrent.value = 0;
    if (newSong.lyric) {
      lyric.value = parseLyric(newSong.lyric);
    } else if (newSong.name) {
      const singer = newSong.artists
        ?.map((artist) => (typeof artist === 'object' ? artist.name : artist))
        .join(',');
      lyric.value = await getLyric(newSong.name, singer);
    }
  },
  { immediate: true, deep: true }
);

watch(audioCurrent, (newVal) => {
  newVal = newVal * 1000 + 200;
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
const offset = computed(() => {
  return displayStore.isMobile ? -100 : -80;
});
const shelfAnchors = ref([
  offset.value,
  Math.round(window.innerHeight) + offset.value,
]);
const shelfHeight = ref(0);
const hidePanel = () => {
  shelfHeight.value = shelfAnchors.value[0];
  show.value = false;
};
watch(
  show,
  (newValue) => {
    if (newValue) {
      shelfHeight.value = shelfAnchors.value[1];
    } else {
      shelfHeight.value = shelfAnchors.value[0];
    }
    panelBackgroundStyle.value.height = `${shelfHeight}px`;
  },
  { immediate: true }
);
const updateAnchors = () => {
  shelfAnchors.value[1] = Math.round(window.innerHeight) + offset.value;
  if (show.value) {
    shelfHeight.value = shelfAnchors.value[1];
  }
};
onMounted(() => {
  window.addEventListener('resize', updateAnchors);
});
onUnmounted(() => {
  window.removeEventListener('resize', updateAnchors);
});
</script>

<template>
  <PlatformSwitch>
    <template #mobile>
      <MobilePlayView
        v-model:lyric="lyric"
        v-model:active-index="activeIndex"
        v-model:transform-style="transformStyle"
        v-model:panel-background-style="panelBackgroundStyle"
        v-model:show="show"
        v-model:shelf-anchors="shelfAnchors"
        v-model:shelf-height="shelfHeight"
        @hide-panel="hidePanel"
      ></MobilePlayView>
    </template>
    <template #windows>
      <WinPlayView
        v-model:lyric="lyric"
        v-model:active-index="activeIndex"
        v-model:transform-style="transformStyle"
        v-model:panel-background-style="panelBackgroundStyle"
        v-model:show="show"
        v-model:shelf-anchors="shelfAnchors"
        v-model:shelf-height="shelfHeight"
        @hide-panel="hidePanel"
      ></WinPlayView>
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
