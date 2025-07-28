<script setup lang="ts">
import { useClickAway } from '@vant/use';
import { ref } from 'vue';

const props = defineProps<{
  state: {
    playbackRate: number;
    playbackRates: number[];
  };
  player: {
    playbackRate: (rate: number) => void;
  };
}>();

const menu = ref();
const showMenu = ref(false);

function toggleMenu() {
  showMenu.value = !showMenu.value;
}

function changeRate(rate: number) {
  props.player.playbackRate(rate);
  showMenu.value = false;
}
useClickAway(menu, () => {
  showMenu.value = false;
});
</script>

<template>
  <div class="group relative">
    <!-- 倍速显示按钮 -->
    <button
      class="flex items-center rounded-md px-3 py-1 font-mono text-sm transition-colors duration-200 hover:bg-white/20"
      @click="toggleMenu"
    >
      <span class="text-sm font-bold text-gray-300">
        {{ state.playbackRate }}x
      </span>
    </button>

    <!-- 倍速选择菜单 -->
    <transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="transform opacity-0 scale-95"
      enter-to-class="transform opacity-100 scale-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
      <div
        v-if="showMenu"
        ref="menu"
        class="absolute bottom-full left-0 z-10 mb-2 w-20 -translate-x-5 overflow-hidden rounded-md bg-gray-800/90 shadow-lg"
        @click.away="showMenu = false"
      >
        <ul>
          <li
            v-for="rate in state.playbackRates"
            :key="rate"
            class="cursor-pointer px-3 py-2 text-center text-sm transition-colors duration-100"
            :class="{
              'bg-blue-500 text-white': rate === state.playbackRate,
              'hover:bg-white/10': rate !== state.playbackRate,
            }"
            @click="changeRate(rate)"
          >
            {{ rate }}x
          </li>
        </ul>
      </div>
    </transition>
  </div>
</template>
