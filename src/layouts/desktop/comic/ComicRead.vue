<script setup lang="ts">
import type {
  ComicChapter,
  ComicContent,
  ComicItem,
} from '@wuji-tauri/source-extension';
import type { ComicSource } from '@/types';
import { Icon } from '@iconify/vue';
import { LoadImage } from '@wuji-tauri/components/src';
import { storeToRefs } from 'pinia';
import { nextTick, onActivated, onDeactivated, ref, watch } from 'vue';
import AddShelfButton from '@/components/button/AddShelfButton.vue';
import { router } from '@/router';
import { useDisplayStore } from '@/store';
import { useBackStore } from '@/store/backStore';

defineProps<{
  comic?: ComicItem;
  comicSource?: ComicSource;
  chapterList?: ComicChapter[];
  chapter?: ComicChapter;
  chapterContent?: ComicContent;
  inShelf: boolean;
  addToShelf: () => void;
  showSetting: () => void;
  showSwitchSource: () => void;
  toChapter: (chapter: ComicChapter) => void;
  prevChapter: () => void;
  nextChapter: () => void;
  refreshChapter: () => void;
}>();

const backStore = useBackStore();
const displayStore = useDisplayStore();

const { showTabBar } = storeToRefs(displayStore);

const bubbleOffset = ref({
  x: 10,
  y: document.querySelector('body')!.clientHeight - 260,
});
// watch(bubbleOffset, (offset) => {
//   const ch = document.querySelector('body')!.clientHeight;
//   if (offset.y > ch - 140) {
//     offset.y = ch - 140;
//   }
// });

const isShowChapterList = ref(false);
async function showChapterList() {
  isShowChapterList.value = true;
  await nextTick();
  document.querySelector('.reading-chapter')?.scrollIntoView({
    block: 'center',
    behavior: 'instant',
  });
}

const showMenu = ref(false);
watch(
  showMenu,
  () => {
    showTabBar.value = showMenu.value;
  },
  { immediate: true },
);
onActivated(() => {
  showTabBar.value = showMenu.value;
});
onDeactivated(() => {
  showTabBar.value = true;
});
</script>

