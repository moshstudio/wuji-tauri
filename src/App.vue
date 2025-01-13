<script setup lang="ts">
import { onMounted, Ref, ref, watch } from "vue";
import { useStore, useDisplayStore } from "./store";
import { Icon } from "@iconify/vue";
import { storeToRefs } from "pinia";
import { useRoute } from "vue-router";
import ImportSubscribeDialog from "@/windows/components/dialogs/ImportSubscribe.vue";
import ManageSubscribeDialog from "@/windows/components/dialogs/ManageSubscribe.vue";
import AboutDialog from "./components/dialogs/About.vue";

interface PageItem {
  name: string;
  icon: string;
  selectedIcon: string;
  to: Ref;
}

const store = useStore();
const displayStore = useDisplayStore();
const { toggleDark } = displayStore;
const { isDark } = storeToRefs(displayStore);

const homePath = ref("/home");
const photoPath = ref("/photo");
const songPath = ref("/song");
const bookPath = ref("/book");
const pages = ref<PageItem[]>([
  {
    name: "Home",
    icon: "wap-home-o",
    selectedIcon: "wap-home",
    to: homePath,
  },
  {
    name: "Photo",
    icon: "photo-o",
    selectedIcon: "photo",
    to: photoPath,
  },
  {
    name: "Song",
    icon: "music-o",
    selectedIcon: "music",
    to: songPath,
  },
  {
    name: "Book",
    icon: "bookmark-o",
    selectedIcon: "bookmark",
    to: bookPath,
  },
]);

const activeKey = ref("0");

const route = useRoute();
const showSettingPopover = ref(false);
const settingActions = [
  {
    text: "切换主题",
    icon: "star-o",
    onClick: () => {
      displayStore.toggleDark();
    },
  },
  {
    text: "导入订阅源",
    onClick: () => {
      displayStore.showAddSubscribeDialog = true;
    },
  },
  {
    text: "更新订阅源",
    onClick: async () => {
      await store.updateSubscribeSources();
    },
  },
  {
    text: "管理订阅源",
    onClick: () => {
      displayStore.showManageSubscribeDialog = true;
    },
  },
  {
    text: "关于",
    onClick: () => {
      displayStore.showAboutDialog = true;
    },
  },
];
const onClickSettingAction = (action: { text: string; onClick: Function }) =>
  action.onClick();

// 记录上一次的页面路径
watch(
  () => route.path,
  (newPath) => {
    if (newPath.startsWith("/photo")) {
      photoPath.value = newPath;
    } else if (newPath.startsWith("/song")) {
      songPath.value = newPath;
    } else if (newPath.startsWith("/book")) {
      bookPath.value = newPath;
    } else {
    }
  }
);

onMounted(() => {
  setTimeout(() => {
    // 获取当前页面的 key
    const currentPageKey = pages.value.findIndex((page) =>
      route.path.startsWith(page.to)
    );
    // 如果当前页面不在 pages 中，则默认为第一个页面
    activeKey.value = currentPageKey !== -1 ? currentPageKey.toString() : "0";
  }, 500);
});
</script>

<template>
  <van-config-provider :theme="displayStore.isDark ? 'dark' : 'light'">
    <div class="flex w-screen h-screen bg-[var(--van-background-2)]">
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
        <div class="flex flex-col gap-2 justify-center items-center pb-4">
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
            v-model:show="showSettingPopover"
            placement="right-end"
            :actions="settingActions"
            @select="onClickSettingAction"
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
        </div>
      </div>
      <transition name="slide">
        <div class="content grow w-full h-full overflow-hidden">
          <router-view v-slot="{ Component }">
            <keep-alive>
              <component :is="Component" />
            </keep-alive>
          </router-view>
        </div>
      </transition>
    </div>
    <div class="dialogs">
      <ImportSubscribeDialog />
      <ManageSubscribeDialog />
      <AboutDialog />
    </div>
  </van-config-provider>
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
