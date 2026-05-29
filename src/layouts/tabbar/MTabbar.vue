<script setup lang="ts">
import { getSourceTypeTheme } from '@wuji-tauri/components';
import { storeToRefs } from 'pinia';
import { set_screen_orientation } from 'tauri-plugin-commands-api';
import { computed, onMounted, reactive, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import GlobalAnnouncementBar from '@/components/announcement/GlobalAnnouncementBar.vue';
import GlobalToastProgress from '@/components/GlobalToastProgress.vue';
import { useDisplayStore } from '@/store';
import { useBackStore } from '@/store/backStore';

const backStore = useBackStore();
const displayStore = useDisplayStore();

const route = useRoute();
const router = useRouter();

const { photoPath, songPath, bookPath, comicPath, videoPath, tabBarPages }
  = storeToRefs(displayStore);
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
    .filter(page => page.enable && page.name !== 'Home')
    .map((page) => {
      const p = _pages[page.name as keyof typeof _pages];
      return {
        ...p,
        theme: getSourceTypeTheme(page.name),
      };
    });
});

function resolveTabIndex(pathName: string | symbol | undefined | null): number {
  if (typeof pathName !== 'string') {
    return 0;
  }
  if (pathName.startsWith('Photo')) {
    return pages.value.findIndex(page => page.name === 'Photo');
  }
  if (pathName.startsWith('Song')) {
    return pages.value.findIndex(page => page.name === 'Song');
  }
  if (pathName.startsWith('Book')) {
    return pages.value.findIndex(page => page.name === 'Book');
  }
  if (pathName.startsWith('Comic')) {
    return pages.value.findIndex(page => page.name === 'Comic');
  }
  if (pathName.startsWith('Video')) {
    return pages.value.findIndex(page => page.name === 'Video');
  }
  return -1;
}

/** 仅由当前路由决定高亮，避免点击 tab 时路由被拦截但图标已切换 */
const activeTabIndex = computed(() => {
  const idx = resolveTabIndex(route.name);
  return idx >= 0 ? idx : 0;
});

function syncTabPaths(newPath?: string) {
  newPath ||= route.path;
  displayStore.routerCurrPath = newPath;
  const pathName = route.name;
  if (typeof pathName !== 'string') {
    return;
  }
  if (
    pathName !== 'BookRead'
    && pathName !== 'ComicRead'
    && !displayStore.fullScreenMode
  ) {
    displayStore.showTabBar = true;
  }
  if (pathName.startsWith('Photo')) {
    photoPath.value = newPath;
  }
  else if (pathName.startsWith('Song')) {
    songPath.value = newPath;
  }
  else if (pathName.startsWith('Book')) {
    bookPath.value = newPath;
  }
  else if (pathName.startsWith('Comic')) {
    comicPath.value = newPath;
  }
  else if (pathName.startsWith('Video')) {
    videoPath.value = newPath;
  }
}

async function onTabItemClick(index: number) {
  const page = pages.value[index];
  if (!page || index === activeTabIndex.value) {
    return;
  }
  await router.push(page.to);
}

watch(
  [() => route.path, pages],
  async ([newPath]) => {
    syncTabPaths(newPath);
  },
  { immediate: true },
);

// 保持竖屏模式
onMounted(async () => {
  await set_screen_orientation('portrait');
});

const { showTabBar } = storeToRefs(displayStore);

// 安卓返回的回调（与 backStore 保持一致，返回 true 表示已消费事件）
window.androidBackCallback = () => backStore.back();
</script>

<template>
  <div
    class="flex h-screen w-screen flex-col overflow-hidden bg-[var(--van-background-2)]"
  >
    <div class="content flex h-full w-full flex-grow flex-col overflow-hidden">
      <GlobalAnnouncementBar />
      <div class="relative min-h-0 min-w-0 flex-1 overflow-hidden">
        <slot />
      </div>
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
        :model-value="activeTabIndex"
        placeholder
        class="mtabbar-root z-[1002] h-[50px] shrink-0"
      >
        <van-tabbar-item
          v-for="(page, index) in pages"
          :key="index"
          @click="onTabItemClick(index)"
        >
          <template #icon>
            <van-icon
              :name="activeTabIndex === index ? page.selectedIcon : page.icon"
              class="mtabbar-icon"
              :class="[
                activeTabIndex === index
                  ? 'mtabbar-icon--active'
                  : 'mtabbar-icon--inactive',
              ]"
              :color="activeTabIndex === index ? page.theme.textColor : 'inherit'"
              size="20"
            />
          </template>
        </van-tabbar-item>
      </van-tabbar>
    </transition>

    <div class="absolute top-0 z-[999999999] w-screen">
      <GlobalToastProgress
        :active="displayStore.toastActive"
        @click="() => displayStore.closeToast()"
      />
    </div>
    <div class="dialogs" />
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

:deep(.van-tabbar-item) {
  transition:
    background-color 0.18s ease-out,
    transform 0.18s ease-out;
}

.mtabbar-icon {
  transition:
    transform 0.18s ease-out,
    color 0.18s ease-out,
    opacity 0.18s ease-out,
    text-shadow 0.18s ease-out;
}

.mtabbar-icon--inactive {
  opacity: 0.7;
}

.mtabbar-icon--active {
  opacity: 1;
  transform: scale(1.05);
  text-shadow: 0 0 6px rgb(from var(--van-text-color) r g b / 35%);
}
</style>
