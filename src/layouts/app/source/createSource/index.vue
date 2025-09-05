<script setup lang="ts">
import MNavBar from '@/components/header/MNavBar.vue';
</script>

<template>
  <div class="relative flex h-full w-full flex-col overflow-hidden">
    <MNavBar title="创建订阅源" />
    <div
      class="flex w-full flex-grow flex-col overflow-y-auto bg-[--van-background] p-2"
    >
      <div class="flex items-center justify-center text-base font-bold">
        手机界面不支持创建源，请使用电脑界面
      </div>
    </div>
  </div>
</template>

<style scoped lang="less"></style>
