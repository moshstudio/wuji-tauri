import type { DownloadTask } from '@/store/download/types';
import { invoke } from '@tauri-apps/api/core';

export const TASK_PREFIX = {
  BOOK: 'book_',
  COMIC: 'comic_',
  PHOTO_ALBUM: 'photo_album_',
  MUSIC_PLAYLIST: 'music_playlist_',
  VIDEO_COLL: 'video_coll_',
  MUSIC: 'music_',
  VIDEO: 'video_',
  PHOTO: 'photo_',
} as const;

export function getAudioExtFromUrl(url: string) {
  try {
    const cleanUrl = url.split('?')[0].split('#')[0];
    const lastDot = cleanUrl.lastIndexOf('.');
    if (lastDot > cleanUrl.lastIndexOf('/')) {
      const ext = cleanUrl.substring(lastDot).toLowerCase();
      const audioExts = [
        '.mp3',
        '.flac',
        '.wav',
        '.m4a',
        '.ogg',
        '.aac',
        '.mka',
        '.dsf',
        '.dff',
      ];
      if (audioExts.includes(ext))
        return ext;
    }
  }
  catch (e) {}
  return '.mp3';
}

export function invokePlugin<T = void>(
  method: string,
  args: Record<string, unknown> = {},
) {
  return invoke<T>(`plugin:download-manager|${method}`, args);
}

export function isTaskRunning(tasks: DownloadTask[], id: string) {
  const task = tasks.find(t => t.id === id);
  if (!task)
    return false;
  const status = task.status;
  return (
    status === 'downloading'
    || (typeof status === 'object' && status !== null && 'downloading' in status)
  );
}
