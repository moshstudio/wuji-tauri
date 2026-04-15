<script setup lang="ts">
import type { BookChapter, BookItem, BookChapterList as ChapterList } from '@wuji-tauri/source-extension';
import type { BookSource } from '@/types';
import { Icon } from '@iconify/vue';
import { showToast } from 'vant';
import { computed, onActivated, onMounted, onUnmounted, watch } from 'vue';
import BookScrollerContent from '@/components/book/BookScrollerContent.vue';
import AddShelfButton from '@/components/button/AddShelfButton.vue';
import MBookTTSButton from '@/components/button/MBookTTSButton.vue';
import { useBookReadScroll } from '@/hooks/useBookReadScroll';
import { useStatusBar } from '@/hooks/useStatusBar';
import { router } from '@/router';
import { useBookChapterStore, useBookStore, useDisplayStore } from '@/store';
import { useBackStore } from '@/store/backStore';

const props = withDefaults(
  defineProps<{
    book?: BookItem;
    bookSource?: BookSource;
    chapterList?: ChapterList;
    isPrev?: boolean;
    chapter?: BookChapter;
    chapterContent?: string;
    prevChapterContent?: string;
    nextChapterContent?: string;
    allSourceResults?: BookItem[];
    fullScreenClickToNext: boolean;
    inShelf: boolean;
    addToShelf: () => void;
    showViewSetting: () => void;
    showSetting: () => void;
    showSwitchSource: () => void;
    toChapter: (chapter: BookChapter) => void;
    prevChapter: (toLast?: boolean) => void;
    nextChapter: () => void;
    refreshChapter: () => Promise<void>;
    loadChapterContent: (chapter: BookChapter) => Promise<string>;
    onDownload?: () => void;
  }>(),
  {
    isPrev: false,
  },
);

const displayStore = useDisplayStore();
const bookStore = useBookStore();
const backStore = useBackStore();
const bookCacheStore = useBookChapterStore();

const {
  loadedChapters,
  activeChapterId,
  activeChapterTitle,
  isLoadingNext,
  isLoadingPrev,
  noMoreNext,
  noMorePrev,
  showMenu,
  scrollContainer,
  currentPIndex,
  computedStyle,
  playTTS,
  ttsActiveChapterId,
} = useBookReadScroll({
  book: () => props.book,
  chapterList: () => props.chapterList,
  chapter: () => props.chapter,
  chapterContent: () => props.chapterContent,
  loadChapterContent: props.loadChapterContent,
  nextChapter: props.nextChapter,
  toChapter: props.toChapter,
});

const sliderToChapterValue = computed({
  get() {
    const id = activeChapterId.value || props.chapter?.id;
    return (props.chapterList?.findIndex(c => c.id === id) || 0) + 1;
  },
  set(v) {
    if (v > 0 && props.chapterList) {
      props.toChapter(props.chapterList[v - 1]);
    }
  },
});

function jumpToChapter(chapter: BookChapter) {
  props.toChapter(chapter);
}

// ── 菜单主动翻章 ──
function onPrevChapterClick() {
  const currentId = activeChapterId.value || props.chapter?.id;
  if (!currentId || !props.chapterList)
    return;
  const idx = props.chapterList.findIndex(c => c.id === currentId);
  if (idx <= 0) {
    showToast('已经是第一章了');
    return;
  }
  jumpToChapter(props.chapterList[idx - 1]);
}

function onNextChapterClick() {
  const currentId = activeChapterId.value || props.chapter?.id;
  if (!currentId || !props.chapterList)
    return;
  const idx = props.chapterList.findIndex(c => c.id === currentId);
  if (idx === -1 || idx >= props.chapterList.length - 1) {
    showToast('已经是最后一章了');
    return;
  }
  jumpToChapter(props.chapterList[idx + 1]);
}

// ── 点击交互 ──
function onClickContent(e: MouseEvent | TouchEvent) {
  if (showMenu.value) {
    showMenu.value = false;
    return;
  }
  if (!scrollContainer.value)
    return;
  const rect = scrollContainer.value.getBoundingClientRect();
  const y = e instanceof TouchEvent ? (e.touches[0]?.clientY || 0) : e.clientY;

  const midY = rect.height / 2;
  const threshold = rect.height * 0.2;

  if (Math.abs(y - midY) < threshold) {
    showMenu.value = true;
    displayStore.showTabBar = true;
  }
  else if (y >= midY) {
    scrollContainer.value.scrollBy({ top: rect.height - 100, behavior: 'smooth' });
  }
  else {
    scrollContainer.value.scrollBy({ top: -(rect.height - 100), behavior: 'smooth' });
  }
}

