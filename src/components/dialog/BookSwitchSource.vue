<script setup lang="ts">
import type { BookChapter, BookItem } from '@wuji-tauri/source-extension';
import { computed } from 'vue';
import { useStore } from '@/store';
import { findMatchedChapter } from '@/utils/bookSourceAccess';

const props = withDefaults(
  defineProps<{
    book?: BookItem;
    searchResult?: BookItem[];
    searching?: boolean;
    searchProgress?: { done: number, total: number };
    currentChapter?: BookChapter;
    search: (book?: BookItem) => void;
    select: (book: BookItem) => void;
  }>(),
  {
    searchResult: () => [],
    searching: false,
    searchProgress: () => ({ done: 0, total: 0 }),
  },
);

const show = defineModel('show', {
  type: Boolean,
  required: true,
});

const store = useStore();

function latestChapterText(item: BookItem): string {
  const latest = item.latestChapter;
  if (!latest)
    return '';
  if (typeof latest === 'string')
    return latest;
  return latest.title || '';
}

function matchedChapter(item: BookItem): BookChapter | undefined {
  if (!props.currentChapter || !item.chapters?.length)
    return undefined;
  return findMatchedChapter(
    item.chapters,
    props.currentChapter,
    props.currentChapter.id,
    props.book?.chapters,
  );
}

function isCurrentSource(item: BookItem): boolean {
  return !!(
    props.book
    && item.id === props.book.id
    && item.sourceId === props.book.sourceId
  );
}

const displayResults = computed(() => {
  const list = [...props.searchResult];
  return list.sort((a, b) => {
    const aMatch = matchedChapter(a);
    const bMatch = matchedChapter(b);
    if (!!aMatch !== !!bMatch)
      return aMatch ? -1 : 1;
    return (b.chapters?.length || 0) - (a.chapters?.length || 0);
  });
});

const progressText = computed(() => {
  const { done, total } = props.searchProgress;
  if (!total)
    return '正在搜索...';
  return `正在搜索 ${Math.min(done, total)}/${total} 个源`;
});

const showEmpty = computed(
  () => !props.searching && displayResults.value.length === 0,
);
</script>

<template>
  <van-dialog
    v-model:show="show"
    teleport="body"
    show-cancel-button
    close-on-click-overlay
    :show-confirm-button="false"
    class="book-switch-source-dialog"
  >
    <template #title>
      <div class="flex select-none items-start justify-between gap-3 px-4 pt-1">
        <div class="min-w-0 flex-1 text-left text-[var(--van-text-color)]">
          <p class="text-base font-medium">
            换源搜索
          </p>
          <p class="mt-0.5 truncate text-sm text-[var(--van-text-color)]">
            {{ book?.title }}
          </p>
          <p
            v-if="book?.author"
            class="truncate text-xs text-[var(--van-text-color-2)]"
          >
            {{ book.author }}
          </p>
          <p
            v-if="currentChapter?.title"
            class="mt-0.5 truncate text-xs text-[var(--van-text-color-2)]"
          >
            当前章节：{{ currentChapter.title }}
          </p>
        </div>
        <van-icon
          name="replay"
          class="van-haptics-feedback mt-1 shrink-0 text-[var(--van-text-color-2)]"
          :class="{ 'animate-spin pointer-events-none opacity-50': searching }"
          @click="() => !searching && search(book)"
        />
      </div>
    </template>

    <div class="select-none px-2 pb-1">
      <div
        v-if="searching"
        class="flex items-center justify-center gap-2 py-3 text-sm text-[var(--van-text-color-2)]"
      >
        <van-loading size="18" />
        <span>{{ progressText }}</span>
      </div>

      <van-empty
        v-if="showEmpty"
        image="search"
        description="未找到可用源"
        class="py-6"
      >
        <van-button
          size="small"
          type="primary"
          plain
          round
          @click="() => search(book)"
        >
          重新搜索
        </van-button>
      </van-empty>

      <div
        v-else-if="displayResults.length"
        class="max-h-[50vh] overflow-y-auto rounded-lg"
      >
        <van-cell-group :border="false" inset>
          <van-cell
            v-for="item in displayResults"
            :key="`${item.sourceId}-${item.id}`"
            center
            clickable
            class="switch-source-cell"
            @click="() => select(item)"
          >
            <template #title>
              <div class="flex min-w-0 flex-col gap-0.5 py-0.5">
                <div class="flex items-center gap-1.5">
                  <span class="truncate font-medium">
                    {{ store.getBookSource(item.sourceId)?.item.name || '未知源' }}
                  </span>
                  <van-tag
                    v-if="isCurrentSource(item)"
                    type="primary"
                    plain
                    size="medium"
                  >
                    当前
                  </van-tag>
                  <van-tag
                    v-else-if="matchedChapter(item)"
                    type="success"
                    plain
                    size="medium"
                  >
                    含本章
                  </van-tag>
                </div>
                <p class="truncate text-xs text-[var(--van-text-color-2)]">
                  <template v-if="item.chapters?.length">
                    共 {{ item.chapters.length }} 章
                  </template>
                  <template v-if="latestChapterText(item)">
                    <template v-if="item.chapters?.length"> · </template>
                    最新：{{ latestChapterText(item) }}
                  </template>
                  <template v-if="item.author">
                    <template v-if="item.chapters?.length || latestChapterText(item)"> · </template>
                    {{ item.author }}
                  </template>
                </p>
                <p
                  v-if="matchedChapter(item)?.title"
                  class="truncate text-xs text-[var(--van-success-color)]"
                >
                  对齐：{{ matchedChapter(item)?.title }}
                </p>
              </div>
            </template>
            <template #right-icon>
              <van-icon name="arrow" class="text-[var(--van-text-color-3)]" />
            </template>
          </van-cell>
        </van-cell-group>
      </div>

      <p
        v-if="searching && displayResults.length"
        class="px-3 pt-2 text-center text-xs text-[var(--van-text-color-3)]"
      >
        {{ progressText }}，可先选择已找到的源
      </p>
    </div>
  </van-dialog>
</template>

<style scoped lang="less">
.switch-source-cell {
  :deep(.van-cell__title) {
    flex: 1;
    min-width: 0;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 0.8s linear infinite;
}
</style>
