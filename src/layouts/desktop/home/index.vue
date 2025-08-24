<script setup lang="ts">
import { fetchHotApi } from '@wuji-tauri/hot-api';
import { useDisplayStore, useStore } from '@/store';
import { sleep } from '@/utils';
import { open } from '@tauri-apps/plugin-shell';
import { storeToRefs } from 'pinia';
import { showFailToast } from 'vant';
import { onMounted, ref } from 'vue';
import WTaichiAnimate from '@/components/animate/WTaichiAnimate.vue';

const store = useStore();
const { hotItems } = storeToRefs(store);

const active = ref(0);
async function openInBrowser(url: string) {
  try {
    await open(url);
  } catch (error) {
    console.error('Failed to open link:', error);
    showFailToast('打开失败,请尝试重置默认浏览器');
  }
}
onMounted(async () => {
  if (!hotItems.value.length) {
    const res = await fetchHotApi();
    const displayStore = useDisplayStore();
    displayStore.taichiAnimateRandomized = true;
    await sleep(200);
    hotItems.value = res;
  }
});
</script>

<template>
  <div class="relative h-full w-full">
    <WTaichiAnimate />
    <div class="absolute left-1/2 h-full max-w-full -translate-x-1/2">
      <van-tabs
        v-model:active="active"
        class="h-full max-w-full select-none overflow-y-auto overflow-x-hidden lg:max-w-[800px]"
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
