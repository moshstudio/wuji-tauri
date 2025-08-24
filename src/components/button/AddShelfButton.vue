<script setup lang="ts">
import { ButtonSize } from 'vant';

withDefaults(
  defineProps<{
    isAdded: boolean;
    addText?: string;
    addedText?: string;
    size?: ButtonSize;
    addClick: () => void;
    addedClick: () => void;
  }>(),
  {
    addText: '收藏',
    addedText: '已收藏',
    size: 'small',
  },
);
</script>

<template>
  <div class="flex items-center justify-center">
    <van-button v-if="isAdded" :size="size" type="primary" @click="addedClick">
      {{ addedText }}
    </van-button>
    <van-button v-else :size="size" type="primary" @click="addClick">
      {{ addText }}
    </van-button>
  </div>
</template>

<style scoped lang="less">
:deep(.van-button__text) {
  color: #eee;
}
</style>
