<script setup lang="ts">
import PlatformSwitch from '@/components/PlatformSwitch.vue';
import WinSource from '../windowsView/source/index.vue';
import MobileSource from '../mobileView/source/index.vue';
import { useDisplayStore } from '@/store';
</script>

<template>
  <PlatformSwitch>
    <template #mobile>
      <MobileSource />
    </template>
    <template #windows>
      <WinSource />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
