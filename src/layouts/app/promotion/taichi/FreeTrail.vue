<script setup lang="ts">
import MNavBar from '@/components/header/MNavBar.vue';
const username = defineModel<string>('username', { required: true });
const password = defineModel<string>('password', { required: true });
defineProps<{
  onGet: (username: string, password: string) => Promise<any>;
}>();
</script>

<template>
  <div
    class="relative flex h-full flex-col overflow-hidden bg-[var(--van-background-color)]"
  >
    <MNavBar title="会员领取" />
    <div class="flex-1 p-4">
      <van-form @submit="() => onGet(username, password)">
        <van-cell-group inset>
          <van-field
            v-model="username"
            name="username"
            label="太极邮箱"
            placeholder="请输入用户名"
            :rules="[{ required: true, message: '请填写太极邮箱' }]"
            class="mb-3"
          />
          <van-field
            v-model="password"
            type="password"
            name="password"
            label="太极密码"
            placeholder="请输入密码"
            :rules="[{ required: true, message: '请填写太极密码' }]"
          />
        </van-cell-group>
        <div class="mt-6 px-4">
          <van-button
            round
            block
            type="primary"
            native-type="submit"
            class="shadow-md"
          >
            领取
          </van-button>
        </div>
      </van-form>
    </div>
    <div class="px-4 pb-6 text-center text-xs text-gray-500">
      太极用户免费领取无极VIP会员试用，一名用户仅限一次
    </div>
  </div>
</template>

<style scoped lang="less">
:deep(.van-cell) {
  background: transparent;
}
:deep(.van-field__label) {
  font-weight: 500;
}
</style>
