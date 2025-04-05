<script setup lang="ts">
import { useDisplayStore } from '@/store';
import _ from 'lodash';
import { storeToRefs } from 'pinia';
import { Icon } from '@iconify/vue';
import { computed, ref } from 'vue';

const displayStore = useDisplayStore();
const { searchHistories } = storeToRefs(displayStore);

const searchValue = defineModel('searchValue', {
  type: String,
  required: true,
});
const emit = defineEmits<{
  (e: 'search'): void;
}>();

const showHistory = ref(false);
const searchInput = ref<HTMLInputElement>();

const onSearch = () => {
  emit('search');
  saveSearch();
};
const clearSearch = () => {
  searchValue.value = '';
  onSearch();
};

// 实时过滤历史记录
const filteredHistory = computed(() => {
  if (!searchValue.value) {
    return searchHistories.value;
  }
  return searchHistories.value.filter((item: string) =>
    item.toLowerCase().includes(searchValue.value.toLowerCase())
  );
});

// 输入处理
const handleInput = () => {
  if (searchValue.value && !filteredHistory.value) {
    showHistory.value = true;
  }
};

// 保存搜索
const saveSearch = () => {
  if (!searchValue.value.trim()) return;

  if (searchHistories.value.includes(searchValue.value)) {
    _.remove(searchHistories.value, (item) => item === searchValue.value);
  }
  searchHistories.value.unshift(searchValue.value);
  showHistory.value = false;
};

// 选择历史记录
const selectHistory = (item: string) => {
  searchValue.value = item;
  showHistory.value = false;
  setTimeout(() => {
    // 如果需要可以在这里触发搜索
    // doSearch()
  }, 0);
};

const deleteHistory = (e: Event, item: string) => {
  e.preventDefault();
  _.remove(searchHistories.value, (i) => i === item);
  searchInput.value?.focus();
  showHistory.value = true;
};

// 清空历史记录
const clearHistory = () => {
  searchHistories.value = [];
  showHistory.value = false;
};

// 失去焦点处理
const onBlur = () => {
  setTimeout(() => {
    showHistory.value = false;
  }, 200);
};
</script>
<template>
  <div class="relative w-full max-w-md mx-auto">
    <van-search
      ref="searchInput"
      v-model="searchValue"
      placeholder="请输入搜索关键词"
      left-icon=""
      shape="round"
      :autofocus="false"
      autocomplete="off"
      @click-right-icon="onSearch"
      @search="onSearch"
      @clear="clearSearch"
      @input="handleInput"
      @focus="showHistory = true"
      @blur="onBlur"
    >
      <template #right-icon>
        <van-icon name="search" class="van-haptics-feedback" />
      </template>
    </van-search>
    <!-- 历史记录面板 -->
    <transition
      name="history-panel"
      enter-active-class="transition-all duration-200 ease-out"
      leave-active-class="transition-all duration-200 ease-in"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="showHistory && filteredHistory.length > 0"
        class="absolute z-50 w-full overflow-hidden bg-[var(--van-background)] text-[var(--van-text-color)] text-sm rounded-lg shadow-lg"
      >
        <div class="max-h-48 overflow-y-auto">
          <div
            v-for="(item, index) in filteredHistory"
            :key="index"
            class="px-4 py-2 cursor-pointer flex items-center justify-between"
          >
            <p class="flex-grow" @click="selectHistory(item)">{{ item }}</p>
            <Icon
              icon="jam:close"
              width="24"
              height="24"
              @mousedown.prevent="(e) => deleteHistory(e, item)"
              @pointerdown.prevent="(e) => deleteHistory(e, item)"
            />
          </div>
        </div>
        <div
          class="px-4 py-2 text-center text-gray-500 border-t border-gray-200 cursor-pointer hover:bg-gray-100 sticky bottom-0 bg-[var(--van-background)]"
          @mousedown.prevent="clearHistory"
          @pointerdown="clearHistory"
        >
          清空历史记录
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped lang="less"></style>
