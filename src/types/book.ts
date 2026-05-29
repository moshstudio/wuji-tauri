import type { BookChapter, BookItem } from '@wuji-tauri/source-extension';

export interface ReadTheme {
  /** 自定义主题唯一标识 */
  id?: string;
  /** 是否为用户创建的自定义主题 */
  isCustom?: boolean;
  name: string;
  color?: string;
  bgColor?: string;
  bgImage?: string;
  bgRepeat?:
    | 'no-repeat'
    | 'repeat'
    | 'repeat-x'
    | 'repeat-y'
    | 'round'
    | 'space';
  bgSize?: 'auto' | 'cover' | 'contain' | string;
  // 支持 CSS 渐变
  bgGradient?: string;
  // 背景位置
  bgPosition?: string;
  // 背景附着
  bgAttachment?: 'scroll' | 'fixed' | 'local';
  // 背景混合模式
  bgBlendMode?: string;
  // 文字阴影
  textShadow?: string;
  // 盒子阴影
  boxShadow?: string;
  // 边框样式
  border?: string;
  // 自定义 CSS 样式对象（完全自定义）
  customStyle?: Record<string, string>;
}

export interface BookHistory {
  book: BookItem;
  lastReadChapter?: BookChapter;
  lastReadTime: number;
}
