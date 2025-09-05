<script lang="ts" setup>
import type { UserInfo } from '@/types/user';
import AppUser from '@/layouts/app/auth/User.vue';

defineProps<{
  userInfo?: UserInfo;
  getUserInfo: () => Promise<void>;
  updateUserInfo: (
    userInfo: Partial<Omit<UserInfo, 'uuid' | 'email' | 'isVerified'>>,
  ) => Promise<void>;
  resetPassword: () => void;
  logout: () => void;
  clickEmail: () => void;
}>();
</script>

<template>
  <AppUser
    :user-info="userInfo"
    :get-user-info="getUserInfo"
    :update-user-info="updateUserInfo"
    :reset-password="resetPassword"
    :logout="logout"
    :click-email="clickEmail"
  />
</template>

<style scoped lang="less"></style>
