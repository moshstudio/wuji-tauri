<script setup lang="ts">
import { reactive } from 'vue';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import AppFreeTrail from '@/layouts/app/promotion/taichi/FreeTrail.vue';
import DesktopFreeTrail from '@/layouts/desktop/promotion/taichi/FreeTrail.vue';
import { useServerStore } from '@/store';

const serverStore = useServerStore();

const form = reactive({
  username: '',
  password: '',
});

const get = async () => {
  console.log('获取免费试用');

  await serverStore.taichiFreeTrail(form.username, form.password);
};
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppFreeTrail
        v-model:username="form.username"
        v-model:password="form.password"
        :onGet="get"
      />
    </template>
    <template #desktop>
      <DesktopFreeTrail
        v-model:username="form.username"
        v-model:password="form.password"
        :onGet="get"
      />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
