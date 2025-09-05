<script setup lang="ts">
import type { BookChapter, BookItem } from '@wuji-tauri/source-extension';
import type { BookSource } from '@/types';
import AppBookDetail from '@/layouts/app/book/BookDetail.vue';

withDefaults(
  defineProps<{
    book?: BookItem;
    bookSource?: BookSource;
    inShelf: boolean;
    toChapter?: (book: BookItem, chapter: BookChapter) => void;
    addToShelf?: (book: BookItem) => void;
  }>(),
  {},
);
</script>

<template>
  <AppBookDetail
    :book="book"
    :book-source="bookSource"
    :in-shelf="inShelf"
    :to-chapter="toChapter"
    :add-to-shelf="addToShelf"
  />
</template>

<style scoped lang="less"></style>
