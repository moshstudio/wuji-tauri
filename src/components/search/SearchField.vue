<script setup lang="ts">
import { Icon } from '@iconify/vue';
import _ from 'lodash';
import { ref } from 'vue';

const props = defineProps<{
  search: (value: string) => void;
}>();
const value = defineModel<string>('value', { required: true });
const searchHistories = defineModel<string[]>('searchHistories', {
  required: true,
});
const showHistory = ref(false);
const searchInput = ref<HTMLInputElement>();

function onSearch() {
  const newValue = value.value.trim();
  const histories = [...searchHistories.value];
  const filtered = histories.filter((item) => item !== newValue);
  filtered.unshift(newValue);
  showHistory.value = false;
  if (newValue) {
    searchHistories.value = filtered;
  }
  props.search(newValue);
}
function clearSearch() {
  value.value = '';
  // onSearch();
}

// 选择历史记录
function selectHistory(item: string) {
  value.value = item;
  showHistory.value = false;
  setTimeout(() => {
    // 如果需要可以在这里触发搜索
    // doSearch()
  }, 0);
}

function deleteHistory(e: Event, item: string) {
  e.preventDefault();
  _.remove(searchHistories.value, (i) => i === item);
  if (!searchHistories.value.length) {
    showHistory.value = false;
    searchInput.value?.focus();
  }
}

// 清空历史记录
function clearHistory() {
  searchHistories.value = [];
  showHistory.value = false;
}
</script>

<template>
  <div class="relative mx-auto flex w-full max-w-md items-center">
    <van-search
      ref="searchInput"
      v-model="value"
      placeholder="请输入搜索关键词"
      left-icon=""
      shape="round"
      :autofocus="false"
      autocomplete="off"
      class="w-full"
      @search="onSearch"
      @clear="clearSearch"
    >
      <template #right-icon>
        <div class="flex items-center gap-3 pl-1">
          <van-icon
            v-if="searchHistories.length"
            name="clock-o"
            class="van-haptics-feedback"
            @click="() => (showHistory = true)"
          />
          <van-icon
            name="search"
            class="van-haptics-feedback"
            @click="onSearch"
          />
        </div>
      </template>
    </van-search>
    <van-dialog
      v-model:show="showHistory"
      teleport="body"
      destroy-on-close
      :show-confirm-button="false"
      :show-cancel-button="false"
      close-on-click-overlay
    >
      <div class="list max-h-48 overflow-y-auto">
        <van-cell-group>
          <div
            v-for="(item, index) in searchHistories"
            :key="index"
            clickable
            class="active-bg-scale flex cursor-pointer items-center justify-between border-b px-4 py-2"
            @click="selectHistory(item)"
          >
            <div
              class="flex-grow overflow-hidden text-sm text-[var(--van-text-color)]"
            >
              {{ item }}
            </div>
            <div
              class="van-haptics-feedback flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center"
              @click.stop="(e: MouseEvent) => deleteHistory(e, item)"
            >
              <Icon
                icon="jam:close"
                width="24"
                height="24"
                color="var(--van-text-color)"
              />
            </div>
          </div>
        </van-cell-group>
      </div>
      <div
        class="van-haptics-feedback sticky bottom-0 border-gray-200 px-4 py-2 text-center text-sm text-gray-500"
        @click="clearHistory"
      >
        清空历史记录
      </div>
    </van-dialog>
  </div>
</template>

<style scoped lang="less">
:deep(.van-cell) {
  flex: 1;
  align-items: center;
  padding: 0 8px 0 0;
  height: 34px;
  background-color: transparent;
}
</style>
