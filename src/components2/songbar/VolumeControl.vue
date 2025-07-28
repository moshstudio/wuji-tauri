<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { ref } from 'vue';

const audioVolume = defineModel<number>({ default: 1 });
const showSlider = ref(false); // 控制条显示状态
</script>

<template>
  <div class="volume-control">
    <!-- 音量按钮 -->
    <Icon
      :icon="
        audioVolume == 0
          ? 'ion:volume-mute-outline'
          : audioVolume <= 0.5
            ? 'ion:volume-low-outline'
            : audioVolume < 1
              ? 'ion:volume-medium-outline'
              : 'ion:volume-high-outline'
      "
      width="22px"
      height="22px"
      class="van-haptics-feedback cursor-pointer text-gray-400 hover:text-[--van-text-color]"
      @mouseenter="showSlider = true"
      @mouseleave="showSlider = false"
      @click="() => (audioVolume = 0)"
    />

    <!-- 音量控制条 -->
    <div
      v-show="showSlider"
      class="slider-container w-[40px] pb-[16px] pt-[22px] text-center"
      @mouseenter="showSlider = true"
      @mouseleave="showSlider = false"
    >
      <van-slider
        v-model="audioVolume"
        vertical
        reverse
        :min="0"
        :max="1"
        :step="0.01"
        bar-height="8px"
        button-size="16px"
        class="volume-slider"
      />
      <div class="text-[10px] text-[--van-text-color]">
        {{ Math.floor(audioVolume * 100) }}%
      </div>
    </div>
  </div>
</template>

<style scoped>
.volume-control {
  position: relative;
  display: inline-block;
}

.slider-container {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background-color: var(--van-background);
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.volume-slider {
  height: 100px;
}
</style>
