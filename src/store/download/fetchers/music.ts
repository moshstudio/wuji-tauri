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
    addTask: (task: Omit<DownloadTask, 'status' | 'downloadedSize' | 'totalSize' | 'completedChunks' | 'createdAt'>) => Promise<void>;
    runBackgroundTask: (id: string, fn: () => Promise<void>) => void;
    markTaskError: (id: string, error: string) => Promise<void>;
    loadTasks: () => Promise<void>;
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
    const allSongs: SongInfo[] = [...(firstPage.list?.list || [])];

    // 获取所有页面的歌曲列表以获得准确的总数
    for (let p = 2; p <= totalPages; p++) {
      if (!isTaskRunning(deps.getTasks(), taskId))
        return;
      const page = await fetchPage(p);
      if (page?.list?.list) {
        allSongs.push(...page.list.list);
      }
    }

    const totalCount = allSongs.length;
    const currentTaskBefore = deps.getTasks().find(t => t.id === taskId);
    if (currentTaskBefore && currentTaskBefore.totalChunks !== totalCount) {
      // 更新总数量，防止进度显示错误（如 20/10 200%）
      await deps.addTask({
        ...currentTaskBefore,
        totalChunks: totalCount,
      });
    }

    const nameCounters = new Map<string, number>();

    // 并行处理下载
    const limit = pLimit(3);
    const promises = allSongs.map(async (song, index) => {
      const currentTask = deps.getTasks().find(t => t.id === taskId);
      if (currentTask?.completedChunks.includes(index))
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
              index,
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
              index,
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

    await Promise.allSettled(promises);

    // 刷新任务列表以确保状态最新
    await deps.loadTasks();

    const finalTask = deps.getTasks().find(t => t.id === taskId);
    const completedCount = finalTask?.completedChunks.length || 0;

    if (isTaskRunning(deps.getTasks(), taskId)) {
      if (completedCount > 0) {
        await invokePlugin('finalize_collection_download', { taskId });
      }
      else {
        await deps.markTaskError(
          taskId,
          `歌单所有歌曲下载失败，请检查网络或源站。`,
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
