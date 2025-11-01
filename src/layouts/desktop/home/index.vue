<script setup lang="ts">
import { openUrl } from '@tauri-apps/plugin-opener';
import { fetchHotApi } from '@wuji-tauri/hot-api';
import { storeToRefs } from 'pinia';
import { showFailToast } from 'vant';
import { onMounted, ref } from 'vue';
import { Icon } from '@iconify/vue';
import DialogAnimate from '@/components/animate/DialogAnimate.vue';
import { useDisplayStore, useStore } from '@/store';
import { sleep } from '@/utils';

const store = useStore();
const displayStore = useDisplayStore();
const { hotItems } = storeToRefs(store);
const { showNews } = storeToRefs(displayStore);

const active = ref(0);
async function openInBrowser(url: string) {
  try {
    await openUrl(url);
  } catch (error) {
    console.error('Failed to open link:', error);
    showFailToast('打开失败,请尝试重置默认浏览器');
  }
}
function toggleNewsTab() {
  showNews.value = !showNews.value;
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
    <DialogAnimate v-if="!showNews" />
    <div class="absolute left-1/2 h-full max-w-full -translate-x-1/2">
      <van-tabs
        v-if="showNews"
        v-model:active="active"
        class="h-full max-w-full transform select-none overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out lg:max-w-[800px]"
        :class="{
          'scale-95 opacity-0': !showNews,
          'scale-100 opacity-100': showNews,
        }"
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
    <van-button
      plain
      round
      size="small"
      @click="toggleNewsTab"
      class="absolute right-1 top-1 z-[13]"
    >
      <Icon
        :icon="showNews ? 'tabler:news-off' : 'tabler:news'"
        width="20px"
        height="20px"
      />
    </van-button>
  </div>
</template>

<style scoped lang="less">
:deep(.van-cell__title) {
  flex: 2;
}
</style>
