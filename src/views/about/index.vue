<script setup lang="ts">
import { getVersion } from '@tauri-apps/api/app';
import { openUrl } from '@tauri-apps/plugin-opener';
import { onMounted, ref } from 'vue';
import wujipng from '@/assets/wuji.png';
import WNavbar from '@/components/header/WNavbar.vue';
import { checkAndUpdate } from '@/utils/update';
import { showSuccessToast } from 'vant';

const version = ref('');
const checking = ref(false);

function openHomepage() {
  openUrl('https://moshangwangluo.com');
}

async function handleCheckUpdate() {
  if (checking.value) return;
  checking.value = true;
  try {
    const haveUpdate = await checkAndUpdate();
    if (!haveUpdate) {
      showSuccessToast('当前已是最新版本');
    }
  } finally {
    checking.value = false;
  }
}

onMounted(async () => {
  version.value = await getVersion();
});
</script>

<template>
  <div
    class="relative flex h-full flex-col overflow-hidden bg-[--van-background-3]"
  >
    <WNavbar title="关于" />
    <div class="flex grow items-center justify-center px-4 pb-6">
      <div
        class="w-full max-w-sm rounded-2xl bg-[--van-background-2] p-6 shadow-sm ring-1 ring-black/5 dark:ring-white/10"
      >
        <div class="flex flex-col items-center gap-3">
          <van-image
            width="96"
            height="96"
            :src="wujipng"
            class="rounded-2xl shadow-sm"
          />
          <div class="mt-2 text-center">
            <h1 class="text-lg font-semibold text-[var(--van-primary-color)]">
              无极
            </h1>
            <p class="mt-1 text-xs text-gray-500">轻巧的多媒体阅读与播放工具</p>
          </div>
          <p
            class="mt-1 inline-flex items-center rounded-full bg-[--van-background-3] px-3 py-1 text-xs text-gray-500"
          >
            版本 {{ version || '加载中…' }}
          </p>
        </div>
        <div class="mt-6 flex flex-col gap-3">
          <van-button
            type="primary"
            block
            round
            :loading="checking"
            @click="handleCheckUpdate"
          >
            检查更新
          </van-button>
          <van-button plain type="primary" block round @click="openHomepage">
            访问官网
          </van-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less"></style>
