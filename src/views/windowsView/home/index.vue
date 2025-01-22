<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { open } from '@tauri-apps/plugin-shell';
import TaiChiAnimate from '../../../components/windows/TaiChiAnimate.vue';
import { showToast } from 'vant';
import { useDisplayStore, useStore } from '@/store';
import { storeToRefs } from 'pinia';
import { apiHot } from '@/apis/hot';
import { sleep } from '@/utils';

const store = useStore();
const { hotItems } = storeToRefs(store);

const active = ref(0);
const openInBrowser = async (url: string) => {
  try {
    await open(url);
  } catch (error) {
    console.error('Failed to open link:', error);
    showToast('打开失败,请尝试重置默认浏览器');
  }
};
onMounted(async () => {
  if (!hotItems.value.length) {
    const res = await apiHot.fetchHotApi();
    const displayStore = useDisplayStore();
    displayStore.taichiAnimateRandomized = true;
    await sleep(200);
    hotItems.value = res;
  }
});
</script>

<template>
  <div class="relative w-full h-full">
    <TaiChiAnimate></TaiChiAnimate>
    <div class="absolute left-1/2 -translate-x-1/2 max-w-full h-full">
      <van-tabs
        v-model:active="active"
        class="h-full max-w-full lg:max-w-[800px] select-none overflow-x-hidden overflow-y-auto"
        sticky
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
              <template #value v-if="entity.cover">
                <van-image
                  width="10em"
                  fit="cover"
                  position="left"
                  :src="entity.cover"
                  lazy-load
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
