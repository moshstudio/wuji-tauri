<script setup lang="ts">
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import { useBackStore, useServerStore } from '@/store';
import AppLogin from '@/layouts/app/auth/Login.vue';
import DesktopLogin from '@/layouts/desktop/auth/Login.vue';

const backStore = useBackStore();
const serverStore = useServerStore();

const register = async (params: {
  email: string;
  password: string;
  passwordConfirm: string;
}) => {
  const ret = await serverStore.registerEmail(
    params.email,
    params.password,
    params.passwordConfirm,
  );
  return ret;
};
const login = async (params: { email: string; password: string }) => {
  const ret = await serverStore.login(params.email, params.password);
  if (ret) {
    backStore.back();
  }
  return ret;
};
const forgetPassword = async (params: { email: string }) => {
  const ret = await serverStore.forgetPasswordEmail(params.email);
  return ret;
};
const resendVerifyEmail = async (params: { email: string }) => {
  const ret = await serverStore.resendVerifyEmail(params.email);
  return ret;
};
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppLogin
        :register="register"
        :login="login"
        :forgetPasswordEmail="forgetPassword"
        :resendVerifyEmail="resendVerifyEmail"
      />
    </template>
    <template #desktop>
      <DesktopLogin
        :register="register"
        :login="login"
        :forgetPasswordEmail="forgetPassword"
        :resendVerifyEmail="resendVerifyEmail"
      />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
