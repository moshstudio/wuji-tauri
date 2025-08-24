<script setup lang="ts">
import MNavBar from '@/components/header/MNavBar.vue';
import { MyMarketSourceCard } from '@wuji-tauri/components/src';
import { MarketSource } from '@wuji-tauri/source-extension';
import ResponsiveGrid2 from '@/components/grid/ResponsiveGrid2.vue';
import _ from 'lodash';
import { TagProps } from 'vant';

const isFreshing = defineModel<boolean>('isFreshing');

defineProps<{
  sources?: MarketSource[];
  refresh: () => void;
  permissionText: (source: MarketSource) => string | undefined;
  permissionStyle: (source: MarketSource) => Partial<TagProps> | undefined;
  createSource: () => void;
  onClick: (source: MarketSource) => void;
  showMoreOptions: (source: MarketSource) => void;
}>();
</script>

<template>
  <div class="relative flex h-full w-full flex-col">
    <MNavBar title="我创建的订阅源"></MNavBar>
    <van-pull-refresh
      v-model="isFreshing"
      @refresh="refresh"
      class="flex w-full flex-grow flex-col overflow-y-auto bg-[--van-background-2] p-2"
    >
      <div class="flex w-full items-center justify-start gap-2 pl-2">
        <van-button size="small" type="primary" @click="createSource">
          创建订阅源
        </van-button>
      </div>
      <ResponsiveGrid2>
        <MyMarketSourceCard
          v-for="source in sources"
          :key="source._id"
          :source="source"
          :click="() => onClick(source)"
          :permission-text="permissionText"
          :permission-style="permissionStyle"
          :showMoreOptions="showMoreOptions"
        ></MyMarketSourceCard>
      </ResponsiveGrid2>
    </van-pull-refresh>
  </div>
</template>

<style scoped lang="less"></style>
