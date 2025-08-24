<script setup lang="ts">
import wujipng from '@/assets/wuji.png';
import { getVersion } from '@tauri-apps/api/app';
import { open } from '@tauri-apps/plugin-shell';
import { onMounted, ref } from 'vue';
import WNavbar from '@/components/header/WNavbar.vue';

const version = ref('');

function openGithub() {
  open('https://github.com/moshstudio/wuji-tauri');
}
onMounted(async () => {
  version.value = await getVersion();
});
</script>

<template>
  <div class="relative flex h-full flex-col overflow-hidden">
    <WNavbar title="关于"></WNavbar>
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
          <div class="text-button" @click="openGithub">Github</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less"></style>
