<script setup lang="ts">
import logo from '@/assets/wuji.svg';
import { useDisplayStore, useStore } from '@/store';
import AboutDialog from '../dialogs/About.vue';
import ImportSubscribeDialog from '../windows/dialogs/ImportSubscribe.vue';
import ManageSubscribeDialog from '../windows/dialogs/ManageSubscribe.vue';
import SettingDialog from '../windows/dialogs/Setting.vue';

const store = useStore();
const displayStore = useDisplayStore();
// 模拟选项数据
const options = [
  {
    text: '导入订阅源',
    onClick: () => {
      displayStore.showLeftPopup = false;
      displayStore.showAddSubscribeDialog = true;
    },
  },
  {
    text: '更新订阅源',
    onClick: async () => {
      displayStore.showLeftPopup = false;
      await store.updateSubscribeSources();
    },
  },
  {
    text: '管理订阅源',
    onClick: () => {
      displayStore.showLeftPopup = false;
      displayStore.showManageSubscribeDialog = true;
    },
  },
  {
    text: '设置',
    onClick: () => {
      displayStore.showLeftPopup = false;
      displayStore.showSettingDialog = true;
    },
  },
  {
    text: '关于',
    onClick: () => {
      displayStore.showLeftPopup = false;
      displayStore.showAboutDialog = true;
    },
  },
];
</script>

<template>
  <van-icon
    name="wap-nav"
    class="cursor-pointer text-[--van-text-color]"
    @click="displayStore.showLeftPopup = !displayStore.showLeftPopup"
  />
  <van-popup
    v-model:show="displayStore.showLeftPopup"
    position="left"
    :style="{ width: '150px', height: '100%' }"
  >
    <div class="p-2">
      <!-- Logo 和软件名 -->
      <div class="flex flex-col justify-center items-center mb-5">
        <van-image width="50" height="50" radius="4" :src="logo" />
        <div class="text-lg font-bold text-[--van-text-color]">
          无极
        </div>
      </div>
      <van-cell-group>
        <van-cell
          v-for="(option, index) in options"
          :key="index"
          :title="option.text"
          clickable
          is-link
          class="mb-2 text-[--van-text-color]"
          @click="option.onClick"
        />
      </van-cell-group>
    </div>
  </van-popup>
  <ImportSubscribeDialog />
  <ManageSubscribeDialog />
  <SettingDialog />
  <AboutDialog />
</template>

<style scoped lang="less"></style>
