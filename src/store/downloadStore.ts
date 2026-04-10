import { defineStore } from 'pinia';
import { invoke } from '@tauri-apps/api/core';
import { sanitizePathName } from '@/utils';
import { listen } from '@tauri-apps/api/event';
import { ref, watch, toRef } from 'vue';
import { useSettingStore } from './settingStore';
import type {
  BookChapter,
  BookItem,
  BookSource,
  ComicChapter,
  ComicItem,
  ComicSource,
  PhotoItem,
  PhotoSource,
  SongInfo,
  SongSource,
  VideoItem,
  VideoSource,
} from '@wuji-tauri/source-extension';

export type DownloadStatus =
  | 'pending'
  | 'downloading'
  | 'paused'
  | 'completed'
  | { pending: null }
  | { downloading: null }
  | { paused: null }
  | { completed: null }
  | { error: string };

export interface DownloadTask {
  id: string;
  sourceId: string;
  title: string;
  url: string;
  savePath: string;
  category: 'Image' | 'Music' | 'Book' | 'Comic' | 'Video';
  status: DownloadStatus;
  totalSize: number;
  downloadedSize: number;
  totalChunks?: number;
  completedChunks: number[];
  createdAt: number;
  headers?: Record<string, string>;
  speed?: string;
}

export const useDownloadStore = defineStore('download', () => {
  const tasks = ref<DownloadTask[]>([]);
  const initialized = ref(false);
  const settingStore = useSettingStore();

  async function loadDownloadPath() {
    // 如果设置中没有路径，获取后端默认路径并保存
    if (!settingStore.downloadPath) {
      const defaultPath = await invoke<string>(
        'plugin:download-manager|get_download_dir',
      );
      settingStore.downloadPath = defaultPath;
    } else {
      // 如果设置中有路径，同步给后端（特别是启动时）
      await invoke('plugin:download-manager|set_download_dir', {
        path: settingStore.downloadPath,
      });
    }
  }

  // 监听设置中的路径变化，同步给后端
  watch(
    () => settingStore.downloadPath,
    async (newPath) => {
      if (newPath) {
        await invoke('plugin:download-manager|set_download_dir', {
          path: newPath,
        });
      }
    },
  );

  async function updateDownloadPath(newPath: string) {
    settingStore.downloadPath = newPath;
  }

  async function loadTasks() {
    const list = await invoke<DownloadTask[]>(
      'plugin:download-manager|get_tasks',
    );
    tasks.value = list;
  }

  async function addTask(
    task: Omit<
      DownloadTask,
      | 'status'
      | 'downloadedSize'
      | 'totalSize'
      | 'completedChunks'
      | 'createdAt'
    >,
  ) {
    const { headers = {}, totalChunks = 0, ...rest } = task;
    await invoke('plugin:download-manager|add_task', {
      ...rest,
      headers,
      totalChunks,
    });
    await loadTasks();
  }

  async function pauseTask(id: string) {
    await invoke('plugin:download-manager|pause_task', { id });
  }

  async function resumeTask(id: string) {
    await invoke('plugin:download-manager|resume_task', { id });
  }

  async function removeTask(id: string) {
    await invoke('plugin:download-manager|remove_task', { id });
    tasks.value = tasks.value.filter((t) => t.id !== id);
  }

  function setupListener() {
    if (initialized.value) return;
    initialized.value = true;

    listen<DownloadTask>('download-progress', (event) => {
      const updatedTask = event.payload;
      const index = tasks.value.findIndex((t) => t.id === updatedTask.id);
      if (index !== -1) {
        // 计算速度 (简化版)
        const oldSize = tasks.value[index].downloadedSize;
        const newSize = updatedTask.downloadedSize;
        // 实际应用中可以加一个时间间隔计算
        tasks.value[index] = { ...updatedTask };
      } else {
        tasks.value.push(updatedTask);
      }
    });

    loadTasks();
    loadDownloadPath();
  }

  async function startBookDownload(book: BookItem, source: BookSource) {
    const taskId = `book_${sanitizePathName(book.id)}`;
    const totalChunks = book.chapters?.length || 0;

    // 1. 创建任务
    await addTask({
      id: taskId,
      sourceId: source.item.id,
      title: book.title || '未命名书籍',
      url: book.url || '',
      savePath: `${sanitizePathName(book.title || taskId, { removeSpaces: false })}.txt`,
      category: 'Book',
      totalChunks: totalChunks,
    });

    // 2. 标记任务为下载中
    await resumeTask(taskId);

    // 3. 开始异步抓取（不阻塞 UI）
    (async () => {
      const chapters = book.chapters || [];
      for (let i = 0; i < totalChunks; i++) {
        const chapter = chapters[i];
        try {
          // 调用现有的 store.bookRead 获取内容
          const store = (await import('@/store')).useStore();
          const content = await store.bookRead(source, book, chapter);
          if (content) {
            // 将文字转为字节推给 Rust
            const encoder = new TextEncoder();
            const data = encoder.encode(content);
            await invoke('plugin:download-manager|append_collection_chunk', {
              taskId,
              index: i,
              title: chapter.title || `Chapter ${i + 1}`,
              data: Array.from(data),
            });
          }
        } catch (e) {
          console.error(`下载章节 ${i} 失败:`, e);
        }
      }
      // 全部完成后触发合并
      await invoke('plugin:download-manager|finalize_collection_download', {
        taskId,
      });
    })();
  }

  async function startVideoDownload(
    video: VideoItem,
    source: VideoSource,
    playUrl: string,
    headers: Record<string, string> = {},
  ) {
    const taskId = `video_${sanitizePathName(video.id)}`;

    // 1. 创建任务
    await addTask({
      id: taskId,
      sourceId: source.item.id,
      title: video.title || '未命名视频',
      url: playUrl,
      savePath: `${sanitizePathName(video.title || taskId, { removeSpaces: false })}.mp4`,
      category: 'Video',
      headers: headers,
      totalChunks: 0,
    });

    // 2. 启动 Rust 后端引擎进行多线程下载
    await resumeTask(taskId);
    loadTasks();
  }

  async function startComicDownload(comic: ComicItem, source: ComicSource) {
    const taskId = `comic_${sanitizePathName(comic.id)}`;
    const totalChunks = comic.chapters?.length || 0;

    await addTask({
      id: taskId,
      sourceId: source.item.id,
      title: comic.title || '未命名漫画',
      url: comic.url || '',
      savePath: sanitizePathName(comic.title || taskId, { removeSpaces: false }), // 漫画通常存为文件夹
      category: 'Comic',
      totalChunks: totalChunks,
    });

    await resumeTask(taskId);

    (async () => {
      const chapters = comic.chapters || [];
      for (let i = 0; i < totalChunks; i++) {
        const chapter = chapters[i];
        try {
          const store = (await import('@/store')).useStore();
          // 获取章节内的所有图片链接
          const res = await store.comicRead(source, comic, chapter);
          const images = res?.photos;
          if (images && images.length > 0) {
            // 漫画的一“片”可以是一个章节的所有图片
            // 这里我们简化处理：将章节内的图片依次下载，索引设为 i_j
            for (let j = 0; j < images.length; j++) {
              await invoke('plugin:download-manager|download_remote_chunk', {
                taskId,
                index: i * 1000 + j, // 简单的复合索引
                url: images[j],
                headers: res?.photosHeaders || {},
              });
            }
          }
        } catch (e) {
          console.error(`漫画章节 ${i} 下载失败:`, e);
        }
      }
      await invoke('plugin:download-manager|finalize_collection_download', {
        taskId,
      });
    })();
  }

  async function startMusicDownload(
    song: SongInfo,
    source: SongSource,
    playUrl: string,
    headers: Record<string, string> = {},
  ) {
    const taskId = `music_${sanitizePathName(song.id)}`;
    await addTask({
      id: taskId,
      sourceId: source.item.id,
      title: song.name || '未知歌曲',
      url: playUrl,
      savePath: `${sanitizePathName(song.name || song.id, { removeSpaces: false })}.mp3`,
      category: 'Music',
      headers,
    });
    await resumeTask(taskId);
  }

  async function startPhotoDownload(
    photo: PhotoItem,
    source: PhotoSource,
    imageUrl: string,
    headers: Record<string, string> = {},
  ) {
    const taskId = `photo_${sanitizePathName(photo.id)}_${Date.now()}`;
    await addTask({
      id: taskId,
      sourceId: source.item.id,
      title: photo.title || '图片素材',
      url: imageUrl,
      savePath: `${sanitizePathName(photo.title || String(Date.now()), { removeSpaces: false })}.jpg`,
      category: 'Image',
      headers,
    });
    await resumeTask(taskId);
  }

  async function startPhotoAlbumDownload(
    photo: PhotoItem,
    source: PhotoSource,
  ) {
    const taskId = `photo_album_${sanitizePathName(photo.id)}`;
    const store = (await import('@/store')).useStore();

    // 1. 先获取第一页，确定总页数
    const firstPage = await store.photoDetail(source, photo, 1);
    if (!firstPage) return;

    const totalPage = Number(firstPage.totalPage) || 1;

    // 2. 创建任务 (此时还不知道确切的图片总数，先用一个大概值或 0)
    await addTask({
      id: taskId,
      sourceId: source.item.id,
      title: photo.title || '未命名相册',
      url: photo.url || '',
      savePath: sanitizePathName(photo.title || taskId, { removeSpaces: false }), // 存为目录
      category: 'Image',
      totalChunks: 1, // 占位，后端 collection 逻辑依赖 total_chunks > 0 分辨类型
    });

    await resumeTask(taskId);

    // 3. 异步抓取所有页面并推送下载
    (async () => {
      try {
        // 先获取所有页面的数据以确定总图片数
        const pagePromises = [];
        for (let p = 1; p <= totalPage; p++) {
          pagePromises.push(
            p === 1 ? firstPage : store.photoDetail(source, photo, p),
          );
        }

        const pageResults = await Promise.all(pagePromises);
        const allPhotos: { url: string; headers: Record<string, string> }[] =
          [];

        for (const detail of pageResults) {
          if (detail?.photos) {
            for (const imgUrl of detail.photos) {
              allPhotos.push({
                url: imgUrl,
                headers: detail.photosHeaders || {},
              });
            }
          }
        }

        // 更新任务的真实总分片数，以便进度条显示正确
        await addTask({
          id: taskId,
          sourceId: source.item.id,
          title: photo.title || '未命名相册',
          url: photo.url || '',
          savePath: sanitizePathName(photo.title || taskId, { removeSpaces: false }),
          category: 'Image',
          totalChunks: allPhotos.length,
        });

        // 顺序下载图片
        for (let i = 0; i < allPhotos.length; i++) {
          const { url, headers } = allPhotos[i];
          await invoke('plugin:download-manager|download_remote_chunk', {
            taskId,
            index: i,
            url,
            headers,
          });
        }

        // 全部完成后触发合并/整理
        await invoke('plugin:download-manager|finalize_collection_download', {
          taskId,
        });
      } catch (e) {
        console.error('下载相册失败:', e);
      }
    })();
  }

  return {
    tasks,
    downloadPath: toRef(settingStore, 'downloadPath'), // 直接引用 settingStore 中的属性
    loadTasks,
    loadDownloadPath,
    updateDownloadPath,
    addTask,
    pauseTask,
    resumeTask,
    removeTask,
    setupListener,
    startBookDownload,
    startVideoDownload,
    startComicDownload,
    startMusicDownload,
    startPhotoDownload,
    startPhotoAlbumDownload,
  };
});
