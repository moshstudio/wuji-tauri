import type { BoundaryMetadata } from './protocol';
import { TICKS_PER_SECOND } from './constants';

export interface WordTimelineItem {
  /** 音频起始时间（秒） */
  startSec: number;
  /** 音频结束时间（秒） */
  endSec: number;
  /** 对应原文起始下标（UTF-16 code unit，与 string 下标一致） */
  charStart: number;
  /** 对应原文结束下标（不含） */
  charEnd: number;
  text: string;
}

/**
 * 将 Edge WordBoundary 映射到原文字符区间。
 * 按顺序在 source 中匹配 boundary 文本，得到可与 audio.currentTime 对齐的时间轴。
 */
export function buildWordTimeline(
  sourceText: string,
  metadata: BoundaryMetadata[],
): WordTimelineItem[] {
  const words = metadata.filter(item => item.Type === 'WordBoundary');
  const timeline: WordTimelineItem[] = [];
  let searchFrom = 0;

  for (const item of words) {
    const text = item.Data.text.Text;
    if (!text)
      continue;

    let idx = sourceText.indexOf(text, searchFrom);
    if (idx === -1) {
      // 偶发空白/标点差异：退化为按 Length 推进
      const len = Math.max(1, item.Data.text.Length || text.length);
      idx = Math.min(searchFrom, sourceText.length);
      const charEnd = Math.min(idx + len, sourceText.length);
      timeline.push({
        startSec: item.Data.Offset / TICKS_PER_SECOND,
        endSec: (item.Data.Offset + item.Data.Duration) / TICKS_PER_SECOND,
        charStart: idx,
        charEnd,
        text: sourceText.slice(idx, charEnd) || text,
      });
      searchFrom = charEnd;
      continue;
    }

    const charEnd = idx + text.length;
    timeline.push({
      startSec: item.Data.Offset / TICKS_PER_SECOND,
      endSec: (item.Data.Offset + item.Data.Duration) / TICKS_PER_SECOND,
      charStart: idx,
      charEnd,
      text,
    });
    searchFrom = charEnd;
  }

  return timeline;
}

/** 根据播放时间查找当前词；返回 timeline 下标，找不到返回 -1 */
export function findTimelineIndexAtTime(
  timeline: WordTimelineItem[],
  currentTimeSec: number,
): number {
  if (!timeline.length)
    return -1;

  let lo = 0;
  let hi = timeline.length - 1;
  let best = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const item = timeline[mid];
    if (currentTimeSec < item.startSec) {
      hi = mid - 1;
    }
    else if (currentTimeSec >= item.endSec) {
      best = mid;
      lo = mid + 1;
    }
    else {
      return mid;
    }
  }

  if (currentTimeSec < timeline[0].startSec)
    return 0;
  if (currentTimeSec >= timeline[timeline.length - 1].endSec)
    return timeline.length - 1;
  return best;
}

/** 找到覆盖或紧邻某个字符下标的词，用于从段落中途 seek */
export function findTimelineIndexAtChar(
  timeline: WordTimelineItem[],
  charIndex: number,
): number {
  if (!timeline.length)
    return -1;
  for (let i = 0; i < timeline.length; i++) {
    if (charIndex < timeline[i].charEnd)
      return i;
  }
  return timeline.length - 1;
}
