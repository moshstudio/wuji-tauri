<script setup lang="ts">
import type {
  BookChapter,
  BookItem,
  BookList,
} from '@wuji-tauri/source-extension';
import type { BookSource } from '@/types';
import _, { template } from 'lodash';
import { storeToRefs } from 'pinia';
import { keepScreenOn } from 'tauri-plugin-keep-screen-on-api';
import { showFailToast, showToast, showDialog } from 'vant';
import {
  computed,
  nextTick,
  onActivated,
  onDeactivated,
  ref,
  watch,
} from 'vue';
import { useRoute } from 'vue-router';
import BookSwitchSourceDialog from '@/components/dialog/BookSwitchSource.vue';
import { router } from '@/router';
import {
  useBookShelfStore,
  useBookStore,
  useDisplayStore,
  useServerStore,
  useStore,
  useTTSStore,
} from '@/store';
import { useBackStore } from '@/store/backStore';
import { retryOnFalse } from '@/utils';
import { createCancellableFunction } from '@/utils/cancelableFunction';
import BookReadSwiper from './BookReadSwiper.vue';

const {
  chapterId,
  bookId,
  sourceId,
  isPrev = 'false',
} = defineProps<{
  chapterId: string;
  bookId: string;
  sourceId: string;
  isPrev?: string;
}>();

const isPrevBool = computed(() => isPrev === 'true');

const store = useStore();
const backStore = useBackStore();
const displayStore = useDisplayStore();
const bookStore = useBookStore();
const shelfStore = useBookShelfStore();
const ttsStore = useTTSStore();
const { webFonts } = storeToRefs(bookStore);
const { bookShelf } = storeToRefs(shelfStore);
const route = useRoute();

const bookSource = ref<BookSource>();
const book = ref<BookItem>();
const chapterList = ref<BookChapter[]>([]);
const readingChapter = ref<BookChapter>();
const readingChapterContent = ref<string>();
const prevChapterContent = ref<string>();
const nextChapterContent = ref<string>();
const showBookShelf = ref(false);

const serverStore = useServerStore();

type FontOption = { label: string; family: string };

function selectFont(font: FontOption) {
  if (!serverStore.isVipOrSuperVip) {
    showDialog({
      title: 'VIP功能',
      message: '此字体VIP可用, 是否去开通会员？',
      showCancelButton: true,
    }).then(() => {
      router.push({ name: 'VipDetail' });
    });
    return;
  }
  bookStore.fontFamily = font.family;
}

const bookInShelf = computed(() => {
  if (!book.value) return false;
  for (const item of bookShelf.value) {
    for (const book of item.books) {
      if (book.book.id === bookId) {
        return true;
      }
    }
  }
  return false;
});

const showSelectShelf = ref(false);
const selectShelfActions = computed(() => {
  return shelfStore.bookShelf.map((shelf) => {
    return {
      name: shelf.name,
      subname: `${shelf.books.length || 0} 本书`,
      callback: () => {
        if (book.value) {
          shelfStore.addToBookSelf(book.value, shelf.id);
          showSelectShelf.value = false;
        }
      },
    };
  });
});

function addToShelf() {
  if (!book.value) {
    return;
  }
  if (shelfStore.bookShelf.length === 1) {
    shelfStore.addToBookSelf(book.value);
  } else {
    showSelectShelf.value = true;
  }
}

/**
 * 实现切换源功能
 */
const showSwitchSourceDialog = ref(false);
const allSourceResults = ref<BookItem[]>([]);

const searchAllSources = createCancellableFunction(
  async (signal: AbortSignal, targetBook?: BookItem) => {
    allSourceResults.value = [];
    if (!targetBook) return;
    await Promise.all(
      store.bookSources.map(async (bookSource) => {
        await store.bookSearch(bookSource, targetBook.title);
        if (signal.aborted) return;
        if (bookSource.list) {
          for (const b of _.castArray<BookList>(bookSource.list)[0].list) {
            if (b.title === targetBook.title) {
              if (signal.aborted) return;
              const detailedBook = await store.bookDetail(bookSource, b);
              if (detailedBook) {
                allSourceResults.value.push(detailedBook);
                return;
              }
            }
          }
        }
      }),
    );
  },
);

