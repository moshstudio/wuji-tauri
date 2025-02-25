<script setup lang="ts">
import { BookChapter, BookItem } from '@/extensions/book';

import { useBookStore, useDisplayStore } from '@/store';
import { BookSource } from '@/types';
import BookShelfButton from '@/components/BookShelfButton.vue';
import BookShelf from '@/views/book/BookShelf.vue';
import NavBar from '@/components/NavBar.vue';
import { onActivated, onDeactivated, onMounted, PropType } from 'vue';
import { useScroll } from '@vueuse/core';
import { ReaderResult } from '@/utils/reader/types';
import SwitchBookSourceDialog from '@/components/dialogs/SwitchBookSource.vue';

const book = defineModel('book', { type: Object as PropType<BookItem> });
const bookSource = defineModel('bookSource', {
  type: Object as PropType<BookSource>,
});
const chapterList = defineModel('chapterList', {
  type: Array as PropType<BookChapter[]>,
});
const readingChapter = defineModel('readingChapter', {
  type: Object as PropType<BookChapter>,
});
const readingPagedContent = defineModel('readingPagedContent', {
  type: Object as PropType<{ isPrev: boolean; content: ReaderResult }>,
});
const readingContent = defineModel('readingContent', {
  type: String,
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
  type: Array as PropType<BookItem[]>,
});
const showSwitchSourceDialog = defineModel('showSwitchSourceDialog', {
  type: Boolean,
  required: true,
});

const emit = defineEmits<{
  (e: 'back', checkShelf?: boolean): void;
  (e: 'loadData'): void;
  (e: 'toChapter', chapter: BookChapter): void;
  (e: 'prevChapter'): void;
  (e: 'nextChapter'): void;
  (e: 'openChapterPopup'): void;
  (e: 'searchAllSources', targetBook: BookItem): void;
  (e: 'switchSource', newBookItem: BookItem): void;
}>();

const bookStore = useBookStore();

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
    :style="{
      backgroundColor: bookStore.currTheme.bgColor,
      color: bookStore.currTheme.color,
    }"
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
              {{ book?.title }}
            </span>
            <span class="text-xs text-[--van-text-color-2]">
              <van-icon name="user-o" />
              {{ book?.author }}
            </span>
            <span
              class="text-xs text-[--van-text-color-2]"
              v-if="readingContent?.length"
            >
              <van-icon name="points" />
              {{ readingContent?.length }} 字
            </span>
            <span class="text-xs text-[--van-text-color-2]" v-if="bookSource">
              <van-icon name="flag-o" />
              {{ bookSource?.item.name }}
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
      class="scroll-container flex h-full overflow-y-auto min-w-[400px] w-[95%] sm:w-[90%] md:w-[75%] lg:w-[60%]"
    >
      <div
        id="read-content"
        class="pt-[80px] relative overflow-y-auto p-4 text-justify leading-[1.8] text-[--van-text-color]"
        :style="{
          fontSize: bookStore.fontSize + 'px',
          fontFamily: `'${bookStore.fontFamily}'`,
          lineHeight: bookStore.lineHeight,
          // 'text-indent': bookStore.fontSize * 2 + 'px',
          'text-align': 'justify',
          color: bookStore.currTheme.color,
          backgroundColor: bookStore.currTheme.bgColor,
          textDecoration: bookStore.underline
            ? 'underline solid 0.5px'
            : 'none',
          textUnderlineOffset: bookStore.underline ? '6px' : 'none',
        }"
        v-if="readingContent"
      ></div>
      <div
        class="read-sidebar absolute right-[8px] bottom-[8px] flex flex-col gap-1 opacity-80 sm:opacity-100 hover:opacity-100"
      >
        <BookShelfButton
          :book="book"
          mode="square"
          :reading-chapter="readingChapter"
        ></BookShelfButton>
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
      :style="{ width: '300px', height: '100%' }"
    >
      <van-list>
        <van-cell
          v-for="item in book?.chapters"
          :key="item.id"
          :title="item.title"
          :class="{
            'bg-[--van-background] reading-chapter':
              readingChapter?.id === item.id,
          }"
          :icon="readingChapter?.id === item.id ? 'eye-o' : ''"
          clickable
          @click="
            () => {
              emit('toChapter', item);
              showChapters = false;
            }
          "
        />
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
        <van-cell class="bg-[#1f1f1f]">
          <template #title>
            <span class="text-white">字体大小</span>
          </template>
          <template #value>
            <van-stepper v-model="bookStore.fontSize" min="10" max="40" />
          </template>
        </van-cell>
        <van-cell class="bg-[#1f1f1f]">
          <template #title>
            <span class="text-white">行间距</span>
          </template>
          <template #value>
            <van-stepper
              v-model="bookStore.lineHeight"
              step="0.1"
              :decimal-length="1"
              min="0.5"
              max="3"
            />
          </template>
        </van-cell>
        <van-cell class="bg-[#1f1f1f]">
          <template #title>
            <span class="text-white">段间距</span>
          </template>
          <template #value>
            <van-stepper v-model="bookStore.readPGap" min="0" max="30" />
          </template>
        </van-cell>
        <van-cell class="bg-[#1f1f1f]">
          <template #title>
            <span class="text-white">左右边距</span>
          </template>
          <template #value>
            <van-stepper v-model="bookStore.paddingX" min="0" max="60" />
          </template>
        </van-cell>
        <van-cell class="bg-[#1f1f1f]">
          <template #title>
            <span class="text-white">下划线</span>
          </template>
          <template #value>
            <van-switch v-model="bookStore.underline" />
          </template>
        </van-cell>
        <div class="pb-2">文字颜色和背景</div>
        <div v-horizontal-scroll class="flex gap-2 overflow-x-auto">
          <div
            v-for="theme in bookStore.themes"
            :key="JSON.stringify(theme)"
            class="rounded-full text-center p-2 border-2 w-[40px] h-[40px] cursor-pointer shrink-0"
            :class="[
              theme.name === bookStore.currTheme.name
                ? 'border-[var(--van-primary-color)]'
                : 'border-white',
            ]"
            :style="{
              backgroundColor: theme.bgColor,
              color: theme.color,
              textDecoration: bookStore.underline
                ? 'underline solid 0.5px'
                : 'none',
              textUnderlineOffset: bookStore.underline ? '6px' : 'none',
            }"
            @click="bookStore.currTheme = theme"
          >
            文
          </div>
        </div>
      </div>
    </van-dialog>
    <BookShelf></BookShelf>
    <SwitchBookSourceDialog
      v-model:show="showSwitchSourceDialog"
      :search-result="allSourceResults || []"
      :book="book"
      @search="
        () => {
          if (book) {
            emit('searchAllSources', book);
          }
        }
      "
      @select="(item) => emit('switchSource', item)"
      v-if="book"
    ></SwitchBookSourceDialog>
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
