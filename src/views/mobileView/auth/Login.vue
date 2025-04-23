<template>
  <div
    class="flex items-center justify-center gap-1 p-2 cursor-pointer van-haptics-feedback"
    v-if="userInfo"
    @click="toUserPage"
  >
    <p class="truncate text-[--van-text-color-2] text-xs">
      {{ userInfo.name || userInfo.email }}
    </p>
  </div>
  <div
    class="flex items-center justify-center gap-1 p-2 cursor-pointer van-haptics-feedback"
    v-else
    @click="showToast('功能未开放')"
  >
    <p class="truncate text-[--van-text-color-2] text-xs">登录/注册</p>
  </div>

  <van-popup
    v-model:show="showLogin"
    round
    safe-area-inset-bottom
    position="bottom"
    teleport="body"
    :style="{ height: '70%', minHeight: '360px' }"
    class="overflow-hidden"
  >
    <div
      class="px-2 pt-6 pb-2 flex flex-col items-center w-full h-full overflow-hidden"
    >
      <div class="flex w-full justify-between">
        <transition
          enter-active-class="animate__animated animate__fadeIn"
          leave-active-class="animate__animated animate__fadeOut"
          mode="out-in"
        >
          <h2 class="text-2xl font-bold text-[--van-text-color]">
            {{ isLoginMode ? '登录' : '注册' }}
          </h2>
        </transition>
        <button
          @click="showLogin = false"
          class="text-gray-500 hover:text-gray-700"
        >
          <van-icon name="cross" size="20" />
        </button>
      </div>
      <div
        class="scrollbar-hide max-w-[500px] h-full flex flex-col overflow-y-auto"
      >
        <van-form @submit="handleSubmit" key="form">
          <TransitionGroup name="list" tag="div">
            <!-- 邮箱输入 -->
            <van-field
              v-model="form.email"
              label="邮箱"
              placeholder="请输入邮箱"
              maxlength="30"
              :rules="emailRules"
              class="mb-4"
              key="email"
            />

            <!-- 密码输入 -->
            <van-field
              v-model="form.password"
              :type="isShowPassword ? 'text' : 'password'"
              label="密码"
              placeholder="请输入密码"
              maxlength="20"
              :rules="passwordRules"
              :right-icon="isShowPassword ? 'eye' : 'closed-eye'"
              @click-right-icon="isShowPassword = !isShowPassword"
              class="mb-4"
              key="password"
            />

            <!-- 注册时才显示的确认密码 -->
            <van-field
              v-if="!isLoginMode"
              v-model="form.confirmPassword"
              maxlength="20"
              :type="isShowPassword ? 'text' : 'password'"
              label="确认密码"
              placeholder="请再次输入密码"
              :rules="confirmPasswordRules"
              class="mb-4"
              key="confirmPassword"
            />

            <!-- 提交按钮 -->
            <van-button
              round
              block
              type="primary"
              native-type="submit"
              class="mt-6"
              :loading="isSubmitting"
              key="submit"
            >
              <span class="text-white">
                {{ isLoginMode ? '登录' : '注册' }}
              </span>
            </van-button>
          </TransitionGroup>
        </van-form>

        <div class="shrink-0 flex w-full items-center justify-between mt-4">
          <button
            @click="toggleMode"
            class="text-blue-500 hover:text-blue-700 text-sm"
          >
            {{ isLoginMode ? '没有账号？去注册' : '已有账号？去登录' }}
          </button>
          <button
            v-if="isLoginMode"
            type="button"
            class="text-blue-500 hover:text-blue-700 text-sm"
            @click="handleForgotPassword"
          >
            忘记密码？
          </button>
          <button
            v-else
            type="button"
            class="text-blue-500 hover:text-blue-700 text-sm"
            @click="resendVerifyEmail"
          >
            重新发送验证邮件
          </button>
        </div>
      </div>
    </div>
  </van-popup>
  <User></User>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { showDialog, showToast } from 'vant';
import Logo from '@/assets/wuji.svg';
import validator from 'validator';
import { useDisplayStore, useServerStore } from '@/store';
import { storeToRefs } from 'pinia';
import { router } from '@/router';
import User from '@/views/auth/User.vue';

const showLogin = defineModel('showLogin', {
  type: Boolean,
  default: false,
});
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
const { userInfo } = storeToRefs(serverStore);
// 登录/注册模式切换
const isLoginMode = ref(true);
const isShowPassword = ref(false);
const toggleMode = () => {
  isLoginMode.value = !isLoginMode.value;
  // resetForm();
};

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
const handleSubmit = async () => {
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
    showToast(String(error) || '操作失败，请重试');
  } finally {
    isSubmitting.value = false;
  }
};

// 忘记密码处理
const handleForgotPassword = () => {
  if (!form.email) {
    showDialog({
      title: '提示',
      message: '请填写邮箱地址, 我们将为您发送一条重置密码邮件',
      showCancelButton: false,
    });
    return;
  } else if (!validator.isEmail(form.email)) {
    showDialog({
      title: '提示',
      message: '请输入有效的邮箱地址',
      showCancelButton: false,
    });
    return;
  } else {
    showDialog({
      title: '提示',
      message: '确认向 ' + form.email + ' 发送重置密码邮件吗?',
      showCancelButton: true,
    })
      .then(() => {
        props.forgetPasswordEmail({
          email: form.email,
        });
      })
      .catch(() => {});
  }
};

const resendVerifyEmail = () => {
  if (!form.email) {
    showDialog({
      title: '提示',
      message: '请填写邮箱地址, 我们将重新为您发送一条验证邮件',
      showCancelButton: false,
    });
    return;
  } else if (!validator.isEmail(form.email)) {
    showDialog({
      title: '提示',
      message: '请输入有效的邮箱地址',
      showCancelButton: false,
    });
    return;
  } else {
    showDialog({
      title: '提示',
      message: '确认向 ' + form.email + ' 重新发送验证邮件吗?\n(密码不会重置)',
      showCancelButton: true,
    })
      .then(() => {
        props.resendVerifyEmail({
          email: form.email,
        });
      })
      .catch(() => {});
  }
};

// 重置表单
const resetForm = () => {
  form.email = '';
  form.password = '';
  form.confirmPassword = '';
};

const toUserPage = () => {
  displayStore.showLeftPopup = false;
  showLogin.value = false;
  displayStore.showUserPage = true;
};
</script>

<style scoped>
:deep(.van-cell__title) {
  flex: 1;
}
:deep(.van-cell__value) {
  flex: 4;
}
/* 列表动画 */
.list-move, /* 对移动的元素应用过渡 */
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}

.list-enter-from,
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
