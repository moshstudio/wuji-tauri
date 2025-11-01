import type { LineData } from '@/utils/reader/types';
import { useStorageAsync } from '@vueuse/core';
import CryptoJS from 'crypto-js';
import { defineStore } from 'pinia';
import { showFailToast, showToast } from 'vant';
import { onMounted, reactive, ref } from 'vue';
import { clearTimeout, setInterval, setTimeout } from 'worker-timers';
import { EdgeTTSClient } from '@/utils/edge-tts';
import { SimpleLRUCache } from '@/utils/lruCache';

export interface Voice {
  Name: string;
  ChineseName: string;
  Gender: 'Female' | 'Male';
  Locale?: string;
  type: 'edge';
  needVip: boolean;
  [name: string]: any;
}

export const useTTSStore = defineStore('ttsStore', () => {
  // 状态
  const voices = ref<Voice[]>([
    {
      Name: 'Microsoft Server Speech Text to Speech Voice (zh-CN, XiaoyiNeural)',
      ChineseName: '晓伊',
      ShortName: 'zh-CN-XiaoyiNeural',
      Gender: 'Female',
      Locale: 'zh-CN',
      type: 'edge',
      needVip: false,
    },
    {
      Name: 'Microsoft Server Speech Text to Speech Voice (zh-CN, YunjianNeural)',
      ChineseName: '云健',
      ShortName: 'zh-CN-YunjianNeural',
      Gender: 'Male',
      Locale: 'zh-CN',
      type: 'edge',
      needVip: true,
    },
    {
      Name: 'Microsoft Server Speech Text to Speech Voice (zh-CN, YunxiNeural)',
      ChineseName: '云希',
      ShortName: 'zh-CN-YunxiNeural',
      Gender: 'Male',
      Locale: 'zh-CN',
      type: 'edge',
      needVip: true,
    },
    {
      Name: 'Microsoft Server Speech Text to Speech Voice (zh-CN, YunxiaNeural)',
      ChineseName: '云夏',
      ShortName: 'zh-CN-YunxiaNeural',
      Gender: 'Male',
      Locale: 'zh-CN',
      type: 'edge',
      needVip: true,
    },
    {
      Name: 'Microsoft Server Speech Text to Speech Voice (zh-CN, YunyangNeural)',
      ChineseName: '云扬',
      ShortName: 'zh-CN-YunyangNeural',
      Gender: 'Male',
      Locale: 'zh-CN',
      type: 'edge',
      needVip: true,
    },
    {
      Name: 'Microsoft Server Speech Text to Speech Voice (zh-CN, XiaoxiaoNeural)',
      ChineseName: '晓晓',
      ShortName: 'zh-CN-XiaoxiaoNeural',
      Gender: 'Female',
      Locale: 'zh-CN',
      type: 'edge',
      needVip: true,
    },
    {
      Name: 'Microsoft Server Speech Text to Speech Voice (zh-CN-liaoning, XiaobeiNeural)',
      ChineseName: '晓北(辽宁)',
      ShortName: 'zh-CN-liaoning-XiaobeiNeural',
      Gender: 'Female',
      Locale: 'zh-CN-liaoning',
      type: 'edge',
      needVip: true,
    },
    {
      Name: 'Microsoft Server Speech Text to Speech Voice (zh-TW, HsiaoChenNeural)',
      ChineseName: '晓晨(台湾)',
      ShortName: 'zh-TW-HsiaoChenNeural',
      Gender: 'Female',
      Locale: 'zh-TW',
      type: 'edge',
      needVip: true,
    },
    {
      Name: 'Microsoft Server Speech Text to Speech Voice (zh-TW, YunJheNeural)',
      ChineseName: '云哲(台湾)',
      ShortName: 'zh-TW-YunJheNeural',
      Gender: 'Male',
      Locale: 'zh-TW',
      type: 'edge',
      needVip: true,
    },
    {
      Name: 'Microsoft Server Speech Text to Speech Voice (zh-TW, HsiaoYuNeural)',
      ChineseName: '小玉(台湾)',
      ShortName: 'zh-TW-HsiaoYuNeural',
      Gender: 'Female',
      Locale: 'zh-TW',
      type: 'edge',
      needVip: true,
    },
    {
      Name: 'Microsoft Server Speech Text to Speech Voice (zh-CN-shaanxi, XiaoniNeural)',
      ChineseName: '晓妮(陕西)',
      ShortName: 'zh-CN-shaanxi-XiaoniNeural',
      Gender: 'Female',
      Locale: 'zh-CN-shaanxi',
      type: 'edge',
      needVip: true,
    },
    {
      Name: 'Microsoft Server Speech Text to Speech Voice (zh-HK, HiuGaaiNeural)',
      ChineseName: '晓佳(香港)',
      Gender: 'Female',
      Locale: 'zh-HK',
      type: 'edge',
      needVip: true,
    },
    {
      Name: 'Microsoft Server Speech Text to Speech Voice (zh-HK, HiuMaanNeural)',
      ChineseName: '晓敏(香港)',
      ShortName: 'zh-HK-HiuMaanNeural',
      Gender: 'Female',
      Locale: 'zh-HK',
      type: 'edge',
      needVip: true,
    },
    {
      Name: 'Microsoft Server Speech Text to Speech Voice (zh-HK, WanLungNeural)',
      ChineseName: '云龙(香港)',
      ShortName: 'zh-HK-WanLungNeural',
      Gender: 'Male',
      Locale: 'zh-HK',
      type: 'edge',
      needVip: true,
    },
  ]);

  const audioPlayer = ref<HTMLAudioElement | null>(null);
  const selectedVoice = useStorageAsync<Voice>('ttsPlayVoice', voices.value[0]);
  const playbackRate = useStorageAsync<number>('ttsPlayBackRate', 1.0);
  const lruCache = new SimpleLRUCache<string, Buffer<ArrayBuffer>>(50);
  const _generating = new SimpleLRUCache<string, boolean>(50);

  const isReading = ref(false);
  const scrollReadingContent = ref<{ content: string; index: number }>();
  const slideReadingContent = ref<LineData[]>();

  const autoStopOptions = reactive({
    enable: false,
    startTime: 0,
    duration: 20,
  });
  const now = ref(Date.now());

  // 每秒更新时间戳
  onMounted(() => {
    const timer = setInterval(() => {
      now.value = Date.now();
      if (
        isReading.value &&
        autoStopOptions.enable &&
        autoStopOptions.startTime
      ) {
        const remaining =
          now.value -
          autoStopOptions.startTime -
          autoStopOptions.duration * 60 * 1000;

        if (Math.ceil(remaining / 1000) === -10) {
          showToast('听书将在10秒后停止');
        }

        if (remaining >= 0) {
          stop();
        }
      }
    }, 1000);
  });

  // 初始化AudioContext
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
    const message =
      'index' in content
        ? content.content
        : content.map((item) => item.text).join('');
    const uid = CryptoJS.MD5(message + JSON.stringify(voice) + rate).toString();
    if (lruCache.has(uid)) {
      return true;
    }
    if (_generating.has(uid)) {
      // 等待生成完成，最长等待30秒
      return new Promise<boolean>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(false);
        }, 30000);
        const check = () => {
          if (lruCache.has(uid)) {
            clearTimeout(timer);
            resolve(true);
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      });
    }
    _generating.set(uid, true);
    const res: boolean = await new Promise(async (resolve, reject) => {
      try {
        const chunks: Uint8Array[] = [];
        const emitter = await new EdgeTTSClient().toStream(message, {
          voice: voice.Name,
          voiceLocale: voice.Locale!,
          rate: rate || 1.0,
        });
        emitter.on('data', (data: Uint8Array) => {
          chunks.push(data);
        });
        emitter.on('end', async () => {
          const concatenated = Buffer.concat(chunks);
          lruCache.set(uid, concatenated);
          resolve(true);
        });
        emitter.on('close', (error: any) => {
          resolve(false);
        });
      } catch (error) {
        resolve(false);
      }
    });
    _generating.delete(uid);
    return res;
  };
  const playVoice = async (
    content: LineData[] | { content: string; index: number },
    voice: Voice,
    rate?: number,
    onended?: (e?: Event) => void,
  ) => {
    isReading.value = true;
    voice = voice || selectedVoice.value;
    rate = rate || playbackRate.value;
    const message =
      'index' in content
        ? content.content
        : content.map((item) => item.text).join('');
    if ('index' in content) {
      scrollReadingContent.value = content;
    } else {
      slideReadingContent.value = content;
    }
    const uid = CryptoJS.MD5(message + JSON.stringify(voice) + rate).toString();
    if (!lruCache.has(uid)) {
      let success = false;
      let times = 3;
      do {
        success = await generateVoice(content, voice, rate);
      } while (!success && times-- > 0);
    }
    if (!lruCache.has(uid)) {
      showFailToast('TTS生成失败');
      audioPlayer.value?.pause();
      isReading.value = false;
      return;
    }
    const buffer = lruCache.get(uid)!;
    const blob = new Blob([buffer], { type: 'audio/mpeg' });
    if (blob.size === 0) {
      onended?.();
    } else {
      // 再次确认一下，当前要读的内容没有改变
      if (
        'index' in content
          ? content.content
          : content.map((item) => item.text).join('') === message
      ) {
        if (audioPlayer.value) {
          audioPlayer.value.src = URL.createObjectURL(blob);
          audioPlayer.value.play();
          audioPlayer.value.onended = (event) => {
            onended?.(event);
          };
        }
      }
    }
  };
  const startAutoStopTimer = () => {
    autoStopOptions.startTime = Date.now();
  };
  const stop = () => {
    if (audioPlayer.value) {
      audioPlayer.value.pause();
      audioPlayer.value.onended = (event) => {};
    }
    isReading.value = false;
  };

  const resetReadingPage = () => {
    scrollReadingContent.value = undefined;
    slideReadingContent.value = undefined;
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
    resetReadingPage,
    isReading,
    scrollReadingContent,
    slideReadingContent,
    autoStopOptions,
  };
});
