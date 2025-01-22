<script setup lang="ts">
import { BookChapter, BookItem } from '@/extensions/book';

import { useDisplayStore } from '@/store';
import { BookSource } from '@/types';
import BookShelfButton from '@/components/BookShelfButton.vue';
import BookShelf from '@/views/book/BookShelf.vue';
import NavBar from '@/components/NavBar.vue';
import { PropType } from 'vue';

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
const readingContent = defineModel('readingContent', {
  type: String,
});
const showBookShelf = defineModel('showBookShelf', {
  type: Boolean,
  required: true,
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

const emit = defineEmits<{
  (e: 'back', checkShelf?: boolean): void;
  (e: 'loadData'): void;
  (e: 'loadChapter', chapter: BookChapter): void;
  (e: 'prevChapter'): void;
  (e: 'nextChapter'): void;
  (e: 'openChapterPopup'): void;
}>();

const displayStore = useDisplayStore();
</script>

<template>
  <div
    class="relative flex flex-col w-full h-full overflow-hidden items-center"
    :style="{ backgroundColor: displayStore.readBgColor }"
  >
    <NavBar
      v-model:show="showNavBar"
      left-arrow
      @click-left="() => emit('back', true)"
      class="absolute w-full h-[70px]"
      target="#content"
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
          </div>
        </div>
      </template>
    </NavBar>
    <div
      class="scroll-container flex h-full overflow-y-auto min-w-[400px] w-[95%] sm:w-[90%] md:w-[75%] lg:w-[60%] bg-gray-50/50 dark:bg-gray-950/50"
    >
      <div
        id="content"
        class="pt-[80px] relative overflow-y-auto p-4 text-justify leading-[1.8] text-[--van-text-color]"
        :style="{ fontSize: displayStore.readFontSize + 'px' }"
        v-if="readingContent"
      ></div>
      <div
        class="read-sidebar absolute right-[8px] bottom-[8px] flex flex-col gap-1 opacity-0 sm:opacity-100 hover:opacity-100"
      >
        <BookShelfButton
          :book="book"
          mode="square"
          @show-shelf="showBookShelf = true"
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
          plain
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
              emit('loadChapter', item);
              showChapters = false;
            }
          "
        />
      </van-list>
    </van-popup>
    <van-dialog
      v-model:show="showSettingDialog"
      title="阅读设置"
      width="350px"
      closeOnClickOverlay
      class="setting-dialog"
    >
      <van-cell-group>
        <van-cell>
          <template #title>
            <p class="w-[60px]">背景色</p>
          </template>
          <template #value>
            <div class="grow flex gap-2">
              <div
                class="h-[30px] w-[30px] rounded-full cursor-pointer border flex justify-center items-center"
                :style="{ backgroundColor: color }"
                v-for="color in [
                  '',
                  '#ebe5d8',
                  '#cfe1cf',
                  '#e3d0a1',
                  '#040a17',
                  '#200e20',
                  '#0c1f4e',
                ]"
                :key="color"
                @click="displayStore.readBgColor = color"
              >
                <van-icon
                  name="success"
                  class="text-[--van-text-color]"
                  v-if="displayStore.readBgColor === color"
                />
              </div>
            </div>
          </template>
        </van-cell>
        <van-cell>
          <template #title>
            <p class="w-[60px]">文本大小</p>
          </template>
          <template #value>
            <van-stepper
              v-model="displayStore.readFontSize"
              step="1"
              min="10"
              max="50"
            />
          </template>
        </van-cell>
      </van-cell-group>
    </van-dialog>
    <BookShelf v-model:show="showBookShelf"></BookShelf>
  </div>
</template>

<style scoped lang="less">
.read-sidebar {
  :deep(.van-button__content) {
    flex-direction: column;
  }
}
#content > :is(p) {
  margin-top: 0.8em;
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
