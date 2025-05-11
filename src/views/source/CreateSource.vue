<script setup lang="ts">
import PlatformSwitch from '@/components/PlatformSwitch.vue';
import WinCreateSource from '../windowsView/source/createSource/index.vue';
import MobileCreateSource from '../mobileView/source/createSource/index.vue';
</script>

<template>
  <PlatformSwitch>
    <template #mobile>
      <MobileCreateSource />
    </template>
    <template #windows>
      <WinCreateSource />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
