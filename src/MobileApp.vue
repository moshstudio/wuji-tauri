<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useDisplayStore } from './store';
import { onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { router } from './router';

const displayStore = useDisplayStore();

const activeKey = ref(0);
const route = useRoute();

const photoPath = ref('/photo');
const songPath = ref('/song');
const bookPath = ref('/book');
const pages = ref([
  {
    name: 'Photo',
    icon: 'photo-o',
    to: photoPath,
  },
  {
    name: 'Song',
    icon: 'music-o',
    to: songPath,
  },
  {
    name: 'Book',
    icon: 'bookmark-o',
    to: bookPath,
  },
]);

// 记录上一次的页面路径
watch(
  () => route.path,
  (newPath) => {
    if (newPath.startsWith('/photo')) {
      photoPath.value = newPath;
    } else if (newPath.startsWith('/song')) {
      songPath.value = newPath;
    } else if (newPath.startsWith('/book')) {
      bookPath.value = newPath;
    } else {
    }
  }
);

onMounted(() => {
  setTimeout(() => {
    if (route.path.startsWith('/home')) {
      router.replace('/photo');
      activeKey.value = 0;
    }
  }, 300);
});
onMounted(() => {
  setTimeout(() => {
    // 获取当前页面的 key
    const currentPageKey = pages.value.findIndex((page) =>
      route.path.startsWith(page.to)
    );
    // 如果当前页面不在 pages 中，则默认为第一个页面
    activeKey.value = currentPageKey !== -1 ? currentPageKey : 0;
  }, 500);
});
</script>

<template>
  <div class="flex flex-col w-screen h-screen bg-[var(--van-background-2)]">
    <transition name="slide">
      <div class="content grow w-full h-full overflow-hidden">
        <router-view v-slot="{ Component }">
          <keep-alive>
            <component :is="Component" />
          </keep-alive>
        </router-view>
      </div>
    </transition>
    <van-tabbar v-model="activeKey" placeholder class="z-[1001]">
      <van-tabbar-item
        v-for="(page, index) in pages"
        :key="index"
        :icon="page.icon"
        :to="page.to"
      >
      </van-tabbar-item>
    </van-tabbar>
    <div class="absolute top-0 w-screen z-[999999999]">
      <v-progress-linear
        :active="displayStore.toastActive"
        indeterminate
        color="teal"
        height="4"
      ></v-progress-linear>
    </div>
  </div>
</template>

<style scoped lang="less"></style>
