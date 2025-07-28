<script lang="ts" setup>
import { ref, reactive, watch, nextTick } from 'vue';
import {
  showConfirmDialog,
  showSuccessToast,
  showFailToast,
  showToast,
  showLoadingToast,
} from 'vant';
import { useBackStore, UserInfo, useServerStore } from '@/store';
import MNavBar from '@/components2/header/MNavBar.vue';
import { router } from '@/router';

const props = defineProps<{
  userInfo?: UserInfo;
}>();

const tmpUserInfo = reactive<Partial<UserInfo>>({});

watch(
  () => props.userInfo,
  () => {
    if (props.userInfo) {
      Object.assign(tmpUserInfo, props.userInfo);
    }
  },
  { immediate: true },
);

const backStore = useBackStore();
const serverStore = useServerStore();

const usernameField = ref<HTMLInputElement>();
const usernameEdit = ref(false);
const toggleUsernameEdit = () => {
  if (usernameEdit.value) {
    usernameEdit.value = false;
    nextTick(() => {
      usernameField.value?.blur();
    });
    // 发送修改用户名请求
  } else {
    usernameEdit.value = true;
    nextTick(() => {
      usernameField.value?.focus();
    });
  }
};

// 重置密码
const handleResetPassword = () => {
  showConfirmDialog({
    title: '重置密码',
    message: '将向您的邮箱发送重置密码链接，确定继续吗？',
  }).then(async () => {
    if (!props.userInfo?.email) {
      showFailToast('请先绑定邮箱');
      return;
    }
    // 调用重置密码API
    const toast = showLoadingToast('正在发送重置邮件...');
    await serverStore.forgetPasswordEmail(props.userInfo.email);
    toast.close();
  });
};

// 退出登录
const handleLogout = () => {
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
};

const copyEmail = () => {
  if (tmpUserInfo.email) {
    navigator.clipboard.writeText(tmpUserInfo.email);
    showToast('已复制到剪贴板');
  }
};
</script>

<template>
  <div class="relative flex h-full w-full flex-col overflow-hidden">
    <MNavBar title="个人中心"></MNavBar>
    <div
      class="flex w-full grow select-none flex-col gap-2 overflow-y-auto bg-[--van-background] p-2"
    >
      <template v-if="!userInfo">
        <h2>请先登录</h2>
        <van-button
          @click="
            () => {
              router.push({ name: 'Login' });
            }
          "
        >
          登录
        </van-button>
      </template>
      <template v-else>
        <van-cell-group inset class="user-info-section">
          <van-cell center>
            <template #title>
              <div class="flex items-center gap-2">
                <div class="h-[46px] w-[46px]">
                  <van-image
                    round
                    width="46px"
                    height="46px"
                    :src="tmpUserInfo.photo || ''"
                  />
                </div>
                <van-field
                  ref="usernameField"
                  autocomplete="off"
                  v-model="tmpUserInfo.name"
                  :placeholder="!usernameEdit ? '未设置昵称' : '请输入昵称'"
                  :disabled="!usernameEdit"
                  :border="false"
                />
                <van-button
                  icon="edit"
                  size="small"
                  round
                  class="border-none"
                  @click="toggleUsernameEdit"
                  v-if="!usernameEdit"
                />
                <van-button
                  size="small"
                  class="text-nowrap"
                  @click="toggleUsernameEdit"
                  v-else
                >
                  保存
                </van-button>
              </div>
            </template>
            <template #label v-if="!tmpUserInfo.isVerified">
              <span class="text-red">账号未验证</span>
            </template>
          </van-cell>
          <van-cell
            title="邮箱"
            :value="tmpUserInfo.email"
            @click="copyEmail"
            clickable
          />
        </van-cell-group>

        <van-cell-group inset>
          <van-cell
            title="同步数据至服务器"
            is-link
            @click="showToast('暂未实现')"
          />
          <van-cell
            title="从服务器下载数据"
            is-link
            @click="showToast('暂未实现')"
          />
        </van-cell-group>

        <!-- 操作按钮 -->
        <van-cell-group inset class="action-section">
          <van-cell title="重置密码" is-link @click="handleResetPassword" />
          <van-cell title="退出登录" is-link @click="handleLogout" />
        </van-cell-group>
      </template>
    </div>
  </div>
</template>

<style scoped lang="less"></style>
