<script setup lang="ts">
import { router } from '@/router';
import { UserInfo } from '@/store';

withDefaults(
  defineProps<{
    userInfo?: UserInfo;
    toLoginPage?: () => void;
    toUserPage?: () => void;
  }>(),
  {
    toLoginPage: () => {
      router.push({ name: 'Login' });
    },
    toUserPage: () => {
      router.push({ name: 'User' });
    },
  },
);
</script>

<template>
  <div class="items-center justify-center">
    <div
      class="van-haptics-feedback flex cursor-pointer items-center justify-center gap-1 text-xs text-[var(--van-text-color-2)]"
      @click="
        () => {
          if (userInfo) {
            toUserPage();
          } else {
            toLoginPage();
          }
        }
      "
    >
      <div v-if="userInfo">
        <van-button
          round
          plain
          size="small"
          :icon="userInfo?.photo || 'user-o'"
        ></van-button>
      </div>
      <div v-else>登录</div>
    </div>
  </div>
</template>

<style scoped lang="less"></style>
