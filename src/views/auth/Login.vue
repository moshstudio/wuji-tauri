<script setup lang="ts">
import PlatformSwitch from '@/components/PlatformSwitch.vue';
import { useDisplayStore, useServerStore, useStore } from '@/store';
import WinLogin from '@/views/windowsView/auth/Login.vue';
import MobileLogin from '@/views/mobileView/auth/Login.vue';
import { ref } from 'vue';

const store = useStore();
const displayStore = useDisplayStore();
const serverStore = useServerStore();

const showLogin = ref(false);

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
    showLogin.value = false;
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
    <template #mobile>
      <MobileLogin
        v-model:showLogin="showLogin"
        :register="register"
        :login="login"
        :forgetPasswordEmail="forgetPassword"
        :resendVerifyEmail="resendVerifyEmail"
      />
    </template>
    <template #windows>
      <WinLogin
        v-model:showLogin="showLogin"
        :register="register"
        :login="login"
        :forgetPasswordEmail="forgetPassword"
        :resendVerifyEmail="resendVerifyEmail"
      />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
