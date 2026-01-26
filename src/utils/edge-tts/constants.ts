export const BASE_URL =
  'speech.platform.bing.com/consumer/speech/synthesize/readaloud';

export const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
export const CLIENT_TOKEN = TRUSTED_CLIENT_TOKEN; // 保持向后兼容

export const WSS_URL = `wss://${BASE_URL}/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}`;
export const SYNTH_URL = WSS_URL; // 保持向后兼容

export const VOICE_LIST = `https://${BASE_URL}/voices/list?trustedclienttoken=${TRUSTED_CLIENT_TOKEN}`;
export const VOICES_URL = VOICE_LIST; // 保持向后兼容

export const DEFAULT_VOICE = 'en-US-EmmaMultilingualNeural';

export const CHROMIUM_FULL_VERSION = '143.0.3650.75';
export const CHROMIUM_MAJOR_VERSION = CHROMIUM_FULL_VERSION.split('.')[0];
export const SEC_MS_GEC_VERSION = `1-${CHROMIUM_FULL_VERSION}`;

export const BASE_HEADERS = {
  'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM_MAJOR_VERSION}.0.0.0 Safari/537.36 Edg/${CHROMIUM_MAJOR_VERSION}.0.0.0`,
  'Accept-Encoding': 'gzip, deflate, br, zstd',
  'Accept-Language': 'en-US,en;q=0.9',
};

export const WSS_HEADERS = {
  Pragma: 'no-cache',
  'Cache-Control': 'no-cache',
  Origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
  'Sec-WebSocket-Version': '13',
  ...BASE_HEADERS,
};

export const VOICE_HEADERS = {
  Authority: 'speech.platform.bing.com',
  'Sec-CH-UA': `" Not;A Brand";v="99", "Microsoft Edge";v="${CHROMIUM_MAJOR_VERSION}", "Chromium";v="${CHROMIUM_MAJOR_VERSION}"`,
  'Sec-CH-UA-Mobile': '?0',
  Accept: '*/*',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Dest': 'empty',
  ...BASE_HEADERS,
};

export enum OUTPUT_FORMAT {
  AUDIO_24KHZ_48KBITRATE_MONO_MP3 = 'audio-24khz-48kbitrate-mono-mp3',
  AUDIO_24KHZ_96KBITRATE_MONO_MP3 = 'audio-24khz-96kbitrate-mono-mp3',
  WEBM_24KHZ_16BIT_MONO_OPUS = 'webm-24khz-16bit-mono-opus',
}

export enum PITCH {
  X_LOW = 'x-low',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  X_HIGH = 'x-high',
  DEFAULT = 'default',
}

export enum RATE {
  X_SLOW = 'x-slow',
  SLOW = 'slow',
  MEDIUM = 'medium',
  FAST = 'fast',
  X_FAST = 'x-fast',
  DEFAULT = 'default',
}

export enum VOLUME {
  SILENT = 'silent',
  X_SOFT = 'x-soft',
  SOFT = 'soft',
  MEDIUM = 'medium',
  LOUD = 'loud',
  X_LOUD = 'x-LOUD',
  DEFAULT = 'default',
}
