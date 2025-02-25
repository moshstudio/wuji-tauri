<script setup lang="ts"></script>

<template>
  <div
    v-remember-scroll
    v-horizontal-scroll
    class="flex overflow-x-auto w-full gap-2 py-2"
    @touchmove.stop
  >
    <slot></slot>
  </div>
</template>

<style scoped lang="less"></style>
