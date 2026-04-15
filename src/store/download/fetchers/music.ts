import type { PlaylistInfo, SongInfo, SongSource } from '@wuji-tauri/source-extension';
import type { DownloadTask } from '../types';
import { joinSongArtists } from '@wuji-tauri/components';
import pLimit from 'p-limit';
import { sanitizePathName } from '@/utils';
import { useSongCacheStore } from '../../songCacheStore';
import { useSongStore } from '../../songStore';
import { useStore } from '../../store';
import { getAudioExtFromUrl, invokePlugin, isTaskRunning, TASK_PREFIX } from '../utils';

export async function runMusicPlaylistFetcher(
  playlist: PlaylistInfo,
  source: SongSource | undefined,
  taskId: string,
  deps: {
    getTasks: () => DownloadTask[];
    runBackgroundTask: (id: string, fn: () => Promise<void>) => void;
    markTaskError: (id: string, error: string) => Promise<void>;
  },
) {
  return deps.runBackgroundTask(taskId, async () => {
    const store = useStore();
    const songStore = useSongStore();
    const songCacheStore = useSongCacheStore();

    const fetchPage = async (p: number) => {
      if (source)
        return await store.songPlaylistDetail(source, playlist, p, { silent: true });
      return p === 1 ? playlist : null;
    };

    const firstPage = await fetchPage(1);
    if (!firstPage)
      throw new Error('无法加载歌单详情');

    const totalPages = firstPage.list?.totalPage || 1;
    const nameCounters = new Map<string, number>();
    let globalCount = 0;

    for (let p = 1; p <= totalPages; p++) {
      if (!isTaskRunning(deps.getTasks(), taskId))
        return;

      const currentDetail = p === 1 ? firstPage : await fetchPage(p);
      const currentList = currentDetail?.list?.list || [];

      // 并行处理下载
      const limit = pLimit(3);
      const pagePromises = currentList.map(async (song, indexInPage) => {
        const globalIndex = globalCount + indexInPage;
        const currentTask = deps.getTasks().find(t => t.id === taskId);
        if (currentTask?.completedChunks.includes(globalIndex))
          return;

        return limit(async () => {
          if (!isTaskRunning(deps.getTasks(), taskId))
            return;
          try {
            const artists = joinSongArtists(song.artists);
            const songName = song.name || '未知歌曲';
            const baseName = sanitizePathName(
              artists ? `${songName} - ${artists}` : songName,
              { removeSpaces: false },
            );
            const count = nameCounters.get(baseName) || 0;
            const safeTitle
              = count === 0 ? baseName : `${baseName} (${count})`;
            nameCounters.set(baseName, count + 1);

            // 检查缓存
            const cachedData = await songCacheStore.getSongBuffer(song);
            if (cachedData) {
              await invokePlugin('append_collection_chunk', {
                taskId,
                index: globalIndex,
                title: safeTitle,
                data: Array.from(cachedData),
              });
              return;
            }

            // 获取播放地址并下载
            const url = await songStore.getSongPlayUrl(song, {
              silent: true,
            });
            if (url) {
              await invokePlugin('download_remote_chunk', {
                taskId,
                index: globalIndex,
                title: safeTitle + getAudioExtFromUrl(url),
                url,
                headers: song.playHeaders || {},
              });
            }
          }
          catch (e) {
            console.error(`[MusicFetcher] Failed for ${song.name}:`, e);
          }
        });
      });

      await Promise.all(pagePromises);
      globalCount += currentList.length;
    }

    const finalTask = deps.getTasks().find(t => t.id === taskId);
    const completedCount = finalTask?.completedChunks.length || 0;
    const totalCount = playlist.list?.list.length || 1;

    if (isTaskRunning(deps.getTasks(), taskId)) {
      if (completedCount >= totalCount) {
        await invokePlugin('finalize_collection_download', { taskId });
      }
      else {
        await deps.markTaskError(
          taskId,
          `歌单下载完成，但有 ${totalCount - completedCount} 首歌曲失败。`,
        );
      }
    }
  });
}

export function getMusicTaskId(song: SongInfo) {
  return `${TASK_PREFIX.MUSIC}${sanitizePathName(song.id)}`;
}

export function getMusicPlaylistTaskId(playlist: PlaylistInfo) {
  return `${TASK_PREFIX.MUSIC_PLAYLIST}${sanitizePathName(playlist.id)}`;
}

export function getMusicSavePath(song: SongInfo, playUrl: string) {
  const artists = joinSongArtists(song.artists);
  const songName = song.name || '未知歌曲';
  const rawName = artists ? `${songName} - ${artists}` : songName;
  return `${sanitizePathName(rawName, { removeSpaces: false })}${getAudioExtFromUrl(playUrl)}`;
}
