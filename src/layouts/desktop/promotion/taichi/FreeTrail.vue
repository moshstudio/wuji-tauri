<script setup lang="ts">
import AppFreeTrail from '@/layouts/app/promotion/taichi/FreeTrail.vue';
const username = defineModel<string>('username', { required: true });
const password = defineModel<string>('password', { required: true });
defineProps<{
  onGet: (username: string, password: string) => Promise<any>;
}>();
</script>

<template>
  <AppFreeTrail
    v-model:username="username"
    v-model:password="password"
    :onGet="onGet"
  ></AppFreeTrail>
</template>

<style scoped lang="less"></style>
