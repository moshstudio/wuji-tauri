<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useStore } from "@/store";
import { storeToRefs } from "pinia";
import PhotoCard from "@/components/card/PhotoCard.vue";
import HorizonList from "@/components/HorizonList.vue";
import SimplePagination from "@/components/SimplePagination.vue";
import PhotoShelf from "./PhotoShelf.vue";
import { PhotoSource } from "@/types";
import { showLoadingToast } from "vant";
import { debounce } from "lodash";
import { createCancellableFunction } from "@/utils/cancelableFunction";
import { open } from "@tauri-apps/plugin-shell";

const store = useStore();
const { photoSources } = storeToRefs(store);

const searchValue = ref("");
const showShelf = ref(false);

const recommend = createCancellableFunction(async (force: boolean = false) => {
  await Promise.all(
    photoSources.value.map(async (source) => {
      if (!source.list || force) {
        await store.photoRecommendList(source);
      }
    })
  );
});

const search = createCancellableFunction(async () => {
  const keyword = searchValue.value;
  if (!keyword) {
    return recommend(true);
  } else {
    await Promise.all(
      photoSources.value.map(async (source) => {
        await store.photoSearchList(source, keyword, 1);
      })
    );
  }
});

const pageChange = debounce(
  createCancellableFunction(async (source: PhotoSource, pageNo: number) => {
    const toast = showLoadingToast({
      message: "加载中",
      duration: 0,
      closeOnClick: true,
      closeOnClickOverlay: false,
    });
    if (!searchValue.value) {
      await store.photoRecommendList(source, pageNo);
    } else {
      await store.photoSearchList(source, searchValue.value, pageNo);
    }
    toast.close();
  }),
  500
);
const openBaseUrl = async (source: PhotoSource) => {
  const sc = await store.sourceClass(source.item);
  if (sc && sc.baseUrl) {
    open(sc.baseUrl);
  }
};

// onMounted(() => {
//   recommend();
// });
</script>

<template>
  <div class="w-full h-full overflow-x-hidden overflow-y-auto">
    <van-row justify="center" align="center" class="relative">
      <div class="absolute right-6 text-button" @click="showShelf = !showShelf">
        收藏
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
    <div v-for="item in photoSources" :key="item.item.id" class="px-4">
      <template v-if="item.list">
        <van-row justify="space-between">
          <van-button
            :plain="true"
            size="small"
            @click="() => openBaseUrl(item)"
          >
            {{ item.item.name }}
          </van-button>
          <SimplePagination
            v-model="item.list.page"
            :page-count="item.list.totalPage"
            @change="(page) => pageChange(item, page)"
            v-if="item.list && item.list.totalPage"
          />
        </van-row>
        <HorizonList>
          <p v-if="!item.list?.list.length" class="m-2 text-xs text-gray-600">
            内容为空
          </p>
          <template v-for="photo in item.list?.list" :key="photo" v-else>
            <PhotoCard :item="photo"></PhotoCard>
          </template>
        </HorizonList>
        <van-divider :style="{ margin: '8px 0px' }" />
      </template>
    </div>
    <PhotoShelf v-model:show="showShelf"></PhotoShelf>
  </div>
</template>

<style scoped lang="less"></style>
