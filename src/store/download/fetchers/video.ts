import type { VideoItem, VideoResource, VideoSource } from '@wuji-tauri/source-extension';
import type { DownloadTask } from '../types';
import { sanitizePathName } from '@/utils';
import { alignVideoUrlForDownload } from '@/utils/videoDownloadProxy';
import { resolveVideoEpisodeUrl } from '@/utils/videoPlayResolver';
import { useStore } from '../../store';
import { invokePlugin, isTaskRunning, TASK_PREFIX } from '../utils';

async function dispatchEpisodeChunkDownload(params: {
  taskId: string;
  index: number;
  episodeTitle: string;
  saveRootPath: string;
  url: string;
  headers?: Record<string, string>;
}) {
  const { taskId, index, episodeTitle, saveRootPath, url, headers = {} } = params;
  const safeEpisodeTitle = sanitizePathName(episodeTitle, {
    removeSpaces: false,
  });

  if (url.toLowerCase().includes('.m3u8')) {
    console.log(
      `[VideoFetcher] Dispatching M3U8 chunk download for: ${episodeTitle}`,
    );
    const subSavePath = `${saveRootPath}/${safeEpisodeTitle}.ts`;
    await invokePlugin('download_m3u8_chunk', {
      taskId,
      index,
      url,
      savePath: subSavePath,
      headers,
    });
    return;
  }

  console.log(
    `[VideoFetcher] Dispatching HTTP chunk for: ${episodeTitle}`,
  );
  await invokePlugin('download_remote_chunk', {
    taskId,
    index,
    title: safeEpisodeTitle,
    url,
    headers,
  });
}

export async function doRunVideoCollectionFetcher(
  video: VideoItem,
  source: VideoSource,
  resource: VideoResource,
  taskId: string,
  deps: {
    getTasks: () => DownloadTask[];
    addTask: (task: any) => Promise<void>;
    markTaskError: (id: string, error: string) => Promise<void>;
    loadTasks: () => Promise<void>;
  },
) {
  const store = useStore();
  const episodes = resource.episodes || [];
  const totalEpisodes = episodes.length;

  console.log(
    `[VideoFetcher] Episode processing loop starting for: ${video.title}`,
  );

  // 等待状态同步
  let retry = 0;
  while (!isTaskRunning(deps.getTasks(), taskId) && retry < 6) {
    console.log(
      `[VideoFetcher] Waiting for task ${taskId} (attempt ${retry + 1})...`,
    );
    await new Promise(r => setTimeout(r, 500));
    retry++;
  }

  if (!isTaskRunning(deps.getTasks(), taskId)) {
    console.warn(
      `[VideoFetcher] Task ${taskId} status sync failed, aborting.`,
    );
    return;
  }

  // 确保任务总分片数正确
  const tasks = deps.getTasks();
  const taskInStore = tasks.find(t => t.id === taskId);
  if (taskInStore && (taskInStore.totalChunks ?? 0) !== totalEpisodes) {
    await deps.addTask({ ...taskInStore, totalChunks: totalEpisodes });
  }

  for (let i = 0; i < totalEpisodes; i++) {
    if (!isTaskRunning(deps.getTasks(), taskId)) {
      console.log(`[VideoFetcher] Task ${taskId} stopped, exiting loop.`);
      return;
    }

    // 检查该集是否已下载
    const currentTask = deps.getTasks().find(t => t.id === taskId);
    if (currentTask?.completedChunks.includes(i)) {
      console.log(
        `[VideoFetcher] Episode ${i + 1} already completed, skipping.`,
      );
      continue;
    }

    const episode = episodes[i];
    console.log(
      `[VideoFetcher] Processing ${i + 1}/${totalEpisodes}: ${episode.title}`,
    );

    try {
      // 1) 首次：按初始链接下载（不走 WebView，避免额外开销）
      const {
        raw: firstRaw,
        resolved: firstAttemptUrlMap,
        webviewUsed: firstWebviewUsed,
      } = await resolveVideoEpisodeUrl({
        source,
        video,
        resource,
        episode,
        videoPlay: (s, v, r, e) => store.videoPlay(s, v, r, e),
        allowWebviewFallback: false,
      });

      if (firstAttemptUrlMap.isLive) {
        console.warn(`[VideoFetcher] Skipping live stream: ${episode.title}`);
        await invokePlugin('mark_chunk_completed', { taskId, index: i });
        continue;
      }

      let downloaded = false;
      try {
        const firstDownloadTarget = await alignVideoUrlForDownload(
          firstAttemptUrlMap,
          {
            pageUrl: firstRaw.url,
            webviewUsed: firstWebviewUsed,
          },
        );
        await dispatchEpisodeChunkDownload({
          taskId,
          index: i,
          episodeTitle: episode.title,
          saveRootPath: taskInStore?.savePath || video.title || 'video',
          url: firstDownloadTarget.url,
          headers: firstDownloadTarget.headers || {},
        });
        downloaded = true;
      }
      catch (firstError) {
        if (!isTaskRunning(deps.getTasks(), taskId))
          return; // 如果是由于暂停导致的，直接停止 fetcher
        console.warn(
          `[VideoFetcher] First attempt failed for ${episode.title}, refetching playable url...`,
          firstError,
        );

        // 2) 失败后：重新获取 URL，并走完整播放解析链路（含 WebView）
        try {
          const {
            raw: retryRaw,
            resolved: retryUrlMap,
            webviewUsed: retryWebviewUsed,
          } = await resolveVideoEpisodeUrl({
            source,
            video,
            resource,
            episode,
            videoPlay: (s, v, r, e) => store.videoPlay(s, v, r, e),
            allowWebviewFallback: true,
          });

          const retryDownloadTarget = await alignVideoUrlForDownload(
            retryUrlMap,
            {
              pageUrl: retryRaw.url,
              webviewUsed: retryWebviewUsed,
            },
          );
          await dispatchEpisodeChunkDownload({
            taskId,
            index: i,
            episodeTitle: episode.title,
            saveRootPath: taskInStore?.savePath || video.title || 'video',
            url: retryDownloadTarget.url,
            headers: retryDownloadTarget.headers || {},
          });
          downloaded = true;
        }
        catch (retryError) {
          console.error(
            `[VideoFetcher] Retry attempt failed for episode ${episode.title}:`,
            retryError,
          );
          if (!isTaskRunning(deps.getTasks(), taskId))
            return; // 如果是由于暂停导致的，直接停止 fetcher
        }
      }

      if (downloaded && isTaskRunning(deps.getTasks(), taskId)) {
        // 分片落盘成功后后端已写入 completed_chunks，这里不重复标记
      }
    }
    catch (e) {
      console.error(`[VideoFetcher] Episode ${episode.title} failed:`, e);
      // 不再标记全局 Error 以免中断循环，只记录日志
    }
  }

  // 刷新任务列表以确保状态最新
  await deps.loadTasks();

  // 检查是否所有分片都已完成
  const finalTask = deps.getTasks().find(t => t.id === taskId);
  const completedCount = finalTask?.completedChunks.length || 0;

  if (isTaskRunning(deps.getTasks(), taskId)) {
    if (completedCount > 0) {
      await invokePlugin('finalize_collection_download', { taskId });
      console.log(`[VideoFetcher] Collection task ${taskId} fully completed.`);
    }
    else {
      const errorMsg = '所有剧集下载均失败，请检查网络或源站。';
      console.warn(`[VideoFetcher] ${errorMsg}`);
      await deps.markTaskError(taskId, errorMsg);
    }
  }
  console.log(`[VideoFetcher] Collection task ${taskId} finalized.`);
}

