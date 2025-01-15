<script setup lang="ts">
import { ref, triggerRef } from "vue";
import { useStore } from "@/store";
import { storeToRefs } from "pinia";
import { open } from "@tauri-apps/plugin-shell";
import BooksTab from "@/windows/components/BooksTab.vue";
import BookShelf from "./BookShelf.vue";
import { BookSource } from "@/types";
import { debounce } from "lodash";
import { createCancellableFunction } from "@/utils/cancelableFunction";
import { router } from "@/router";
import { BookItem } from "@/extensions/book";

const store = useStore();
const { bookSources } = storeToRefs(store);

const showBookShelf = ref(false);

const searchValue = ref("");

const recommend = createCancellableFunction(async (force: boolean = false) => {
  await Promise.all(
    bookSources.value.map(async (source) => {
      if (!source.list || force) {
        await store.bookRecommendList(source);
      }
    })
  );
});

const search = createCancellableFunction(async () => {
  const keyword = searchValue.value;
  if (!keyword) {
    await recommend(true);
    triggerRef(bookSources);
  } else {
    await Promise.all(
      bookSources.value.map(async (bookSources) => {
        await store.bookSearch(bookSources, keyword, 1);
      })
    );
  }
});

const pageChange = debounce(
  createCancellableFunction(async (source: BookSource, pageNo: number) => {
    // const toast = showLoadingToast("加载中");
    // if (!searchValue.value) {
    //   await store.photoRecommendList(source, pageNo);
    // } else {
    //   await store.photoSearchList(source, searchValue.value, pageNo);
    // }
    // toast.close();
  }),
  500
);
const loadType = async (source: BookSource, type?: string) => {
  await store.bookRecommendList(source, 1, type);
};
const loadPage = debounce(
  createCancellableFunction(
    async (source: BookSource, pageNo?: number, type?: string) => {
      if (!searchValue.value) {
        await store.bookRecommendList(source, pageNo, type);
      } else {
        await store.bookSearch(source, searchValue.value, pageNo);
      }
    }
  ),
  500
);
const toDetail = (source: BookSource, item: BookItem) => {
  router.push({
    name: "BookDetail",
    params: {
      bookId: item.id,
      sourceId: source.item.id,
    },
  });
};

const openBaseUrl = async (source: BookSource) => {
  const sc = await store.sourceClass(source.item);
  if (sc && sc.baseUrl) {
    // open(sc.baseUrl);
  }
};

// onMounted(() => {
//   recommend();
// });
</script>

<template>
  <div class="w-full h-full overflow-x-hidden overflow-y-auto">
    <van-row justify="center" align="center" class="relative">
      <div
        class="absolute right-6 text-button"
        @click="showBookShelf = !showBookShelf"
      >
        书架
      </div>
      <van-search
        v-model="searchValue"
        placeholder="请输入搜索关键词"
        left-icon=""
        @click-right-icon="search"
        @search="search"
        @clear="search"
      >
        <template #right-icon>
          <van-icon name="search" class="van-haptics-feedback" />
        </template>
      </van-search>
    </van-row>
    <div v-for="source in bookSources" :key="source.item.id" class="px-4">
      <template v-if="!!source.list">
        <van-row justify="space-between">
          <van-button
            :plain="true"
            size="small"
            @click="() => openBaseUrl(source)"
          >
            {{ source.item.name }}
          </van-button>
        </van-row>
        <BooksTab
          :source="source"
          @on-load="loadType"
          @load-page="loadPage"
          @on-detail="toDetail"
        >
        </BooksTab>
        <van-divider :style="{ margin: '8px 0px' }" />
      </template>
    </div>
    <BookShelf v-model:show="showBookShelf"></BookShelf>
  </div>
</template>

<style scoped lang="less"></style>
