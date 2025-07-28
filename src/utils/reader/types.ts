export interface ReaderOptions {
  platform?:
    | 'browser'
    | 'quickApp'
    | 'wxMini'
    | 'alipayMini'
    | 'alitbMini'
    | 'swan';
  id?: string;
  splitCode?: string;
  fast?: boolean;
  type?: 'page' | 'line';
  width: number;
  height: number;
  fontFamily?: string;
  fontSize: number;
  lineHeight?: number;
  pGap?: number;
  pIndent?: number;
  title?: string;
  titleSize?: number;
  titleHeight?: number;
  titleWeight?: string;
  titleGap?: number;
}
export interface LineData {
  isTitle: boolean;
  center: boolean;
  pFirst: boolean;
  pLast: boolean;
  pIndex: number;
  lineIndex: number;
  textIndex: number;
  text: string;
}
export type ReaderResult = LineData[][];
