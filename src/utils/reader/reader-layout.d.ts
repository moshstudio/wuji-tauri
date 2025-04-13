import type { ReaderOptions, ReaderResult } from './types';

declare module '@/utils/reader/reader-layout' {
  function Reader(content: string, option: ReaderOptions): ReaderResult;

  export default Reader;
}
