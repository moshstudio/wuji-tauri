<script setup lang="ts">
import validator from 'validator';
import { showDialog, showFailToast } from 'vant';
import { reactive, ref } from 'vue';
import MNavBar from '@/components/header/MNavBar.vue';
import { useDisplayStore, useServerStore } from '@/store';

const props = defineProps<{
  register: (params: {
    email: string;
    password: string;
    passwordConfirm: string;
  }) => Promise<boolean>;
  login: (params: { email: string; password: string }) => Promise<boolean>;
  forgetPasswordEmail: (params: { email: string }) => Promise<boolean>;
  resendVerifyEmail: (params: { email: string }) => Promise<boolean>;
}>();

const displayStore = useDisplayStore();
const serverStore = useServerStore();

// 登录/注册模式切换
const isLoginMode = ref(true);
const isShowPassword = ref(false);
function toggleMode() {
  isLoginMode.value = !isLoginMode.value;
  // resetForm();
}

// 表单验证规则
const emailRules = [
  { required: true, message: '请填写邮箱地址' },
  {
    validator: (value: string) => validator.isEmail(value),
    message: '请输入有效的邮箱地址',
  },
];

const passwordRules = [
  { required: true, message: '请填写密码' },
  {
    validator: (value: string) =>
      value.length >= 6 &&
      validator.matches(value, /(?=.*\d)(?=.*[a-z])(?=.*[A-Z])/),
    message: '密码必须包含大小写字母和数字, 且长度不小于6位',
  },
];

const confirmPasswordRules = [
  { required: true, message: '请确认密码' },
  {
    validator: (value: string) => value === form.password,
    message: '两次密码输入不一致',
  },
];

// 表单数据
const form = reactive({
  email: '',
  password: '',
  confirmPassword: '',
});

// 提交表单
const isSubmitting = ref(false);
async function handleSubmit() {
  isSubmitting.value = true;

  try {
    if (isLoginMode.value) {
      // 登录逻辑
      await props.login({
        email: form.email,
        password: form.password,
      });
    } else {
      // 注册
      await props.register({
        email: form.email,
        password: form.password,
        passwordConfirm: form.confirmPassword,
      });
    }
  } catch (error) {
    showFailToast(String(error) || '操作失败，请重试');
  } finally {
    isSubmitting.value = false;
  }
}

// 忘记密码处理
function handleForgotPassword() {
  if (!form.email) {
    showDialog({
      title: '提示',
      message: '请填写邮箱地址, 我们将为您发送一条重置密码邮件',
      showCancelButton: false,
    });
  } else if (!validator.isEmail(form.email)) {
    showDialog({
      title: '提示',
      message: '请输入有效的邮箱地址',
      showCancelButton: false,
    });
  } else {
    showDialog({
      title: '提示',
      message: `确认向 ${form.email} 发送重置密码邮件吗?`,
      showCancelButton: true,
    })
      .then(() => {
        props.forgetPasswordEmail({
          email: form.email,
        });
      })
      .catch(() => {});
  }
}

function resendVerifyEmail() {
  if (!form.email) {
    showDialog({
      title: '提示',
      message: '请填写邮箱地址, 我们将重新为您发送一条验证邮件',
      showCancelButton: false,
    });
  } else if (!validator.isEmail(form.email)) {
    showDialog({
      title: '提示',
      message: '请输入有效的邮箱地址',
      showCancelButton: false,
    });
  } else {
    showDialog({
      title: '提示',
      message: `确认向 ${form.email} 重新发送验证邮件吗?\n(密码不会重置)`,
      showCancelButton: true,
    })
      .then(() => {
        props.resendVerifyEmail({
          email: form.email,
        });
      })
      .catch(() => {});
  }
}
</script>

<template>
  <div
    class="relative flex h-full w-full flex-col overflow-hidden bg-[var(--van-background)]"
  >
    <MNavBar :title="isLoginMode ? '登录' : '注册'" />
    <div
      class="flex h-full w-full flex-grow flex-col items-center overflow-auto p-4"
    >
      <div class="flex w-full max-w-[500px] flex-col">
        <van-form key="form" class="relative w-full" @submit="handleSubmit">
          <TransitionGroup name="list" tag="div">
            <!-- 邮箱输入 -->
            <van-field
              key="email"
              v-model="form.email"
              label="邮箱"
              placeholder="请输入邮箱"
              maxlength="30"
              :rules="emailRules"
              class="mb-4"
            />

            <!-- 密码输入 -->
            <van-field
              key="password"
              v-model="form.password"
              :type="isShowPassword ? 'text' : 'password'"
              label="密码"
              placeholder="请输入密码"
              maxlength="20"
              :rules="passwordRules"
              :right-icon="isShowPassword ? 'eye' : 'closed-eye'"
              class="mb-4"
              @click-right-icon="isShowPassword = !isShowPassword"
            />

            <!-- 注册时才显示的确认密码 -->
            <van-field
              v-if="!isLoginMode"
              key="confirmPassword"
              v-model="form.confirmPassword"
              maxlength="20"
              :type="isShowPassword ? 'text' : 'password'"
              label="确认密码"
              placeholder="请再次输入密码"
              :rules="confirmPasswordRules"
              class="mb-4"
            />

            <!-- 提交按钮 -->
            <van-button
              key="submit"
              round
              block
              type="primary"
              native-type="submit"
              class="mt-6"
              :loading="isSubmitting"
            >
              <span class="text-white">
                {{ isLoginMode ? '登录' : '注册' }}
              </span>
            </van-button>
          </TransitionGroup>
        </van-form>

        <div class="mt-4 flex w-full shrink-0 items-center justify-between">
          <button
            class="text-sm text-blue-500 hover:text-blue-700"
            @click="toggleMode"
          >
            {{ isLoginMode ? '没有账号？去注册' : '已有账号？去登录' }}
          </button>
          <button
            v-if="isLoginMode"
            type="button"
            class="text-sm text-blue-500 hover:text-blue-700"
            @click="handleForgotPassword"
          >
            忘记密码？
          </button>
          <button
            v-else
            type="button"
            class="text-sm text-blue-500 hover:text-blue-700"
            @click="resendVerifyEmail"
          >
            重新发送验证邮件
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
:deep(.van-cell__title) {
  flex: 1;
}
:deep(.van-cell__value) {
  flex: 4;
}

.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateY(-30px);
}

.list-leave-to {
  opacity: 0;
  transform: translateY(-30px);
}
/* 确保离开的元素从布局流中删除 */
.list-leave-active {
  position: absolute;
  width: 100%;
}
</style>
