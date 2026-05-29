<script setup lang="ts">
import type { LoadedChapter } from '@/hooks/useBookReadScroll';
import { useBookStore, useTTSStore } from '@/store';

defineProps<{
  loadedChapters: LoadedChapter[];
  activeChapterId?: string;
  ttsActiveChapterId?: string;
  currentPIndex?: number;
}>();

const bookStore = useBookStore();
const ttsStore = useTTSStore();
</script>

<template>
  <div
    v-for="lc in loadedChapters"
    :key="lc.chapter.id"
    :data-chapter-id="lc.chapter.id"
    class="chapter-wrapper"
  >
    <!-- 章节段落 -->
    <p
      v-for="(p, index) in lc.paragraphs"
      :key="`${lc.chapter.id}-${index}`"
      :data-p-index="index"
      :class="[
        `index-${index}`,
        index === 0 ? 'text-2xl font-bold text-center' : '',
      ]"
      :style="{
        fontSize: index === 0 ? `${bookStore.fontSize * 1.3}px` : `${bookStore.fontSize}px`,
        fontWeight: index === 0 ? Math.min(bookStore.fontWeight + 200, 900) : bookStore.fontWeight,
        fontFamily: bookStore.fontFamily,
        lineHeight: index === 0 ? bookStore.lineHeight * 1.3 : bookStore.lineHeight,
        paddingTop: index === 0 ? '0px' : `${bookStore.readPGap}px`,
        paddingBottom: index === 0 ? `${bookStore.readPGap * 1.3}px` : '0px',
        textIndent: index === 0 ? '0' : '2em',
        textAlign: index === 0 ? 'center' : 'justify',
        textAlignLast: 'auto',
        backgroundColor:
          ttsStore.isReading
          && ttsStore.scrollReadingContent?.chapterId === lc.chapter.id
          && ttsStore.scrollReadingContent?.index === index
            ? 'rgba(255, 165, 0, 0.3)'
            : 'transparent',
        transition: 'background-color 0.3s ease',
      }"
    >
      {{ p }}
    </p>

    <!-- 章节之间的分隔线 -->
    <div
      v-if="lc !== loadedChapters[loadedChapters.length - 1]"
      class="my-6 flex items-center gap-3 opacity-30"
    >
      <div class="h-px flex-1 bg-current" />
      <span class="text-xs shrink-0">{{ lc.chapter.title }} · 完</span>
      <div class="h-px flex-1 bg-current" />
    </div>
  </div>
</template>

<style scoped>
.chapter-wrapper {
  width: 100%;
}
</style>
