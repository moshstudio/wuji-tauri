<script setup lang="ts">
import { getVersion } from '@tauri-apps/api/app';
import { openUrl } from '@tauri-apps/plugin-opener';
import { onMounted, ref } from 'vue';
import wujipng from '@/assets/wuji.png';
import WNavbar from '@/components/header/WNavbar.vue';

const version = ref('');

function openGithub() {
  openUrl('https://moshangwangluo.com');
}
onMounted(async () => {
  version.value = await getVersion();
});
</script>

<template>
  <div class="relative flex h-full flex-col overflow-hidden">
    <WNavbar title="关于" />
    <div
      class="flex grow flex-col items-center justify-center overflow-y-auto bg-[--van-background-3]"
    >
      <div class="flex flex-col items-center justify-center gap-2 p-4">
        <van-image
          width="120"
          height="120"
          :src="wujipng"
          class="animate-pulse rounded-lg transition-all"
        />
        <h1 class="mt-4 text-xl text-[var(--van-primary-color)]">无极</h1>
        <p class="text-sm text-gray-400">
          {{ version }}
        </p>
        <p class="text-sm text-gray-400">By moshang studio</p>
        <div class="flex gap-2">
          <div class="text-button" @click="openGithub">主页</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less"></style>
