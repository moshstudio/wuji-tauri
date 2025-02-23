<script setup lang="ts">
import { BookItem } from '@/extensions/book';
import { useStore } from '@/store';
import { ref, reactive, watch } from 'vue';

const show = defineModel('show', {
  type: Boolean,
  required: true,
});
const { book, searchResult } = defineProps<{
  book: BookItem;
  searchResult: BookItem[];
}>();
const emit = defineEmits<{
  (e: 'search'): void;
  (e: 'select', book: BookItem): void;
}>();

watch(show, (val) => {
  if (val) {
    if (!searchResult.length) {
      emit('search');
    }
  }
});

const store = useStore();
</script>

<template>
  <van-dialog
    teleport="body"
    v-model:show="show"
    show-cancel-button
    close-on-click-overlay
    :show-confirm-button="false"
  >
    <template #title>
      <div class="flex gap-2 px-4 justify-between items-center select-none">
        <div class="flex flex-col items-start text-[var(--van-text-color)]">
          <p class="text-base">{{ book.title }}</p>
          <p class="text-xs text-gray-500" v-if="book.author">
            {{ book.author }}
          </p>
        </div>
        <div class="flex gap-2">
          <van-icon
            name="replay"
            class="van-haptics-feedback"
            @click="() => emit('search')"
          />
        </div>
      </div>
    </template>
    <div class="flex flex-col gap-2 max-h-[60vh] overflow-y-auto select-none">
      <template v-for="item in searchResult" :key="item.id">
        <van-cell-group>
          <van-cell
            center
            clickable
            :title="store.getBookSource(item.sourceId)?.item.name"
            :label="item.latestChapter?.toString()"
            @click="() => emit('select', item)"
          >
            <template #value>
              <div class="flex flex-shrink gap-2 items-center">
                <p v-if="item.author">{{ item.author }}</p>
                <van-icon name="success" v-if="book.id === item.id" />
              </div>
            </template>
          </van-cell>
        </van-cell-group>
      </template>
    </div>
  </van-dialog>
</template>

<style scoped lang="less">
:deep(.van-cell__title) {
  flex: 2;
}
</style>