async function switchSource(newBookItem: BookItem) {
  if (!readingChapter.value) {
    showToast('请重新加载章节');
    return;
  }
  if (!newBookItem.chapters) {
    showToast('章节为空');
    return;
  }
  const chapter =
    newBookItem.chapters?.find((chapter) => chapter.id === chapterId) ||
    newBookItem.chapters?.find(
      (chapter) => chapter.title === readingChapter.value?.title,
    ) ||
    newBookItem.chapters?.[
      book.value?.chapters?.findIndex((chapter) => chapter.id === chapterId) ||
        0
    ];

  if (!chapter) {
    showToast('章节不存在');
    return;
  }

  chapter.readingPage = readingChapter.value.readingPage;

  showSwitchSourceDialog.value = false;

  router.push({
    // name: 'BookRead',
    params: {
      chapterId: chapter.id,
      bookId: newBookItem.id,
      sourceId: newBookItem.sourceId,
      isPrev: 'false',
    },
  });
}

const loadData = retryOnFalse({ onFailed: backStore.back })(async () => {
  book.value = undefined;
  chapterList.value = [];
  readingChapter.value = undefined;
  readingChapterContent.value = undefined;
  prevChapterContent.value = undefined;
  nextChapterContent.value = undefined;
  if (!bookId || !sourceId || !chapterId) {
    return false;
  }

  bookSource.value = store.getBookSource(sourceId!);
  if (!bookSource.value) {
    showToast('源不存在或未启用');
    return false;
  }

  book.value = store.getBookItem(bookSource.value, bookId);

  if (!book.value) {
    return false;
  }
  return true;
});

async function loadChapter(chapter?: BookChapter, refresh = false) {
  if (!book.value) {
    showToast('书籍不存在');
    backStore.back();
    return;
  }
  if (!book.value.chapters?.length) {
    if (!bookSource.value) {
      showFailToast('源不存在或未启用');
      return;
    }
    const ret = await store.bookDetail(bookSource.value, book.value);
    if (ret) {
      Object.assign(book.value, ret);
    }
  }
  if (!chapter) {
    chapter = book.value.chapters?.find((chapter) => chapter.id === chapterId);
  }
  if (!chapter) {
    showToast('章节不存在');
    backStore.back();
    return;
  }
  const chapterIndex = book.value.chapters?.findIndex(
    (chapter) => chapter.id === chapterId,
  );
  shelfStore.updateBookReadInfo(book.value, chapter);
  const displayStore = useDisplayStore();
  const t = displayStore.showToast();
  chapterList.value = book.value.chapters || [];
  readingChapter.value = chapter;
  const content =
    (await store.bookRead(bookSource.value!, book.value, chapter, {
      refresh,
    })) || '';
  readingChapterContent.value = content;
  displayStore.closeToast(t);
  if (!readingChapterContent.value) {
    showToast('本章内容为空');
  }

  // 载入上一章和下一章
  if (chapterIndex && chapterIndex > 0) {
    const prevChapter = book.value.chapters![chapterIndex - 1];
    prevChapterContent.value =
      (await store.bookRead(bookSource.value!, book.value, prevChapter)) || '';
  } else {
    prevChapterContent.value = '';
  }
  if (chapterIndex && chapterIndex < book.value.chapters!.length - 1) {
    const nextChapter = book.value.chapters![chapterIndex + 1];
    nextChapterContent.value =
      (await store.bookRead(bookSource.value!, book.value, nextChapter)) || '';
  } else {
    nextChapterContent.value = '';
  }
}

function prevChapter(toLast: boolean = false) {
  const index = chapterList.value.findIndex(
    (chapter) => chapter.id === readingChapter.value?.id,
  );
  if (index === -1) {
    return;
  }
  if (index > 0) {
    if (!toLast) {
      chapterList.value[index - 1].readingPage = undefined;
    }
    ttsStore.resetReadingPage();
    if (route.name === 'BookRead') {
      router.replace({
        params: {
          chapterId: chapterList.value[index - 1].id,
          bookId: book.value?.id,
          sourceId: book.value?.sourceId,
          isPrev: toLast ? 'true' : '',
        },
      });
    } else {
      const currPath = route.path;
      router
        .replace({
          name: 'BookRead',
          params: {
            chapterId: chapterList.value[index - 1].id,
            bookId: book.value?.id,
            sourceId: book.value?.sourceId,
            isPrev: toLast ? 'true' : '',
          },
        })
        .then(() => {
          router.replace(currPath);
        });
    }
  } else {
    showToast('没有上一章了');
  }
}

