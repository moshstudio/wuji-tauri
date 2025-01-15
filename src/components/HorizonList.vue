<script setup lang="ts"></script>

<template>
  <div
    v-remember-scroll
    v-horizontal-scroll
    class="flex overflow-x-auto w-full"
  >
    <slot></slot>
  </div>
</template>

<style scoped lang="less"></style>
