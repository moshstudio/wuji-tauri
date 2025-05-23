<script setup lang="ts">
import type { BookChapter, BookItem } from '@/extensions/book';

import type { BookSource } from '@/types';
import type { ReaderResult } from '@/utils/reader/types';
import type { PropType } from 'vue';
import BookShelfButton from '@/components/BookShelfButton.vue';
import SwitchBookSourceDialog from '@/components/dialogs/SwitchBookSource.vue';
import WinBookTTSButton from '@/components/buttons/WinBookTTSButton.vue';
import NavBar from '@/components/NavBar.vue';
import { useBookChapterStore, useBookStore, useTTSStore } from '@/store';
import BookShelf from '@/views/book/BookShelf.vue';
import { Icon } from '@iconify/vue';
import { useScroll } from '@vueuse/core';
import { onActivated, onDeactivated, onMounted } from 'vue';

const emit = defineEmits<{
  (e: 'back', checkShelf?: boolean): void;
  (e: 'loadData'): void;
  (e: 'toChapter', chapter: BookChapter): void;
  (e: 'prevChapter'): void;
  (e: 'nextChapter'): void;
  (e: 'refreshChapter'): void;
  (e: 'openChapterPopup'): void;
  (e: 'searchAllSources', targetBook: BookItem): void;
  (e: 'switchSource', newBookItem: BookItem): void;
  (e: 'playTts'): void;
}>();
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
  type: Array<{ content: string; index: number }>,
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

const bookStore = useBookStore();
const bookCacheStore = useBookChapterStore();
const ttsStore = useTTSStore();

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
    class="w-full h-full flex flex-col items-center overflow-hidden"
    :style="{
      backgroundColor: bookStore.currTheme.bgColor,
      color: bookStore.currTheme.color,
    }"
  >
    <div class="relative grow w-full h-full overflow-hidden">
      <NavBar
        v-model:show="showNavBar"
        left-arrow
        class="absolute w-full h-[70px]"
        target="#read-content"
        @click-left="() => emit('back', true)"
      >
        <template #title>
          <div class="flex flex-col gap-2 items-center truncate">
            <span class="text-xl">{{ readingChapter?.title }}</span>
            <div class="flex gap-2">
              <span class="text-xs text-[--van-text-color-2]">
                <van-icon name="orders-o" />
                {{ book?.title }}
              </span>
              <span class="text-xs text-[--van-text-color-2]">
                <van-icon name="user-o" />
                {{ book?.author }}
              </span>
              <span
                v-if="readingContent?.length"
                class="text-xs text-[--van-text-color-2]"
              >
                <van-icon name="points" />
                {{
                  readingContent?.map((line) => line.content).join('\n').length
                }}
                字
              </span>
              <span v-if="bookSource" class="text-xs text-[--van-text-color-2]">
                <van-icon name="flag-o" />
                {{ bookSource?.item.name }}
              </span>
              <van-icon
                name="exchange"
                class="text-[--van-text-color-2] van-haptics-feedback"
                @click="() => (showSwitchSourceDialog = true)"
              />
              <van-icon
                name="replay"
                class="text-[--van-text-color-2] van-haptics-feedback"
                @click="() => emit('refreshChapter')"
              />
            </div>
          </div>
        </template>
      </NavBar>
      <div
        class="scroll-container flex flex-col items-center w-full h-full overflow-y-auto"
      >
        <div
          v-if="readingContent"
          v-remember-scroll
          id="read-content"
          class="pt-[80px] relative overflow-y-auto p-4 text-justify leading-[1.8] text-[--van-text-color] min-w-[400px] w-[95%] sm:w-[90%] md:w-[75%] lg:w-[60%]"
          :style="{
            fontSize: `${bookStore.fontSize}px`,
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
        >
          <p
            v-for="line in readingContent"
            :key="line.index"
            :class="`index-${line.index}`"
            :style="{
              marginTop: `${bookStore.readPGap}px`,
              backgroundColor:
                ttsStore.isReading &&
                ttsStore.scrollReadingContent?.index === line.index
                  ? 'rgba(128, 128, 128, 0.5)'
                  : '',
            }"
          >
            {{ line.content }}
          </p>
        </div>
        <div
          class="read-sidebar absolute right-[8px] bottom-[8px] flex flex-col gap-1 opacity-80 sm:opacity-100 hover:opacity-100"
        >
          <WinBookTTSButton
            :reading-content="readingContent || []"
            :onPlay="() => emit('playTts')"
          />
          <BookShelfButton
            :book="book"
            mode="square"
            :reading-chapter="readingChapter"
          />
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
        </div>
      </div>
      <BookShelf />
    </div>

    <van-popup
      v-model:show="showChapters"
      position="right"
      class="chapter-popup"
      :style="{ width: '300px', height: '100%' }"
      @wheel.stop
    >
      <van-list>
        <template v-for="item in book?.chapters" :key="item.id">
          <div
            class="flex justify-start items-center text-sm text-[--van-text-color-2] gap-2 p-2 flex-nowrap select-none van-haptics-feedback"
            :class="{
              'bg-[--van-background] reading-chapter':
                readingChapter?.id === item.id,
            }"
            @click="
              () => {
                emit('toChapter', item);
                showChapters = false;
              }
            "
          >
            <Icon
              v-if="readingChapter?.id === item.id"
              icon="iconamoon:eye-thin"
              width="24"
              height="24"
              color="var(--van-primary-color)"
            />
            <span
              class="flex-grow text-left overflow-hidden text-nowrap text-ellipsis"
              :class="
                readingChapter?.id === item.id
                  ? 'text-[var(--van-primary-color)]'
                  : 'text-[var(--van-text-color)]'
              "
            >
              {{ item.title }}
            </span>
            <Icon
              v-if="book && bookCacheStore.chapterInCache(book, item)"
              icon="material-symbols-light:download-done-rounded"
              width="20"
              height="20"
              class="text-gray-400"
            />
          </div>
        </template>
      </van-list>
    </van-popup>
    <van-dialog
      v-model:show="showSettingDialog"
      title="界面设置"
      close-on-click-overlay
      :show-confirm-button="false"
      class="setting-dialog"
      @wheel.stop
    >
      <div class="flex flex-col p-2 text-sm">
        <div class="pb-2 text-gray-400">字体和样式</div>
        <van-cell title="字体大小">
          <template #value>
            <van-stepper v-model="bookStore.fontSize" min="10" max="40" />
          </template>
        </van-cell>
        <van-cell title="行间距">
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
        <van-cell title="段间距">
          <template #value>
            <van-stepper v-model="bookStore.readPGap" min="0" max="30" />
          </template>
        </van-cell>
        <van-cell title="左右边距">
          <template #value>
            <van-stepper v-model="bookStore.paddingX" min="0" max="60" />
          </template>
        </van-cell>
        <van-cell title="下划线">
          <template #value>
            <van-switch v-model="bookStore.underline" />
          </template>
        </van-cell>
        <div class="pb-2 text-gray-400">文字颜色和背景</div>
        <div
          v-horizontal-scroll
          class="flex gap-2 py-2 overflow-x-auto"
          @wheel.stop
        >
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
    <SwitchBookSourceDialog
      v-if="book"
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
    />
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
