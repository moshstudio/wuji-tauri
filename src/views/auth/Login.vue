<script setup lang="ts">
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import AppLogin from '@/layouts/app/auth/Login.vue';
import DesktopLogin from '@/layouts/desktop/auth/Login.vue';
import { useBackStore, useServerStore } from '@/store';

const backStore = useBackStore();
const serverStore = useServerStore();

async function register(params: {
  email: string;
  password: string;
  passwordConfirm: string;
}) {
  const ret = await serverStore.registerEmail(
    params.email,
    params.password,
    params.passwordConfirm,
  );
  return ret;
}
async function login(params: { email: string; password: string }) {
  const ret = await serverStore.login(params.email, params.password);
  if (ret) {
    backStore.back();
  }
  return ret;
}
async function forgetPassword(params: { email: string }) {
  const ret = await serverStore.forgetPasswordEmail(params.email);
  return ret;
}
async function resendVerifyEmail(params: { email: string }) {
  const ret = await serverStore.resendVerifyEmail(params.email);
  return ret;
}
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppLogin
        :register="register"
        :login="login"
        :forget-password-email="forgetPassword"
        :resend-verify-email="resendVerifyEmail"
      />
    </template>
    <template #desktop>
      <DesktopLogin
        :register="register"
        :login="login"
        :forget-password-email="forgetPassword"
        :resend-verify-email="resendVerifyEmail"
      />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
