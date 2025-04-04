<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { exit_app, set_status_bar } from 'tauri-plugin-commands-api';
import {
  useBookShelfStore,
  useBookStore,
  useComicShelfStore,
  useComicStore,
  useDisplayStore,
  useVideoShelfStore,
} from './store';
import { nextTick, onMounted, ref, VNode, watch } from 'vue';
import { useRoute } from 'vue-router';
import { router } from './router';
import { showConfirmDialog, showToast } from 'vant';

const { routerView } = defineProps<{
  routerView: VNode;
}>();

const displayStore = useDisplayStore();
const bookStore = useBookStore();
const comicStore = useComicStore();
const bookShelfStore = useBookShelfStore();
const comicShelfStore = useComicShelfStore();
const videoShelfStore = useVideoShelfStore();

const activeKey = ref(0);
const route = useRoute();

const { photoPath, songPath, bookPath, comicPath, videoPath } =
  storeToRefs(displayStore);

const pages = ref([
  {
    name: 'Photo',
    icon: 'photo-o',
    selectedIcon: 'photo',
    to: photoPath,
  },
  {
    name: 'Song',
    icon: 'music-o',
    selectedIcon: 'music',
    to: songPath,
  },
  {
    name: 'Book',
    icon: 'bookmark-o',
    selectedIcon: 'bookmark',
    to: bookPath,
  },
  {
    name: 'Comic',
    icon: 'comment-circle-o',
    selectedIcon: 'comment-circle',
    to: comicPath,
  },
  {
    name: 'Video',
    icon: 'video-o',
    selectedIcon: 'video',
    to: videoPath,
  },
]);

// 记录上一次的页面路径
watch(
  () => route.path,
  (newPath) => {
    if (newPath.startsWith('/home')) {
      router.push('/photo');
      return;
    }
    displayStore.routerCurrPath = newPath;
    if (!newPath.startsWith('/book/read/')) {
      displayStore.showTabBar = true;
    }
    if (newPath.startsWith('/photo')) {
      photoPath.value = newPath;
      activeKey.value = 0;
    } else if (newPath.startsWith('/song')) {
      songPath.value = newPath;
      activeKey.value = 1;
    } else if (newPath.startsWith('/book')) {
      bookPath.value = newPath;
      activeKey.value = 2;
    } else if (newPath.startsWith('/comic')) {
      comicPath.value = newPath;
      activeKey.value = 3;
    } else if (newPath.startsWith('/video')) {
      videoPath.value = newPath;
      activeKey.value = 4;
    } else {
    }
  }
);

watch(
  [() => displayStore.isDark, () => route.path],
  () => {
    const path = route.name;
    if (path === 'BookRead') {
      set_status_bar('#000000', 'light');
    } else {
      if (displayStore.isDark) {
        set_status_bar('#000000', 'light');
      } else {
        set_status_bar('#ffffff', 'dark');
      }
    }
  },
  {
    immediate: true,
  }
);

//移动版是没有home页面的
onMounted(() => {
  nextTick(async () => {
    if (route.path === '/home') {
      router.replace(photoPath.value);
    }
  });
});

// 同步更新tabbar的目标
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
// 更新showtabbar
const { showTabBar } = storeToRefs(displayStore);

