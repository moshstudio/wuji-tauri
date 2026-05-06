import type { ComicItem, ComicSource } from '@wuji-tauri/source-extension';
import type { DownloadTask } from '../types';
import pLimit from 'p-limit';
import { sanitizePathName } from '@/utils';
import { useStore } from '../../store';
import { invokePlugin, isTaskRunning, TASK_PREFIX } from '../utils';

export async function runComicFetcher(
  comic: ComicItem,
  source: ComicSource,
  taskId: string,
  deps: {
    getTasks: () => DownloadTask[];
    addTask: (task: any) => Promise<void>;
    runBackgroundTask: (id: string, fn: () => Promise<void>) => void;
    markTaskError: (id: string, error: string) => Promise<void>;
    loadTasks: () => Promise<void>;
  },
) {
  return deps.runBackgroundTask(taskId, async () => {
    const store = useStore();
    if (!comic.chapters?.length) {
      const detail = await store.comicDetail(source, comic);
      if (detail?.chapters)
        comic.chapters = detail.chapters;
    }

    const chapters = comic.chapters || [];
    const totalChunks = chapters.length;

    // 同步总章节数
    const tasks = deps.getTasks();
    const existingTask = tasks.find(t => t.id === taskId);
    if (existingTask && (existingTask.totalChunks ?? 0) !== totalChunks) {
      await deps.addTask({
        ...existingTask,
        totalChunks,
        headers: existingTask.headers || {},
      });
    }

    // 1. 初始化并发控制
    const chapterLimit = pLimit(3); // 最多 3 个章节同时解析+下载
    const downloadLimit = pLimit(10); // 全局并发下载连接

    const chapterTasks = chapters.map((chapter, i) =>
      chapterLimit(async () => {
        if (!isTaskRunning(deps.getTasks(), taskId))
          return;

        // 检查该章节是否已完成
        const currentTask = deps.getTasks().find(t => t.id === taskId);
        if (currentTask?.completedChunks.includes(i)) {
          return;
        }

        // 频率控制
        const delay = i < 3 ? i * 200 : 50 + Math.random() * 100;
        await new Promise(r => setTimeout(r, delay));

        try {
          // A. 解析章节内容
          const res = await store.comicRead(source, comic, chapter);
          if (!res?.photos || res.photos.length === 0) {
            console.warn(`[Download] 章节解析无图片: ${chapter.title}`);
            // 虽然没图，但也标记个完成，防止卡住
            await invokePlugin('mark_chunk_completed', { taskId, index: i });
            return;
          }

          const safeChapterTitle = sanitizePathName(
            chapter.title || `第 ${i + 1} 话`,
            { removeSpaces: false },
          );

          // B. 开始下载章节内的所有图片
          const photoPromises = res.photos.map((url, j) =>
            downloadLimit(async () => {
              if (!isTaskRunning(deps.getTasks(), taskId))
                return;

              // 偏移索引以避免干扰主进度
              const photoIndex = 1_000_000 + i * 1000 + j;

              await invokePlugin('download_remote_chunk', {
                taskId,
                index: photoIndex,
                title: `${safeChapterTitle}/${(j + 1).toString().padStart(4, '0')}`,
                url,
                headers: res.photosHeaders || {},
              });
            }),
          );

          // 等待所有图片下载尝试完成
          const results = await Promise.allSettled(photoPromises);
          const allSuccess = results.every(r => r.status === 'fulfilled');

          if (!allSuccess) {
            console.error(
              `[Download] 章节 ${safeChapterTitle} 部分图片下载失败`,
            );
            // 如果只是部分失败，我们依然尝试打包，但不标记章节完成
          }

          // C. 执行章节打包操作
          try {
            console.log(
              `[DownloadManager] 开始打包章节: ${safeChapterTitle}`,
            );
            await invokePlugin('package_to_cbz', {
              taskId,
              subdirName: safeChapterTitle,
            });

            if (allSuccess) {
              // D. 只有完全成功的章节才标记为已完成
              await invokePlugin('mark_chunk_completed', {
                taskId,
                index: i,
              });
            }
          }
          catch (packErr) {
            console.error(
              `[DownloadManager] 章节打包失败: ${safeChapterTitle}`,
              packErr,
            );
          }
        }
        catch (e) {
          console.error(`[Download] 章节任务执行失败: ${chapter.title}`, e);
        }
      }),
    );

    await Promise.all(chapterTasks);

    // 刷新任务列表以确保状态最新
    await deps.loadTasks();

    // 获取最新任务状态
    const currentTaskFinal = deps.getTasks().find(t => t.id === taskId);
    const completedChunksCount
      = currentTaskFinal?.completedChunks.filter(idx => idx < 1_000_000).length
        || 0;

    if (isTaskRunning(deps.getTasks(), taskId)) {
      if (completedChunksCount > 0) {
        await invokePlugin('finalize_collection_download', { taskId });
      }
      else {
        await deps.markTaskError(
          taskId,
          `所有章节处理失败，请重试。`,
        );
      }
    }
  });
}

export function getComicTaskId(comic: ComicItem) {
  const comicId = sanitizePathName(comic.id, { removeSpaces: true });
  return `${TASK_PREFIX.COMIC}${comicId}`;
}

export function getComicSavePath(comic: ComicItem) {
  return sanitizePathName(comic.title || `comic_${comic.id}`, {
    removeSpaces: false,
  });
}
