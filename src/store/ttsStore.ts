import type { PluginListener } from '@tauri-apps/api/core';
import type { BoundaryMetadata, WordTimelineItem } from '@/utils/edge-tts';
import type { LineData } from '@/utils/reader/types';
import type { Voice } from '@/utils/tts/voices';
import { Buffer } from 'node:buffer';
import { useStorageAsync } from '@vueuse/core';
import CryptoJS from 'crypto-js';
import { defineStore } from 'pinia';
import * as androidMedia from 'tauri-plugin-mediasession-api';
import { showFailToast, showToast } from 'vant';
import { onMounted, onUnmounted, reactive, ref } from 'vue';
import { clearTimeout, setInterval, setTimeout } from 'worker-timers';
import {
  buildWordTimeline,
  EdgeTTSClient,
  findTimelineIndexAtChar,
  findTimelineIndexAtTime,
} from '@/utils/edge-tts';
import { SimpleLRUCache } from '@/utils/lruCache';
import {
  handlePermissionRequest,
  MediaSessionPermissionType,
} from '@/utils/permissions';
import { createTtsAudioEngine } from '@/utils/tts/audioEngine';
import { loadProxiedImageDataUrl } from '@/utils/tts/cover';
import { TTS_VOICES } from '@/utils/tts/voices';
import { useBookStore } from './bookStore';
import { useDisplayStore } from './displayStore';
import { tauriAddPluginListener } from './utils';

export type { Voice } from '@/utils/tts/voices';

/** 滚动模式：一段文本 */
export interface TtsScrollContent {
  content: string;
  index: number;
  chapterId?: string;
  /** 所属章节标题，供 MediaSession 显示 */
  title?: string;
}

/** 翻页模式：一段的全部行（可跨页） */
export type TtsSlideContent = LineData[];
export type TtsContent = TtsScrollContent | TtsSlideContent;

interface CachedVoice {
  audio: Buffer<ArrayBuffer>;
  boundaries: BoundaryMetadata[];
  timeline: WordTimelineItem[];
}

function isScrollContent(content: TtsContent): content is TtsScrollContent {
  return !Array.isArray(content) && 'index' in content;
}

function contentText(content: TtsContent) {
  return isScrollContent(content)
    ? content.content
    : content.map(item => item.text).join('');
}

function cacheKey(message: string, voice: Voice, rate: number) {
  return CryptoJS.MD5(message + JSON.stringify(voice) + rate).toString();
}

