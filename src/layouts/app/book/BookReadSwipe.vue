<script lang="ts" setup>
import type { BookChapter, BookItem } from '@wuji-tauri/source-extension';
import type { Swiper as SwiperType } from 'swiper/types';
import type { BookSource } from '@/types';
import type { LineData, ReaderResult } from '@/utils/reader/types';
import { Icon } from '@iconify/vue';
import { storeToRefs } from 'pinia';
import { Swiper, SwiperSlide } from 'swiper/vue';
import { showToast } from 'vant';
import { computed, nextTick, onActivated, ref, watch } from 'vue';
import AddShelfButton from '@/components/button/AddShelfButton.vue';
import MBookTTSButton from '@/components/button/MBookTTSButton.vue';
import { router } from '@/router';
import {
  useBookChapterStore,
  useBookStore,
  useDisplayStore,
  useTTSStore,
} from '@/store';
import { useBackStore } from '@/store/backStore';
import 'swiper/css';

const props = withDefaults(
  defineProps<{
    book?: BookItem;
    bookSource?: BookSource;
    chapterList?: BookChapter[];
    readingChapter?: BookChapter;
    readingContent?: ReaderResult;
    prevChapterContent?: ReaderResult;
    nextChapterContent?: ReaderResult;
    fullScreenClickToNext: boolean;
    inShelf: boolean;
    addToShelf: () => void;
    showViewSetting: () => void;
    showSetting: () => void;
    showSwitchSource: () => void;
    toChapter: (chapter: BookChapter) => void;
    prevChapter: (toLast?: boolean) => void;
    nextChapter: () => void;
    refreshChapter: () => void;
    playTts: () => void;
  }>(),
  {},
);
const readingPageIndex = defineModel<number>('readingPageIndex', {
  required: true,
});
const backStore = useBackStore();
const displayStore = useDisplayStore();
const bookStore = useBookStore();
const bookCacheStore = useBookChapterStore();
const ttsStore = useTTSStore();
const { showTabBar, showChapters: isShowChapterList } =
  storeToRefs(displayStore);

const element = ref<HTMLElement>();
const swiperElement = ref<SwiperType>();
/** 显示菜单 */
const showMenu = ref(false);

/** 最大章节数 */
const chapterCount = computed(() => props.chapterList?.length || 0);
/** 章节位置（0开始） */
const readingChapterIndex = computed(
  () =>
    props.chapterList?.findIndex(
      (item) => item.id === props.readingChapter?.id,
    ) || 0,
);

