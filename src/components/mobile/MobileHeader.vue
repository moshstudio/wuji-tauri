<script setup lang="ts">
import LeftPopup from './LeftPopup.vue';
import SearchButton from './Search2.vue';
const searchValue = defineModel('searchValue', {
  type: String,
  required: true,
});
const emit = defineEmits<{
  (e: 'search', value: string): void;
  (e: 'showShelf'): void;
}>();
</script>

<template>
  <div
    class="px-4 h-[50px] flex gap-2 justify-between items-center z-[100] bg-[--van-background-2]"
  >
    <LeftPopup></LeftPopup>
    <SearchButton
      v-model="searchValue"
      @search="(v) => emit('search', v)"
    ></SearchButton>
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