function nextChapter() {
  const index = chapterList.value.findIndex(
    (chapter) => chapter.id === readingChapter.value?.id,
  );
  if (index === -1) {
    return;
  }
  if (index < chapterList.value.length - 1) {
    ttsStore.resetReadingPage();
    chapterList.value[index + 1].readingPage = undefined;
    const newBookReadParams = {
      chapterId: chapterList.value[index + 1].id,
      bookId: book.value?.id,
      sourceId: book.value?.sourceId,
      isPrev: 'false',
    };
    if (route.name === 'BookRead') {
      router.replace({
        params: newBookReadParams,
      });
    } else {
      const currPath = {
        name: route.name,
        params: route.params,
      };
      router
        .replace({
          name: 'BookRead',
          params: newBookReadParams,
        })
        .then(() => {
          router.replace(currPath);
        });
    }
  } else {
    showToast('没有下一章了');
  }
}

async function resfreshChapter() {
  await loadChapter(undefined, true);
}
function toChapter(chapter: BookChapter) {
  chapter.readingPage = undefined;

  router.replace({
    // name: 'BookRead',
    params: {
      chapterId: chapter.id,
      bookId: book.value?.id,
      sourceId: book.value?.sourceId,
    },
  });
}
function openChapterPopup() {
  displayStore.showChapters = true;
  nextTick(() => {
    document
      .querySelector('.reading-chapter')
      ?.scrollIntoView({ block: 'center', behavior: 'instant' });
  });
}

watch(
  [() => chapterId, () => bookId, () => sourceId],
  async () => {
    await loadData();
    await loadChapter();
  },
  { immediate: true },
);

watch(
  book,
  (b) => {
    bookStore.readingBook = b;
    allSourceResults.value = [];
  },
  { immediate: true },
);
watch(readingChapter, (c) => (bookStore.readingChapter = c), {
  immediate: true,
});

