<script setup lang="ts">
import { useDisplayStore } from '@/store';
import MSidebar from '../sidebar/MSidebar.vue';
import SearchField from '@/components/search/SearchField.vue';

const emit = defineEmits<{
  (e: 'search'): void;
  (e: 'showShelf'): void;
}>();
const value = defineModel<string>('value', {
  required: true,
});
const displayStore = useDisplayStore();
</script>

<template>
  <div
    class="z-[100] flex h-[50px] items-center justify-between gap-2 bg-[--van-background-2] px-4"
  >
    <div class="placeholder"></div>
    <SearchField
      v-model:value="value"
      v-model:search-histories="displayStore.searchHistories"
      :search="() => emit('search')"
    />
    <div class="flex h-[50px] items-center justify-center gap-2">
      <van-icon
        name="star-o"
        class="text-button-2"
        @click="() => emit('showShelf')"
      />
    </div>
  </div>
</template>

<style scoped lang="less"></style>
