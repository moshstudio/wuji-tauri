<script setup lang="ts">
import { storeToRefs } from 'pinia';
import {
  showConfirmDialog,
  showFailToast,
  showSuccessToast,
  showToast,
} from 'vant';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import AppUser from '@/layouts/app/auth/User.vue';
import DesktopUser from '@/layouts/desktop/auth/User.vue';
import { useBackStore, useServerStore } from '@/store';
import { ref } from 'vue';
import { onMountedOrActivated } from '@vant/use';

const backStore = useBackStore();
const serverStore = useServerStore();
const { userInfo } = storeToRefs(serverStore);

const showTaichiTrailNotice = ref(false);

async function updateUserInfo(info: {
  name?: string;
  photo?: string;
  phone?: string;
}) {
  serverStore.updateUserInfo({ ...info });
}

// 重置密码
function resetPassword() {
  showConfirmDialog({
    title: '重置密码',
    message: '将向您的邮箱发送重置密码链接，确定继续吗？',
  }).then(async () => {
    if (!userInfo.value?.email) {
      showFailToast('请先绑定邮箱');
      return;
    }
    // 调用重置密码API
    await serverStore.forgetPasswordEmail(userInfo.value.email);
  });
}

// 退出登录
function logout() {
  showConfirmDialog({
    title: '退出登录',
    message: '确定要退出当前账号吗？',
  }).then(() => {
    // 调用退出登录API
    // 清除用户数据
    // 跳转到登录页
    serverStore.logout();
    backStore.back();
    showSuccessToast('已退出登录');
  });
}

function clickEmail() {
  if (userInfo.value?.email) {
    navigator.clipboard.writeText(userInfo.value.email);
    showToast('已复制到剪贴板');
  }
}

onMountedOrActivated(async () => {
  console.log('user page onMountedOrActivated');

  // 获取用户信息
  const status = await serverStore.checkTaichiFreeTrail();
  if (status === true) {
    showTaichiTrailNotice.value = true;
  } else {
    showTaichiTrailNotice.value = false;
  }
});
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppUser
        :user-info="userInfo"
        :show-taichi-trail-notice="showTaichiTrailNotice"
        :get-user-info="serverStore.fetchUserInfo"
        :update-user-info="updateUserInfo"
        :reset-password="resetPassword"
        :logout="logout"
        :click-email="clickEmail"
      />
    </template>
    <template #desktop>
      <DesktopUser
        :user-info="userInfo"
        :show-taichi-trail-notice="showTaichiTrailNotice"
        :get-user-info="serverStore.fetchUserInfo"
        :update-user-info="updateUserInfo"
        :reset-password="resetPassword"
        :logout="logout"
        :click-email="clickEmail"
      />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
