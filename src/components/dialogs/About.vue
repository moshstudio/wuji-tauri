<script setup lang="ts">
import wujisvg from '@/assets/wuji.svg';
import { useDisplayStore } from '@/store';
import { getVersion } from '@tauri-apps/api/app';
import { open } from '@tauri-apps/plugin-shell';
import { onMounted, ref } from 'vue';

const displayStore = useDisplayStore();
const version = ref('');

function openGithub() {
  open('https://github.com/moshstudio/wuji-tauri');
}
onMounted(async () => {
  version.value = await getVersion();
});
</script>

<template>
  <van-dialog
    v-model:show="displayStore.showAboutDialog"
    close-on-click-overlay
    @touchmove.stop
  >
    <div class="flex flex-col gap-2 justify-center items-center p-4">
      <van-image
        width="80"
        height="80"
        :src="wujisvg"
        class="shadow rounded-lg"
      />
      <h1 class="text-xl text-[var(--van-primary-color)]">
        无极
      </h1>
      <p class="text-gray-400 text-sm">
        {{ version }}
      </p>
      <p class="text-gray-400 text-sm">
        By moshang studio
      </p>
      <div class="flex gap-2">
        <div class="text-button" @click="openGithub">
          Github
        </div>
      </div>
    </div>
  </van-dialog>
</template>

<style scoped lang="less"></style>
