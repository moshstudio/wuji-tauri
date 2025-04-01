<script setup lang="ts">
import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  Ref,
  ref,
  VNode,
  watch,
} from 'vue';
import { useStore, useDisplayStore } from './store';
import { Icon } from '@iconify/vue';
import { useRoute } from 'vue-router';
import buildTray from './utils/tray';
import ImportSubscribeDialog from '@/components/windows/dialogs/ImportSubscribe.vue';
import ManageSubscribeDialog from './components/windows/dialogs/ManageSubscribe.vue';
import AboutDialog from '@/components/dialogs/About.vue';
import SettingDialog from './components/windows/dialogs/Setting.vue';
import { TrayIcon } from '@tauri-apps/api/tray';
import { storeToRefs } from 'pinia';
import { router } from './router';

interface PageItem {
  name: string;
  icon: string;
  selectedIcon: string;
  to: Ref;
}

const { routerView } = defineProps<{
  routerView: VNode;
}>();

const store = useStore();
const displayStore = useDisplayStore();

const homePath = ref('/home');
const { photoPath, songPath, bookPath, comicPath, videoPath } =
  storeToRefs(displayStore);
const pages = ref<PageItem[]>([
  {
    name: 'Home',
    icon: 'wap-home-o',
    selectedIcon: 'wap-home',
    to: homePath,
  },
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

const activeKey = ref('0');

const route = useRoute();
const showSettingPopover = ref(false);
const settingActions = [
  {
    text: '关于',
    onClick: () => {
      displayStore.showAboutDialog = true;
    },
  },
];
const showSourcePopover = ref(false);
const sourceActions = [
  {
    text: '导入订阅源',
    onClick: () => {
      displayStore.showAddSubscribeDialog = true;
    },
  },
  {
    text: '更新订阅源',
    onClick: async () => {
      await store.updateSubscribeSources();
    },
  },
  {
    text: '管理订阅源',
    onClick: () => {
      displayStore.showManageSubscribeDialog = true;
    },
  },
  {
    text: '设置',
    onClick: () => {
      displayStore.showSettingDialog = true;
    },
  },
];
const onClickAction = (action: { text: string; onClick: Function }) =>
  action.onClick();

// 记录上一次的页面路径
watch(
  () => route.path,
  (newPath) => {
    displayStore.routerCurrPath = newPath;
    if (newPath.startsWith('/home')) {
      activeKey.value = '0';
    } else if (newPath.startsWith('/photo')) {
      photoPath.value = newPath;
      activeKey.value = '1';
    } else if (newPath.startsWith('/song')) {
      songPath.value = newPath;
      activeKey.value = '2';
    } else if (newPath.startsWith('/book')) {
      bookPath.value = newPath;
      activeKey.value = '3';
    } else if (newPath.startsWith('/comic')) {
      comicPath.value = newPath;
      activeKey.value = '4';
    } else if (newPath.startsWith('/video')) {
      videoPath.value = newPath;
      activeKey.value = '5';
    } else {
    }
  }
);

// onMounted(async () => {
//   await getCurrentWindow().setMinSize(new LogicalSize(600, 300));
//   await getCurrentWindow().setSizeConstraints({
//     minWidth: 600,
//     minHeight: 300,
//   });
// });

onMounted(() => {
  setTimeout(() => {
    // 获取当前页面的 key
    const currentPageKey = pages.value.findIndex((page) =>
      route.path.startsWith(page.to)
    );
    // 如果当前页面不在 pages 中，则默认为第一个页面
    activeKey.value = currentPageKey !== -1 ? currentPageKey.toString() : '0';
  }, 500);
});

onMounted(async () => {
  if (displayStore.trayId && (await TrayIcon.getById(displayStore.trayId))) {
    await TrayIcon.removeById(displayStore.trayId);
  }
  displayStore.trayId = (await buildTray()).id;
});
onBeforeUnmount(async () => {
  if (displayStore.trayId && (await TrayIcon.getById(displayStore.trayId))) {
    await TrayIcon.removeById(displayStore.trayId);
  }
});
</script>

<template>
  <div class="flex w-screen h-screen bg-[var(--van-background-2)]">
    <div class="flex w-full h-full">
      <div class="sidebar flex flex-col w-[50px] bg-[var(--van-background)]">
        <van-sidebar v-model="activeKey" class="grow">
          <van-sidebar-item
            v-for="(page, index) in pages"
            :key="index"
            :to="page.to"
          >
            <template #title>
              <van-icon
                :name="activeKey == `${index}` ? page.selectedIcon : page.icon"
                class="hover:scale-105"
                size="26"
              />
            </template>
          </van-sidebar-item>
        </van-sidebar>
        <div class="flex flex-col gap-2 justify-center items-center pb-2">
          <!-- <div class="cursor-pointer hover:scale-105" @click="toggleDark()">
            <Icon
              icon="pepicons-pop:moon-circle"
              width="26px"
              height="26px"
              v-if="!isDark"
            />
            <Icon
              icon="pepicons-pop:sun-circle"
              width="26px"
              height="26px"
              class="text-white"
              v-else
            />
          </div> -->
          <van-popover
            v-model:show="showSourcePopover"
            placement="right-end"
            :actions="sourceActions"
            @select="onClickAction"
          >
            <template #reference>
              <Icon
                icon="lets-icons:setting-line"
                width="26px"
                height="26px"
                class="text-[var(--van-text-color)] cursor-pointer hover:scale-105"
              />
            </template>
          </van-popover>
          <van-popover
            v-model:show="showSettingPopover"
            placement="right-end"
            :actions="settingActions"
            @select="onClickAction"
          >
            <template #reference>
              <Icon
                icon="si:info-line"
                width="26px"
                height="26px"
                class="text-[var(--van-text-color)] cursor-pointer hover:scale-105"
              />
            </template>
          </van-popover>
        </div>
      </div>
      <transition name="slide">
        <div class="content grow w-full h-full overflow-hidden">
          <Component :is="routerView" />
          <!-- <router-view v-slot="{ Component }">
            <keep-alive>
              <component :is="Component" />
            </keep-alive>
          </router-view> -->
        </div>
      </transition>
    </div>
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

  <div class="dialogs">
    <ImportSubscribeDialog />
    <ManageSubscribeDialog />
    <AboutDialog />
    <SettingDialog />
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
:deep(.van-sidebar) {
  width: 50px;
}
:deep(.van-sidebar-item) {
  padding: 12px;
}
.van-toast .van-toast__icon {
  font-size: var(--van-toast-icon-size);
}
</style>
