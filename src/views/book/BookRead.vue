<script setup lang="ts">
import type {
  BookChapter,
  BookItem,
} from '@wuji-tauri/source-extension';
import type { BookSource } from '@/types';
import { storeToRefs } from 'pinia';
import { keepScreenOn } from 'tauri-plugin-keep-screen-on-api';
import { showToast } from 'vant';
import { computed, onActivated, onDeactivated, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import MembershipCornerBadge from '@/components/badge/MembershipCornerBadge.vue';
import BookThemePicker from '@/components/book/BookThemePicker.vue';
import BookSwitchSourceDialog from '@/components/dialog/BookSwitchSource.vue';
import { useBookSwitchSource } from '@/hooks/useBookSwitchSource';
import { router } from '@/router';
import {
  useBookChapterStore,
  useBookShelfStore,
  useBookStore,
  useDisplayStore,
  useDownloadStore,
  useServerStore,
  useStore,
  useSubscribeSourceStore,
  useTTSStore,
} from '@/store';
import { useBackStore } from '@/store/backStore';
import { retryOnFalse, sleep } from '@/utils';
import {
  confirmSwitchSource,
  ensureBookSource,
  findBookItemById,
} from '@/utils/bookSourceAccess';
import { showMembershipBadge } from '@/utils/membershipBadge';
import { showVipDialog } from '@/utils/vip';
import BookReadScroller from './BookReadScroller.vue';

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
const downloadStore = useDownloadStore();
const subscribeStore = useSubscribeSourceStore();
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

const showReadModeSheet = ref(false);
interface ReadModeAction {
  name: string;
  value: 'slide' | 'scroll';
}

const readModeActions: ReadModeAction[] = [
  { name: '侧滑翻页', value: 'slide' },
  { name: '上下滚动', value: 'scroll' },
];

function onSelectReadMode(action: ReadModeAction) {
  bookStore.readMode = action.value;
  showReadModeSheet.value = false;
}

const serverStore = useServerStore();

interface FontOption {
  label: string;
  family: string;
  feature?: string;
}

function selectFont(font: FontOption) {
  if (font.feature && !serverStore.hasFeature(font.feature)) {
    showVipDialog('此字体VIP可用, 是否去开通会员？', 'VIP功能');
    return;
  }
  bookStore.fontFamily = font.family;
}

const bookInShelf = computed(() => {
  if (!book.value)
    return false;
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
          shelfStore.addToBookShelf(book.value, shelf.id);
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
    shelfStore.addToBookShelf(book.value);
  }
  else {
    showSelectShelf.value = true;
  }
}

/**
 * 实现切换源功能
 */
const {
  showSwitchSourceDialog,
  allSourceResults,
  searchAllSources,
  openSwitchSource,
  switchSource: navigateSwitchSource,
  isSearching,
  searchProgress,
} = useBookSwitchSource();
let isPromptingSwitchSource = false;

function openCurrentSwitchSource() {
  openSwitchSource(book.value);
}

async function offerSwitchSource(
  message = '当前源无法获取本章内容，是否换源搜索并继续阅读？',
  emptyToast = '章节内容加载失败',
) {
  if (!book.value) {
    showToast(emptyToast);
    return;
  }
  if (isPromptingSwitchSource || showSwitchSourceDialog.value)
    return;

  const hasOtherSources = store.bookSources.some(
    source => source.item.id !== book.value?.sourceId,
  );
  if (!hasOtherSources) {
    showToast(emptyToast);
    return;
  }

  isPromptingSwitchSource = true;
  try {
    if (!(await confirmSwitchSource(message)))
      return;
    openCurrentSwitchSource();
  }
  finally {
    isPromptingSwitchSource = false;
  }
}

async function switchSource(newBookItem: BookItem) {
  await navigateSwitchSource(newBookItem, {
    chapterId,
    readingChapter: readingChapter.value,
    originalChapters: book.value?.chapters,
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

  const [loaded, shelfReady] = await Promise.all([
    subscribeStore.waitForLoaded(),
    shelfStore.waitForReady(),
  ]);
  if (!loaded) {
    showToast('订阅源加载超时，请稍后重试');
    return false;
  }
  if (!shelfReady) {
    showToast('书架加载超时，请稍后重试');
    return false;
  }

  const ensured = await ensureBookSource(sourceId!);
  if (ensured.ok) {
    bookSource.value = ensured.source;
  }
  else {
    bookSource.value = undefined;
    book.value = findBookItemById(bookId);
    if (ensured.action === 'switch') {
      if (book.value) {
        openCurrentSwitchSource();
        return true;
      }
      showToast('无法换源：找不到书籍信息');
    }
    return false;
  }

  // 书架/历史优先，避免冷启动时仅依赖源内列表
  book.value
    = findBookItemById(bookId) || store.getBookItem(bookSource.value, bookId);

  if (!book.value) {
    return false;
  }
  return true;
});

/** 从书架/历史取与路由 chapterId 匹配的 lastReadChapter，供目录未就绪时兜底 */
function resolveLastReadChapterFallback(): BookChapter | undefined {
  for (const shelf of shelfStore.bookShelf) {
    for (const item of shelf.books) {
      if (item.book.id === bookId && item.lastReadChapter?.id === chapterId) {
        return item.lastReadChapter;
      }
    }
  }
  for (const history of shelfStore.bookHistory) {
    if (
      history.book.id === bookId
      && history.lastReadChapter?.id === chapterId
    ) {
      return history.lastReadChapter;
    }
  }
  return undefined;
}

/** 缓存未命中时网络拉取，失败则短间隔软重试 */
async function bookReadWithRetry(
  chapter: BookChapter,
  refresh = false,
): Promise<string> {
  const content
    = (await store.bookRead(bookSource.value!, book.value!, chapter, {
      refresh,
    })) || '';
  if (content || refresh)
    return content;

  for (let i = 0; i < 2; i++) {
    await sleep(800);
    const retry
      = (await store.bookRead(bookSource.value!, book.value!, chapter, {
        refresh: true,
        cacheMoreChapters: false,
      })) || '';
    if (retry)
      return retry;
  }
  return '';
}

async function loadAdjacentChapters(chapter: BookChapter) {
  const chapterIndex
    = book.value?.chapters?.findIndex(c => c.id === chapter.id) ?? -1;
  if (chapterIndex > 0) {
    const prevChapter = book.value!.chapters![chapterIndex - 1];
    prevChapterContent.value
      = (await store.bookRead(bookSource.value!, book.value!, prevChapter))
        || '';
  }
  else {
    prevChapterContent.value = '';
  }
  if (
    chapterIndex >= 0
    && chapterIndex < (book.value?.chapters?.length ?? 0) - 1
  ) {
    const nextChapter = book.value!.chapters![chapterIndex + 1];
    nextChapterContent.value
      = (await store.bookRead(bookSource.value!, book.value!, nextChapter))
        || '';
  }
  else {
    nextChapterContent.value = '';
  }
}

/** 目录缺失时后台补拉，已有缓存正文时失败不弹窗 */
async function ensureChaptersInBackground() {
  if (!book.value || !bookSource.value || book.value.chapters?.length)
    return;
  try {
    const ret = await store.bookDetail(bookSource.value, book.value, {
      silent: true,
    });
    if (ret) {
      Object.assign(book.value, ret);
      if (book.value.chapters?.length) {
        chapterList.value = book.value.chapters;
        if (readingChapter.value) {
          await loadAdjacentChapters(readingChapter.value);
        }
      }
    }
  }
  catch {
    // 后台补目录失败时保持已展示的缓存正文
  }
}

async function loadChapter(chapter?: BookChapter, refresh = false) {
  if (!book.value) {
    showToast('书籍不存在');
    backStore.back();
    return;
  }
  // 源不可用时已打开换源对话框，跳过章节加载
  if (!bookSource.value) {
    return;
  }
  // 如果当前已经在读这一章，且由于路由参数微调触发（URL 跟随滚动），则静默跳过
  if (!refresh && !chapter && readingChapter.value?.id === chapterId) {
    return;
  }

  if (!chapter) {
    chapter = book.value.chapters?.find(c => c.id === chapterId);
  }
  if (!chapter) {
    chapter = resolveLastReadChapterFallback();
  }

  const chapterStore = useBookChapterStore();

  // 缓存优先：有磁盘正文则先展示，目录可后台补
  if (chapter && !refresh) {
    const cached = await chapterStore.getBookChapter(book.value, chapter);
    if (cached) {
      readingChapter.value = chapter;
      readingChapterContent.value = cached;
      chapterList.value = book.value.chapters || [];
      shelfStore.updateBookReadInfo(book.value, chapter);
      if (!book.value.chapters?.length) {
        void ensureChaptersInBackground();
      }
      else {
        await loadAdjacentChapters(chapter);
      }
      return;
    }
  }

  if (!book.value.chapters?.length) {
    const ret = await store.bookDetail(bookSource.value, book.value, {
      silent: true,
    });
    if (ret) {
      Object.assign(book.value, ret);
    }
    if (!book.value.chapters?.length) {
      // 目录仍空：若有 lastRead 元数据，尝试直接拉正文
      if (chapter) {
        const displayStore = useDisplayStore();
        const t = displayStore.showToast();
        readingChapter.value = chapter;
        const content = await bookReadWithRetry(chapter, refresh);
        readingChapterContent.value = content;
        displayStore.closeToast(t);
        if (content) {
          shelfStore.updateBookReadInfo(book.value, chapter);
          void ensureChaptersInBackground();
          return;
        }
      }
      readingChapter.value
        = chapter || ({ id: chapterId, title: '' } as BookChapter);
      await offerSwitchSource(
        '获取章节列表失败，是否换源搜索并继续阅读？',
        '章节内容加载失败',
      );
      return;
    }
  }

  if (!chapter) {
    chapter = book.value.chapters?.find(c => c.id === chapterId);
  }
  if (!chapter) {
    showToast('章节不存在');
    backStore.back();
    return;
  }

  shelfStore.updateBookReadInfo(book.value, chapter);
  const displayStore = useDisplayStore();
  const t = displayStore.showToast();
  chapterList.value = book.value.chapters || [];
  readingChapter.value = chapter;
  const content = await bookReadWithRetry(chapter, refresh);
  readingChapterContent.value = content;
  displayStore.closeToast(t);
  if (!readingChapterContent.value) {
    await offerSwitchSource(
      '当前源无法获取本章内容，是否换源搜索并继续阅读？',
      '章节内容加载失败',
    );
    return;
  }

  await loadAdjacentChapters(chapter);
}

function prevChapter(toLast: boolean = false) {
  const index = chapterList.value.findIndex(
    chapter => chapter.id === readingChapter.value?.id,
  );
  if (index === -1) {
    return;
  }
  if (index > 0) {
    if (!toLast) {
      chapterList.value[index - 1].readingPage = undefined;
      chapterList.value[index - 1].readingParagraph = undefined;
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
    }
    else {
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
  }
  else {
    showToast('没有上一章了');
  }
}

function nextChapter() {
  const index = chapterList.value.findIndex(
    chapter => chapter.id === readingChapter.value?.id,
  );
  if (index === -1) {
    return;
  }
  if (index < chapterList.value.length - 1) {
    ttsStore.resetReadingPage();
    chapterList.value[index + 1].readingPage = undefined;
    chapterList.value[index + 1].readingParagraph = undefined;
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
    }
    else {
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
  }
  else {
    showToast('没有下一章了');
  }
}

async function resfreshChapter() {
  await loadChapter(undefined, true);
}

let lastRefreshChaptersTime = 0;
const REFRESH_INTERVAL = 2 * 1000;
let isRefreshingChapters = false;

async function refreshChapters() {
  if (!book.value || !bookSource.value || isRefreshingChapters)
    return;

  const now = Date.now();
  if (now - lastRefreshChaptersTime < REFRESH_INTERVAL) {
    return;
  }

  isRefreshingChapters = true;
  const t = displayStore.showToast();
  try {
    const oldCount = book.value.chapters?.length || 0;
    const ret = await store.bookDetail(bookSource.value, book.value, {
      silent: true,
    });
    if (ret) {
      ret.chapters ??= [];
      const newCount = ret.chapters.length;
      Object.assign(book.value, ret);

      chapterList.value = book.value.chapters || [];
      if (newCount > oldCount) {
        showToast(`已更新 ${newCount - oldCount} 个新章节`);
        nextChapter();
      }
      else {
        showToast('已是最新内容');
      }
      lastRefreshChaptersTime = Date.now();
    }
  }
  finally {
    isRefreshingChapters = false;
    displayStore.closeToast(t);
  }
}

/**
 * 按章节加载内容，不做路由跳转，供无限滚动模式使用
 */
async function loadChapterContent(chapter: BookChapter): Promise<string> {
  if (!bookSource.value || !book.value)
    return '';
  const content = await bookReadWithRetry(chapter);
  if (!content) {
    void offerSwitchSource(
      '当前源无法获取本章内容，是否换源搜索并继续阅读？',
      '章节内容加载失败',
    );
  }
  return content;
}
function toChapter(chapter: BookChapter) {
  chapter.readingPage = undefined;
  chapter.readingParagraph = undefined;

  router.replace({
    // name: 'BookRead',
    params: {
      chapterId: chapter.id,
      bookId: book.value?.id,
      sourceId: book.value?.sourceId,
    },
  });
}

async function onDownload() {
  if (book.value && bookSource.value) {
    if (!book.value.chapters?.length) {
      showToast('章节列表加载中，请稍后');
      return;
    }
    await downloadStore.startBookDownload(book.value, bookSource.value);
  }
}

function updateReadingPage(page: number) {
  if (readingChapter.value) {
    readingChapter.value.readingPage = page;
    if (book.value) {
      shelfStore.updateBookReadInfo(book.value, readingChapter.value);
    }
  }
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
watch(readingChapter, c => (bookStore.readingChapter = c), {
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
  <component
    :is="bookStore.readMode === 'slide' ? BookReadSwiper : BookReadScroller"
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
    :show-switch-source="openCurrentSwitchSource"
    :to-chapter="toChapter"
    :prev-chapter="prevChapter"
    :next-chapter="nextChapter"
    :refresh-chapter="resfreshChapter"
    :refresh-chapters="refreshChapters"
    :load-chapter-content="loadChapterContent"
    :on-download="onDownload"
    @update:reading-page="updateReadingPage"
  >
    <BookSwitchSourceDialog
      v-model:show="showSwitchSourceDialog"
      :book="book"
      :search-result="allSourceResults"
      :searching="isSearching"
      :search-progress="searchProgress"
      :current-chapter="readingChapter"
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
    <van-action-sheet
      v-model:show="showReadModeSheet"
      :actions="readModeActions"
      cancel-text="取消"
      title="选择翻页模式"
      teleport="body"
      @select="onSelectReadMode"
    />

    <van-dialog
      v-model:show="displayStore.showSettingDialog"
      title="阅读设置"
      close-on-click-overlay
      :show-confirm-button="false"
      class="setting-dialog"
    >
      <div class="flex flex-col gap-2 p-2 text-sm">
        <van-cell
          title="翻页模式"
          :value="bookStore.readMode === 'slide' ? '侧滑翻页' : '上下滚动'"
          is-link
          @click="showReadModeSheet = true"
        />
        <van-cell
          v-if="bookStore.readMode === 'slide'"
          title="全屏点击向下翻页"
          center
        >
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
                  }
                  else {
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
      <div class="flex max-h-[80vh] flex-col overflow-y-auto px-4 py-2 text-sm">
        <div class="pb-1 text-[var(--van-text-color-2)]">
          主题
        </div>
        <BookThemePicker />
        <div class="pb-1 text-[var(--van-text-color-2)]">
          字体
        </div>
        <div
          class="grid grid-cols-[repeat(auto-fill,minmax(46px,1fr))] gap-1 p-1"
        >
          <template v-for="font in webFonts" :key="font.family">
            <div
              class="relative flex h-[46px] w-[46px] shrink-0 cursor-pointer items-center justify-center rounded-lg border-2 text-center text-sm text-[--van-text-color]"
              :class="[
                font.family === bookStore.fontFamily
                  ? 'border-[var(--van-primary-color)]'
                  : 'border-[var(--van-border-color)]',
              ]"
              :style="{ fontFamily: font.family }"
              @click="selectFont(font)"
            >
              {{ font.label }}
              <MembershipCornerBadge v-if="showMembershipBadge(font.feature)" />
            </div>
          </template>
        </div>
        <div class="pb-1 pt-4 text-[var(--van-text-color-2)]">
          字体和样式
        </div>
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
  </component>
</template>

<style scoped lang="less">
:deep(.van-dialog__header) {
  padding-top: 8px;
}
</style>
