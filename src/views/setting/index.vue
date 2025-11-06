<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import AppSetting from '@/layouts/app/setting/index.vue';
import DesktopSetting from '@/layouts/desktop/setting/index.vue';
import { useDisplayStore, useStore } from '@/store';

const store = useStore();
const displayStore = useDisplayStore();
const {
  isDark,
  songAutoSwitchSource,
  showViewHistory,
  autoUpdateSubscribeSource,
  paginationPosition,
} = storeToRefs(displayStore);

const showConfirmClearData = ref(false);

function clearData() {
  showConfirmClearData.value = true;
}
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppSetting
        v-model:is-dark="isDark"
        v-model:show-history="showViewHistory"
        v-model:song-auto-switch-source="songAutoSwitchSource"
        v-model:auto-update-subscribe-source="autoUpdateSubscribeSource"
        v-model:pagination-position="paginationPosition"
        :clear-cache="store.clearCache"
        :clear-data="clearData"
      />
    </template>
    <template #desktop>
      <DesktopSetting
        v-model:is-dark="isDark"
        v-model:show-history="showViewHistory"
        v-model:song-auto-switch-source="songAutoSwitchSource"
        v-model:auto-update-subscribe-source="autoUpdateSubscribeSource"
        v-model:pagination-position="paginationPosition"
        :clear-cache="store.clearCache"
        :clear-data="clearData"
      />
    </template>
    <van-action-sheet
      v-model:show="showConfirmClearData"
      teleport="body"
      cancel-text="取消"
      :actions="[
        { name: '确认清空数据?', color: '#ee0a24', callback: store.clearData },
      ]"
      close-on-click-action
    />
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
