<script setup lang="ts">
import { useDisplayStore } from '@/store';
import { storeToRefs } from 'pinia';
import { ref, reactive } from 'vue';
const displayStore = useDisplayStore();

const { showManageSubscribeDialog } = storeToRefs(displayStore);

</script>

<template>
  <van-popup
    v-model:show="showManageSubscribeDialog"
    position="right"
    teleport="body"
    :overlay="false"
    z-index="1000"
    destroy-on-close
    class="w-full h-full overflow-hidden"
  ></van-popup>
</template>

<style scoped lang="less"></style>
