import type { ComicChapter, ComicItem } from '@/extensions/comic';
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useComicStore = defineStore('comic', () => {
  const readingComic = ref<ComicItem>();
  const readingChapter = ref<ComicChapter>();
  return {
    readingComic,
    readingChapter,
  };
});