watch(showMenu, (val) => {
  displayStore.showTabBar = val;
}, { immediate: true });

// 声明式状态栏控制：如果是“默认”主题，则跟随软件全局主题色
useStatusBar(() => {
  return bookStore.currTheme.name === '默认'
    ? undefined
    : bookStore.currTheme.bgColor;
});

onActivated(() => {
  displayStore.showTabBar = showMenu.value;
});

// ── 键盘快捷键 ──
function handleKeyDown(e: KeyboardEvent) {
  switch (e.key) {
    case 'ArrowUp':
      scrollContainer.value?.scrollBy({ top: -100, behavior: 'smooth' });
      break;
    case 'ArrowDown':
      scrollContainer.value?.scrollBy({ top: 100, behavior: 'smooth' });
      break;
    case ' ':
    case 'Spacebar':
      showMenu.value = !showMenu.value;
      break;
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
});

// ── 底部状态栏 ──
const activeChapterProgress = computed(() => {
  const id = activeChapterId.value;
  if (!id || !props.chapterList)
    return '0.0';
  const idx = props.chapterList.findIndex(c => c.id === id);
  if (idx < 0)
    return '0.0';
  return ((idx / (props.chapterList.length || 1)) * 100).toFixed(1);
});
</script>

<template>
  <div class="fixed box-border flex h-screen w-screen flex-col overflow-hidden" :class="[showMenu ? '' : 'hide_menu']">
    <!-- 顶部菜单 -->
    <transition
      enter-active-class="transition-all duration-100 ease-out"
      enter-from-class="opacity-0 transform -translate-y-full"
      enter-to-class="opacity-100 transform translate-y-0"
      leave-active-class="transition-all duration-100 ease-in"
      leave-from-class="opacity-100 transform translate-y-0"
      leave-to-class="opacity-0 transform -translate-y-full"
    >
      <div v-show="showMenu" class="top_menu absolute left-0 top-0 z-[5] flex w-full flex-col gap-2 bg-[var(--van-background)] p-2 shadow transition">
        <div class="flex flex-nowrap items-center justify-between">
          <div class="flex flex-nowrap items-center">
            <van-icon name="arrow-left" color="var(--van-text-color)" size="22" class="p-1" @click="backStore.back" />
            <span class="ml-2 line-clamp-1 text-sm text-[var(--van-text-color)]">{{ book?.title }}</span>
          </div>
          <div class="flex items-center gap-3 pr-2">
            <van-icon name="down" class="text-[var(--van-text-color)] cursor-pointer" @click="onDownload" />
            <van-icon name="replay" class="text-[var(--van-text-color)] cursor-pointer" @click="refreshChapter" />
            <van-icon name="exchange" class="text-[var(--van-text-color)] cursor-pointer" @click="showSwitchSource" />
            <AddShelfButton size="mini" :is-added="inShelf" :add-click="addToShelf" :added-click="() => router.push({ name: 'BookShelf' })" />
          </div>
        </div>
        <div class="flex items-center justify-between text-xs text-[var(--van-text-color)]">
          <span>{{ activeChapterTitle }}</span>
          <div v-if="bookSource" class="mr-2 rounded p-1 text-[var(--van-primary-color)]">
            {{ bookSource?.item.name }}
          </div>
        </div>
      </div>
    </transition>

    <!-- 滚动内容区 —— 多章节无限滚动 -->
    <div
      ref="scrollContainer"
      class="h-full w-full overflow-y-auto relative"
      :style="[computedStyle, { overflowAnchor: 'none' }]"
      @click="onClickContent"
    >
      <!-- 顶部加载提示 -->
      <div v-if="isLoadingPrev" class="py-4 text-center text-sm opacity-50">
        加载上一章...
      </div>
      <div v-if="noMorePrev && loadedChapters.length > 0" class="py-4 text-center text-sm opacity-40">
        已经是第一章了
      </div>

      <!-- 多章节渲染 -->
      <BookScrollerContent
        :loaded-chapters="loadedChapters"
        :active-chapter-id="activeChapterId"
        :tts-active-chapter-id="ttsActiveChapterId"
        :current-p-index="currentPIndex"
      />

      <!-- 底部加载提示 -->
      <div v-if="isLoadingNext" class="py-4 text-center text-sm opacity-50">
        加载下一章...
      </div>
      <div v-if="noMoreNext && loadedChapters.length > 0" class="py-8 text-center text-sm opacity-40">
        已经是最后一章了
      </div>

      <!-- 底部留白 -->
      <div class="h-[30vh]" />
    </div>

    <!-- 底部状态栏 -->
    <div
      class="fixed bottom-0 left-0 w-full flex items-center justify-between text-[11px] opacity-60 transition-opacity"
      :class="showMenu ? 'opacity-0' : 'opacity-60'"
      :style="{
        height: `${bookStore.paddingBottom}px`,
        paddingLeft: `${bookStore.paddingX}px`,
        paddingRight: `${bookStore.paddingX}px`,
        color: computedStyle.color,
      }"
    >
      <span class="truncate pr-2">{{ activeChapterTitle }}</span>
      <span>{{ activeChapterProgress }}%</span>
    </div>

    <!-- 底部菜单 -->
    <transition
      enter-active-class="transition-all duration-100 ease-out"
      enter-from-class="opacity-0 transform translate-y-full"
      enter-to-class="opacity-100 transform translate-y-0"
      leave-active-class="transition-all duration-100 ease-in"
      leave-from-class="opacity-100 transform translate-y-0"
      leave-to-class="opacity-0 transform translate-y-full"
    >
      <div
        v-show="showMenu"
        class="bottom-menu absolute bottom-0 left-0 z-[6] flex w-full flex-col bg-[var(--van-background)] p-2 text-[var(--van-text-color)] shadow-[0_-2px_10px_rgba(0,0,0,0.05)] transition"
        :class="displayStore.isAppView ? 'pb-[50px]' : 'pb-safe'"
      >
        <div class="flex items-center gap-2 mb-2">
          <div class="van-haptics-feedback shrink-0 text-nowrap px-2 text-sm cursor-pointer" @click="onPrevChapterClick">
            上一章
          </div>
          <van-slider
            v-model="sliderToChapterValue"
            class="w-[calc(100%-120px)]"
            :button-size="16"
            :min="1"
            :step="1"
            :max="chapterList ? chapterList.length : 1"
          />
          <div class="van-haptics-feedback shrink-0 text-nowrap px-2 text-sm cursor-pointer" @click="onNextChapterClick">
            下一章
          </div>
        </div>
        <div class="flex w-full items-center justify-between gap-1 text-sm pt-0">
          <div class="flex flex-col items-center gap-1 p-2 cursor-pointer" @click="displayStore.showChapters = true; showMenu = false;">
            <Icon icon="tabler:list" width="20" height="20" />
            章节
          </div>
          <MBookTTSButton :reading-paged-content="[]" :on-play="playTTS" />
          <div class="flex flex-col items-center gap-1 p-2 cursor-pointer" @click="showViewSetting">
            <Icon icon="ci:font" width="20" height="20" />
            界面
          </div>
          <div class="flex flex-col items-center gap-1 p-2 cursor-pointer" @click="showSetting">
            <Icon icon="tabler:settings" width="20" height="20" />
            设置
          </div>
        </div>
      </div>
    </transition>

    <!-- 章节侧边栏 (App: 从左侧弹出) -->
    <van-popup
      v-model:show="displayStore.showChapters"
      teleport="body"
      position="left"
      :style="{ height: '100%', maxWidth: '70%', backgroundColor: 'var(--van-background)' }"
    >
      <van-list>
        <template v-for="item in book?.chapters" :key="item.id">
          <div
            class="flex items-center gap-2 p-2 text-sm cursor-pointer"
            :class="{ 'reading-chapter': activeChapterId === item.id }"
            @click="jumpToChapter(item); displayStore.showChapters = false; showMenu = false;"
          >
            <span class="flex-grow truncate" :class="activeChapterId === item.id ? 'text-[var(--van-primary-color)]' : 'text-[var(--van-text-color)]'">
              {{ item.title }}
            </span>
            <Icon v-if="book && bookCacheStore.chapterInCache(book, item)" icon="material-symbols-light:download-done-rounded" width="20" height="20" class="text-gray-400" />
          </div>
        </template>
      </van-list>
    </van-popup>
  </div>
</template>

<style scoped>
.reading-chapter {
  background-color: var(--van-active-color);
}
.chapter-sentinel {
  height: 1px;
  width: 100%;
  pointer-events: none;
}
</style>
