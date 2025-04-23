<script setup lang="ts">
import PlatformSwitch from '@/components/PlatformSwitch.vue';
import WinUser from '../windowsView/auth/User.vue';
import MobileUser from '../mobileView/auth/User.vue';
</script>

<template>
  <PlatformSwitch>
    <template #mobile>
      <MobileUser />
    </template>
    <template #windows>
      <WinUser />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
