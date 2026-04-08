import { ref, computed, watch, nextTick, onMounted } from 'vue';
import { useTTSStore } from '@/store';

/**
 * 滚动模式专用 TTS hook
 *
 * 设计原则：
 * - 始终使用 { content: string; index: number } 对象格式调用 playVoice / generateVoice
 *   以确保 ttsStore 内部走同一条路径，缓存 key 一致，预加载能命中缓存
 * - 只依赖外部传入的 chapterContent / title，不混入 slideReadingContent 逻辑
 */
export function useBookTTS(options: {
  title: () => string | undefined;
  chapterContent: () => string | undefined;
  chapterId: () => string | undefined;
  nextChapter: () => void;
}) {
  const ttsStore = useTTSStore();

  // 当前正在播报的段落索引（0-based，对应 paragraphs 数组）
  const currentPIndex = ref(0);

  // 根据章节内容构建段落列表
  const paragraphs = computed<string[]>(() => {
    const content = options.chapterContent();
    const title = options.title();
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

    // 去除标题后紧跟的与标题内容相同的行（防重复）
    if (title && pList[1] === title.replace(/\s+/g, '')) {
      pList.splice(1, 1);
    }

    return pList;
  });

  // 恢复挂载时的滚动位置
  onMounted(() => {
    if (ttsStore.isReading && ttsStore.scrollReadingContent) {
      currentPIndex.value = ttsStore.scrollReadingContent.index;
      nextTick(() => {
        const chId = ttsStore.scrollReadingContent?.chapterId;
        const pIdx = ttsStore.scrollReadingContent?.index;
        // 使用属性选择器精准定位具体章节的具体段落
        const el = document.querySelector(`[data-chapter-id="${chId}"] [data-p-index="${pIdx}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  });

  // 章节切换时重置段落索引并重新开始播放
  watch(
    () => options.chapterContent(),
    (newContent, oldContent) => {
      // 如果内容没有实质变化，或者正在播放且内容还是原来那一套内容，就不重置
      // 注意：滚动模式下 ttsActiveChapterId 变化会引起 chapterContent 变化，这是正常的重置触发点
      if (!newContent || newContent === oldContent) return;
      
      currentPIndex.value = 0;
      if (ttsStore.isReading) {
        nextTick(() => {
          // 如果已经在播报新章的开头，则不重复触发
          if (ttsStore.scrollReadingContent?.index === 0 && ttsStore.scrollReadingContent?.content === paragraphs.value[0]) {
            return;
          }
          playParagraph(0);
        });
      }
    },
  );

  /**
   * 播放指定索引的段落
   */
  function playParagraph(index: number) {
    if (!paragraphs.value.length) return;

    // 跳过空段落
    if (index >= paragraphs.value.length) {
      // 已读完当前章节，跳到下一章
      options.nextChapter();
      return;
    }

    const text = paragraphs.value[index];
    if (!text || text.trim() === '') {
      playParagraph(index + 1);
      return;
    }

    currentPIndex.value = index;

    const contentObj = { 
      content: text, 
      index: index, 
      chapterId: options.chapterId() 
    };

    // 预加载后续段落（使用相同的 { content, index } 格式，确保缓存 key 一致）
    for (let offset = 1; offset <= 2; offset++) {
      const nextIdx = index + offset;
      if (nextIdx < paragraphs.value.length) {
        const nextText = paragraphs.value[nextIdx];
        if (nextText && nextText.trim() !== '') {
          ttsStore.generateVoice(
            { content: nextText, index: nextIdx },
            ttsStore.selectedVoice,
            ttsStore.playbackRate,
          );
        }
      }
    }

    ttsStore.playVoice(
      contentObj,
      ttsStore.selectedVoice,
      ttsStore.playbackRate,
      () => {
        if (ttsStore.isReading) {
          playParagraph(index + 1);
        }
      },
    );
  }

  /**
   * 对外暴露的启动函数：从当前 currentPIndex 开始播放
   */
  function playTTS() {
    playParagraph(currentPIndex.value);
  }

  return {
    paragraphs,
    currentPIndex,
    playTTS,
  };
}