<template>
  <div
    class="relative flex h-full w-full flex-col items-center overflow-hidden"
    :class="[showMenu ? '' : 'hide_menu']"
  >
    <!-- 顶部菜单 -->
    <div
      class="top_menu absolute left-0 top-0 z-[5] flex w-full flex-col gap-2 bg-[var(--van-background)] p-2 shadow transition"
    >
      <div class="flex flex-nowrap items-center justify-between">
        <div class="flex flex-nowrap items-center">
          <van-icon
            name="arrow-left"
            color="var(--van-text-color)"
            size="22"
            @click="backStore.back"
          />
          <span class="ml-2 line-clamp-1 text-sm text-[var(--van-text-color)]">
            {{ comic?.title }}
          </span>
        </div>
        <div class="options flex items-center gap-3 pr-2">
          <van-icon
            name="replay"
            class="van-haptics-feedback text-[var(--van-text-color)]"
            @click="refreshChapter"
          />
          <van-icon
            name="exchange"
            class="van-haptics-feedback text-[var(--van-text-color)]"
            @click="showSwitchSource"
          />

          <AddShelfButton
            size="mini"
            :is-added="inShelf"
            :add-click="addToShelf"
            :added-click="() => router.push({ name: 'ComicShelf' })"
          />
        </div>
      </div>
      <div
        class="flex flex-nowrap items-center justify-between text-xs text-[var(--van-text-color)]"
      >
        <span v-if="chapter">{{ chapter?.title }}</span>
        <div
          v-if="comicSource"
          class="mr-2 rounded p-1 text-[var(--van-primary-color)]"
        >
          {{ comicSource?.item.name }}
        </div>
      </div>
    </div>
    <div
      v-remember-scroll
      class="comic-scroll-container flex h-full w-full overflow-y-auto"
    >
      <div
        id="comic-read-content"
        class="relative w-full py-2 text-justify leading-[0] text-[--van-text-color]"
        @click="() => (showMenu = !showMenu)"
      >
        <div
          v-for="(item, index) in chapterContent?.photos"
          :key="index"
          class="min-h-[50px] w-full text-center leading-[0]"
        >
          <LoadImage
            :src="item"
            :headers="chapterContent?.photosHeaders"
            :compress="false"
            fit="contain"
            :lazy-load="true"
          />
        </div>
      </div>
      <van-floating-bubble
        v-model:offset="bubbleOffset"
        axis="xy"
        :gap="6"
        class="!h-[90px] !w-[40px] !border !border-[var(--van-border-color)] !bg-[color:rgb(var(--van-background)/0.5)] active:!opacity-100"
      >
        <div class="flex h-[90px] flex-col items-center gap-[0px] leading-[0]">
          <van-button
            icon="arrow-up"
            square
            hairline
            size="small"
            class="h-[45px] w-[40px]"
            @click="() => prevChapter()"
          />
          <van-button
            icon="arrow-down"
            square
            hairline
            size="small"
            class="h-[45px] w-[40px]"
            @click="() => nextChapter()"
          />
        </div>
      </van-floating-bubble>
    </div>

    <!-- 底部菜单 -->
    <div
      class="bottom up-shadow absolute bottom-0 left-0 z-[6] flex w-full flex-col bg-[var(--van-background)] p-2 text-[var(--van-text-color)] transition"
    >
      <div class="flex items-center justify-between gap-[10px]">
        <div
          class="van-haptics-feedback w-[50px] text-sm"
          @click="() => prevChapter()"
        >
          上一章
        </div>

        <div
          class="van-haptics-feedback w-[50px] text-sm"
          @click="() => nextChapter()"
        >
          下一章
        </div>
      </div>
      <div class="flex w-full items-center justify-between gap-1 text-sm">
        <div
          class="van-haptics-feedback flex flex-col items-center gap-1 p-2"
          @click="() => showChapterList()"
        >
          <Icon icon="tabler:list" width="20" height="20" />
          章节
        </div>
        <div
          class="van-haptics-feedback flex flex-col items-center gap-1 p-2"
          @click="showSetting"
        >
          <Icon icon="ci:font" width="20" height="20" />
          界面
        </div>
      </div>
    </div>
    <van-popup
      v-model:show="isShowChapterList"
      position="right"
      :style="{
        minWidth: '30%',
        maxWidth: '70%',
        height: '100%',
        backgroundColor: 'var(--van-background)',
      }"
      class="scrollbar scrollbar-track-transparent scrollbar-thumb-gray-400/60"
    >
      <van-list>
        <template v-for="item in comic?.chapters" :key="item.id">
          <div
            class="mobile-scrollbar van-haptics-feedback flex select-none flex-nowrap items-center justify-start gap-2 p-2 text-sm"
            :class="{
              'reading-chapter': chapter?.id === item.id,
            }"
            @click="
              () => {
                toChapter(item);
                isShowChapterList = false;
                showMenu = false;
              }
            "
          >
            <Icon
              v-if="chapter?.id === item.id"
              icon="iconamoon:eye-thin"
              width="24"
              height="24"
              color="var(--van-primary-color)"
            />
            <span
              class="flex-grow overflow-hidden text-ellipsis text-nowrap text-left"
              :class="
                chapter?.id === item.id
                  ? 'text-[var(--van-primary-color)]'
                  : 'text-[var(--van-text-color)]'
              "
            >
              {{ item.title }}
            </span>
          </div>
        </template>
      </van-list>
    </van-popup>
  </div>
</template>

<style scoped lang="less">
.hide_menu {
  .top_menu {
    transform: translateY(-100%);
  }
  .bottom {
    transform: translateY(100%);
  }
}
:deep(.van-list) {
  ::-webkit-scrollbar {
    background-color: transparent;
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-thumb {
    background-color: rgba(110, 110, 110, 0.2);
    border-radius: 6px;
  }

  :hover::-webkit-scrollbar-thumb {
    background-color: rgba(110, 110, 110, 0.6);
  }

  ::-webkit-scrollbar-thumb:hover {
    background-color: rgba(110, 110, 110, 0.8);
  }
}
</style>
