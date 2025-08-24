<script setup lang="ts">
import type { CSSProperties } from 'vue';
import { useDisplayStore } from '@/store';
import { storeToRefs } from 'pinia';
import { onMounted, ref, watch } from 'vue';

interface Part {
  x: number;
  y: number;
  color: string;
  position?: 'absolute';
  width?: number;
  height?: number;
  rotate?: number;
  borderRadius?: number;
  deg?: number;
}

const displayStore = useDisplayStore();
const { taichiAnimateRandomized } = storeToRefs(displayStore);

const size = 40;
const gap = 6;
const duration = 2000;
const colors = [
  '#E91E63',
  '#FFC107',
  '#8BC34A',
  '#673AB7',
  '#2196F3',
  '#FFEB3B',
];
const allColors = [
  '#BFCAC2',
  '#013E41',
  '#C6DEE0',
  '#F7EDEB',
  '#A6BAAF',
  '#4A475C',
  '#CEAEB9',
  '#E9CEC3',
  '#EED9D4',
  '#8D7477',
  '#6E4740',
  '#5E5D65',
  '#CB9B8F',
  '#F6E1DC',
  '#B5BAC0',
  '#5B7493',
  '#E3BCB5',
  '#A7BEC6',
  '#F4F4F4',
  '#B98A82',
  '#F5F4F0',
  '#BFBFC1',
  '#B4A29E',
  '#E0D3C3',
  '#EBE8E3',
  '#E4DBD2',
  '#BEA8AA',
  '#9AA2AD',
  '#9B8D8C',
  '#DECFCC',
];
const parts = ref<Part[]>([]);
const initialParts: Part[] = [
  // W
  { x: 0, y: 0, color: colors[0] },
  { x: 0, y: 1, color: colors[0] },
  { x: 0, y: 2, color: colors[0] },
  { x: 0, y: 3, color: colors[0] },
  { x: 1, y: 4, color: colors[0] },
  { x: 2, y: 3, color: colors[0] },
  { x: 2, y: 2, color: colors[0] },
  { x: 2, y: 1, color: colors[0] },
  { x: 3, y: 4, color: colors[0] },
  { x: 4, y: 3, color: colors[0] },
  { x: 4, y: 2, color: colors[0] },
  { x: 4, y: 1, color: colors[0] },
  { x: 4, y: 0, color: colors[0] },
  // U
  { x: 6, y: 0, color: colors[1] },
  { x: 6, y: 1, color: colors[1] },
  { x: 6, y: 2, color: colors[1] },
  { x: 6, y: 3, color: colors[1] },
  { x: 7, y: 4, color: colors[1] },
  { x: 8, y: 4, color: colors[1] },
  { x: 9, y: 3, color: colors[1] },
  { x: 9, y: 2, color: colors[1] },
  { x: 9, y: 1, color: colors[1] },
  { x: 9, y: 0, color: colors[1] },
  // J
  { x: 12, y: 3, color: colors[2] },
  { x: 13, y: 4, color: colors[2] },
  { x: 14, y: 4, color: colors[2] },
  { x: 15, y: 3, color: colors[2] },
  { x: 15, y: 2, color: colors[2] },
  { x: 15, y: 1, color: colors[2] },
  { x: 15, y: 0, color: colors[2] },
  // I
  { x: 17, y: 0, color: colors[3] },
  { x: 17, y: 4, color: colors[3] },
  { x: 18, y: 0, color: colors[3] },
  { x: 18, y: 1, color: colors[3] },
  { x: 18, y: 2, color: colors[3] },
  { x: 18, y: 3, color: colors[3] },
  { x: 18, y: 4, color: colors[3] },
  { x: 19, y: 0, color: colors[3] },
  { x: 19, y: 4, color: colors[3] },
];
const randomized = ref(false);

function buildParts() {
  parts.value.splice(0, parts.value.length);
  parts.value.push(...JSON.parse(JSON.stringify(initialParts)));
}

function getPartStyle(part: Part): CSSProperties {
  const left = part.x * (size + gap);
  const top = part.y * (size + gap);
  return {
    width: `${part.width ?? size}px`,
    height: `${part.height ?? size}px`,
    backgroundColor: part.color,
    position: 'absolute',
    left: `${left}px`,
    top: `${top}px`,
    borderRadius: '10%',
    transform: `rotate(${part.deg ?? 0}deg)`,
    transition: `all ${duration}ms`,
  };
}

function randomize() {
  randomized.value = true;
  parts.value.forEach((part) => {
    const partSize = Math.max(50, Math.floor(Math.random() * (size * 8)));
    part.x += Math.floor(Math.random() * 30) - 15;
    part.y += Math.floor(Math.random() * 30) - 15;
    part.color = allColors[Math.floor(Math.random() * allColors.length)];
    part.width = partSize;
    part.height = partSize;
    part.borderRadius = Math.floor(Math.random() * (size / 2));
    part.rotate = Math.floor(Math.random() * 90);
    part.deg = Math.floor(Math.random() * 360) - 180;
  });
}

function assemble() {
  randomized.value = false;
  buildParts();
}

function toggle() {
  if (randomized.value) {
    assemble();
  } else {
    randomize();
  }
}

onMounted(() => {
  buildParts();
});
watch(taichiAnimateRandomized, (v) => {
  if (v) {
    randomize();
  } else {
    assemble();
  }
});
</script>

<template>
  <div class="fixed h-full w-full overflow-hidden">
    <div
      class="relative left-1/2 top-1/2 translate-x-[-500px] translate-y-[-130px]"
    >
      <div class="tai-chi-animation absolute">
        <div
          v-for="(part, index) in parts"
          :key="index"
          class="part"
          :style="getPartStyle(part)"
          @click="toggle"
        ></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.part {
  transition: all 2000ms;
}
</style>
