<script setup lang="ts">
import MLoginButton from '@/components/button/MLoginButton.vue';
import { router } from '@/router';
import { useDisplayStore, useServerStore, useStore } from '@/store';

const store = useStore();
const displayStore = useDisplayStore();
const serverStore = useServerStore();

const options = [
  {
    text: '管理订阅源',
    color: '#1989fa',
    onClick: () => {
      router.push({ name: 'SourceManage' });
    },
  },
  {
    text: '订阅源市场',
    color: '#07c160',
    onClick: () => {
      router.push({ name: 'SourceMarket' });
    },
  },
  {
    text: '设置',
    onClick: () => {
      router.push({ name: 'Setting' });
    },
  },
  {
    text: '关于',
    onClick: () => {
      router.push({ name: 'About' });
    },
  },
];
</script>

<template>
  <div>
    <van-icon
      name="wap-nav"
      class="cursor-pointer text-[--van-text-color]"
      @click="displayStore.showLeftPopup = !displayStore.showLeftPopup"
    />
    <van-popup
      v-model:show="displayStore.showLeftPopup"
      z-index="1004"
      position="left"
      teleport="body"
      destroy-on-close
      :style="{ width: '150px', height: '100%' }"
    >
      <div class="p-2">
        <!-- Logo 和软件名 -->
        <div class="my-5 flex flex-col items-center justify-center">
          <!-- <van-image width="50" height="50" radius="4" :src="logo" /> -->
          <div class="text-lg font-bold text-[--van-text-color]">无极</div>
        </div>
        <MLoginButton :user-info="serverStore.userInfo" />

        <van-cell-group>
          <van-cell
            v-for="(option, index) in options"
            :key="index"
            clickable
            is-link
            class="mb-2"
            @click="option.onClick"
          >
            <template #title>
              <span :style="{ color: option.color }">{{ option.text }}</span>
            </template>
          </van-cell>
        </van-cell-group>
      </div>
    </van-popup>
  </div>
</template>

<style scoped lang="less"></style>
