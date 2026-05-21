<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { getSourceTypeTheme } from '@wuji-tauri/components';
import { storeToRefs } from 'pinia';
import { computed, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import GlobalAnnouncementBar from '@/components/announcement/GlobalAnnouncementBar.vue';
import WLoginButton from '@/components/button/WLoginButton.vue';
import GlobalToastProgress from '@/components/GlobalToastProgress.vue';
import { router } from '@/router';
import { useDisplayStore, useServerStore } from '@/store';

const displayStore = useDisplayStore();
const serverStore = useServerStore();

const homePath = ref('/home');
const {
  photoPath,
  songPath,
  bookPath,
  comicPath,
  videoPath,
  tabBarPages,
  showTabBar,
} = storeToRefs(displayStore);
interface TabPage {
  name: string;
  icon: string;
  selectedIcon: string;
  to: string;
}

const _pages: Record<string, TabPage> = reactive({
  Home: {
    name: 'Home',
    icon: 'wap-home-o',
    selectedIcon: 'wap-home',
    to: homePath,
  },
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
    .filter(page => page.enable)
    .map((page) => {
      const p = _pages[page.name as keyof typeof _pages];
      return {
        ...p,
        theme: getSourceTypeTheme(page.name),
      };
    });
});

const activeKey = ref('0');

const route = useRoute();
const showSettingPopover = ref(false);

const showSourcePopover = ref(false);
interface PopoverAction {
  text: string;
  color?: string;
  onClick: () => void;
}

const settingActions: PopoverAction[] = [
  {
    text: '下载管理',
    onClick: () => {
      router.push({ name: 'DownloadManager' });
    },
  },
  {
    text: '设置',
    onClick: () => {
      router.push({ name: 'Setting' });
    },
  },
  {
    text: '关于',
    onClick: () => {
      router.push({ name: 'About' });
    },
  },
];
const sourceActions: PopoverAction[] = [
  {
    text: '管理订阅源',
    color: '#1989fa',
    onClick: () => {
      router.push({ name: 'SourceManage' });
    },
  },
  {
    text: '订阅源市场',
    color: '#07c160',
    onClick: () => {
      router.push({ name: 'SourceMarket' });
    },
  },
  {
    text: '创建订阅源',
    onClick: () => {
      router.push({ name: 'SourceContentCreate' });
    },
  },
];
function onClickAction(action: PopoverAction) {
  action.onClick();
}

function updateActiveKey(newPath?: string) {
  newPath ||= route.path;
  displayStore.routerCurrPath = newPath;
  const pathName = route.name;
  if (typeof pathName !== 'string')
    return;
  if (pathName !== 'BookRead' && pathName !== 'ComicRead') {
    displayStore.showTabBar = true;
  }
  if (pathName.startsWith('Home')) {
    activeKey.value = String(
      pages.value.findIndex(page => page.name === 'Home'),
    );
  }
  else if (pathName.startsWith('Photo')) {
    photoPath.value = newPath;
    activeKey.value = String(
      pages.value.findIndex(page => page.name === 'Photo'),
    );
  }
  else if (pathName.startsWith('Song')) {
    songPath.value = newPath;
    activeKey.value = String(
      pages.value.findIndex(page => page.name === 'Song'),
    );
  }
  else if (pathName.startsWith('Book')) {
    bookPath.value = newPath;
    activeKey.value = String(
      pages.value.findIndex(page => page.name === 'Book'),
    );
  }
  else if (pathName.startsWith('Comic')) {
    comicPath.value = newPath;
    activeKey.value = String(
      pages.value.findIndex(page => page.name === 'Comic'),
    );
  }
  else if (pathName.startsWith('Video')) {
    videoPath.value = newPath;
    activeKey.value = String(
      pages.value.findIndex(page => page.name === 'Video'),
    );
  }
}

watch(
  [() => route.path, pages],
  ([newPath, _newPages]) => {
    updateActiveKey(newPath);
  },
  { immediate: true },
);
</script>

<template>
  <div class="flex h-screen w-screen bg-[var(--van-background-2)]">
    <transition
      enter-active-class="transition-all duration-100 ease-out"
      enter-from-class="opacity-0 transform translate-x-[-50px]"
      enter-to-class="opacity-100 transform translate-x-0"
      leave-active-class="transition-all duration-100 ease-in absolute"
      leave-from-class="opacity-100 transform translate-x-0"
      leave-to-class="opacity-0 transform translate-x-[-50px]"
    >
      <div
        v-show="showTabBar"
        class="sidebar z-[1002] flex w-[50px] flex-col bg-[var(--van-background)]"
      >
        <van-sidebar v-model="activeKey" class="grow">
          <van-sidebar-item
            v-for="(page, index) in pages"
            :key="index"
            :to="page.to"
          >
            <template #title>
              <van-icon
                :name="activeKey === `${index}` ? page.selectedIcon : page.icon"
                class="wtabbar-icon"
                :class="[
                  activeKey === `${index}`
                    ? 'wtabbar-icon--active'
                    : 'wtabbar-icon--inactive',
                ]"
                :color="activeKey === `${index}` ? page.theme.textColor : 'inherit'"
                size="22"
              />
            </template>
          </van-sidebar-item>
        </van-sidebar>
        <div class="flex flex-col items-center justify-center gap-4 pb-2">
          <WLoginButton :user-info="serverStore.userInfo" />
          <van-popover
            v-model:show="showSettingPopover"
            placement="right-end"
            :actions="settingActions"
            @select="onClickAction"
          >
            <template #reference>
              <Icon
                icon="lets-icons:setting-line"
                width="26px"
                height="26px"
                class="cursor-pointer text-[var(--van-text-color)] hover:scale-105"
              />
            </template>
          </van-popover>
          <van-popover
            v-model:show="showSourcePopover"
            placement="right-end"
            :actions="sourceActions"
            @select="onClickAction"
          >
            <template #reference>
              <Icon
                icon="ant-design:appstore-add-outlined"
                width="26px"
                height="26px"
                class="cursor-pointer text-[var(--van-text-color)] hover:scale-105"
              />
            </template>
          </van-popover>
        </div>
      </div>
    </transition>

    <div class="content flex h-full w-full grow flex-col overflow-hidden">
      <GlobalAnnouncementBar />
      <div class="min-h-0 min-w-0 flex-1 overflow-hidden">
        <slot />
      </div>
    </div>

    <div class="absolute top-0 z-[999999999] w-screen">
      <GlobalToastProgress
        :active="displayStore.toastActive"
        @click="() => displayStore.closeToast()"
      />
    </div>
  </div>
