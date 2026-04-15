<script setup lang="ts">
import AppFreeTrail from '@/layouts/app/promotion/taichi/FreeTrail.vue';

defineProps<{
  onGet: (username: string, password: string) => Promise<any>;
}>();
const username = defineModel<string>('username', { required: true });
const password = defineModel<string>('password', { required: true });
</script>

<template>
  <AppFreeTrail
    v-model:username="username"
    v-model:password="password"
    :on-get="onGet"
  />
</template>

<style scoped lang="less"></style>
