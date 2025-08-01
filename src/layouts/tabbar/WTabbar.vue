<script setup lang="ts">
import ImportSubscribeSource from '@/components2/dialog/ImportSubscribeSource.vue';
import { Icon } from '@iconify/vue';
import { storeToRefs } from 'pinia';
import { computed, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useDisplayStore, useServerStore, useStore } from '@/store';
import { router } from '@/router';
import WLoginButton from '@/components2/button/WLoginButton.vue';

const store = useStore();
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
const showImportSubscribeDialog = ref(false);
const showSettingPopover = ref(false);

const showSourcePopover = ref(false);
const settingActions = [
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
const sourceActions = [
  {
    text: '导入订阅源',
    onClick: () => {
      showImportSubscribeDialog.value = true;
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
      router.push({ name: 'SourceManage' });
    },
  },
  {
    text: '创建订阅源',
    onClick: () => {
      router.push({ name: 'SourceCreate' });
    },
  },
];
function onClickAction(action: { text: string; onClick: Function }) {
  action.onClick();
}

function updateActiveKey(newPath?: string) {
  newPath ||= route.path;
  displayStore.routerCurrPath = newPath;
  if (
    !newPath.startsWith('/book-read/') &&
    !newPath.startsWith('/comic-read/')
  ) {
    displayStore.showTabBar = true;
  }
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
      leave-active-class="transition-all duration-100 ease-in"
      leave-from-class="opacity-100 transform translate-x-0"
      leave-to-class="opacity-0 transform translate-x-[-50px]"
    >
      <div
        v-show="showTabBar"
        class="sidebar flex w-[50px] flex-col bg-[var(--van-background)]"
      >
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
        <div class="flex flex-col items-center justify-center gap-2 pb-2">
          <WLoginButton :user-info="serverStore.userInfo"></WLoginButton>
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

    <div class="content h-full w-full grow overflow-hidden">
      <slot></slot>
    </div>

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
    <div class="dialogs">
      <ImportSubscribeSource v-model:show="showImportSubscribeDialog" />
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