onActivated(() => {
  if (displayStore.isAndroid && displayStore.bookKeepScreenOn) {
    keepScreenOn(true);
  }
  if (ttsStore.isReading) {
    if (!displayStore.isAppView && ttsStore.scrollReadingContent) {
      document
        .querySelector(
          `#read-content .index-${ttsStore.scrollReadingContent.index}`,
        )
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }
});
onDeactivated(() => {
  if (displayStore.isAndroid && displayStore.bookKeepScreenOn) {
    keepScreenOn(false);
  }
});
</script>

<template>
  <BookReadSwiper
    :book="book"
    :book-source="bookSource"
    :chapter-list="chapterList"
    :is-prev="isPrevBool"
    :chapter="readingChapter"
    :chapter-content="readingChapterContent"
    :prev-chapter-content="prevChapterContent"
    :next-chapter-content="nextChapterContent"
    :all-source-results="allSourceResults"
    :full-screen-click-to-next="bookStore.fullScreenClickToNext"
    :in-shelf="bookInShelf"
    :add-to-shelf="addToShelf"
    :show-view-setting="() => (displayStore.showViewSettingDialog = true)"
    :show-setting="() => (displayStore.showSettingDialog = true)"
    :show-switch-source="
      () => {
        showSwitchSourceDialog = true;
        searchAllSources(book);
      }
    "
    :to-chapter="toChapter"
    :prev-chapter="prevChapter"
    :next-chapter="nextChapter"
    :refresh-chapter="resfreshChapter"
  >
    <BookSwitchSourceDialog
      v-model:show="showSwitchSourceDialog"
      :book="book"
      :search-result="allSourceResults"
      :search="searchAllSources"
      :select="switchSource"
    />
    <van-action-sheet
      v-model:show="showSelectShelf"
      :actions="selectShelfActions"
      cancel-text="取消"
      title="选择书架"
      teleport="body"
    />

    <van-dialog
      v-model:show="displayStore.showSettingDialog"
      title="阅读设置"
      close-on-click-overlay
      :show-confirm-button="false"
      class="setting-dialog"
    >
      <div class="flex flex-col gap-2 p-2 text-sm">
        <van-cell title="全屏点击向下翻页">
          <template #value>
            <van-switch v-model="bookStore.fullScreenClickToNext" />
          </template>
        </van-cell>
        <van-cell v-if="displayStore.isAndroid" title="保持屏幕常亮">
          <template #value>
            <van-switch
              v-model="displayStore.bookKeepScreenOn"
              @change="
                (v) => {
                  displayStore.bookKeepScreenOn = v;
                  if (v) {
                    keepScreenOn(true);
                  } else {
                    keepScreenOn(false);
                  }
                }
              "
            />
          </template>
        </van-cell>
      </div>
    </van-dialog>
    <van-dialog
      v-model:show="displayStore.showViewSettingDialog"
      title="界面设置"
      width="min(100%, 480px)"
      close-on-click-overlay
      :show-confirm-button="false"
      class="setting-dialog"
    >
      <div class="flex max-h-[80vh] flex-col overflow-y-auto p-2 text-sm">
        <div class="pb-1 text-gray-400">文字颜色和背景</div>
        <div
          class="grid grid-cols-[repeat(auto-fill,minmax(46px,1fr))] gap-1 p-2"
        >
          <div
            v-for="theme in bookStore.themes"
            :key="JSON.stringify(theme)"
            class="flex h-[46px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 text-center text-[10px]"
            :class="[
              theme.name === bookStore.currTheme.name
                ? 'border-[var(--van-primary-color)]'
                : 'border-gray-300',
            ]"
            :style="{
              color: theme.color || '#333',
              backgroundColor: theme.bgColor || '#fff',
              backgroundImage:
                theme.bgGradient ||
                (theme.bgImage ? `url(${theme.bgImage})` : ''),
              backgroundRepeat: theme.bgRepeat || 'repeat',
              backgroundSize: theme.bgSize || 'auto',
              backgroundPosition: theme.bgPosition || 'center',
              textShadow: theme.textShadow,
              boxShadow: theme.boxShadow,
              ...(theme.customStyle || {}),
            }"
            @click="bookStore.currTheme = theme"
          >
            <span class="font-medium">{{ theme.name }}</span>
          </div>
        </div>
        <div class="pb-1 text-gray-400">字体</div>
        <div
          class="grid grid-cols-[repeat(auto-fill,minmax(46px,1fr))] gap-1 p-1"
        >
          <template v-for="font in webFonts" :key="font.family">
            <van-badge color="#1989fa" :offset="[-8, 0]">
              <template #content v-if="font.isVip">
                <van-icon name="diamond" class="badge-icon" />
              </template>
              <div
                class="flex h-[46px] w-[46px] shrink-0 cursor-pointer items-center justify-center rounded-lg border-2 text-center text-sm text-[--van-text-color]"
                :class="[
                  font.family === bookStore.fontFamily
                    ? 'border-[var(--van-primary-color)]'
                    : 'border-gray-300',
                ]"
                :style="{ fontFamily: font.family }"
                @click="selectFont(font)"
              >
                {{ font.label }}
              </div>
            </van-badge>
          </template>
        </div>
        <div class="pb-1 pt-4 text-gray-400">字体和样式</div>
        <van-cell-group>
          <van-cell title="字体大小" center>
            <template #value>
              <van-stepper v-model="bookStore.fontSize" min="10" max="40" />
            </template>
          </van-cell>
          <van-cell title="字体粗细" center>
            <template #value>
              <van-stepper
                v-model="bookStore.fontWeight"
                min="400"
                max="600"
                step="200"
              />
            </template>
          </van-cell>
          <van-cell title="行间距" center>
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
          <van-cell title="段间距" center>
            <template #value>
              <van-stepper v-model="bookStore.readPGap" min="0" max="30" />
            </template>
          </van-cell>
          <van-cell title="左右边距" center>
            <template #value>
              <van-stepper v-model="bookStore.paddingX" min="0" max="60" />
            </template>
          </van-cell>
          <van-cell title="下划线" center>
            <template #value>
              <van-switch v-model="bookStore.underline" />
            </template>
          </van-cell>
        </van-cell-group>
      </div>
    </van-dialog>
  </BookReadSwiper>
</template>

<style scoped lang="less">
.badge-icon {
  display: block;
  font-size: 10px;
  line-height: 16px;
}
:deep(.van-dialog__header) {
  padding-top: 8px;
}
</style>
