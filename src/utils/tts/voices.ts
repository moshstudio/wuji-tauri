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

export const TTS_VOICES: Voice[] = [
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
];
