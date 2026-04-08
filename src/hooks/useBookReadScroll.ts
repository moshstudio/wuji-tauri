import { ref, computed, watch, nextTick, onMounted, onUnmounted, onBeforeUnmount, onActivated, onDeactivated } from 'vue';
import type { BookChapter, BookItem, BookChapterList as ChapterList } from '@wuji-tauri/source-extension';
import { useBookStore, useTTSStore, useBookShelfStore } from '@/store';
import { router } from '@/router';
import { useBookTTS } from '@/hooks/useBookTTS';
import _ from 'lodash';

export interface LoadedChapter {
  chapter: BookChapter;
  content: string;
  paragraphs: string[];
}

export function buildParagraphs(title: string | undefined, content: string): string[] {
  if (!content) return [];
  let hasTitle = false;
  const pList = content
    .split(/\n|\r\n/)
    .map((p, i) => {
      const trimmed = p.trim();
      if (i === 0 && trimmed === title) {
        hasTitle = true;
        return p;
      }
      return p.replace(/\s+/g, '');
    })
    .filter((p) => p !== '');

  if (!hasTitle && title) {
    pList.unshift(title);
  }
  if (title && pList[1] === title.replace(/\s+/g, '')) {
    pList.splice(1, 1);
  }
  return pList;
}

export interface UseBookReadScrollOptions {
  book: () => BookItem | undefined;
  chapterList: () => ChapterList | undefined;
  chapter: () => BookChapter | undefined;
  chapterContent: () => string | undefined;
  loadChapterContent: (chapter: BookChapter) => Promise<string>;
  nextChapter: () => void;
  toChapter: (chapter: BookChapter) => void;
}

