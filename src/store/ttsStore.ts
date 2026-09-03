import type { PluginListener } from '@tauri-apps/api/core';
import type { BoundaryMetadata, WordTimelineItem } from '@/utils/edge-tts';
import type { LineData } from '@/utils/reader/types';
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
import { useDisplayStore } from './displayStore';
import { tauriAddPluginListener } from './utils';

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
  const displayStore = useDisplayStore();
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
  const players: HTMLAudioElement[] = [];
  let activeSlot = 0;
  let androidSessionReady = false;
  const androidPlugins: PluginListener[] = [];
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

  const ensurePlayers = () => {
    if (players.length >= 2)
      return;
    players[0] = new Audio();
    players[1] = new Audio();
    for (const el of players) {
      el.preload = 'auto';
      el.setAttribute('playsinline', 'true');
    }
    activeSlot = 0;
    audioPlayer.value = players[0];
  };

  /** 锁屏后续播不要复用已 ended 的 Audio，安卓 WebView 上设新 src 经常播不出来 */
  const acquirePlayer = () => {
    ensurePlayers();
    const current = players[activeSlot];
    if (!current.src) {
      audioPlayer.value = current;
      return current;
    }
    clearReadyHandler(current);
    current.onended = null;
    current.onerror = null;
    if (!current.ended && !current.paused)
      current.pause();
    activeSlot = 1 - activeSlot;
    const next = players[activeSlot];
    audioPlayer.value = next;
    return next;
  };

  const syncAndroidSession = async (
    state: 'playing' | 'paused' | 'stopped',
  ) => {
    if (!displayStore.isAndroid)
      return;
    try {
      if (state === 'playing') {
        const title
          = scrollReadingContent.value?.content?.slice(0, 32)
            || slideReadingContent.value?.[0]?.text?.slice(0, 32)
            || '听书中';
        await androidMedia.setMetedata({
          title,
          artist: selectedVoice.value?.ChineseName || '听书',
          album: '听书',
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

  const stopProgressTracking = () => {
    if (progressRaf) {
      cancelAnimationFrame(progressRaf);
      progressRaf = 0;
    }
    const player = audioPlayer.value;
    if (player)
      player.ontimeupdate = null;
    activeTimeline = [];
    speakingCharIndex.value = -1;
    speakingCharEnd.value = -1;
  };

  const clearReadyHandler = (player?: HTMLAudioElement | null) => {
    const el = player ?? audioPlayer.value;
    if (!el)
      return;
    el.onloadedmetadata = null;
    el.oncanplay = null;
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
      clearReadyHandler(player);
      player.onended = null;
      player.onerror = null;
      // 已结束时再 pause 会打断 WebView 的连续播放资格，下一段 play() 会被静默拒绝
      if (!player.ended && !player.paused)
        player.pause();
    }
    revokeCurrentUrl();
  };

  const stop = () => {
    invalidatePlay();
    isReading.value = false;
    resetReadingPage();
    void syncAndroidSession('stopped');
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
    ensurePlayers();
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
    void pauseMusicForTts();
    void ensureAndroidSession().then(() => syncAndroidSession('playing'));
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
      void syncAndroidSession('stopped');
      return;
    }
    if (!isReading.value)
      return;

    const cached = lruCache.get(uid);
    if (!cached)
      return;
    // Node Buffer 可能是共享 pool 上的 view，拷贝后再做 Blob，避免二次播放读到脏数据
    const audioBytes = new Uint8Array(cached.audio.byteLength);
    audioBytes.set(cached.audio);
    const blob = new Blob([audioBytes], { type: 'audio/mpeg' });
    if (blob.size === 0) {
      onended?.();
      return;
    }
    if (getContentText(content) !== message)
      return;

    const player = acquirePlayer();
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

    let started = false;
    const tryPlay = (attempt = 0) => {
      if (generation !== playGeneration)
        return;
      void player.play().then(() => {
        void syncAndroidSession('playing');
      }).catch((err: unknown) => {
        if (generation !== playGeneration)
          return;
        const name = err instanceof Error ? err.name : '';
        if (name === 'AbortError' && attempt < 6) {
          started = false;
          setTimeout(() => tryPlay(attempt + 1), 250 * (attempt + 1));
          return;
        }
        if (attempt < 6)
          setTimeout(() => tryPlay(attempt + 1), 250 * (attempt + 1));
      });
    };

    const startPlayback = () => {
      if (generation !== playGeneration)
        return;
      if (player.readyState < HTMLMediaElement.HAVE_METADATA)
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
      if (!started) {
        started = true;
        tryPlay();
      }
    };

    // 锁屏后 loadedmetadata 可能迟迟不来，先直接 play()；双缓冲 Audio 避免复用 ended 元素
    player.onloadedmetadata = () => startPlayback();
    player.oncanplay = () => startPlayback();
    player.src = currentObjectUrl;
    tryPlay();
  };

  const startAutoStopTimer = () => {
    autoStopOptions.startTime = Date.now();
  };

  onMounted(() => {
    init();
    if (!displayStore.isAndroid)
      return;

    const bind = (
      event: string,
      handler: (payload?: any) => void,
    ) => {
      tauriAddPluginListener('mediasession', event, handler).then((listener) => {
        androidPlugins.push(listener);
      });
    };

    bind('pause', () => {
      if (!isReading.value)
        return;
      audioPlayer.value?.pause();
      void syncAndroidSession('paused');
    });
    bind('play', () => {
      if (!isReading.value)
        return;
      void audioPlayer.value?.play().catch(() => {});
      void syncAndroidSession('playing');
    });
    bind('stop', () => {
      if (!isReading.value)
        return;
      stop();
    });
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
    scrollReadingContent,
    slideReadingContent,
    speakingCharIndex,
    speakingCharEnd,
    autoStopOptions,
  };
});
