<script setup lang="ts">
import WNavbar from '@/components/header/WNavbar.vue';

defineProps<{
  clearCache: () => void;
  clearData: () => void;
}>();
const isDark = defineModel<boolean>('isDark', { required: true });
</script>

<template>
  <div class="relative flex h-full flex-col overflow-hidden">
    <WNavbar title="设置" />
    <div
      class="flex w-full flex-grow flex-col items-center overflow-y-auto bg-[--van-background] p-4"
    >
      <van-cell-group inset class="w-full">
        <van-cell
          center
          title="深色模式"
          is-link
          @click="() => (isDark = !isDark)"
        >
          <template #right-icon>
            <van-switch v-model="isDark" @click.stop />
          </template>
        </van-cell>
        <van-cell center title="清除缓存" is-link @click="clearCache" />
        <van-cell center is-link @click="clearData">
          <template #title>
            <p class="text-red">清空数据</p>
          </template>
        </van-cell>
      </van-cell-group>
    </div>
  </div>
</template>

<style scoped lang="less"></style>
