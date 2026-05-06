<script setup lang="ts">
defineProps<{
  active: boolean;
}>();

const emit = defineEmits<{
  click: [];
}>();
</script>

<template>
  <div
    v-show="active"
    class="h-1 w-full cursor-pointer overflow-hidden rounded-full bg-black/10 dark:bg-white/10"
    role="progressbar"
    aria-valuemin="0"
    aria-valuemax="100"
    @click="emit('click')"
  >
    <div class="global-toast-progress__bar h-full rounded-full bg-teal-500" />
  </div>
</template>

<style scoped>
.global-toast-progress__bar {
  width: 35%;
  animation: global-toast-progress-indeterminate 1s ease-in-out infinite;
}

@keyframes global-toast-progress-indeterminate {
  0% {
    transform: translateX(-100%);
  }

  100% {
    transform: translateX(350%);
  }
}
</style>