// 安卓返回的回调
const backTs = ref(Date.now());
window.androidBackCallback = async () => {
  if (displayStore.fullScreenMode) {
    displayStore.fullScreenMode = false;
    return;
  }
  const checkBack = async () => {
    const now = Date.now();
    if (now - backTs.value > 1000) {
      backTs.value = now;
      showToast('再按一次退出');
    } else {
      await exit_app();
    }
  };
  const path = route.name?.toString();
  if (path === 'PhotoDetail') {
    router.push({ name: 'Photo' });
  } else if (path === 'SongPlaylist') {
    if (displayStore.showPlayingPlaylist) {
      // 关闭播放列表
      displayStore.showPlayingPlaylist = false;
    } else if (displayStore.showPlayView) {
      // 关闭播放页
      displayStore.showPlayView = false;
    } else if (displayStore.showSongShelf) {
      displayStore.showSongShelf = false;
    } else {
      router.push({ name: 'Song' });
    }
  } else if (path === 'BookDetail') {
    if (displayStore.showBookShelf) {
      // 关闭书架
      displayStore.showBookShelf = false;
    } else {
      router.push({ name: 'Book' });
    }
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
  } else if (path === 'ComicDetail') {
    if (displayStore.showComicShelf) {
      // 关闭书架
      displayStore.showComicShelf = false;
    } else {
      router.push({ name: 'Comic' });
    }
  } else if (path === 'ComicRead') {
    if (comicStore.readingComic) {
      if (!comicShelfStore.isComicInShelf(comicStore.readingComic)) {
        try {
          const d = await showConfirmDialog({
            title: '放入书架',
            message: `是否将《${comicStore.readingComic.title}》放入书架？`,
          });
          if (d == 'confirm') {
            comicShelfStore.addToComicSelf(comicStore.readingComic);
            if (comicStore.readingComic && comicStore.readingChapter) {
              comicShelfStore.updateComicReadInfo(
                comicStore.readingComic,
                comicStore.readingChapter
              );
            }
          }
        } catch (error) {}
      }
    }
    displayStore.showTabBar = true;
    router.push({ name: 'Comic' });
  } else if (path === 'VideoDetail') {
    if (displayStore.showVideoShelf) {
      // 关闭收藏
      displayStore.showVideoShelf = false;
    } else {
      router.push({ name: 'Video' });
    }
  } else if (path === 'Photo') {
    if (displayStore.showPhotoShelf) {
      displayStore.showPhotoShelf = false;
    } else {
      await checkBack();
    }
  } else if (path === 'Song') {
    if (displayStore.showPlayingPlaylist) {
      // 关闭播放列表
      displayStore.showPlayingPlaylist = false;
    } else if (displayStore.showPlayView) {
      // 关闭播放页
      displayStore.showPlayView = false;
    } else if (displayStore.showSongShelfDetail) {
      // 收藏的歌单的详情
      displayStore.showSongShelfDetail = false;
    } else if (displayStore.showSongShelf) {
      displayStore.showSongShelf = false;
    } else {
      await checkBack();
    }
  } else if (path === 'Book') {
    if (displayStore.showBookShelf) {
      displayStore.showBookShelf = false;
    } else {
      await checkBack();
    }
  } else if (path === 'Comic') {
    if (displayStore.showComicShelf) {
      displayStore.showComicShelf = false;
    } else {
      await checkBack();
    }
  } else if (path === 'Video') {
    if (displayStore.showVideoShelf) {
      displayStore.showVideoShelf = false;
    } else {
      await checkBack();
    }
  } else if (!path || path === 'Home') {
    await checkBack();
  } else {
    showToast(`未定义的返回路径 ${route.path}`);
  }
};
</script>

<template>
  <div class="flex flex-col w-screen h-screen bg-[var(--van-background-2)]">
    <transition name="slide">
      <div class="content flex-1 w-full h-full overflow-hidden">
        <Component :is="routerView" />

        <!-- <router-view v-slot="{ Component }">
          <keep-alive>
            <component :is="Component" />
          </keep-alive>
        </router-view> -->
      </div>
    </transition>
    <transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition-all duration-300 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <van-tabbar
        v-model="activeKey"
        placeholder
        class="z-[1002]"
        active-color="var(--van-text-color)"
        v-show="showTabBar"
      >
        <van-tabbar-item
          v-for="(page, index) in pages"
          :key="index"
          :icon="page.icon"
          :to="page.to"
        >
          <template #icon>
            <van-icon :name="page.selectedIcon" v-if="activeKey == index" />
            <van-icon :name="page.icon" v-else />
          </template>
        </van-tabbar-item>
      </van-tabbar>
    </transition>

    <div class="absolute top-0 w-screen z-[999999999]">
      <v-progress-linear
        :active="displayStore.toastActive"
        indeterminate
        rounded
        color="teal"
        height="4"
        @click="() => displayStore.closeToast()"
      ></v-progress-linear>
    </div>
  </div>
</template>

<style scoped lang="less">
:deep(.van-collapse-item__content) {
}
</style>
