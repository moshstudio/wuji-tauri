<script setup lang="ts">
defineProps<{
  isSvip: boolean;
  onClick?: () => void;
}>();
</script>

<template>
  <div
    class="svip-badge"
    :class="{ 'svip-active': isSvip, 'svip-inactive': !isSvip }"
    @click="onClick"
  >
    <span class="svip-text">SVIP</span>
    <span v-if="!isSvip" class="svip-plus">+</span>
    <div v-if="isSvip" class="sparkle">
      <div v-for="i in 6" :key="i" class="sparkle-dot" :style="`--i: ${i}`" />
    </div>
  </div>
</template>

<style scoped>
.svip-badge {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: bold;
  font-style: italic;
  cursor: pointer;
  transition: all 0.3s ease;
  user-select: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  line-height: 1;
  overflow: hidden;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.svip-active {
  background: linear-gradient(135deg, #ff3434, #ff00aa, #c300ff);
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  animation: glow 2s infinite alternate;
}

.svip-inactive {
  background: linear-gradient(135deg, #e4e4e4, #c1c1c1);
  color: #888;
}

.svip-text {
  position: relative;
  z-index: 2;
}

.svip-plus {
  margin-left: 2px;
  font-size: 14px;
  font-weight: 800;
  position: relative;
  z-index: 2;
}

.svip-badge:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.svip-badge:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* 闪光效果 */
.sparkle {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  z-index: 1;
}

.sparkle-dot {
  position: absolute;
  width: 3px;
  height: 3px;
  background: #fff;
  border-radius: 50%;
  opacity: 0.8;
  animation: sparkle 3s linear infinite;
  animation-delay: calc(0.5s * var(--i));
}

@keyframes glow {
  0% {
    box-shadow: 0 0 4px rgba(255, 0, 170, 0.4);
  }
  100% {
    box-shadow:
      0 0 10px rgba(255, 0, 170, 0.6),
      0 0 20px rgba(195, 0, 255, 0.4);
  }
}

@keyframes sparkle {
  0% {
    transform: translate(0, 0) scale(0);
    opacity: 0;
  }
  25% {
    opacity: 1;
  }
  50% {
    transform: translate(calc(80% - 8px), calc(80% - 8px)) scale(1);
  }
  75% {
    opacity: 0.5;
  }
  100% {
    transform: translate(calc(160% - 16px), calc(0% - 16px)) scale(0);
    opacity: 0;
  }
}
</style>
