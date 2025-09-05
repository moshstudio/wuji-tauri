<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    size?: number | string;
    color?: string;
    isPlaying: boolean;
    play: () => void;
    pause: () => void;
  }>(),
  {
    size: 16,
    color: 'blue',
    isPlaying: false,
  },
);

const isAnimating = ref(false);

function handleClick() {
  if (props.isPlaying) {
    props.pause();
  } else {
    props.play();
  }
  isAnimating.value = true;
}

watch(
  () => props.isPlaying,
  () => {
    isAnimating.value = true;
    setTimeout(() => (isAnimating.value = false), 300);
  },
);
</script>

<template>
  <div
    class="van-haptics-feedback flex items-center justify-center"
    :class="{ 'scale-90': isAnimating }"
    @click="handleClick"
  >
    <transition
      mode="out-in"
      enter-active-class="transition-transform duration-200 ease-out"
      leave-active-class="transition-transform duration-200 ease-out"
      enter-from-class="scale-0 opacity-0"
      leave-to-class="scale-0 opacity-0"
    >
      <Icon
        v-if="!isPlaying"
        key="play"
        icon="ph:play-fill"
        :width="size"
        :height="size"
        :color="color"
        class="origin-center transform"
      />
      <Icon
        v-else
        key="pause"
        icon="ph:pause-fill"
        :width="size"
        :height="size"
        :color="color"
        class="origin-center transform"
      />
    </transition>
  </div>
</template>
