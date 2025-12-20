<script setup lang="ts">
import { ref } from 'vue';
import WNavbar from '@/components/header/WNavbar.vue';
import { useDisplayStore } from '@/store';

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
const paginationPosition = defineModel<'top' | 'bottom' | 'both'>(
  'paginationPosition',
  {
    required: true,
  },
);
const enableAutostart = defineModel<boolean>('enableAutostart', {
  required: false,
  default: false,
});
const closeAction = defineModel<'close' | 'minimize'>('closeAction', {
  required: false,
  default: 'close',
});

const displayStore = useDisplayStore();
const showPaginationSheet = ref(false);
const showCloseActionSheet = ref(false);
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

      <van-cell-group v-if="displayStore.isWindows" inset class="w-full">
        <van-cell
          center
          title="开机自启"
          is-link
          @click="() => (enableAutostart = !enableAutostart)"
        >
          <template #right-icon>
            <van-switch v-model="enableAutostart" @click.stop />
          </template>
        </van-cell>
        <van-cell
          center
          title="关闭窗口时"
          is-link
          @click="showCloseActionSheet = true"
        >
          <template #value>
            <div class="text-[var(--van-gray-6)]">
              {{ closeAction === 'close' ? '关闭应用' : '最小化到托盘' }}
            </div>
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
        <van-cell
          center
          title="换页按钮位置"
          is-link
          @click="showPaginationSheet = true"
        >
          <template #value>
            <div class="text-[var(--van-gray-6)]">
              {{
                paginationPosition === 'top'
                  ? '列表上方'
                  : paginationPosition === 'bottom'
                    ? '列表下方'
                    : '列表上下方'
              }}
            </div>
          </template>
        </van-cell>
      </van-cell-group>
    </div>
  </div>
  <van-action-sheet
    v-model:show="showPaginationSheet"
    :actions="[
      { name: '列表上方' },
      { name: '列表下方' },
      { name: '列表上下方' },
    ]"
    cancel-text="取消"
    @select="
      (item: any) => {
        if (item.name === '列表上方') paginationPosition = 'top';
        else if (item.name === '列表下方') paginationPosition = 'bottom';
        else paginationPosition = 'both';
        showPaginationSheet = false;
      }
    "
  />
  <van-action-sheet
    v-model:show="showCloseActionSheet"
    :actions="[{ name: '关闭应用' }, { name: '最小化到托盘' }]"
    cancel-text="取消"
    @select="
      (item: any) => {
        if (item.name === '关闭应用') closeAction = 'close';
        else closeAction = 'minimize';
        showCloseActionSheet = false;
      }
    "
  />
</template>

<style scoped lang="less"></style>
