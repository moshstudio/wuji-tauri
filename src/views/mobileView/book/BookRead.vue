<script lang="ts" setup>
import type { BookChapter, BookItem } from '@/extensions/book';
import type { BookSource } from '@/types';
import type { LineData, ReaderResult } from '@/utils/reader/types';
import type { PropType } from 'vue';

import BookShelfButton from '@/components/BookShelfButton.vue';
import MobileBookTTSButton from '@/components/buttons/MobileBookTTSButton.vue';
import SwitchBookSourceDialog from '@/components/dialogs/SwitchBookSource.vue';
import {
  useBookChapterStore,
  useBookStore,
  useDisplayStore,
  useTTSStore,
} from '@/store';
import { Icon } from '@iconify/vue';
import { keepScreenOn } from 'tauri-plugin-keep-screen-on-api';
import { showToast } from 'vant';
import {
  computed,
  onActivated,
  onBeforeUnmount,
  reactive,
  ref,
  watch,
} from 'vue';

const emit = defineEmits<{
  (e: 'back', checkShelf?: boolean): void;
  (e: 'loadData'): void;
  (e: 'toChapter', chapter: BookChapter): void;
  (e: 'prevChapter', toLast?: boolean): void;
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
const chapterLists = defineModel('chapterList', {
  type: Array as PropType<BookChapter[]>,
});
const readingChapter = defineModel('readingChapter', {
  type: Object as PropType<BookChapter>,
});
const readingContent = defineModel('readingContent', {
  type: Array<{ content: string; index: number }>,
});
const readingPagedContent = defineModel('readingPagedContent', {
  type: Object as PropType<{ isPrev: boolean; content: ReaderResult }>,
});
const chapterPage = defineModel('chapterPage', {
  type: Number,
  required: true,
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
const allSourceResults = defineModel('allSourceResults', {
  type: Array as PropType<BookItem[]>,
});
const showSwitchSourceDialog = defineModel('showSwitchSourceDialog', {
  type: Boolean,
  required: true,
});

const displayStore = useDisplayStore();
const bookStore = useBookStore();
const bookCacheStore = useBookChapterStore();
const ttsStore = useTTSStore();

/** 显示菜单 */
const showMenu = ref(false);
const showReadSettingDialog = ref(false);

watch(
  showMenu,
  () => {
    displayStore.showTabBar = showMenu.value;
  },
  {
    immediate: true,
  },
);
onActivated(() => {
  displayStore.showTabBar = showMenu.value;
});

/** 页面过渡时间（毫秒） */
const slideTime = 260;
/** 有效拖拽时间（毫秒） */
const dragTime = 300;

/** touch 参数 */
const touchParams = reactive({
  /** 页面负偏移量（负数） */
  pageSlideValue: '-102%',
  /** 触摸位置 */
  touchPosition: 0,
  /** 触摸的位置Y */
  touchPositionY: 0,
  /** 触摸的时间 */
  touchTime: 0,
  /** 首次打开提示 */
  firstTip: false,
  /** 是否开始触摸 */
  startTouch: false,
  moveDistance: 0,
  moveTime: 0,
});

/** 滑动计时器 */
let slideTimer: NodeJS.Timeout | null;

const prevPageStyle = reactive({
  transform: '-102%',
  transition: '0s all',
  zIndex: 3,
});
const currPageStyle = reactive({
  transform: '0px',
  transition: '0s all',
  zIndex: 2,
});
const nextPageStyle = reactive({
  transform: '0px',
  transition: '0s all',
  zIndex: 1,
});

/** 最大章节数 */
const chapterMax = computed(() => chapterLists.value?.length || 0);
/** 章节位置（0开始） */
const chapterIndex = computed(
  () =>
    chapterLists.value?.findIndex(
      (item) => item.id === readingChapter.value?.id,
    ) || 0,
);

/** 页面内容列表 */
const prevPageContent = computed<LineData[]>(() => {
  if (!readingPagedContent.value) {
    return [
      {
        isTitle: false,
        center: true,
        pFirst: false,
        pLast: false,
        pIndex: 0,
        lineIndex: 0,
        textIndex: 0,
        text: '',
      },
    ];
  }
  if (chapterPage.value === 0) {
    const index = chapterLists.value?.findIndex(
      (item) => item.id === readingChapter.value?.id,
    );
    if (index && index > 0) {
      return [
        {
          isTitle: true,
          center: false,
          pFirst: false,
          pLast: true,
          pIndex: 0,
          lineIndex: 0,
          textIndex: 0,
          text: chapterLists.value?.[index - 1].title || '',
        },
      ];
    } else {
      return [
        {
          isTitle: false,
          center: true,
          pFirst: false,
          pLast: false,
          pIndex: 0,
          lineIndex: 0,
          textIndex: 0,
          text: '',
        },
      ];
    }
  } else {
    return readingPagedContent.value?.content[chapterPage.value - 1] || [];
  }
});
const currPageContent = computed<LineData[]>(() => {
  return readingPagedContent.value?.content[chapterPage.value] || [];
});
const nextPageContent = computed<LineData[]>(() => {
  if (!readingPagedContent.value) {
    return [
      {
        isTitle: false,
        center: true,
        pFirst: false,
        pLast: false,
        pIndex: 0,
        lineIndex: 0,
        textIndex: 0,
        text: '',
      },
    ];
  }
  if (chapterPage.value === readingPagedContent.value?.content.length - 1) {
    const index = chapterLists.value?.findIndex(
      (item) => item.id === readingChapter.value?.id,
    );
    if (index && index < chapterMax.value - 1) {
      return [
        {
          isTitle: true,
          center: false,
          pFirst: false,
          pLast: true,
          pIndex: 0,
          lineIndex: 0,
          textIndex: 0,
          text: chapterLists.value?.[index + 1].title || '',
        },
      ];
    } else {
      return [
        {
          isTitle: false,
          center: true,
          pFirst: false,
          pLast: false,
          pIndex: 0,
          lineIndex: 0,
          textIndex: 0,
          text: '',
        },
      ];
    }
  }
  return readingPagedContent.value?.content[chapterPage.value + 1] || [];
});

/** 是否为第一页 */
const isFirstPage = computed(
  () => chapterIndex.value === 0 && chapterPage.value === 0,
);
/** 是否否最后一页 */
const isLastPage = computed(
  () =>
    (chapterIndex.value === chapterMax.value - 1 &&
      chapterPage.value ===
        (readingPagedContent.value?.content.length || 0) - 1) ||
    false,
);

function goBack() {
  // uni.navigateBack();
  emit('back', true);
}

/**
 * 检查点击的位置
 * @returns 'left'|'middle'|'right'
 */
function checkTouchPosition(x: number, y: number) {
  const element = document.querySelector('#read-content');
  if (!element) {
    return 'middle';
  }
  const rect = element.getBoundingClientRect();
  const width = Math.floor(rect.width * 0.3);
  const height = Math.floor(rect.height * 0.3);
  if (x < width) {
    if (bookStore.fullScreenClickToNext) {
      return 'right';
    } else {
      return 'left';
    }
  }
  if (x >= rect.width - width) return 'right';
  if (y < height) {
    if (bookStore.fullScreenClickToNext) {
      return 'right';
    } else {
      return 'left';
    }
  }
  if (y >= rect.height - height) return 'right';
  return 'middle';
}

/** 重置页面（位置偏移） */
function resetPage() {
  prevPageStyle.transition = '0s all';
  prevPageStyle.transform = touchParams.pageSlideValue;

  currPageStyle.transition = '0s all';
  currPageStyle.transform = '0px';

  nextPageStyle.transition = '0s all';
  nextPageStyle.transform = '0px';
}

/** 切换到上一页 */
function pagePrev() {
  prevPageStyle.transition = `${slideTime}ms all`;
  prevPageStyle.transform = `0px`;

  currPageStyle.transition = `0s all`;
  currPageStyle.transform = `0px`;

  nextPageStyle.transition = `0s all`;
  nextPageStyle.transform = `0px`;

  slideTimer = setTimeout(() => {
    if (chapterPage.value > 0) {
      chapterPage.value--;
    } else {
      emit('prevChapter', true);
    }
    resetPage();
    clearTimeout(slideTimer!);
    slideTimer = null;
    if (ttsStore.isReading) {
      // 刷新阅读状态
      ttsStore.stop();
      // 前一页防止pIndex冲突
      ttsStore.slideReadingContent = undefined;
      emit('playTts');
    }
  }, slideTime);
}

/** 切换到下一页 */
function pageNext() {
  prevPageStyle.transition = '0s all';
  prevPageStyle.transform = touchParams.pageSlideValue;

  currPageStyle.transition = `${slideTime}ms all`;
  currPageStyle.transform = touchParams.pageSlideValue;

  nextPageStyle.transition = '0s all';
  nextPageStyle.transform = `0px`;

  slideTimer = setTimeout(() => {
    if (
      chapterPage.value ===
      (readingPagedContent.value?.content.length || 1) - 1
    ) {
      emit('nextChapter');
    } else {
      chapterPage.value++;
    }
    resetPage();
    clearTimeout(slideTimer!);
    slideTimer = null;
    if (ttsStore.isReading) {
      // 刷新阅读状态
      ttsStore.stop();
      emit('playTts');
    }
  }, slideTime);
}

function toChapterPage(page: number) {
  chapterPage.value = page;
  if (ttsStore.isReading) {
    // 刷新阅读状态
    console.log('to chapter page');
    ttsStore.stop();
    emit('playTts');
  }
}

function onTouchStart(e: TouchEvent) {
  // console.log('onTouchStart >>', e);
  if (slideTimer) return;
  touchParams.startTouch = true;
  const pageX = e.touches[0].pageX;
  touchParams.touchPosition = pageX;
  touchParams.touchPositionY = e.touches[0].pageY;
  touchParams.touchTime = Date.now();
}

function onTouchMove(e: TouchEvent) {
  if (!touchParams.startTouch) return;
  if (showMenu.value) return;
  const pageX = e.touches[0].pageX;
  const slide = pageX - touchParams.touchPosition;

  if (slide < 0) {
    currPageStyle.transition = '0s all';
    currPageStyle.transform = `${slide}px`;
  } else {
    prevPageStyle.transition = '0s all';
    prevPageStyle.transform = `calc(${touchParams.pageSlideValue} + ${slide}px)`;
  }
  // console.log("onTouchMove", slide);
}

function onTouchEnd(e: TouchEvent) {
  if (!touchParams.startTouch) return;
  touchParams.startTouch = false;
  if (showMenu.value) {
    showMenu.value = false;
    return;
  }
  const pageX = e.changedTouches[0].pageX;
  const pageY = e.changedTouches[0].pageY;
  const now = Date.now();
  const slideX = pageX - touchParams.touchPosition;

  /** 返回原来位置 */
  const backPosition = () => {
    prevPageStyle.transition = `${slideTime}ms all`;
    prevPageStyle.transform = touchParams.pageSlideValue;

    currPageStyle.transition = `${slideTime}ms all`;
    currPageStyle.transform = '0px';
  };
  // console.log("onTouchEnd", slideX);
  if (Math.abs(slideX) <= 10) {
    // 处理点击事件
    switch (checkTouchPosition(pageX, pageY)) {
      case 'left':
        if (isFirstPage.value) {
          showToast('没有上一页了');
        } else {
          pagePrev();
        }
        break;
      case 'right':
        if (isLastPage.value) {
          showToast('当前小说已完结');
        } else {
          pageNext();
        }
        break;
      case 'middle':
        showMenu.value = true;
        break;
    }
  } else {
    // console.log(now - touchTime, slideX, value);
    const threshold = 100;
    if (
      now - touchParams.touchTime < dragTime ||
      (now - touchParams.touchTime > dragTime && Math.abs(slideX) >= threshold)
    ) {
      if (slideX > 0) {
        // console.log("向右边滑动");
        if (isFirstPage.value) {
          showToast('没有上一页了');
          backPosition();
        } else {
          pagePrev();
        }
      } else {
        // console.log("向左边滑动");
        if (isLastPage.value) {
          showToast('当前小说已完结');
          backPosition();
        } else {
          pageNext();
        }
      }
    } else {
      // console.log("执行");
      // 重置当前页和上一页的回弹
      backPosition();
    }
  }
}

/** 上一章 */
function chapterPrev() {
  emit('prevChapter');
}

/** 下一章 */
function chapterNext() {
  if (chapterIndex.value === chapterMax.value)
    return showToast('当前小说已完结');
  emit('nextChapter');
}
onBeforeUnmount(() => {
  slideTimer && clearTimeout(slideTimer);
});
</script>

<template>
  <div
    id="read-content"
    class="select-none w-full h-screen fixed top-0 left-0 overflow-hidden box-border"
    :class="[showMenu ? '' : 'hide_menu']"
  >
    <!-- 顶部菜单 -->
    <div
      class="top_menu fixed left-0 top-0 z-[5] p-2 flex flex-col gap-2 w-full transition bg-[#1f1f1f]"
    >
      <div class="flex flex-nowrap items-center justify-between">
        <div class="flex flex-nowrap items-center">
          <van-icon
            name="arrow-left"
            color="white"
            size="22"
            @click="goBack()"
          />
          <span class="ml-2 text-sm text-white line-clamp-1">
            {{ book?.title }}
          </span>
        </div>
        <div class="options pr-2 flex gap-3 items-center">
          <van-icon
            name="replay"
            class="text-white van-haptics-feedback"
            @click="() => emit('refreshChapter')"
          />
          <van-icon
            name="exchange"
            class="text-white van-haptics-feedback"
            @click="() => (showSwitchSourceDialog = true)"
          />

          <BookShelfButton :book="book" :reading-chapter="readingChapter" />
        </div>
      </div>
      <div
        class="flex flex-nowrap items-center justify-between text-white text-xs"
      >
        <span v-if="readingChapter">{{ readingChapter?.title }}</span>
        <div
          v-if="bookSource"
          class="p-1 rounded bg-[var(--van-primary-color)] mr-2"
        >
          {{ bookSource?.item.name }}
        </div>
      </div>
    </div>

    <!-- 阅读内容页 -->
    <div
      class="content w-full h-full relative"
      :style="{
        backgroundColor: bookStore.currTheme.bgColor,
        color: bookStore.currTheme.color,
      }"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
    >
      <div
        v-for="({ style, content, pageNo }, index) in [
          {
            style: prevPageStyle,
            content: prevPageContent,
            pageNo: chapterPage + 1 > 1 ? chapterPage : '',
          },
          {
            style: currPageStyle,
            content: currPageContent,
            pageNo: readingPagedContent ? chapterPage + 1 : '1',
          },
          {
            style: nextPageStyle,
            content: nextPageContent,
            pageNo:
              readingPagedContent &&
              chapterPage + 1 < readingPagedContent.content.length
                ? chapterPage + 2
                : '',
          },
        ]"
        :key="`pageStyle${index}`"
        class="page w-full h-full box-border shadow absolute left-0 top-0 overflow-hidden flex flex-col"
        :style="{
          transition: style.transition,
          transform: `translate3d(${style.transform},0px,0px)`,
          'z-index': style.zIndex,
          paddingLeft: `${bookStore.paddingX}px`,
          paddingRight: `${bookStore.paddingX}px`,
          backgroundColor: bookStore.currTheme.bgColor,
          color: bookStore.currTheme.color,
          textDecoration: bookStore.underline
            ? 'underline solid 0.5px'
            : 'none',
          textUnderlineOffset: bookStore.underline ? '6px' : 'none',
        }"
      >
        <!-- 顶部状态占位 -->
        <div
          class="status_bar w-full"
          :style="{ height: `${bookStore.paddingTop}px` }"
        />
        <!-- 小说段落 -->
        <div class="grow">
          <template
            v-for="(line, index) of content"
            :key="JSON.stringify(line) + index"
          >
            <p
              :style="{
                'font-size': `${bookStore.fontSize * (line.isTitle ? 1.3 : 1)}px`,
                'font-family': `'${bookStore.fontFamily}'`,
                'line-height': line.isTitle
                  ? bookStore.lineHeight * 1.3
                  : bookStore.lineHeight,
                'text-indent': line.pFirst
                  ? `${bookStore.fontSize * (line.isTitle ? 1.3 : 1) * 2}px`
                  : '0px',
                'text-align': 'justify',
                'text-align-last': line.pLast ? 'auto' : 'justify',
                'padding-top':
                  !line.isTitle && line.pFirst
                    ? `${bookStore.readPGap}px`
                    : '0px',
                'padding-bottom':
                  line.isTitle && line.pLast
                    ? `${bookStore.readPGap * 1.3}px`
                    : '0px',
                backgroundColor:
                  ttsStore.isReading &&
                  ttsStore.slideReadingContent?.[0].pIndex === line.pIndex
                    ? 'rgba(128, 128, 128, 0.5)'
                    : '',
              }"
            >
              {{ line.text }}
            </p>
          </template>
        </div>

        <!-- 顶底部状态占位 -->
        <div
          class="bottom_bar flex items-center justify-between text-xs"
          :style="{ height: `${bookStore.paddingBottom}px` }"
        >
          <p class="truncate">
            {{ readingChapter?.title }}
          </p>
          <div class="flex flex-nowrap gap-1">
            <span>
              {{ pageNo }}/{{ readingPagedContent?.content.length || 1 }}
            </span>
            <span v-if="chapterLists">
              {{
                (
                  ((chapterLists.findIndex(
                    (chapter) => chapter.id === readingChapter?.id,
                  ) || 0) /
                    chapterLists.length) *
                  100
                ).toFixed(1)
              }}%
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部菜单 -->
    <div
      class="bottom fixed bottom-0 left-0 z-[6] w-full flex flex-col p-2 pb-[50px] bg-[#1f1f1f] text-white transition"
    >
      <div class="flex items-center gap-2">
        <div
          class="shrink-0 text-nowrap text-sm van-haptics-feedback px-2"
          @click="chapterPrev"
        >
          上一章
        </div>
        <van-slider
          v-model="chapterPage"
          class="w-[calc(100%-120px)]"
          :button-size="16"
          :max="
            readingPagedContent ? readingPagedContent.content.length - 1 : 0
          "
          @change="(val) => toChapterPage(val)"
        />
        <div
          class="shrink-0 text-nowrap text-sm van-haptics-feedback px-2"
          @click="chapterNext"
        >
          下一章
        </div>
      </div>
      <div class="w-full flex gap-1 items-center justify-between text-sm">
        <div
          class="flex flex-col gap-1 items-center van-haptics-feedback p-2"
          @click="() => emit('openChapterPopup')"
        >
          <Icon icon="tabler:list" width="20" height="20" />
          章节
        </div>
        <MobileBookTTSButton
          :reading-paged-content="readingPagedContent?.content || [[]]"
          :onPlay="() => emit('playTts')"
        ></MobileBookTTSButton>
        <div
          class="flex flex-col gap-1 items-center van-haptics-feedback p-2"
          @click="() => (showSettingDialog = true)"
        >
          <Icon icon="ci:font" width="20" height="20" />
          界面
        </div>
        <div
          class="flex flex-col gap-1 items-center van-haptics-feedback p-2"
          @click="() => (showReadSettingDialog = true)"
        >
          <Icon icon="tabler:settings" width="20" height="20" />
          设置
        </div>
      </div>
    </div>
    <van-popup
      v-model:show="showChapters"
      position="left"
      :style="{
        width: '70%',
        height: 'calc(100% - 50px)',
        top: 'calc(50% - 25px)',
        backgroundColor: '#1f1f1f',
      }"
      class="scrollbar scrollbar-thumb-gray-400/60 scrollbar-track-transparent"
    >
      <van-list>
        <template v-for="item in book?.chapters" :key="item.id">
          <div
            class="flex justify-start items-center text-sm gap-2 p-2 flex-nowrap select-none van-haptics-feedback"
            :class="{
              'bg-black reading-chapter': readingChapter?.id === item.id,
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
                  : 'text-[#f5f5f5]'
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
        <div v-horizontal-scroll class="flex gap-2 py-2 overflow-x-auto">
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
    <van-dialog
      v-model:show="showReadSettingDialog"
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

<style lang="scss" scoped>
/* 菜单显示隐藏 */
.hide_menu {
  .top_menu {
    transform: translateY(-100%);
  }
  .bottom {
    transform: translateY(100%);
  }
}
</style>