export const useTTSStore = defineStore('ttsStore', () => {
  const displayStore = useDisplayStore();
  const engine = createTtsAudioEngine();

  const voices = ref<Voice[]>(TTS_VOICES);
  const selectedVoice = useStorageAsync<Voice>('ttsPlayVoice', TTS_VOICES[0]);
  const playbackRate = useStorageAsync<number>('ttsPlayBackRate', 1.0);

  const lruCache = new SimpleLRUCache<string, CachedVoice>(50);
  const generating = new SimpleLRUCache<string, boolean>(50);

  const isReading = ref(false);
  const scrollReadingContent = ref<TtsScrollContent>();
  const slideReadingContent = ref<TtsSlideContent>();
  const speakingCharIndex = ref(-1);
  const speakingCharEnd = ref(-1);
  /** 正在朗读的章节标题（滚动切章不改 readingChapter，通知栏要用这个） */
  const speakingChapterTitle = ref<string>();

  const autoStopEnable = useStorageAsync('ttsAutoStopEnable', false);
  const autoStopDuration = useStorageAsync('ttsAutoStopDuration', 30);
  const autoStopStartTime = ref(0);
  const autoStopOptions = reactive({
    get enable() {
      return autoStopEnable.value;
    },
    set enable(v: boolean) {
      autoStopEnable.value = v;
    },
    get duration() {
      return autoStopDuration.value;
    },
    set duration(v: number) {
      autoStopDuration.value = v;
    },
    get startTime() {
      return autoStopStartTime.value;
    },
    set startTime(v: number) {
      autoStopStartTime.value = v;
    },
  });
  const now = ref(Date.now());

  /** 新的 playVoice 使旧的合成/开播回调全部失效 */
  let playGeneration = 0;
  let activeTimeline: WordTimelineItem[] = [];
  let androidSessionReady = false;
  const androidPlugins: PluginListener[] = [];
  let skipNextHandler: (() => void) | null = null;
  let skipPrevHandler: (() => void) | null = null;
  let lastSkipAt = 0;
  let coverCacheKey = '';
  let coverDataUrl: string | undefined;
  let coverLoadingKey = '';

  const bindContent = (content: TtsContent) => {
    if (isScrollContent(content)) {
      scrollReadingContent.value = content;
      if (content.title)
        speakingChapterTitle.value = content.title;
    }
    else {
      slideReadingContent.value = content;
    }
  };

  const setSpeakingChapterTitle = (title?: string) => {
    if (title)
      speakingChapterTitle.value = title;
  };

  const isSamePlayingContent = (content: TtsContent) => {
    if (!isReading.value)
      return false;
    if (isScrollContent(content)) {
      return (
        scrollReadingContent.value?.index === content.index
        && scrollReadingContent.value?.content === content.content
      );
    }
    const current = slideReadingContent.value;
    return !!current?.length && contentText(current) === contentText(content);
  };

  const charToSec = (charIndex: number): number | null => {
    if (!activeTimeline.length)
      return charIndex > 0 ? null : 0;
    const idx = findTimelineIndexAtChar(activeTimeline, Math.max(0, charIndex));
    if (idx < 0)
      return null;
    return activeTimeline[idx].startSec;
  };

  const applySpeakingChar = (charIndex: number) => {
    if (!activeTimeline.length) {
      speakingCharIndex.value = Math.max(0, charIndex);
      speakingCharEnd.value = speakingCharIndex.value;
      return;
    }
    const idx = findTimelineIndexAtChar(activeTimeline, Math.max(0, charIndex));
    if (idx < 0)
      return;
    speakingCharIndex.value = activeTimeline[idx].charStart;
    speakingCharEnd.value = activeTimeline[idx].charEnd;
  };

  const updateSpeakingFromTime = (currentTime: number) => {
    if (!activeTimeline.length)
      return;
    const idx = findTimelineIndexAtTime(activeTimeline, currentTime);
    if (idx < 0)
      return;
    const word = activeTimeline[idx];
    if (speakingCharIndex.value !== word.charStart) {
      speakingCharIndex.value = word.charStart;
      speakingCharEnd.value = word.charEnd;
    }
  };

  const sessionText = () => {
    const bookStore = useBookStore();
    const book = bookStore.readingBook;
    const chapter = bookStore.readingChapter;
    const snippet
      = scrollReadingContent.value?.content?.slice(0, 32)
        || slideReadingContent.value?.[0]?.text?.slice(0, 32);
    return {
      title:
        speakingChapterTitle.value
        || chapter?.title
        || book?.title
        || snippet
        || '听书中',
      artist: book?.author || selectedVoice.value?.ChineseName || '听书',
      album: book?.title || '听书',
    };
  };

  const currentCoverKey = () => {
    const book = useBookStore().readingBook;
    if (!book?.cover)
      return '';
    return `${book.cover}\0${JSON.stringify(book.coverHeaders || {})}`;
  };

  const ensureCoverDataUrl = async () => {
    const key = currentCoverKey();
    if (!key)
      return undefined;
    if (coverCacheKey === key)
      return coverDataUrl;
    if (coverLoadingKey === key)
      return undefined;
    coverLoadingKey = key;
    try {
      const book = useBookStore().readingBook;
      if (!book?.cover)
        return undefined;
      const dataUrl = await loadProxiedImageDataUrl(
        book.cover,
        book.coverHeaders,
      );
      if (currentCoverKey() !== key)
        return undefined;
      coverCacheKey = key;
      coverDataUrl = dataUrl;
      return dataUrl;
    }
    catch {
      return undefined;
    }
    finally {
      if (coverLoadingKey === key)
        coverLoadingKey = '';
    }
  };

  const pushAndroidMetadata = async (cover?: string) => {
    const meta = sessionText();
    await androidMedia.setMetedata({
      title: meta.title,
      artist: meta.artist,
      album: meta.album,
      ...(cover ? { cover } : {}),
    });
  };

  const syncAndroidSession = async (
    state: 'playing' | 'paused' | 'stopped',
  ) => {
    if (!displayStore.isAndroid)
      return;
    try {
      if (state === 'playing') {
        const key = currentCoverKey();
        const cachedCover = coverCacheKey === key ? coverDataUrl : undefined;
        await pushAndroidMetadata(cachedCover);
        void ensureCoverDataUrl().then((cover) => {
          if (cover && isReading.value)
            void pushAndroidMetadata(cover);
        });
      }
      await androidMedia.setPlaybackState({ state });
    }
    catch {
      // 桌面或权限未就绪时忽略
    }
  };

  const ensureAndroidSession = async () => {
    if (!displayStore.isAndroid || androidSessionReady)
      return;
    androidSessionReady = true;
    try {
      await handlePermissionRequest(
        MediaSessionPermissionType.ForegroundService,
      );
      await handlePermissionRequest(
        MediaSessionPermissionType.ForegroundServiceMediaPlayback,
      );
      await handlePermissionRequest(MediaSessionPermissionType.WakeLock);
    }
    catch {
      androidSessionReady = false;
    }
  };

  const pauseMusicForTts = async () => {
    const { useSongStore } = await import('./songStore');
    const songStore = useSongStore();
    if (songStore.isPlaying)
      await songStore.onPause();
  };

  const resetReadingPage = () => {
    scrollReadingContent.value = undefined;
    slideReadingContent.value = undefined;
    speakingChapterTitle.value = undefined;
  };

  const invalidatePlay = () => {
    playGeneration += 1;
    engine.stop();
    speakingCharIndex.value = -1;
    speakingCharEnd.value = -1;
    activeTimeline = [];
  };

  const stop = () => {
    invalidatePlay();
    isReading.value = false;
    resetReadingPage();
    void syncAndroidSession('stopped');
  };

  const generateVoice = async (
    content: TtsContent,
    voice?: Voice,
    rate?: number,
  ): Promise<boolean> => {
    voice = voice || selectedVoice.value;
    rate = rate || playbackRate.value;
    const message = contentText(content);
    const uid = cacheKey(message, voice, rate);
    if (lruCache.has(uid))
      return true;

    if (generating.has(uid)) {
      return new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => resolve(false), 30000);
        const check = () => {
          if (lruCache.has(uid)) {
            clearTimeout(timer);
            resolve(true);
            return;
          }
          if (!generating.has(uid)) {
            clearTimeout(timer);
            resolve(lruCache.has(uid));
            return;
          }
          setTimeout(check, 100);
        };
        check();
      });
    }

    generating.set(uid, true);
    const ok = await new Promise<boolean>((resolve) => {
      new EdgeTTSClient()
        .toStream(message, {
          voice: voice.Name,
          voiceLocale: voice.Locale!,
          rate: rate || 1.0,
        })
        .then((emitter) => {
          const chunks: Uint8Array[] = [];
          const liveBoundaries: BoundaryMetadata[] = [];
          emitter.on('data', (data: Uint8Array) => chunks.push(data));
          emitter.on('metadata', (meta: BoundaryMetadata) => {
            liveBoundaries.push(meta);
          });
          emitter.on('end', (metadata?: BoundaryMetadata[]) => {
            const boundaries
              = Array.isArray(metadata) && metadata.length > 0
                ? metadata
                : liveBoundaries;
            lruCache.set(uid, {
              audio: Buffer.concat(chunks) as unknown as Buffer<ArrayBuffer>,
              boundaries,
              timeline: buildWordTimeline(message, boundaries),
            });
            resolve(true);
          });
          emitter.on('close', () => resolve(false));
        })
        .catch(() => resolve(false));
    });
    generating.delete(uid);
    return ok;
  };

  /**
   * 朗读一段。同一段已在播则只 seek，不重载音频。
   * @param content 段落文本
   * @param voice 音色
   * @param rate 语速
   * @param onended 本段播完回调
   * @param seekCharIndex 从段落中途开始（翻页续段）
   */
  const playVoice = async (
    content: TtsContent,
    voice?: Voice,
    rate?: number,
    onended?: (e?: Event) => void,
    seekCharIndex = 0,
  ) => {
    voice = voice || selectedVoice.value;
    rate = rate || playbackRate.value;

    if (isSamePlayingContent(content)) {
      const sec = charToSec(seekCharIndex);
      if (sec != null && engine.seek(sec)) {
        applySpeakingChar(seekCharIndex);
        return;
      }
    }

    const generation = ++playGeneration;
    isReading.value = true;
    bindContent(content);
    speakingCharIndex.value = Math.max(0, seekCharIndex);
    speakingCharEnd.value = speakingCharIndex.value;
    void pauseMusicForTts();
    void ensureAndroidSession().then(() => syncAndroidSession('playing'));

    const message = contentText(content);
    const uid = cacheKey(message, voice, rate);
    const success = lruCache.has(uid) || (await generateVoice(content, voice, rate));
    if (generation !== playGeneration)
      return;
    if (!success) {
      showFailToast('TTS生成失败');
      stop();
      return;
    }
    if (!isReading.value)
      return;

    const cached = lruCache.get(uid);
    if (!cached)
      return;
    const audioBytes = new Uint8Array(cached.audio.byteLength);
    audioBytes.set(cached.audio);
    const blob = new Blob([audioBytes], { type: 'audio/mpeg' });
    if (blob.size === 0) {
      onended?.();
      return;
    }
    if (contentText(content) !== message)
      return;

    activeTimeline = cached.timeline;
    applySpeakingChar(seekCharIndex);
    engine.play({
      blob,
      seekSec: charToSec(seekCharIndex) ?? 0,
      onEnded: () => {
        if (generation !== playGeneration || !isReading.value)
          return;
        speakingCharIndex.value = -1;
        speakingCharEnd.value = -1;
        onended?.();
      },
      onTimeUpdate: (currentTime) => {
        if (generation !== playGeneration)
          return;
        updateSpeakingFromTime(currentTime);
      },
    });
    void syncAndroidSession('playing');
  };

  const registerSkipHandlers = (handlers: {
    next?: (() => void) | null;
    prev?: (() => void) | null;
  }) => {
    if ('next' in handlers)
      skipNextHandler = handlers.next ?? null;
    if ('prev' in handlers)
      skipPrevHandler = handlers.prev ?? null;
  };

  const runSkipHandler = (handler: (() => void) | null) => {
    if (!isReading.value || !handler)
      return;
    const nowMs = Date.now();
    if (nowMs - lastSkipAt < 400)
      return;
    lastSkipAt = nowMs;
    handler();
  };

  const startAutoStopTimer = () => {
    autoStopOptions.startTime = Date.now();
  };

  onMounted(() => {
    setInterval(() => {
      now.value = Date.now();
      if (
        !isReading.value
        || !autoStopOptions.enable
        || !autoStopOptions.startTime
      ) {
        return;
      }
      const remaining
        = now.value
          - autoStopOptions.startTime
          - autoStopOptions.duration * 60 * 1000;
      if (Math.ceil(remaining / 1000) === -10)
        showToast('听书将在10秒后停止');
      if (remaining >= 0)
        stop();
    }, 1000);

    if (!displayStore.isAndroid)
      return;

    const bind = (event: string, handler: () => void) => {
      tauriAddPluginListener('mediasession', event, handler).then((listener) => {
        androidPlugins.push(listener);
      });
    };
    bind('pause', () => {
      if (!isReading.value)
        return;
      engine.pause();
      void syncAndroidSession('paused');
    });
    bind('play', () => {
      if (!isReading.value)
        return;
      engine.resume();
      void syncAndroidSession('playing');
    });
    bind('stop', () => {
      if (!isReading.value)
        return;
      stop();
    });
    bind('nexttrack', () => runSkipHandler(skipNextHandler));
    bind('previoustrack', () => runSkipHandler(skipPrevHandler));
  });

  onUnmounted(() => {
    for (const plugin of androidPlugins)
      plugin.unregister();
    androidPlugins.length = 0;
  });

  return {
    voices,
    selectedVoice,
    playbackRate,
    generateVoice,
    playVoice,
    startAutoStopTimer,
    stop,
    invalidatePlay,
    resetReadingPage,
    isReading,
    registerSkipHandlers,
    setSpeakingChapterTitle,
    scrollReadingContent,
    slideReadingContent,
    speakingCharIndex,
    speakingCharEnd,
    autoStopOptions,
  };
});
