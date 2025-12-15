<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { Swiper, SwiperSlide } from 'swiper/vue';
import type { Swiper as SwiperType } from 'swiper';
import { VideoEpisode } from '@wuji-tauri/source-extension';
import 'swiper/css';

const props = defineProps<{
  prevEpisode: VideoEpisode | null;
  nextEpisode: VideoEpisode | null;
  onPlayPrevious: () => Promise<void>;
  onPlayNext: () => Promise<void>;
}>();

const swipeRef = ref<SwiperType>();

const onSwiper = (swiper: SwiperType) => {
  swipeRef.value = swiper;
};

const onSlideChange = async (swiper: SwiperType) => {
  const index = swiper.activeIndex;
  if (index === 0) {
    // 向下滑，播放上一集
    props.onPlayPrevious();
    await nextTick();
    swipeRef.value?.slideTo(1, 0);
  } else if (index === 2) {
    // 向上滑，播放下一集
    props.onPlayNext();
    await nextTick();
    swipeRef.value?.slideTo(1, 0);
  }
};
</script>

<template>
  <Swiper
    :direction="'vertical'"
    :initial-slide="1"
    :slides-per-view="1"
    :space-between="0"
    :touch-start-prevent-default="false"
    class="h-full w-full"
    @swiper="onSwiper"
    @slide-change-transition-end="onSlideChange"
  >
    <SwiperSlide>
      <div class="flex h-full w-full items-center justify-center bg-black">
        <div v-if="prevEpisode" class="px-4 text-center">
          <van-icon name="arrow-up" size="40" color="#666" />
          <div class="mt-2 text-sm text-gray-500">上一集</div>
          <div class="mt-1 text-base text-white">
            {{ prevEpisode.title }}
          </div>
        </div>
        <div v-else class="text-center">
          <div class="text-sm text-gray-500">已经是第一集了</div>
        </div>
      </div>
    </SwiperSlide>
    <SwiperSlide>
      <div class="h-full w-full">
        <slot></slot>
      </div>
    </SwiperSlide>
    <SwiperSlide>
      <div class="flex h-full w-full items-center justify-center bg-black">
        <div v-if="nextEpisode" class="px-4 text-center">
          <van-icon name="arrow-down" size="40" color="#666" />
          <div class="mt-2 text-sm text-gray-500">下一集</div>
          <div class="mt-1 text-base text-white">
            {{ nextEpisode.title }}
          </div>
        </div>
        <div v-else class="text-center">
          <div class="text-sm text-gray-500">没有下一集了</div>
        </div>
      </div>
    </SwiperSlide>
  </Swiper>
</template>

<style scoped lang="less"></style>