export function useBookReadScroll(options: UseBookReadScrollOptions) {
  const bookStore = useBookStore();
  const ttsStore = useTTSStore();
  const shelfStore = useBookShelfStore();

  const loadedChapters = ref<LoadedChapter[]>([]);
  const activeChapterId = ref<string>();
  const isLoadingNext = ref(false);
  const isLoadingPrev = ref(false);
  const noMoreNext = ref(false);
  const noMorePrev = ref(false);
  const MAX_LOADED_CHAPTERS = 7;

  const showMenu = ref(false);
  const scrollContainer = ref<HTMLElement | null>(null);
  const isRecovering = ref(false);
  let lastInternalChapterId = '';

  // ── 章节索引辅助 ──
  function getChapterIndex(chapter: BookChapter): number {
    return options.chapterList()?.findIndex((c) => c.id === chapter.id) ?? -1;
  }

  function getNextChapterMeta(chapter: BookChapter): BookChapter | undefined {
    const idx = getChapterIndex(chapter);
    if (idx < 0 || !options.chapterList()) return undefined;
    return options.chapterList()![idx + 1];
  }

  function getPrevChapterMeta(chapter: BookChapter): BookChapter | undefined {
    const idx = getChapterIndex(chapter);
    if (idx <= 0 || !options.chapterList()) return undefined;
    return options.chapterList()![idx - 1];
  }

  // ── TTS 集成 ──
  const ttsActiveChapterId = ref<string>();

  const ttsChapter = computed(() => {
    // 优先使用听书活动章节，如果没设置则跟随当前活动的可见章节
    const id = ttsActiveChapterId.value || activeChapterId.value;
    return loadedChapters.value.find((c) => c.chapter.id === id);
  });

  const { currentPIndex, playTTS: originalPlayTTS } = useBookTTS({
    title: () => ttsChapter.value?.chapter.title,
    chapterContent: () => ttsChapter.value?.content,
    chapterId: () => ttsChapter.value?.chapter.id,
    nextChapter: () => {
      if (!ttsChapter.value) return;
      const nextMeta = getNextChapterMeta(ttsChapter.value.chapter);
      if (nextMeta) {
        const isLoaded = loadedChapters.value.find((c) => c.chapter.id === nextMeta.id);
        if (isLoaded) {
          // 如果下一章已经加载了，直接切换追踪 ID，useBookTTS 会因为 chapterContent 变化而自动开始读新章
          ttsActiveChapterId.value = nextMeta.id;
          return;
        }
      }
      // 否则调用外部的翻页逻辑（通常是路由跳转）
      options.nextChapter();
    },
  });

  const playTTS = () => {
    if (!ttsActiveChapterId.value && activeChapterId.value) {
      ttsActiveChapterId.value = activeChapterId.value;
      // 首次开始听书时，从当前可见的段落开始
      const startP = getCurrentParagraphIndex(activeChapterId.value);
      if (startP !== -1) {
        currentPIndex.value = startP;
      }
    }
    originalPlayTTS();
  };

  watch(currentPIndex, (newIndex) => {
    if (ttsStore.isReading) {
      const chId = ttsActiveChapterId.value || activeChapterId.value;
      // 使用属性选择器以安全处理包含特殊字符（如 / 或 .）的章节 ID
      const el = document.querySelector(`[data-chapter-id="${chId}"] [data-p-index="${newIndex}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  });

  // 当听书停止时，清空追踪 ID，以便下次从当前可见位置重新开始
  watch(
    () => ttsStore.isReading,
    (reading) => {
      if (!reading) {
        ttsActiveChapterId.value = undefined;
      }
    },
  );

  const activeChapterTitle = computed(() => {
    const lc = loadedChapters.value.find((c) => c.chapter.id === activeChapterId.value);
    return lc?.chapter.title || options.chapter()?.title;
  });

  const getCurrentParagraphIndex = (chapterId: string): number => {
    const container = scrollContainer.value;
    if (!container) return -1;
    const chapterWrapper = container.querySelector(`[data-chapter-id="${chapterId}"]`);
    if (!chapterWrapper) return -1;

    const paragraphs = chapterWrapper.querySelectorAll('p');
    const containerRect = container.getBoundingClientRect();
    if (containerRect.height === 0 || containerRect.width === 0) return -1;

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      const rect = p.getBoundingClientRect();
      if (rect.bottom > containerRect.top) return i;
    }
    return 0;
  };

  const forceSaveProgress = () => {
    if (isRecovering.value) return;
    const currentBook = options.book();
    if (activeChapterId.value && currentBook) {
      const chapter = options.chapterList()?.find((c) => c.id === activeChapterId.value);
      if (chapter) {
        const pIndex = getCurrentParagraphIndex(activeChapterId.value);
        if (pIndex !== -1) {
          chapter.readingParagraph = pIndex;
          shelfStore.updateBookReadInfo(currentBook, chapter);
        }
      }
    }
  };

  const debouncedSaveProgress = _.debounce(forceSaveProgress, 500);

  // ── 章节切换与路由同步 ──
  const syncRouteToActiveChapter = (chapterId: string) => {
    if (chapterId && chapterId !== lastInternalChapterId) {
      lastInternalChapterId = chapterId;
      router.replace({
        params: {
          ...router.currentRoute.value.params,
          chapterId: chapterId,
        },
      });
      forceSaveProgress();
    }
  };

  const updateActiveChapter = () => {
    const container = scrollContainer.value;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const wrappers = container.querySelectorAll('.chapter-wrapper');
    const targetY = containerRect.top + containerRect.height * 0.3;

    // 听书状态下的特殊逻辑：优先跟随听书进度
    if (ttsStore.isReading && ttsActiveChapterId.value) {
      const ttsId = ttsActiveChapterId.value;
      const ttsEl = container.querySelector(`[data-chapter-id="${ttsId}"]`) as HTMLElement;
      if (ttsEl) {
        const rect = ttsEl.getBoundingClientRect();
        // 只要听书章节在视口内可见，就将其设为活动章节，防止与滚动同步逻辑产生冲突（打架）
        if (rect.bottom > containerRect.top && rect.top < containerRect.bottom) {
          if (ttsId !== activeChapterId.value) {
            activeChapterId.value = ttsId;
            syncRouteToActiveChapter(ttsId);
          }
          return;
        }
      }
    }

    for (let i = 0; i < wrappers.length; i++) {
      const el = wrappers[i] as HTMLElement;
      const rect = el.getBoundingClientRect();
      if (rect.top <= targetY && rect.bottom >= targetY) {
        const chId = el.dataset.chapterId;
        if (chId && chId !== activeChapterId.value) {
          activeChapterId.value = chId;
          syncRouteToActiveChapter(chId);
        }
        break;
      }
    }
  };

  // ── 加载逻辑 ──
  async function loadNextChapter() {
    if (isLoadingNext.value || noMoreNext.value) return;
    const last = loadedChapters.value[loadedChapters.value.length - 1];
    if (!last) return;
    const nextCh = getNextChapterMeta(last.chapter);
    if (!nextCh) {
      noMoreNext.value = true;
      return;
    }

    isLoadingNext.value = true;
    try {
      const content = await options.loadChapterContent(nextCh);
      loadedChapters.value.push({
        chapter: nextCh,
        content,
        paragraphs: buildParagraphs(nextCh.title, content),
      });
      if (!getNextChapterMeta(nextCh)) noMoreNext.value = true;

      await nextTick();

      // 智能修剪：确保不修剪掉当前正在阅读的章节
      if (loadedChapters.value.length > MAX_LOADED_CHAPTERS) {
        const activeIdx = loadedChapters.value.findIndex(c => c.chapter.id === activeChapterId.value);
        const scrollEl = scrollContainer.value;

        if (activeIdx < MAX_LOADED_CHAPTERS / 2) {
          // 活跃章节在前半段，从尾部修剪
          while (loadedChapters.value.length > MAX_LOADED_CHAPTERS) {
            loadedChapters.value.pop();
            noMoreNext.value = false;
          }
        } else if (scrollEl) {
          // 从头部修剪，并补偿滚动位置
          const prevScrollHeight = scrollEl.scrollHeight;
          let trimmed = false;
          while (loadedChapters.value.length > MAX_LOADED_CHAPTERS) {
            loadedChapters.value.shift();
            noMorePrev.value = false;
            trimmed = true;
          }
          if (trimmed) {
            await nextTick();
            const newScrollHeight = scrollEl.scrollHeight;
            scrollEl.scrollTop -= (prevScrollHeight - newScrollHeight);
          }
        }
      }
    } finally {
      isLoadingNext.value = false;
    }
  }

  async function loadPrevChapter() {
    if (isLoadingPrev.value || noMorePrev.value) return;
    const first = loadedChapters.value[0];
    if (!first) return;
    const prevCh = getPrevChapterMeta(first.chapter);
    if (!prevCh) {
      noMorePrev.value = true;
      return;
    }

    isLoadingPrev.value = true;
    try {
      const content = await options.loadChapterContent(prevCh);
      const scrollEl = scrollContainer.value!;
      const prevScrollHeight = scrollEl.scrollHeight;

      loadedChapters.value.unshift({
        chapter: prevCh,
        content,
        paragraphs: buildParagraphs(prevCh.title, content),
      });

      if (!getPrevChapterMeta(prevCh)) noMorePrev.value = true;

      // 补偿 scrollTop，在补偿完成前锁定避免 updateActiveChapter 误判
      isRecovering.value = true;
      await nextTick();
      const newScrollHeight = scrollEl.scrollHeight;
      scrollEl.scrollTop += newScrollHeight - prevScrollHeight;

      // 等待浏览器完成布局后释放锁
      setTimeout(() => {
        isRecovering.value = false;
      }, 80);

      if (loadedChapters.value.length > MAX_LOADED_CHAPTERS) {
        // 确保 activeChapterId 所在的章节不被修剪
        while (loadedChapters.value.length > MAX_LOADED_CHAPTERS) {
          if (loadedChapters.value[loadedChapters.value.length - 1].chapter.id !== activeChapterId.value) {
            loadedChapters.value.pop();
            noMoreNext.value = false;
          } else {
            break;
          }
        }
      }
    } finally {
      isLoadingPrev.value = false;
    }
  }

  // ── 初始化监听 ──
  watch(
    [options.chapter, options.chapterContent],
    ([ch, content]) => {
      if (ch && content !== undefined && content !== null) {
        if (ch.id === lastInternalChapterId) return;

        // 如果目标章节已经在已加载列表中，说明只是正常的滚动同步，不需要销毁缓冲区重置
        const isAlreadyLoaded = loadedChapters.value.some(lc => lc.chapter.id === ch.id);
        const needReset = !isAlreadyLoaded || 
                         loadedChapters.value.length === 0 || 
                         (loadedChapters.value.length === 1 && loadedChapters.value[0].content !== content);

        if (needReset) {
          forceSaveProgress();
          loadedChapters.value = [
            {
              chapter: ch,
              content: content || '',
              paragraphs: buildParagraphs(ch.title, content || ''),
            },
          ];
          activeChapterId.value = ch.id;
          lastInternalChapterId = ch.id;
          noMoreNext.value = false;
          noMorePrev.value = false;

          const idx = getChapterIndex(ch);
          if (idx === 0) noMorePrev.value = true;
          if (idx === (options.chapterList()?.length ?? 1) - 1) noMoreNext.value = true;

          isRecovering.value = true;
          nextTick(() => {
            const tryScroll = (attempts = 0) => {
              if (scrollContainer.value) {
                const extra = Number(ch.readingParagraph) || 0;
                const p = scrollContainer.value.querySelector(
                  `[data-chapter-id="${ch.id}"] p.index-${extra}`,
                ) as HTMLElement;

                if (p) {
                  if (p.offsetTop === 0 && extra > 0 && attempts < 10) {
                    setTimeout(() => tryScroll(attempts + 1), 50);
                    return;
                  }
                  scrollContainer.value.scrollTop = p.offsetTop;
                } else {
                  scrollContainer.value.scrollTop = 0;
                }
              }
              isRecovering.value = false;
            };
            setTimeout(() => tryScroll(0), 150);
          });
        }
      }
    },
    { immediate: true },
  );

  function onScroll() {
    const el = scrollContainer.value;
    if (!el || isRecovering.value || isLoadingNext.value || isLoadingPrev.value) return;

    // 先更新活跃章节和保存进度，再决定是否加载更多
    updateActiveChapter();
    debouncedSaveProgress();

    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceToBottom < 500) loadNextChapter();
    if (el.scrollTop < 50) loadPrevChapter();
  }

  // ── 生命周期 ──
  let savedScrollTop = 0; // keep-alive 场景下保存滚动位置

  onMounted(() => {
    scrollContainer.value?.addEventListener('scroll', onScroll, { passive: true });
    // 如果已经正在听书，尝试从 ttsStore 恢复追踪的章节 ID，以确保模式切换后进度依然锁定
    if (ttsStore.isReading && ttsStore.scrollReadingContent?.chapterId) {
      ttsActiveChapterId.value = ttsStore.scrollReadingContent.chapterId;
    }
  });

  onUnmounted(() => {
    scrollContainer.value?.removeEventListener('scroll', onScroll);
  });

  onBeforeUnmount(() => {
    debouncedSaveProgress.cancel?.();
    forceSaveProgress();
  });

  onDeactivated(() => {
    // 保存滚动位置，keep-alive 后 WebView 可能会重置 scrollTop
    savedScrollTop = scrollContainer.value?.scrollTop ?? 0;
    debouncedSaveProgress.cancel?.();
    forceSaveProgress();
  });

  onActivated(() => {
    // 恢复滚动位置
    if (scrollContainer.value && savedScrollTop > 0) {
      nextTick(() => {
        if (scrollContainer.value) {
          scrollContainer.value.scrollTop = savedScrollTop;
        }
      });
    }
  });

  // ── 样式计算 ──
  const computedStyle = computed(() => {
    const baseStyle = {
      paddingLeft: `${bookStore.paddingX}px`,
      paddingRight: `${bookStore.paddingX}px`,
      paddingTop: `${bookStore.paddingTop}px`,
      paddingBottom: `${bookStore.paddingBottom}px`,
      color: bookStore.currTheme.color || '#333',
      backgroundColor: bookStore.currTheme.bgColor || '#fff',
      backgroundImage: bookStore.currTheme.bgGradient || bookStore.currTheme.bgImage || '',
      backgroundRepeat: bookStore.currTheme.bgRepeat || 'repeat',
      backgroundSize: bookStore.currTheme.bgSize || 'auto',
      backgroundAttachment: bookStore.currTheme.bgAttachment,
      backgroundBlendMode: bookStore.currTheme.bgBlendMode,
      textShadow: bookStore.currTheme.textShadow,
      boxShadow: bookStore.currTheme.boxShadow,
      border: bookStore.currTheme.border,
    };

    if (bookStore.currTheme.customStyle) {
      return { ...baseStyle, ...bookStore.currTheme.customStyle };
    }
    return baseStyle;
  });

  return {
    loadedChapters,
    activeChapterId,
    ttsActiveChapterId,
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
    onScroll,
    forceSaveProgress,
  };
}