/** 页面内容列表 */
const prevPageContent = computed<LineData[]>(() => {
  if (!props.readingContent) {
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
  if (readingPageIndex.value === 0) {
    if (readingChapterIndex.value > 0) {
      if (props.prevChapterContent?.length) {
        return props.prevChapterContent[props.prevChapterContent.length - 1];
      } else {
        return [
          {
            isTitle: true,
            center: false,
            pFirst: false,
            pLast: true,
            pIndex: 0,
            lineIndex: 0,
            textIndex: 0,
            text:
              props.chapterList?.[readingChapterIndex.value - 1].title || '',
          },
        ];
      }
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
    return props.readingContent?.[readingPageIndex.value - 1] || [];
  }
});
const currPageContent = computed<LineData[]>(() => {
  nextTick(() => {
    if (
      props.readingContent &&
      readingPageIndex.value >= props.readingContent.length &&
      props.readingContent.length > 0
    ) {
      readingPageIndex.value = props.readingContent.length - 1;
    }
  });
  return props.readingContent?.[readingPageIndex.value] || [];
});
const nextPageContent = computed<LineData[]>(() => {
  if (!props.readingContent) {
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
  if (readingPageIndex.value === props.readingContent.length - 1) {
    // 最后一页
    if (readingChapterIndex.value < chapterCount.value - 1) {
      if (props.nextChapterContent?.length) {
        return props.nextChapterContent[0];
      } else {
        return [
          {
            isTitle: true,
            center: false,
            pFirst: false,
            pLast: true,
            pIndex: 0,
            lineIndex: 0,
            textIndex: 0,
            text:
              props.chapterList?.[readingChapterIndex.value + 1].title || '',
          },
        ];
      }
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
    return props.readingContent?.[readingPageIndex.value + 1] || [];
  }
});

const pages = computed(() => {
  return [
    readingPageIndex.value <= 0
      ? {
          content: prevPageContent.value,
          title: props.chapterList?.[readingChapterIndex.value - 1]?.title,
          pageNo: props.prevChapterContent?.length || '',
          totalPage: props.prevChapterContent?.length || '',
        }
      : {
          content: prevPageContent.value,
          title: props.readingChapter?.title,
          pageNo: readingPageIndex.value,
          totalPage: props.readingContent?.length || '',
        },
    {
      content: currPageContent.value,
      title: props.readingChapter?.title,
      pageNo: readingPageIndex.value + 1,
      totalPage: props.readingContent?.length || '',
    },
    props.readingContent &&
    readingPageIndex.value < props.readingContent.length - 1
      ? {
          content: nextPageContent.value,
          title: props.readingChapter?.title,
          pageNo: readingPageIndex.value + 2,
          totalPage: props.readingContent?.length || '',
        }
      : {
          content: nextPageContent.value,
          title: props.chapterList?.[readingChapterIndex.value + 1]?.title,
          pageNo: 1,
          totalPage: props.nextChapterContent?.length || '',
        },
  ];
});

/** 是否为第一页 */
const isFirstPage = computed(
  () => readingChapterIndex.value === 0 && readingPageIndex.value === 0,
);
/** 是否为最后一页 */
const isLastPage = computed(
  () =>
    (readingChapterIndex.value === chapterCount.value - 1 &&
      readingPageIndex.value === (props.readingContent?.length || 0) - 1) ||
    false,
);
const sliderToPageValue = computed({
  get() {
    return readingPageIndex.value + 1;
  },
  set(v) {
    if (v > 0) {
      readingPageIndex.value = v - 1;
      if (ttsStore.isReading) {
        // 刷新阅读状态
        ttsStore.stop();
        props.playTts();
      }
    }
  },
});

/** 切换到上一页 */
function pagePrev() {
  if (!props.readingContent) {
    return;
  }
  swiperElement.value?.slideTo(0, 200);
}

/** 切换到下一页 */
function pageNext() {
  if (!props.readingContent) {
    return;
  }
  swiperElement.value?.slideTo(2, 200);
}

defineExpose({
  pagePrev,
  pageNext,
  toggleMenu: () => {
    showMenu.value = !showMenu.value;
  },
});

function toChapterPage(page: number) {
  readingPageIndex.value = page;
  if (ttsStore.isReading) {
    // 刷新阅读状态
    ttsStore.stop();
    props.playTts();
  }
}

function onClickPage(
  swiper: SwiperType,
  e: PointerEvent | MouseEvent | TouchEvent,
) {
  if (showMenu.value) {
    showMenu.value = false;
    return;
  }
  if (!element.value) return;
  const rect = element.value.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  // 计算点击位置相对于元素的坐标
  const x =
    e instanceof TouchEvent
      ? (e.touches[0]?.clientX || e.changedTouches[0]?.clientX || 0) - rect.left
      : e.clientX - rect.left;
  const y =
    e instanceof TouchEvent
      ? (e.touches[0]?.clientY || e.changedTouches[0]?.clientY || 0) - rect.top
      : e.clientY - rect.top;

  // 定义区域阈值（例如20%的边缘区域）
  const threshold = 0.315;
  const xThreshold = width * threshold;
  const yThreshold = height * threshold;

  let zone: 'center' | 'left' | 'right' | 'top' | 'bottom' = 'center';

  // 判断点击区域
  if (x < xThreshold) {
    zone = 'left';
  } else if (x > width - xThreshold) {
    zone = 'right';
  } else if (y < yThreshold) {
    zone = 'top';
  } else if (y > height - yThreshold) {
    zone = 'bottom';
  }
  switch (zone) {
    case 'left':
    case 'top':
      if (props.fullScreenClickToNext) {
        pageNext();
      } else {
        pagePrev();
      }
      break;
    case 'right':
    case 'bottom':
      pageNext();
      break;
    case 'center':
      showMenu.value = true;
      break;
  }
}
function handlePageChange(swiper: SwiperType) {
  if (swiper.activeIndex === 2) {
    // 下一页
    if (!props.readingContent) return;
    if (readingPageIndex.value >= props.readingContent.length - 1) {
      if (isLastPage.value) {
        showToast('没有更多内容了');
        swiperElement.value?.slideTo(1, 200, false);
      } else {
        props.nextChapter();
        swiperElement.value?.slideTo(1, 0, false);
      }
    } else {
      readingPageIndex.value++;
      swiperElement.value?.slideTo(1, 0, false);
      if (ttsStore.isReading) {
        // 刷新阅读状态
        ttsStore.stop();
        props.playTts();
      }
    }
  } else if (swiper.activeIndex === 0) {
    // 上一页
    if (readingPageIndex.value === 0) {
      if (isFirstPage.value) {
        showToast('已经是第一页了');
        swiperElement.value?.slideTo(1, 200, false);
      } else {
        props.prevChapter(true);
        swiperElement.value?.slideTo(1, 0, false);
      }
    } else {
      readingPageIndex.value--;
      swiperElement.value?.slideTo(1, 0, false);
      if (ttsStore.isReading) {
        // 刷新阅读状态
        ttsStore.stop();
        // 前一页防止pIndex冲突
        ttsStore.slideReadingContent = undefined;
        props.playTts();
      }
    }
  }
}

async function showChapterList() {
  isShowChapterList.value = true;
  await nextTick();
  document.querySelector('.reading-chapter')?.scrollIntoView({
    block: 'center',
    behavior: 'instant',
  });
}

const computedStyle = computed(() => {
  const baseStyle = {
    paddingLeft: `${bookStore.paddingX}px`,
    paddingRight: `${bookStore.paddingX}px`,
    color: bookStore.currTheme.color || '#333',
    backgroundColor: bookStore.currTheme.bgColor || '#fff',
    backgroundImage:
      bookStore.currTheme.bgGradient || bookStore.currTheme.bgImage || '',
    backgroundRepeat: bookStore.currTheme.bgRepeat || 'repeat',
    backgroundSize: bookStore.currTheme.bgSize || 'auto',
    backgroundPosition: bookStore.currTheme.bgPosition || '0 0',
    backgroundAttachment: bookStore.currTheme.bgAttachment,
    backgroundBlendMode: bookStore.currTheme.bgBlendMode,
    textShadow: bookStore.currTheme.textShadow,
    boxShadow: bookStore.currTheme.boxShadow,
    border: bookStore.currTheme.border,
    textDecoration: bookStore.underline ? 'underline solid 0.5px' : 'none',
  };

  // 安全地合并 customStyle
  if (bookStore.currTheme.customStyle) {
    return { ...baseStyle, ...bookStore.currTheme.customStyle };
  }

  return baseStyle;
});

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
</script>

<template>
  <div
    id="read-content"
    ref="element"
    class="fixed box-border flex h-screen w-screen min-w-0 flex-shrink-0 select-none flex-col overflow-hidden"
    :class="[showMenu ? '' : 'hide_menu']"
  >
    <!-- 顶部菜单 -->
    <transition
      enter-active-class="transition-all duration-100 ease-out"
      enter-from-class="opacity-0 transform -translate-y-full"
      enter-to-class="opacity-100 transform translate-y-0"
      leave-active-class="transition-all duration-100 ease-in"
      leave-from-class="opacity-100 transform translate-y-0"
      leave-to-class="opacity-0 transform -translate-y-full"
    >
      <div
        v-show="showMenu"
        class="top_menu absolute left-0 top-0 z-[5] flex w-full flex-col gap-2 bg-[var(--van-background)] p-2 shadow transition"
      >
        <div class="flex flex-nowrap items-center justify-between">
          <div class="flex flex-nowrap items-center">
            <van-icon
              name="arrow-left"
              color="var(--van-text-color)"
              size="22"
              class="van-haptics-feedback p-1"
              @click="backStore.back"
            />
            <span
              class="ml-2 line-clamp-1 text-sm text-[var(--van-text-color)]"
            >
              {{ book?.title }}
            </span>
          </div>
          <div class="options flex items-center gap-3 pr-2">
            <van-icon
              name="replay"
              class="van-haptics-feedback text-[var(--van-text-color)]"
              @click="() => refreshChapter()"
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
              :added-click="() => router.push({ name: 'BookShelf' })"
            />
          </div>
        </div>
        <div
          class="flex flex-nowrap items-center justify-between text-xs text-[var(--van-text-color)]"
        >
          <span v-if="readingChapter">{{ readingChapter?.title }}</span>
          <div
            v-if="bookSource"
            class="mr-2 rounded p-1 text-[var(--van-primary-color)]"
          >
            {{ bookSource?.item.name }}
          </div>
        </div>
      </div>
    </transition>

    <!-- 阅读内容页 -->
    <Swiper
      class="h-full w-full flex-grow"
      :grab-cursor="true"
      :centered-slides="true"
      slides-per-view="auto"
      :initial-slide="1"
      @swiper="(swiper) => (swiperElement = swiper)"
      @slide-change-transition-end="handlePageChange"
      @click="onClickPage"
    >
      <SwiperSlide
        v-for="({ content, title, pageNo, totalPage }, slideIndex) in pages"
        :key="`slide_${slideIndex}`"
      >
        <div
          class="flex h-full w-full flex-col overflow-hidden underline-offset-[6px]"
          :style="computedStyle"
        >
          <!-- 顶部状态占位 -->
          <div
            class="status_bar w-full"
            :style="{ height: `${bookStore.paddingTop}px` }"
          />
          <!-- 小说段落 -->
          <div
            class="flex min-h-0 w-full flex-grow flex-col items-center"
            :class="pageNo === totalPage ? 'justify-start' : 'justify-around'"
          >
            <p
              v-for="(line, pIndex) of content"
              :key="`p_${slideIndex}_${pIndex}`"
              class="w-full overflow-hidden"
              :style="{
                'font-size': `${bookStore.fontSize * (line.isTitle ? 1.3 : 1)}px`,
                'font-weight': line.isTitle
                  ? Math.min(bookStore.fontWeight + 200, 900)
                  : bookStore.fontWeight,
                'font-family': bookStore.fontFamily,
                'line-height': line.isTitle
                  ? bookStore.lineHeight * 1.3
                  : bookStore.lineHeight,
                'text-indent': line.pFirst
                  ? `${(line.isTitle ? 1.3 : 1) * 2}em`
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
                borderRadius:
                  ttsStore.isReading &&
                  ttsStore.slideReadingContent?.[0].pIndex === line.pIndex
                    ? '0px'
                    : '',
                backgroundColor:
                  ttsStore.isReading &&
                  ttsStore.slideReadingContent?.[0].pIndex === line.pIndex
                    ? 'rgba(255, 165, 0, 0.3)'
                    : '',
                whiteSpace: 'nowrap',
              }"
            >
              {{ line.text }}
            </p>
          </div>

          <!-- 顶底部状态占位 -->
          <div
            class="bottom_bar flex flex-shrink-0 items-center justify-between text-xs"
            :style="{ height: `${bookStore.paddingBottom}px` }"
          >
            <p class="truncate">
              {{ title }}
            </p>
            <div class="flex flex-nowrap gap-1">
              <span>{{ pageNo }}/{{ totalPage }}</span>
              <span>
                {{
                  (
                    ((chapterList?.findIndex(
                      (chapter) => chapter.id === readingChapter?.id,
                    ) || 0) /
                      (chapterList?.length || 1)) *
                    100
                  ).toFixed(1)
                }}%
              </span>
            </div>
          </div>
        </div>
      </SwiperSlide>
    </Swiper>

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
        class="bottom-menu up-shadow absolute bottom-0 left-0 z-[6] flex w-full flex-col bg-[var(--van-background)] p-2 pb-[50px] text-[var(--van-text-color)] transition"
      >
        <div class="flex items-center gap-2">
          <div
            class="van-haptics-feedback shrink-0 text-nowrap px-2 text-sm"
            @click="() => prevChapter()"
          >
            上一章
          </div>
          <van-slider
            v-model="sliderToPageValue"
            class="w-[calc(100%-120px)]"
            :button-size="16"
            :min="1"
            :step="1"
            :max="readingContent ? readingContent.length : 1"
          />
          <div
            class="van-haptics-feedback shrink-0 text-nowrap px-2 text-sm"
            @click="nextChapter"
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
          <MBookTTSButton
            :reading-paged-content="readingContent || [[]]"
            :on-play="playTts"
          />
          <div
            class="van-haptics-feedback flex flex-col items-center gap-1 p-2"
            @click="showViewSetting"
          >
            <Icon icon="ci:font" width="20" height="20" />
            界面
          </div>
          <div
            class="van-haptics-feedback flex flex-col items-center gap-1 p-2"
            @click="showSetting"
          >
            <Icon icon="tabler:settings" width="20" height="20" />
            设置
          </div>
        </div>
      </div>
    </transition>

    <van-popup
      v-model:show="isShowChapterList"
      teleport="body"
      position="left"
      :style="{
        height: '100%',
        maxWidth: '70%',
        backgroundColor: 'var(--van-background)',
      }"
      class="scrollbar scrollbar-track-transparent scrollbar-thumb-gray-400/60"
    >
      <van-list>
        <template v-for="item in book?.chapters" :key="item.id">
          <div
            class="van-haptics-feedback flex select-none flex-nowrap items-center justify-start gap-2 p-2 text-sm"
            :class="{
              'reading-chapter': readingChapter?.id === item.id,
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
              v-if="readingChapter?.id === item.id"
              icon="iconamoon:eye-thin"
              width="24"
              height="24"
              color="var(--van-primary-color)"
            />
            <span
              class="flex-grow overflow-hidden text-ellipsis text-nowrap text-left"
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
  </div>
</template>

<style lang="less" scoped></style>
