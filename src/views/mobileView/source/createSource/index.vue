<script setup lang="ts">
import { useDisplayStore } from '@/store';
import { storeToRefs } from 'pinia';

const displayStore = useDisplayStore();
const { showCreateSubscribeDialog } = storeToRefs(displayStore);

function save() {
  showCreateSubscribeDialog.value = false;
}
</script>

<template>
  <van-popup
    v-model:show="showCreateSubscribeDialog"
    position="bottom"
    teleport="body"
    :overlay="false"
    z-index="1003"
    destroy-on-close
    class="w-full h-full overflow-hidden"
  >
    <div class="relative h-full flex flex-col">
      <van-nav-bar :title="'创建订阅源'" left-arrow @click-left="save" />
      <div class="flex items-center justify-center font-bold text-base">
        手机界面不支持创建源，请使用电脑界面
      </div>
    </div>
  </van-popup>
</template>

<style scoped lang="less"></style>
