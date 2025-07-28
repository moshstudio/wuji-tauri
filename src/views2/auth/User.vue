<script setup lang="ts">
import PlatformSwitch from '@/components2/platform/PlatformSwitch.vue';
import AppUser from '@/layouts/app/auth/User.vue';
import DesktopUser from '@/layouts/desktop/auth/User.vue';
import { useServerStore } from '@/store';
import { storeToRefs } from 'pinia';

const serverStore = useServerStore();
const { userInfo } = storeToRefs(serverStore);
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppUser :user-info="userInfo" />
    </template>
    <template #desktop>
      <DesktopUser :user-info="userInfo" />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
