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
  <div class="relative group">
    <!-- 倍速显示按钮 -->
    <button
      class="flex items-center px-3 py-1 text-sm font-mono rounded-md hover:bg-white/20 transition-colors duration-200"
      @click="toggleMenu"
    >
      <span class="text-sm text-gray-300 font-bold">
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
        class="absolute bottom-full left-0 -translate-x-5 mb-2 w-20 bg-gray-800/90 rounded-md shadow-lg z-10 overflow-hidden"
        @click.away="showMenu = false"
      >
        <ul>
          <li
            v-for="rate in state.playbackRates"
            :key="rate"
            class="px-3 py-2 text-sm cursor-pointer transition-colors duration-100 text-center"
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
