<script setup lang="ts">
import { ComicChapter, ComicContent, ComicItem } from '@/extensions/comic';

import { useComicStore, useDisplayStore } from '@/store';
import { ComicSource } from '@/types';
import ComicShelfButton from '@/components/ComicShelfButton.vue';
import ComicShelf from '@/views/comic/ComicShelf.vue';
import NavBar from '@/components/NavBar.vue';
import { Icon } from '@iconify/vue';
import { onActivated, onDeactivated, onMounted, PropType } from 'vue';
import { useScroll } from '@vueuse/core';
import LoadImage from '@/components/LoadImage.vue';
import SwitchComicSourceDialog from '@/components/dialogs/SwitchComicSource.vue';

const comic = defineModel('comic', { type: Object as PropType<ComicItem> });
const comicSource = defineModel('comicSource', {
  type: Object as PropType<ComicSource>,
});
const chapterList = defineModel('chapterList', {
  type: Array as PropType<ComicChapter[]>,
});
const readingChapter = defineModel('readingChapter', {
  type: Object as PropType<ComicChapter>,
});
const readingContent = defineModel('readingContent', {
  type: Object as PropType<ComicContent>,
});
const showChapters = defineModel('showChapters', {
  type: Boolean,
  required: true,
});
const showSettingDialog = defineModel('showSettingDialog', {
  type: Boolean,
  required: true,
});
const showNavBar = defineModel('showNavBar', {
  type: Boolean,
  required: true,
});
const allSourceResults = defineModel('allSourceResults', {
  type: Array as PropType<ComicItem[]>,
});
const showSwitchSourceDialog = defineModel('showSwitchSourceDialog', {
  type: Boolean,
  required: true,
});

const emit = defineEmits<{
  (e: 'back', checkShelf?: boolean): void;
  (e: 'loadData'): void;
  (e: 'toChapter', chapter: ComicChapter): void;
  (e: 'prevChapter'): void;
  (e: 'nextChapter'): void;
  (e: 'openChapterPopup'): void;
  (e: 'searchAllSources', targetComic: ComicItem): void;
  (e: 'switchSource', newComicItem: ComicItem): void;
}>();

const comicStore = useComicStore();

let savedScrollPosition = 0;

onMounted(() => {
  const el: HTMLElement | null = document.querySelector(`.scroll-container`);
  if (el) {
    const { y } = useScroll(el);
    // 组件停用时保存滚动位置
    onDeactivated(() => {
      savedScrollPosition = y.value;
    });

    // 组件激活时恢复滚动位置
    onActivated(() => {
      el.scrollTo({
        top: savedScrollPosition,
        behavior: 'instant',
      });
    });
  }
});
</script>