</template>

<style scoped lang="less">
:deep(.van-pagination) {
  font-size: 12px;
}

body {
  width: 100vw;
  height: 100vh;
  // 不滚动且不显示滚动条
  overflow: hidden;
  -ms-overflow-style: none;
}

.sidebar {
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 4px 0 12px rgba(0, 0, 0, 0.14);
  border-right: 1px solid rgb(from var(--van-text-color) r g b / 6%);
}

:deep(.van-sidebar) {
  width: 50px;
}

:deep(.van-sidebar-item) {
  padding: 12px;
  position: relative;
  display: flex;
  justify-content: center;
  transition:
    background-color 0.16s ease-out,
    transform 0.16s ease-out;
}

:deep(.van-sidebar-item:hover) {
  background-color: rgb(from var(--van-text-color) r g b / 4%);
}

:deep(.van-sidebar-item--select) {
  background-color: rgb(from var(--van-text-color) r g b / 6%);
}

:deep(.van-sidebar-item--select::before) {
  width: 3px;
  border-radius: 999px;
  background: var(--van-primary-color);
}

.wtabbar-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  transition:
    background-color 0.16s ease-out,
    box-shadow 0.16s ease-out,
    transform 0.16s ease-out,
    color 0.16s ease-out,
    opacity 0.16s ease-out;
}

.wtabbar-icon--inactive {
  opacity: 0.7;
}

.wtabbar-icon--active {
  opacity: 1;
  transform: scale(1.05);
}

.van-toast .van-toast__icon {
  font-size: var(--van-toast-icon-size);
}
</style>
