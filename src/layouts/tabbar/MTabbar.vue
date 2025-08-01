<script setup lang="ts">
import { storeToRefs } from 'pinia';
import {
  set_screen_orientation,
  set_status_bar,
} from 'tauri-plugin-commands-api';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useDisplayStore } from '@/store';
import { useBackStore } from '@/store/backStore';

const backStore = useBackStore();
const displayStore = useDisplayStore();

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
  displayStore.routerCurrPath = newPath;
  if (
    !newPath.startsWith('/book-read/') &&
    !newPath.startsWith('/comic-read/')
  ) {
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

watch(
  [() => route.path, pages],
  async ([newPath, _newPages]) => {
    updateActiveKey(newPath);
  },
  { immediate: true },
);

watch(
  [() => displayStore.isDark, () => route.path],
  () => {
    const pathName = route.name;
    if (pathName === 'BookRead' || pathName === 'VideoDetail') {
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

// 保持竖屏模式
onMounted(async () => {
  await set_screen_orientation('portrait');
});

const { showTabBar } = storeToRefs(displayStore);

// 安卓返回的回调
window.androidBackCallback = async () => {
  backStore.back();
};
</script>

<template>
  <div
    class="flex h-screen w-screen flex-col overflow-hidden bg-[var(--van-background-2)]"
  >
    <div class="content h-full w-full flex-grow overflow-hidden">
      <slot></slot>
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
        class="z-[1002] h-[50px] shrink-0"
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

    <div class="absolute top-0 z-[999999999] w-screen">
      <v-progress-linear
        :active="displayStore.toastActive"
        indeterminate
        rounded
        color="teal"
        height="4"
        @click="() => displayStore.closeToast()"
      />
    </div>
    <div class="dialogs"></div>
  </div>
</template>

<style scoped lang="less">
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
