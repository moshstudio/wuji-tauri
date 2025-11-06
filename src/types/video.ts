import { VideoItem } from '@wuji-tauri/source-extension';

export interface VideoHistory {
  video: VideoItem;
  lastReadTime: number;
}
