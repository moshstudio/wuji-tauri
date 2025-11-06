<script setup lang="ts">
import WNavbar from '@/components/header/WNavbar.vue';

defineProps<{
  clearCache: () => void;
  clearData: () => void;
}>();
const isDark = defineModel<boolean>('isDark', { required: true });
const showHistory = defineModel<boolean>('showHistory', { required: true });
const songAutoSwitchSource = defineModel<boolean>('songAutoSwitchSource', {
  required: true,
});
const autoUpdateSubscribeSource = defineModel<boolean>(
  'autoUpdateSubscribeSource',
  {
    required: true,
  },
);
</script>

<template>
  <div class="relative flex h-full flex-col overflow-hidden">
    <WNavbar title="设置" />
    <div
      class="flex w-full flex-grow flex-col items-center gap-4 overflow-y-auto overflow-x-hidden bg-[--van-background] p-4"
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

      <van-cell-group inset class="w-full">
        <van-cell
          center
          title="首页显示历史记录"
          is-link
          @click="() => (showHistory = !showHistory)"
        >
          <template #right-icon>
            <van-switch v-model="showHistory" @click.stop />
          </template>
        </van-cell>
        <van-cell
          center
          title="音乐自动切换源"
          is-link
          @click="() => (songAutoSwitchSource = !songAutoSwitchSource)"
        >
          <template #right-icon>
            <van-switch v-model="songAutoSwitchSource" @click.stop />
          </template>
        </van-cell>
        <van-cell
          center
          title="自动更新订阅源"
          is-link
          @click="
            () => (autoUpdateSubscribeSource = !autoUpdateSubscribeSource)
          "
        >
          <template #right-icon>
            <van-switch v-model="autoUpdateSubscribeSource" @click.stop />
          </template>
        </van-cell>
      </van-cell-group>
    </div>
  </div>
</template>

<style scoped lang="less"></style>
