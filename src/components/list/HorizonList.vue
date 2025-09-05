<script setup lang="ts"></script>

<template>
  <div
    v-remember-scroll
    class="flex w-full gap-2 overflow-x-auto overflow-y-hidden py-2"
    @touchmove.stop
  >
    <slot />
  </div>
</template>

<style scoped lang="less"></style>