<template>
  <div
    class="relative flex flex-col w-full h-full overflow-hidden items-center"
  >
    <NavBar
      v-model:show="showNavBar"
      left-arrow
      @click-left="() => emit('back', true)"
      class="absolute w-full h-[70px]"
      target="#read-content"
    >
      <template #title>
        <div class="flex flex-col gap-1 items-center truncate">
          <span class="text-xl">{{ readingChapter?.title }}</span>
          <div class="flex gap-1">
            <span class="text-xs text-[--van-text-color-2]">
              <van-icon name="orders-o" />
              {{ comic?.title }}
            </span>
            <span class="text-xs text-[--van-text-color-2]">
              <van-icon name="user-o" />
              {{ comic?.author }}
            </span>
            <span class="text-xs text-[--van-text-color-2]" v-if="comicSource">
              <van-icon name="flag-o" />
              {{ comicSource?.item.name }}
            </span>
            <van-icon
              name="exchange"
              class="text-[--van-text-color-2] van-haptics-feedback"
              @click="() => (showSwitchSourceDialog = true)"
            />
          </div>
        </div>
      </template>
    </NavBar>
    <div
      class="scroll-container flex-grow flex flex-col gap-0 items-center overflow-y-auto min-w-[400px] w-[95%] sm:w-[90%] md:w-[85%] lg:w-[75%] focus:outline-none focus:border-none"
      @keydown.right.stop="() => emit('nextChapter')"
      @keydown.left.stop="() => emit('prevChapter')"
      tabindex="0"
    >
      <div class="min-h-[80px]"></div>
      <template
        v-if="readingContent"
        v-for="item in readingContent.photos"
        :key="item.id"
      >
        <div class="w-full text-center leading-none">
          <LoadImage
            :src="item"
            :headers="readingContent.photosHeaders"
            fit="contain"
            lazy-load
          >
          </LoadImage>
        </div>
      </template>
      <div
        class="read-sidebar absolute right-[8px] bottom-[8px] flex flex-col gap-1 opacity-80 sm:opacity-100 hover:opacity-100"
      >
        <ComicShelfButton
          :comic="comic"
          mode="square"
          :reading-chapter="readingChapter"
        ></ComicShelfButton>
        <van-button
          icon="bars"
          square
          size="small"
          class="w-[46px] h-[46px] opacity-50 hover:opacity-100"
          @click="() => emit('openChapterPopup')"
        >
          <span>章节</span>
        </van-button>
        <van-button
          icon="arrow-up"
          square
          size="small"
          class="w-[46px] h-[46px] opacity-50 hover:opacity-100"
          @click="() => emit('prevChapter')"
        >
          <span>上章</span>
        </van-button>
        <van-button
          icon="arrow-down"
          square
          type="primary"
          size="small"
          class="w-[46px] h-[46px] opacity-50 hover:opacity-100"
          @click="() => emit('nextChapter')"
        >
          <span class="font-bold">下章</span>
        </van-button>
        <van-button
          icon="setting"
          square
          size="small"
          class="w-[46px] h-[46px] opacity-50 hover:opacity-100"
          @click="showSettingDialog = true"
        >
          <span>设置</span>
        </van-button>
        <!-- <PositionBackTop
          target=".scroll-container"
          placeholder
          class="w-[46px] h-[46px] flex items-center justify-center"
        >
          <van-button
            square
            size="small"
            class="w-[46px] h-[46px] opacity-50 hover:opacity-100"
          >
            <template #icon>
              <van-icon name="back-top" size="20" />
            </template>
          </van-button>
        </PositionBackTop> -->
      </div>
    </div>
    <van-popup
      v-model:show="showChapters"
      position="right"
      class="chapter-popup"
      :style="{ width: '260px', height: '100%' }"
      @wheel.stop
    >
      <van-list>
        <van-cell
          v-for="item in comic?.chapters"
          :key="item.id"
          :class="{
            'bg-[--van-background] reading-chapter':
              readingChapter?.id === item.id,
          }"
          clickable
          @click="
            () => {
              emit('toChapter', item);
              showChapters = false;
            }
          "
        >
          <div class="flex items-center gap-2 flex-nowrap">
            <Icon
              icon="iconamoon:eye-thin"
              width="24"
              height="24"
              color="var(--van-primary-color)"
              v-if="readingChapter?.id === item.id"
            />
            <span
              class="flex-grow flex text-left"
              :class="
                readingChapter?.id === item.id
                  ? 'text-[var(--van-primary-color)]'
                  : 'text-[var(--van-text-color)]'
              "
            >
              {{ item.title }}
            </span>
          </div>
        </van-cell>
      </van-list>
    </van-popup>
    <van-dialog
      v-model:show="showSettingDialog"
      titl
      closeOnClickOverlay
      :show-confirm-button="false"
      class="setting-dialog bg-[#1f1f1f] text-white"
    >
      <template #title>
        <div class="text-white">界面设置</div>
      </template>
      <div class="flex flex-col p-2 text-sm">
        <div class="pb-2">字体和样式</div>
      </div>
    </van-dialog>
    <ComicShelf></ComicShelf>
    <!-- <SwitchComicSourceDialog
      v-model:show="showSwitchSourceDialog"
      :search-result="allSourceResults || []"
      :comic="comic"
      @search="
        () => {
          if (comic) {
            emit('searchAllSources', comic);
          }
        }
      "
      @select="(item) => emit('switchSource', item)"
      v-if="comic"
    ></SwitchComicSourceDialog> -->
  </div>
</template>

<style scoped lang="less">
.read-sidebar {
  :deep(.van-button__content) {
    flex-direction: column;
  }
}

:deep(.setting-dialog .van-cell__value) {
  flex: auto;
}
:deep(.van-nav-bar__content) {
  height: 68px;
}
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(30px);
}
</style>
