<script setup lang="ts">
import type { VNode } from 'vue';
import { storeToRefs } from 'pinia';
import {
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
  useStore,
  useSubscribeSourceStore,
  useTTSStore,
  useVideoShelfStore,
} from './store';
import AboutDialog from '@/components/dialogs/About.vue';
import ImportSubscribeDialog from '@/components/windows/dialogs/ImportSubscribe.vue';
import SettingDialog from '@/components/windows/dialogs/Setting.vue';
import SourcePopup from '@/views/source/index.vue';
import CreateSourcePopup from './views/source/CreateSource.vue';

const { routerView } = defineProps<{
  routerView: VNode;
}>();

const store = useStore();
const displayStore = useDisplayStore();
const sourceStore = useSubscribeSourceStore();
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
window.androidBackCallback = async () => {
  if (displayStore.showManageSubscribeDialog) {
    displayStore.showManageSubscribeDialog = false;
    sourceStore.saveSubscribeSources();
    store.loadSubscribeSources(true);
    return;
  }
  const path = route.name?.toString();
  if (path) {
    await displayStore.triggerBackCallbacks(path);
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
    <div class="dialogs">
      <ImportSubscribeDialog />
      <SettingDialog />
      <AboutDialog />
      <SourcePopup />
      <CreateSourcePopup />
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
