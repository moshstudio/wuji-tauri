<script setup lang="ts">
import type { ReadTheme } from '@/types/book';
import { Icon } from '@iconify/vue';
import { ref } from 'vue';
import BookCustomThemeSheet from '@/components/book/BookCustomThemeSheet.vue';
import { useBookStore } from '@/store';
import { getThemeTileStyle, isThemeSelected } from '@/utils/readTheme';

const bookStore = useBookStore();

const showEditor = ref(false);
const editingTheme = ref<ReadTheme | undefined>();

function isSelected(theme: ReadTheme) {
  return isThemeSelected(theme, bookStore.currTheme);
}

function onSelectTheme(theme: ReadTheme) {
  bookStore.selectTheme(theme);
}

function onAddCustom() {
  editingTheme.value = undefined;
  showEditor.value = true;
}

function onEditTheme(theme: ReadTheme, e: Event) {
  e.stopPropagation();
  editingTheme.value = theme;
  showEditor.value = true;
}
</script>

<template>
  <div>
    <div
      class="grid grid-cols-[repeat(auto-fill,minmax(46px,1fr))] gap-1 p-2"
    >
      <div
        v-for="theme in bookStore.themes"
        :key="theme.id || theme.name"
        class="relative flex h-[46px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 text-center text-[10px]"
        :class="[
          isSelected(theme)
            ? 'border-[var(--van-primary-color)]'
            : 'border-[var(--van-border-color)]',
        ]"
        :style="getThemeTileStyle(theme)"
        @click="onSelectTheme(theme)"
      >
        <button
          v-if="bookStore.isCustomTheme(theme)"
          type="button"
          class="absolute right-0.5 top-0.5 z-10 flex h-4 w-4 items-center justify-center rounded bg-black/30 text-white"
          aria-label="编辑主题"
          @click="onEditTheme(theme, $event)"
        >
          <Icon icon="mdi:pencil" class="text-[10px]" />
        </button>
        <span class="font-medium">{{ theme.name }}</span>
      </div>

      <!-- 新建自定义 -->
      <button
        type="button"
        class="flex h-[46px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--van-border-color)] text-[var(--van-text-color-2)] transition-colors hover:border-[var(--van-primary-color)] hover:text-[var(--van-primary-color)]"
        aria-label="新建自定义主题"
        @click="onAddCustom"
      >
        <Icon icon="mdi:plus" class="text-lg" />
        <span class="text-[10px]">自定义</span>
      </button>
    </div>

    <BookCustomThemeSheet
      v-model:show="showEditor"
      :editing-theme="editingTheme"
    />
  </div>
</template>