export function getVideoTaskId(video: { id: string }, episode?: { id: string }) {
  const videoId = sanitizePathName(video.id, { removeSpaces: true });
  const episodeId = episode
    ? sanitizePathName(episode.id, { removeSpaces: true })
    : '';
  return `${TASK_PREFIX.VIDEO}${videoId}${episodeId ? `_${episodeId}` : ''}`;
}

export function getVideoCollectionTaskId(video: VideoItem) {
  const videoId = sanitizePathName(video.id, { removeSpaces: true });
  return `${TASK_PREFIX.VIDEO_COLL}${videoId}`;
}

export function getVideoSavePath(video: { id: string; title: string }, playUrl: string, episode?: { id: string; title: string }) {
  const videoId = sanitizePathName(video.id, { removeSpaces: true });
  const seriesTitle = sanitizePathName(video.title || videoId, {
    removeSpaces: false,
  });
  const itemTitle = episode
    ? sanitizePathName(episode.title, { removeSpaces: false })
    : seriesTitle;

  let ext = '.mp4';
  if (playUrl.toLowerCase().includes('.m3u8')) {
    ext = '.ts'; // M3U8 本质是 MPEG-TS 流，拼接产物应保存为 .ts
  }
  else {
    try {
      const urlWithoutQuery = playUrl.split('?')[0];
      const lastDot = urlWithoutQuery.lastIndexOf('.');
      if (lastDot > urlWithoutQuery.lastIndexOf('/')) {
        const detectedExt = urlWithoutQuery.substring(lastDot).toLowerCase();
        const videoExts = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.ts'];
        if (videoExts.includes(detectedExt))
          ext = detectedExt;
      }
    }
    catch (e) {}
  }
  return `${seriesTitle}/${itemTitle}${ext}`;
}

export function getVideoCollectionSavePath(video: VideoItem) {
  const videoId = sanitizePathName(video.id, { removeSpaces: true });
  return sanitizePathName(video.title || videoId, {
    removeSpaces: false,
  });
}
