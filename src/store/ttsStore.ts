import type { BoundaryMetadata, WordTimelineItem } from '@/utils/edge-tts';
import type { LineData } from '@/utils/reader/types';
import { Buffer } from 'node:buffer';
import { useStorageAsync } from '@vueuse/core';
import CryptoJS from 'crypto-js';
import { defineStore } from 'pinia';
import { showFailToast, showToast } from 'vant';
import { onMounted, reactive, ref } from 'vue';
import { clearTimeout, setInterval, setTimeout } from 'worker-timers';
import {
  buildWordTimeline,
  EdgeTTSClient,
  findTimelineIndexAtChar,
  findTimelineIndexAtTime,
} from '@/utils/edge-tts';
import { SimpleLRUCache } from '@/utils/lruCache';

export interface Voice {
  Name: string;
  ChineseName: string;
  ShortName: string;
  Gender: 'Female' | 'Male';
  Locale?: string;
  type: 'edge';
  feature?: string;
  [name: string]: any;
}

interface CachedVoice {
  audio: Buffer<ArrayBuffer>;
  boundaries: BoundaryMetadata[];
  timeline: WordTimelineItem[];
}

export const useTTSStore = defineStore('ttsStore', () => {
  const voices = ref<Voice[]>([
    {
      Name: 'Microsoft Server Speech Text to Speech Voice (zh-CN, XiaoyiNeural)',
      ChineseName: '晓伊',
      ShortName: 'zh-CN-XiaoyiNeural',
      Gender: 'Female',
      Locale: 'zh-CN',
      type: 'edge',
    },
    {
      Name: 'Microsoft Server Speech Text to Speech Voice (zh-CN, YunjianNeural)',
      ChineseName: '云健',
      ShortName: 'zh-CN-YunjianNeural',
      Gender: 'Male',
      Locale: 'zh-CN',
      type: 'edge',
      feature: 'tts_voice',
    },
    {
      Name: 'Microsoft Server Speech Text to Speech Voice (zh-CN, YunxiNeural)',
      ChineseName: '云希',
      ShortName: 'zh-CN-YunxiNeural',
      Gender: 'Male',
      Locale: 'zh-CN',
      type: 'edge',
      feature: 'tts_voice',
    },
    {
      Name: 'Microsoft Server Speech Text to Speech Voice (zh-CN, YunxiaNeural)',
      ChineseName: '云夏',
      ShortName: 'zh-CN-YunxiaNeural',
      Gender: 'Male',
      Locale: 'zh-CN',
      type: 'edge',
      feature: 'tts_voice',
    },
    {
      Name: 'Microsoft Server Speech Text to Speech Voice (zh-CN, YunyangNeural)',
      ChineseName: '云扬',
      ShortName: 'zh-CN-YunyangNeural',
      Gender: 'Male',
      Locale: 'zh-CN',
      type: 'edge',
      feature: 'tts_voice',
    },
    {
      Name: 'Microsoft Server Speech Text to Speech Voice (zh-CN, XiaoxiaoNeural)',
      ChineseName: '晓晓',
      ShortName: 'zh-CN-XiaoxiaoNeural',
      Gender: 'Female',
      Locale: 'zh-CN',
      type: 'edge',
      feature: 'tts_voice',
    },
    {
      Name: 'Microsoft Server Speech Text to Speech Voice (zh-CN-liaoning, XiaobeiNeural)',
      ChineseName: '晓北(辽宁)',
      ShortName: 'zh-CN-liaoning-XiaobeiNeural',
      Gender: 'Female',
      Locale: 'zh-CN-liaoning',
      type: 'edge',
      feature: 'tts_voice',
    },
    {
      Name: 'Microsoft Server Speech Text to Speech Voice (zh-TW, HsiaoChenNeural)',
      ChineseName: '晓晨(台湾)',
      ShortName: 'zh-TW-HsiaoChenNeural',
      Gender: 'Female',
      Locale: 'zh-TW',
      type: 'edge',
      feature: 'tts_voice',
    },
    {
      Name: 'Microsoft Server Speech Text to Speech Voice (zh-TW, YunJheNeural)',
      ChineseName: '云哲(台湾)',
      ShortName: 'zh-TW-YunJheNeural',
      Gender: 'Male',
      Locale: 'zh-TW',
      type: 'edge',
      feature: 'tts_voice',
    },
    {
      Name: 'Microsoft Server Speech Text to Speech Voice (zh-TW, HsiaoYuNeural)',
      ChineseName: '小玉(台湾)',
      ShortName: 'zh-TW-HsiaoYuNeural',
      Gender: 'Female',
      Locale: 'zh-TW',
      type: 'edge',
      feature: 'tts_voice',
    },
    {
      Name: 'Microsoft Server Speech Text to Speech Voice (zh-CN-shaanxi, XiaoniNeural)',
      ChineseName: '晓妮(陕西)',
      ShortName: 'zh-CN-shaanxi-XiaoniNeural',
      Gender: 'Female',
      Locale: 'zh-CN-shaanxi',
      type: 'edge',
      feature: 'tts_voice',
    },
    {
      Name: 'Microsoft Server Speech Text to Speech Voice (zh-HK, HiuGaaiNeural)',
      ChineseName: '晓佳(香港)',
      ShortName: 'zh-HK-HiuGaaiNeural',
      Gender: 'Female',
      Locale: 'zh-HK',
      type: 'edge',
      feature: 'tts_voice',
    },
    {
      Name: 'Microsoft Server Speech Text to Speech Voice (zh-HK, HiuMaanNeural)',
      ChineseName: '晓敏(香港)',
      ShortName: 'zh-HK-HiuMaanNeural',
      Gender: 'Female',
      Locale: 'zh-HK',
      type: 'edge',
      feature: 'tts_voice',
    },
    {
      Name: 'Microsoft Server Speech Text to Speech Voice (zh-HK, WanLungNeural)',
      ChineseName: '云龙(香港)',
      ShortName: 'zh-HK-WanLungNeural',
      Gender: 'Male',
      Locale: 'zh-HK',
      type: 'edge',
      feature: 'tts_voice',
    },
  ]);

  const audioPlayer = ref<HTMLAudioElement | null>(null);
  const selectedVoice = useStorageAsync<Voice>('ttsPlayVoice', voices.value[0]);
  const playbackRate = useStorageAsync<number>('ttsPlayBackRate', 1.0);
  const lruCache = new SimpleLRUCache<string, CachedVoice>(50);
  const _generating = new SimpleLRUCache<string, boolean>(50);

  const isReading = ref(false);
  const scrollReadingContent = ref<{
    content: string;
    index: number;
    chapterId?: string;
  }>();
  const slideReadingContent = ref<LineData[]>();
  /** 当前朗读到原文的字符下标；无词边界时为 -1 */
  const speakingCharIndex = ref(-1);
  const speakingCharEnd = ref(-1);

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

  let playGeneration = 0;
  let currentObjectUrl: string | null = null;
  let activeTimeline: WordTimelineItem[] = [];
  let progressRaf = 0;

  const getContentText = (
    content: LineData[] | { content: string; index: number },
  ) => {
    return 'index' in content
      ? content.content
      : content.map(item => item.text).join('');
  };

  const revokeCurrentUrl = () => {
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = null;
    }
  };

  const ensurePlayer = () => {
    if (!audioPlayer.value)
      audioPlayer.value = new Audio();
    return audioPlayer.value;
  };

  const stopProgressTracking = () => {
    if (progressRaf) {
      cancelAnimationFrame(progressRaf);
      progressRaf = 0;
    }
    const player = audioPlayer.value;
    if (player) {
      player.ontimeupdate = null;
      player.onloadedmetadata = null;
    }
    activeTimeline = [];
    speakingCharIndex.value = -1;
    speakingCharEnd.value = -1;
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

  const startProgressTracking = (player: HTMLAudioElement) => {
    const tick = () => {
      if (!isReading.value || !activeTimeline.length) {
        progressRaf = 0;
        return;
      }
      if (!player.paused && !player.ended)
        updateSpeakingFromTime(player.currentTime);
      progressRaf = requestAnimationFrame(tick);
    };
    player.ontimeupdate = () => updateSpeakingFromTime(player.currentTime);
    progressRaf = requestAnimationFrame(tick);
  };

  const resetReadingPage = () => {
    scrollReadingContent.value = undefined;
    slideReadingContent.value = undefined;
  };

  const invalidatePlay = () => {
    playGeneration += 1;
    stopProgressTracking();
    const player = audioPlayer.value;
    if (player) {
      player.pause();
      player.onended = null;
    }
    revokeCurrentUrl();
  };

  const stop = () => {
    invalidatePlay();
    isReading.value = false;
    resetReadingPage();
  };

  onMounted(() => {
    setInterval(() => {
      now.value = Date.now();
      if (
        isReading.value
        && autoStopOptions.enable
        && autoStopOptions.startTime
      ) {
        const remaining
          = now.value
            - autoStopOptions.startTime
            - autoStopOptions.duration * 60 * 1000;

        if (Math.ceil(remaining / 1000) === -10) {
          showToast('听书将在10秒后停止');
        }

        if (remaining >= 0) {
          stop();
        }
      }
    }, 1000);
  });

  const init = async () => {
    if (!audioPlayer.value) {
      audioPlayer.value = new Audio();
    }
  };

  const generateVoice = async (
    content: LineData[] | { content: string; index: number },
    voice: Voice,
    rate?: number,
  ): Promise<boolean> => {
    voice = voice || selectedVoice.value;
    rate = rate || playbackRate.value;
    const message = getContentText(content);
    const uid = CryptoJS.MD5(message + JSON.stringify(voice) + rate).toString();
    if (lruCache.has(uid)) {
      return true;
    }
    if (_generating.has(uid)) {
      return new Promise<boolean>((resolve, _reject) => {
        const timer = setTimeout(() => {
          resolve(false);
        }, 30000);
        const check = () => {
          if (lruCache.has(uid)) {
            clearTimeout(timer);
            resolve(true);
            return;
          }
          if (!_generating.has(uid)) {
            clearTimeout(timer);
            resolve(lruCache.has(uid));
            return;
          }
          setTimeout(check, 100);
        };
        check();
      });
    }
    _generating.set(uid, true);
    const res: boolean = await new Promise((resolve) => {
      new EdgeTTSClient()
        .toStream(message, {
          voice: voice.Name,
          voiceLocale: voice.Locale!,
          rate: rate || 1.0,
        })
        .then((emitter) => {
          const chunks: Uint8Array[] = [];
          const liveBoundaries: BoundaryMetadata[] = [];
          emitter.on('data', (data: Uint8Array) => {
            chunks.push(data);
          });
          emitter.on('metadata', (meta: BoundaryMetadata) => {
            liveBoundaries.push(meta);
          });
          emitter.on('end', (metadata?: BoundaryMetadata[]) => {
            const concatenated = Buffer.concat(chunks);
            const boundaries
              = Array.isArray(metadata) && metadata.length > 0
                ? metadata
                : liveBoundaries;
            lruCache.set(uid, {
              audio: concatenated as unknown as Buffer<ArrayBuffer>,
              boundaries,
              timeline: buildWordTimeline(message, boundaries),
            });
            resolve(true);
          });
          emitter.on('close', () => {
            resolve(false);
          });
        })
        .catch(() => {
          resolve(false);
        });
    });
    _generating.delete(uid);
    return res;
  };

  /**
   * @param seekCharIndex 从段落中途开始播（用于跨页续段所在页）
   */
  const playVoice = async (
    content: LineData[] | { content: string; index: number },
    voice: Voice,
    rate?: number,
    onended?: (e?: Event) => void,
    seekCharIndex = 0,
  ) => {
    invalidatePlay();
    const generation = playGeneration;
    isReading.value = true;
    voice = voice || selectedVoice.value;
    rate = rate || playbackRate.value;
    const message = getContentText(content);
    if ('index' in content) {
      scrollReadingContent.value = content;
    }
    else {
      slideReadingContent.value = content;
    }
    const uid = CryptoJS.MD5(message + JSON.stringify(voice) + rate).toString();
    let success = lruCache.has(uid);
    if (!success) {
      success = await generateVoice(content, voice, rate);
    }

    if (generation !== playGeneration)
      return;

    if (!success) {
      showFailToast('TTS生成失败');
      audioPlayer.value?.pause();
      isReading.value = false;
      return;
    }
    if (!isReading.value)
      return;

    const cached = lruCache.get(uid);
    if (!cached)
      return;
    const blob = new Blob([cached.audio], { type: 'audio/mpeg' });
    if (blob.size === 0) {
      onended?.();
      return;
    }
    if (getContentText(content) !== message)
      return;

    const player = ensurePlayer();
    revokeCurrentUrl();
    currentObjectUrl = URL.createObjectURL(blob);
    activeTimeline = cached.timeline;
    speakingCharIndex.value = Math.max(0, seekCharIndex);
    speakingCharEnd.value = speakingCharIndex.value;

    player.onended = (event) => {
      if (generation !== playGeneration)
        return;
      if (!isReading.value)
        return;
      stopProgressTracking();
      onended?.(event);
    };

    const startPlayback = () => {
      if (generation !== playGeneration)
        return;
      if (seekCharIndex > 0 && activeTimeline.length) {
        const idx = findTimelineIndexAtChar(activeTimeline, seekCharIndex);
        if (idx >= 0) {
          player.currentTime = activeTimeline[idx].startSec;
          speakingCharIndex.value = activeTimeline[idx].charStart;
          speakingCharEnd.value = activeTimeline[idx].charEnd;
        }
      }
      startProgressTracking(player);
      void player.play().catch(() => {});
    };

    player.src = currentObjectUrl;
    if (player.readyState >= 1)
      startPlayback();
    else
      player.onloadedmetadata = () => startPlayback();
  };

  const startAutoStopTimer = () => {
    autoStopOptions.startTime = Date.now();
  };

  onMounted(() => {
    init();
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
    scrollReadingContent,
    slideReadingContent,
    speakingCharIndex,
    speakingCharEnd,
    autoStopOptions,
  };
});
