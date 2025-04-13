<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  (e: 'search', value: string): void;
}>();
const searchValue = defineModel({ type: String, required: true });
const isExpanded = ref(false);
const searchBar = ref<HTMLElement>();
function showSearchBar() {
  isExpanded.value = true;
  // 让输入框自动聚焦
  setTimeout(() => {
    searchBar.value?.focus();
  }, 0);
}
function hideSearchBar() {
  if (!searchValue.value.trim()) {
    isExpanded.value = false;
  }
}
function performSearch() {
  emit('search', searchValue.value);
}
</script>

<template>
  <div class="relative">
    <button v-if="!isExpanded" class="text-button-2" @click="showSearchBar">
      <van-icon name="search" />
    </button>
    <transition name="slide">
      <div
        v-if="isExpanded"
        class="absolute top-1/2 right-1/2 -translate-y-1/2 w-[70vw]"
      >
        <van-search
          ref="searchBar"
          v-model="searchValue"
          placeholder="请输入搜索关键词"
          left-icon=""
          shape="round"
          autofocus
          @click-right-icon="performSearch"
          @search="performSearch"
          @clear="performSearch"
          @blur="hideSearchBar"
        >
          <template #right-icon>
            <van-icon name="search" class="van-haptics-feedback" />
          </template>
        </van-search>
      </div>
    </transition>
  </div>
</template>

<style scoped lang="less">
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateX(20px) translateY(-50%);
}
</style>
