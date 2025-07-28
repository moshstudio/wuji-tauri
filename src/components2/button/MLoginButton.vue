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
  <div class="flex items-center justify-center">
    <div
      class="van-haptics-feedback flex cursor-pointer items-center justify-center gap-1 p-2 text-xs text-[var(--van-text-color-2)]"
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
      <template v-if="userInfo">
        <div class="truncate">
          {{ userInfo.name || userInfo.email }}
        </div>
      </template>
      <template v-else>
        <div>登录</div>
        <van-icon name="arrow"></van-icon>
      </template>
    </div>
  </div>
</template>

<style scoped lang="less"></style>
