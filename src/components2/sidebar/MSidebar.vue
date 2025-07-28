<script setup lang="ts">
import logo from '@/assets/wuji.png';
import { router } from '@/router';
import { useDisplayStore, useServerStore, useStore } from '@/store';
import { ref } from 'vue';
import ImportSubscribeSource from '@/components2/dialog/ImportSubscribeSource.vue';
import MLoginButton from '@/components2/button/MLoginButton.vue';

const store = useStore();
const displayStore = useDisplayStore();
const serverStore = useServerStore();

const showImportSubscribeDialog = ref(false);

const options = [
  {
    text: '导入订阅源',
    onClick: () => {
      displayStore.showLeftPopup = false;
      showImportSubscribeDialog.value = true;
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
      router.push({ name: 'SourceManage' });
    },
  },
  {
    text: '设置',
    onClick: () => {
      displayStore.showLeftPopup = false;
      router.push({ name: 'Setting' });
    },
  },
  {
    text: '关于',
    onClick: () => {
      displayStore.showLeftPopup = false;
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
      z-index="1002"
      position="left"
      destroy-on-close
      :style="{ width: '150px', height: '100%' }"
    >
      <div class="p-2">
        <!-- Logo 和软件名 -->
        <div class="my-5 flex flex-col items-center justify-center">
          <!-- <van-image width="50" height="50" radius="4" :src="logo" /> -->
          <div class="text-lg font-bold text-[--van-text-color]">无极</div>
        </div>
        <MLoginButton :user-info="serverStore.userInfo"></MLoginButton>

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
    <div class="dialogs">
      <ImportSubscribeSource v-model:show="showImportSubscribeDialog" />
    </div>
  </div>
</template>

<style scoped lang="less"></style>
