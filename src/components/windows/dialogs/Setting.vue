<script setup lang="ts">
import { ref } from 'vue';
import { useDisplayStore, useStore } from '@/store';

const store = useStore();
const displayStore = useDisplayStore();
const showConfirmClearData = ref(false);
const clearData = () => {
  store.clearData();
};
</script>

<template>
  <van-dialog
    v-model:show="displayStore.showSettingDialog"
    title="设置"
    show-cancel-button
    close-on-click-overlay
  >
    <van-cell-group class="mt-2" inset>
      <van-cell center title="深色模式">
        <template #right-icon>
          <van-switch v-model="displayStore.isDark" />
        </template>
      </van-cell>
      <van-cell
        center
        title="清除缓存"
        is-link
        @click="() => store.clearCache()"
      >
      </van-cell>
      <van-cell center is-link @click="showConfirmClearData = true">
        <template #title>
          <p class="text-red">清空数据</p>
        </template>
      </van-cell>
    </van-cell-group>
  </van-dialog>
  <van-action-sheet
    v-model:show="showConfirmClearData"
    teleport="body"
    cancel-text="取消"
    :actions="[
      { name: '确认清空数据?', color: '#ee0a24', callback: clearData },
    ]"
    close-on-click-action
  />
</template>

<style scoped lang="less"></style>
