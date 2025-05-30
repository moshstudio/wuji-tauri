<script setup lang="ts">
import type { Ref, VNode } from 'vue';
import AboutDialog from '@/components/dialogs/About.vue';
import ImportSubscribeDialog from '@/components/windows/dialogs/ImportSubscribe.vue';
import SourcePopup from '@/views/source/index.vue';
import CreateSourcePopup from './views/source/CreateSource.vue';
import { Icon } from '@iconify/vue';
import { TrayIcon } from '@tauri-apps/api/tray';
import { storeToRefs } from 'pinia';
import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue';
import { useRoute } from 'vue-router';
import SettingDialog from './components/windows/dialogs/Setting.vue';
import LoginButton from '@/views/auth/Login.vue';
import { useDisplayStore, useStore } from './store';
import buildTray from './utils/tray';

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
const { photoPath, songPath, bookPath, comicPath, videoPath, tabBarPages } =
  storeToRefs(displayStore);
const _pages: any = reactive({
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
    .filter((page) => page.enable)
    .map((page) => _pages[page.name as keyof typeof _pages]);
});

const activeKey = ref('0');

const route = useRoute();
const showSettingPopover = ref(false);

const showSourcePopover = ref(false);
const settingActions = [
  {
    text: '设置',
    onClick: () => {
      displayStore.showSettingDialog = true;
    },
  },
  {
    text: '关于',
    onClick: () => {
      displayStore.showAboutDialog = true;
    },
  },
];
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
    text: '创建订阅源',
    onClick: () => {
      displayStore.showCreateSubscribeDialog = true;
    },
  },
];
function onClickAction(action: { text: string; onClick: Function }) {
  action.onClick();
}

function updateActiveKey(newPath?: string) {
  newPath ||= route.path;
  displayStore.routerCurrPath = newPath;
  if (newPath.startsWith('/home')) {
    activeKey.value = String(
      pages.value.findIndex((page) => page.name === 'Home'),
    );
  } else if (newPath.startsWith('/photo')) {
    photoPath.value = newPath;
    activeKey.value = String(
      pages.value.findIndex((page) => page.name === 'Photo'),
    );
  } else if (newPath.startsWith('/song')) {
    songPath.value = newPath;
    activeKey.value = String(
      pages.value.findIndex((page) => page.name === 'Song'),
    );
  } else if (newPath.startsWith('/book')) {
    bookPath.value = newPath;
    activeKey.value = String(
      pages.value.findIndex((page) => page.name === 'Book'),
    );
  } else if (newPath.startsWith('/comic')) {
    comicPath.value = newPath;
    activeKey.value = String(
      pages.value.findIndex((page) => page.name === 'Comic'),
    );
  } else if (newPath.startsWith('/video')) {
    videoPath.value = newPath;
    activeKey.value = String(
      pages.value.findIndex((page) => page.name === 'Video'),
    );
  } else {
  }
}

// 记录上一次的页面路径
watch([() => route.path, pages], ([newPath, newPages]) => {
  updateActiveKey(newPath);
});

onMounted(() => {
  updateActiveKey(displayStore.routerCurrPath);
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
        <div class="flex flex-col gap-4 justify-center items-center pb-2">
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

          <LoginButton />

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
                class="text-[var(--van-text-color)] cursor-pointer hover:scale-105"
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
                icon="tabler:source-code"
                width="26px"
                height="26px"
                class="text-[var(--van-text-color)] cursor-pointer hover:scale-105"
              />
            </template>
          </van-popover>
        </div>
      </div>

      <div class="content grow w-full h-full overflow-hidden">
        <Component :is="routerView" />
      </div>
    </div>
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
      <AboutDialog />
      <SettingDialog />
      <SourcePopup />
      <CreateSourcePopup />
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
