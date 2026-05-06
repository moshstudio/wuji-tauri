import type { PhotoItem, PhotoSource } from '@wuji-tauri/source-extension';
import type { DownloadTask } from '../types';
import pLimit from 'p-limit';
import { sanitizePathName } from '@/utils';
import { useStore } from '../../store';
import { invokePlugin, isTaskRunning, TASK_PREFIX } from '../utils';

export async function runPhotoAlbumFetcher(
  photo: PhotoItem,
  source: PhotoSource,
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
    const limit = pLimit(3);
    let totalImages = 0;

    const fetchPage = async (p: number) => {
      for (let retry = 0; retry < 3; retry++) {
        const res = await store.photoDetail(source, photo, p, {
          silent: true,
        });
        if (res)
          return res;
        if (retry < 2)
          await new Promise(r => setTimeout(r, 1500));
      }
      return null;
    };

    const firstPage = await fetchPage(1);
    if (!firstPage)
      throw new Error('获取相册详情失败');

    const totalPage = Number(firstPage.totalPage) || 1;
    const chunkLimit = pLimit(10);

    for (let p = 1; p <= totalPage; p++) {
      if (!isTaskRunning(deps.getTasks(), taskId))
        return;
      const detail = p === 1 ? firstPage : await limit(() => fetchPage(p));
      if (detail?.photos) {
        const pageImagesCount = detail.photos.length;
        const currentTotal = totalImages + pageImagesCount;

        // 动态更新总张数
        const tasks = deps.getTasks();
        const currentTask = tasks.find(t => t.id === taskId);
        const oldTotalChunks = currentTask?.totalChunks ?? 0;

        if (oldTotalChunks < currentTotal) {
          await deps.addTask({
            id: taskId,
            sourceId: source.item.id,
            title: photo.title || '未命名相册',
            url: photo.url || '',
            savePath: getPhotoAlbumSavePath(photo, taskId),
            category: 'Image',
            totalChunks: currentTotal,
            extra: { photoId: photo.id },
          });
        }

        const pagePushPromises = detail.photos.map((imgUrl, iInPage) => {
          const currentIndex = totalImages + iInPage;
          return chunkLimit(() =>
            invokePlugin('download_remote_chunk', {
              taskId,
              index: currentIndex,
              url: imgUrl,
              title: `${currentIndex + 1}`,
              headers: detail.photosHeaders || {},
            }),
          );
        });
        // 等待所有当前页的图片下载尝试完成，避免单张失败中断整个任务
        await Promise.allSettled(pagePushPromises);
        totalImages += pageImagesCount;
      }
    }

    // 强制刷新任务列表以确保 completedChunks 的长度是最新的（防止事件延迟）
    await deps.loadTasks();

    const finalTask = deps.getTasks().find(t => t.id === taskId);
    const completedCount = finalTask?.completedChunks.length || 0;

    if (isTaskRunning(deps.getTasks(), taskId)) {
      if (totalImages > 0 && completedCount > 0) {
        await invokePlugin('finalize_collection_download', { taskId });
      }
      else {
        await deps.markTaskError(
          taskId,
          totalImages === 0
            ? '未发现可下载的图片'
            : `所有图片均下载失败，请重试。`,
        );
      }
    }
  });
}

export function getPhotoTaskId(photo: PhotoItem) {
  return `photo_${sanitizePathName(photo.id)}_${Date.now()}`;
}

export function getPhotoAlbumTaskId(photo: PhotoItem) {
  return `${TASK_PREFIX.PHOTO_ALBUM}${sanitizePathName(photo.id)}`;
}

export function getPhotoSavePath(photo: PhotoItem) {
  return `${sanitizePathName(photo.title || String(Date.now()), { removeSpaces: false })}.jpg`;
}

export function getPhotoAlbumSavePath(photo: PhotoItem, taskId: string) {
  return sanitizePathName(photo.title || taskId, {
    removeSpaces: false,
  });
}
