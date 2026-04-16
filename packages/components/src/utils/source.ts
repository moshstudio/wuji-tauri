import type { SourceType } from '@wuji-tauri/source-extension';

export interface SourceTheme {
  label: string;
  icon: string;
  emoji: string;
  unit: string;
  color: string;
  bgColor: string; // Vant 标签背景色 (浅色模式)
  textColor: string; // Vant 标签文本色 (浅色模式)
  bg: string; // Tailwind 背景类 (支持暗色模式)
  text: string; // Tailwind 文本类 (支持暗色模式)
}

const THEME_MAP: Record<string, SourceTheme> = {
  photo: {
    label: '图片',
    icon: 'photo',
    emoji: '🖼️',
    unit: '张',
    color: 'teal',
    bgColor: '#f0fdfa',
    textColor: '#0d9488',
    bg: 'bg-teal-50 dark:bg-teal-500/10',
    text: 'text-teal-600 dark:text-teal-400',
  },
  song: {
    label: '音乐',
    icon: 'music',
    emoji: '🎵',
    unit: '首',
    color: 'purple',
    bgColor: '#faf5ff',
    textColor: '#7e22ce',
    bg: 'bg-purple-50 dark:bg-purple-500/10',
    text: 'text-purple-600 dark:text-purple-400',
  },
  video: {
    label: '影视',
    icon: 'video',
    emoji: '🎬',
    unit: '个',
    color: 'blue',
    bgColor: '#eff6ff',
    textColor: '#1d4ed8',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
  },
  book: {
    label: '书籍',
    icon: 'description',
    emoji: '📖',
    unit: '章节',
    color: 'orange',
    bgColor: '#fff7ed',
    textColor: '#c2410c',
    bg: 'bg-orange-50 dark:bg-orange-500/10',
    text: 'text-orange-600 dark:text-orange-400',
  },
  comic: {
    label: '漫画',
    icon: 'photo-o',
    emoji: '🎨',
    unit: '话',
    color: 'pink',
    bgColor: '#fdf2f8',
    textColor: '#be185d',
    bg: 'bg-pink-50 dark:bg-pink-500/10',
    text: 'text-pink-600 dark:text-pink-400',
  },
  resource: {
    label: '资源',
    icon: 'folder-o',
    emoji: '📦',
    unit: '项',
    color: 'gray',
    bgColor: '#f9fafb',
    textColor: '#4b5563',
    bg: 'bg-gray-50 dark:bg-zinc-800',
    text: 'text-gray-600 dark:text-gray-400',
  },
  Home: {
    label: '首页',
    icon: 'wap-home',
    emoji: '🏠',
    unit: '项',
    color: 'blue',
    bgColor: '#eff6ff',
    textColor: '#1d4ed8',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
  },
};

// 别名映射，兼容 DownloadTask 的 category
THEME_MAP.Image = THEME_MAP.photo;
THEME_MAP.Music = THEME_MAP.song;
// DownloadTask 的首字母大写变种
THEME_MAP.Photo = THEME_MAP.photo;
THEME_MAP.Song = THEME_MAP.song;
THEME_MAP.Video = THEME_MAP.video;
THEME_MAP.Book = THEME_MAP.book;
THEME_MAP.Comic = THEME_MAP.comic;

const DEFAULT_THEME: SourceTheme = {
  label: '未知',
  icon: 'question-o',
  emoji: '❔',
  unit: '项',
  color: 'gray',
  bgColor: '#f1f5f9',
  textColor: '#475569',
  bg: 'bg-gray-50 dark:bg-zinc-800',
  text: 'text-gray-600 dark:text-gray-400',
};

/**
 * 获取资源类型的完整配色与显示方案
 */
export function getSourceTypeTheme(type?: string): SourceTheme {
  if (!type)
    return DEFAULT_THEME;
  return THEME_MAP[type] || DEFAULT_THEME;
}

/**
 * 兼容旧版的简易属性获取函数
 */
export function getSourceTypeProperty(type?: SourceType | string) {
  const theme = getSourceTypeTheme(type);
  return {
    name: theme.label,
    bgColor: theme.bgColor,
    textColor: theme.textColor,
  };
}
