<script lang="ts" setup>
import { ref, reactive, watch, nextTick } from 'vue';
import { showToast } from 'vant';
import { UserInfo } from '@/store';
import MNavBar from '@/components/header/MNavBar.vue';
import { router } from '@/router';

const props = defineProps<{
  userInfo?: UserInfo;
  updateUserInfo: (
    userInfo: Partial<Omit<UserInfo, 'uuid' | 'email' | 'isVerified'>>,
  ) => Promise<void>;
  resetPassword: () => void;
  logout: () => void;
  clickEmail: () => void;
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

const usernameField = ref<HTMLInputElement>();
const usernameEdit = ref(false);
const toggleUsernameEdit = () => {
  if (usernameEdit.value) {
    usernameEdit.value = false;
    nextTick(() => {
      usernameField.value?.blur();
    });
    // 发送修改用户名请求
    props.updateUserInfo({
      name: tmpUserInfo.name,
    });
  } else {
    usernameEdit.value = true;
    nextTick(() => {
      usernameField.value?.focus();
    });
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
            @click="clickEmail"
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
          <van-cell title="重置密码" is-link @click="resetPassword" />
          <van-cell title="退出登录" is-link @click="logout" />
        </van-cell-group>
      </template>
    </div>
  </div>
</template>

<style scoped lang="less"></style>
