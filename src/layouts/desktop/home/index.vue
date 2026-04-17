<script setup lang="ts">
import { openUrl } from '@tauri-apps/plugin-opener';
import { fetchHotApi } from '@wuji-tauri/hot-api';
import { storeToRefs } from 'pinia';
import { showFailToast } from 'vant';
import { onMounted, ref } from 'vue';

import { useDisplayStore, useStore } from '@/store';

const store = useStore();
const displayStore = useDisplayStore();
const { hotItems } = storeToRefs(store);

const active = ref(0);
const loading = ref(false);
async function openInBrowser(url: string) {
  try {
    await openUrl(url);
  }
  catch (error) {
    console.error('Failed to open link:', error);
    showFailToast('打开失败,请尝试重置默认浏览器');
  }
}
onMounted(async () => {
  if (!hotItems.value.length) {
    loading.value = true;
    try {
      const res = await fetchHotApi();
      hotItems.value = res;
    }
    finally {
      loading.value = false;
    }
  }
});
</script>

<template>
  <div class="relative h-full w-full">
    <div class="absolute left-1/2 h-full max-w-full -translate-x-1/2">
      <!-- 骨架屏 -->
      <div v-if="loading" class="w-screen space-y-4 p-4 lg:w-[800px]">
        <van-skeleton v-for="i in 8" :key="i" animated>
          <template #template>
            <div class="flex w-full items-center py-3">
              <div class="flex-1 pr-4">
                <van-skeleton-paragraph row-width="60%" />
                <van-skeleton-paragraph row-width="90%" class="mt-2" />
              </div>
              <van-skeleton-image style="width: 10em; height: 60px; border-radius: 4px;" />
            </div>
          </template>
        </van-skeleton>
      </div>

      <van-tabs
        v-if="!loading"
        v-model:active="active"
        class="h-full max-w-full transform select-none overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out lg:max-w-[800px]"
        sticky
        animated
      >
        <van-tab v-for="item in hotItems" :key="item.title" :title="item.title">
          <van-cell-group>
            <van-cell
              v-for="entity in item.data"
              :key="entity.id"
              :title="entity.title"
              :label="entity.desc?.substring(0, 120)"
              class="van-haptics-feedback"
              @click="openInBrowser(entity.url)"
            >
              <template v-if="entity.cover" #value>
                <van-image
                  width="10em"
                  radius="4"
                  fit="cover"
                  position="left"
                  :src="entity.cover"
                  class="max-h-[100px]"
                />
              </template>
            </van-cell>
          </van-cell-group>
        </van-tab>
      </van-tabs>
    </div>
  </div>
</template>

<style scoped lang="less">
:deep(.van-cell__title) {
  flex: 2;
}
</style>
