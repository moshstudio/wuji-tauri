<script setup lang="ts">
import { getSourceTypeTheme } from '@wuji-tauri/components';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { router } from '@/router';
import { useSubscribeSourceStore } from '@/store';

const props = defineProps<{
  type: string;
}>();

const subscribeStore = useSubscribeSourceStore();
const { isLoaded } = storeToRefs(subscribeStore);

const theme = computed(() => getSourceTypeTheme(props.type));
const description = computed(
  () => `尚未启用任何${theme.value.label}源`,
);

function goManage() {
  router.push({ name: 'SourceManage' });
}

function goMarket() {
  router.push({ name: 'SourceMarket' });
}
</script>

<template>
  <van-loading v-if="!isLoaded" class="flex justify-center py-16" size="24px" />
  <div v-else class="px-4 py-12">
    <van-empty :description="description">
      <div class="mt-4 flex flex-wrap justify-center gap-2">
        <van-button type="primary" size="small" round @click="goManage">
          管理订阅源
        </van-button>
        <van-button plain size="small" round @click="goMarket">
          浏览源市场
        </van-button>
      </div>
    </van-empty>
  </div>
</template>
