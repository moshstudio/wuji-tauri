<script setup lang="ts">
import LeftPopup from './LeftPopup.vue';
import SearchButton from './Search2.vue';

const emit = defineEmits<{
  (e: 'search'): void;
  (e: 'showShelf'): void;
}>();
const searchValue = defineModel('searchValue', {
  type: String,
  required: true,
});
</script>

<template>
  <div
    class="px-4 h-[50px] flex gap-2 justify-between items-center z-[100] bg-[--van-background-2]"
  >
    <LeftPopup />
    <SearchButton
      v-model:search-value="searchValue"
      @search="() => emit('search')"
    />
    <div class="h-[50px] flex items-center justify-center gap-2">
      <van-icon
        name="star-o"
        class="text-button-2"
        @click="() => emit('showShelf')"
      />
    </div>
  </div>
</template>

<style scoped lang="less"></style>
