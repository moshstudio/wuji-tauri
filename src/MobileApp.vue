<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { Window } from '@tauri-apps/api/window';
import { useBookShelfStore, useBookStore, useDisplayStore } from './store';
import { onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { router } from './router';
import { showConfirmDialog, showToast } from 'vant';

const displayStore = useDisplayStore();
const bookStore = useBookStore();
const bookShelfStore = useBookShelfStore();

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
      activeKey.value = 0;
    } else if (newPath.startsWith('/song')) {
      songPath.value = newPath;
      activeKey.value = 1;
    } else if (newPath.startsWith('/book')) {
      bookPath.value = newPath;
      activeKey.value = 2;
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
const showTabBar = ref(true);
onMounted(() => {
  setTimeout(() => {
    watch(
      () => displayStore.showTabBar,
      (show) => {
        showTabBar.value = show;
      },
      {
        immediate: true,
      }
    );
  }, 1000);
});
const backTs = ref(Date.now());
window.androidBackCallback = async () => {
  const path = route.name?.toString();
  if (path === 'PhotoDetail') {
    router.push({ name: 'Photo' });
  } else if (path === 'SongPlaylist') {
    router.push({ name: 'Song' });
  } else if (path === 'BookDetail') {
    router.push({ name: 'Book' });
  } else if (path === 'BookRead') {
    if (bookStore.readingBook) {
      if (!bookShelfStore.isBookInShelf(bookStore.readingBook)) {
        try {
          const d = await showConfirmDialog({
            title: '放入书架',
            message: `是否将《${bookStore.readingBook.title}》放入书架？`,
          });
          if (d == 'confirm') {
            bookShelfStore.addToBookSelf(bookStore.readingBook);
            if (bookStore.readingBook && bookStore.readingChapter) {
              bookShelfStore.updateBookReadInfo(
                bookStore.readingBook,
                bookStore.readingChapter
              );
            }
          }
        } catch (error) {}
      }
    }
    displayStore.showTabBar = true;
    router.push({ name: 'Book' });
  } else if (
    !path ||
    path === 'Home' ||
    path === 'Photo' ||
    path === 'Book' ||
    path === 'Song'
  ) {
    const now = Date.now();
    if (now - backTs.value > 1000) {
      backTs.value = now;
      showToast('再按一次退出');
    } else {
      Window.getCurrent()?.destroy();
    }
  } else {
    showToast(`未定义的返回路径 ${route.path}`);
  }
};
</script>

<template>
  <div class="flex flex-col w-screen h-screen bg-[var(--van-background-2)]">
    <transition name="slide">
      <div class="content flex-1 w-full h-full overflow-hidden">
        <router-view v-slot="{ Component }">
          <keep-alive>
            <component :is="Component" />
          </keep-alive>
        </router-view>
      </div>
    </transition>
    <van-tabbar
      v-model="activeKey"
      placeholder
      class="z-[1002]"
      v-show="showTabBar"
    >
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
