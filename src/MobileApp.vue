<script setup lang="ts">
import type { VNode } from 'vue';
import { storeToRefs } from 'pinia';
import {
  exit_app,
  set_screen_orientation,
  set_status_bar,
} from 'tauri-plugin-commands-api';
import { showConfirmDialog, showToast } from 'vant';
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { router } from './router';
import {
  useBookShelfStore,
  useBookStore,
  useComicShelfStore,
  useComicStore,
  useDisplayStore,
  useTTSStore,
  useVideoShelfStore,
} from './store';
import View from './components/View.vue';

const { routerView } = defineProps<{
  routerView: VNode;
}>();

const displayStore = useDisplayStore();
const bookStore = useBookStore();
const comicStore = useComicStore();
const bookShelfStore = useBookShelfStore();
const comicShelfStore = useComicShelfStore();
const videoShelfStore = useVideoShelfStore();
const ttsStore = useTTSStore();

const activeKey = ref(0);
const route = useRoute();

const { photoPath, songPath, bookPath, comicPath, videoPath, tabBarPages } =
  storeToRefs(displayStore);
const _pages = reactive({
  Photo: {
    name: 'Photo',
    icon: 'photo-o',
    selectedIcon: 'photo',
    to: photoPath,
  },
  Song: {
    name: 'Song',
    icon: 'music-o',
    selectedIcon: 'music',
    to: songPath,
  },
  Book: {
    name: 'Book',
    icon: 'bookmark-o',
    selectedIcon: 'bookmark',
    to: bookPath,
  },
  Comic: {
    name: 'Comic',
    icon: 'comment-circle-o',
    selectedIcon: 'comment-circle',
    to: comicPath,
  },
  Video: {
    name: 'Video',
    icon: 'video-o',
    selectedIcon: 'video',
    to: videoPath,
  },
});
const pages = computed(() => {
  return tabBarPages.value
    .filter((page) => page.enable && page.name !== 'Home')
    .map((page) => _pages[page.name as keyof typeof _pages]);
});

function updateActiveKey(newPath?: string) {
  newPath ||= route.path;
  if (newPath.startsWith('/home')) {
    router.push(pages.value[0].to);
    return;
  }
  displayStore.routerCurrPath = newPath;
  if (!newPath.startsWith('/book/read/')) {
    displayStore.showTabBar = true;
  }
  if (newPath.startsWith('/photo')) {
    photoPath.value = newPath;
    activeKey.value = pages.value.findIndex((page) => page.name === 'Photo');
  } else if (newPath.startsWith('/song')) {
    songPath.value = newPath;
    activeKey.value = pages.value.findIndex((page) => page.name === 'Song');
  } else if (newPath.startsWith('/book')) {
    bookPath.value = newPath;
    activeKey.value = pages.value.findIndex((page) => page.name === 'Book');
  } else if (newPath.startsWith('/comic')) {
    comicPath.value = newPath;
    activeKey.value = pages.value.findIndex((page) => page.name === 'Comic');
  } else if (newPath.startsWith('/video')) {
    videoPath.value = newPath;
    activeKey.value = pages.value.findIndex((page) => page.name === 'Video');
  } else {
  }
}
// 记录上一次的页面路径
watch([() => route.path, pages], async ([newPath, newPages]) => {
  updateActiveKey(newPath);
});

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
  },
);

onMounted(() => {
  updateActiveKey(displayStore.routerCurrPath);
  nextTick(() => {
    // 移动版是没有home页面的
    if (route.path.startsWith('/home')) {
      router.push(pages.value[0].to);
    }
  });
});

// 保持竖屏模式
onMounted(async () => {
  await set_screen_orientation('portrait');
});

const { showTabBar } = storeToRefs(displayStore);

// 安卓返回的回调
const backTs = ref(Date.now());
window.androidBackCallback = async () => {
  if (displayStore.fullScreenMode) {
    displayStore.fullScreenMode = false;
    displayStore.showTabBar = true;
    await set_screen_orientation('portrait');
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
    ttsStore.stop();
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
                bookStore.readingChapter,
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
                comicStore.readingChapter,
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
  <div
    class="flex flex-col w-screen h-screen overflow-hidden bg-[var(--van-background-2)]"
  >
    <div class="content flex-grow w-full h-full overflow-hidden">
      <Component :is="routerView" />
    </div>
    <transition
      enter-active-class="transition-all duration-100 ease-out"
      enter-from-class="opacity-0 transform translate-y-[50px]"
      enter-to-class="opacity-100 transform translate-y-0"
      leave-active-class="transition-all duration-100 ease-in"
      leave-from-class="opacity-100 transform translate-y-0"
      leave-to-class="opacity-0 transform translate-y-[50px]"
    >
      <van-tabbar
        v-show="showTabBar"
        v-model="activeKey"
        placeholder
        class="shrink-0 z-[1002] h-[50px]"
        active-color="var(--van-text-color)"
      >
        <van-tabbar-item
          v-for="(page, index) in pages"
          :key="index"
          :icon="page.icon"
          :to="page.to"
        >
          <template #icon>
            <van-icon v-if="activeKey == index" :name="page.selectedIcon" />
            <van-icon v-else :name="page.icon" />
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
      />
    </div>
  </div>
</template>

<style scoped lang="less">
/* 滑动效果 */
.slide-enter-active {
  transition: all 0.3s ease-out;
}
.slide-leave-active {
  transition: all 0.3s ease-in;
}
.slide-enter-from {
  transform: translateX(20px);
  opacity: 0;
}
.slide-leave-to {
  transform: translateX(-20px);
  opacity: 0;
}
</style>
