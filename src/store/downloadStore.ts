import type {
  BookItem,
  BookSource,
  ComicItem,
  ComicSource,
  PhotoItem,
  PhotoSource,
  PlaylistInfo,
  SongInfo,
  SongSource,
  VideoItem,
  VideoResource,
  VideoSource,
} from '@wuji-tauri/source-extension';
import type { DownloadTask } from '@/store/download/types';
import { listen } from '@tauri-apps/api/event';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { cachedFetch } from '@wuji-tauri/fetch';
import { defineStore } from 'pinia';
import {
  showConfirmDialog,
  showFailToast,
  showLoadingToast,
  showSuccessToast,
  showToast,
} from 'vant';
import { ref, toRef, watch } from 'vue';
import {
  invokePlugin,
  TASK_PREFIX,
} from '@/store/download/utils';
import { bytesToSize, sanitizePathName } from '@/utils';
import {
  getBookSavePath,
  getBookTaskId,
  runBookFetcher,
} from './download/fetchers/book';
import {
  getComicSavePath,
  getComicTaskId,
  runComicFetcher,
} from './download/fetchers/comic';
import {
  getMusicPlaylistTaskId,
  getMusicSavePath,
  getMusicTaskId,
  runMusicPlaylistFetcher,
} from './download/fetchers/music';
import {
  getPhotoAlbumSavePath,
  getPhotoAlbumTaskId,
  getPhotoSavePath,
  getPhotoTaskId,
  runPhotoAlbumFetcher,
} from './download/fetchers/photo';
import {
  doRunVideoCollectionFetcher,
  getVideoCollectionSavePath,
  getVideoCollectionTaskId,
  getVideoSavePath,
  getVideoTaskId,
} from './download/fetchers/video';
import { useSettingStore } from './settingStore';
import { useSongCacheStore } from './songCacheStore';
import { useSongStore } from './songStore';
import { useStore } from './store';

export const useDownloadStore = defineStore('download', () => {
  // --- State ---
  const tasks = ref<DownloadTask[]>([]);
  const initialized = ref(false);
  const runningFetchers = new Set<string>();
  // 网速统计状态
  const trafficMap = new Map<
    string,
    { lastSize: number; lastTime: number; lastSpeed: string }
  >();
  const fetcherRegistry = new Map<
    string,
    (id: string, task: DownloadTask) => void | Promise<void>
  >();

  const settingStore = useSettingStore();
  const downloadPath = toRef(settingStore, 'downloadPath');

  async function loadDownloadPath() {
    if (!settingStore.downloadPath) {
      const defaultPath = await invokePlugin<string>('get_download_dir');
      settingStore.downloadPath = defaultPath;
    }
    else {
      await invokePlugin('set_download_dir', {
        path: settingStore.downloadPath,
      });
    }
  }

  watch(downloadPath, async (newPath) => {
    if (newPath)
      await invokePlugin('set_download_dir', { path: newPath });
  });

  // --- Core Task Management ---

  async function loadTasks() {
    tasks.value = await invokePlugin<DownloadTask[]>('get_tasks');
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
    reset = false,
  ) {
    trafficMap.delete(task.id);
    const { headers = {}, extra = {}, totalChunks = 0, ...rest } = task;
    await invokePlugin('add_task', {
      ...rest,
      headers,
      extra,
      totalChunks,
      reset,
    });
    await loadTasks();
  }

  async function pauseTask(id: string) {
    console.log(`[DownloadManager] Pausing task: ${id}`);
    await invokePlugin('pause_task', { id });
    runningFetchers.delete(id);
  }

  async function removeTask(id: string, deleteFile = false) {
    console.log(`[DownloadManager] Removing task: ${id}`);
    await stopFetcher(id);
    await invokePlugin('remove_task', { id, deleteFile });
    await loadTasks();
  }

  async function markTaskError(id: string, error: string) {
    await invokePlugin('mark_task_error', { id, error });
  }

  // --- Fetcher Framework ---

  function registerFetcher(
    prefix: string,
    fetcher: (id: string, task: DownloadTask) => void | Promise<void>,
  ) {
    fetcherRegistry.set(prefix, fetcher);
  }

  async function stopFetcher(id: string) {
    runningFetchers.delete(id);
  }

  function runBackgroundTask(id: string, taskFn: () => Promise<void>) {
    if (runningFetchers.has(id))
      return;
    runningFetchers.add(id);

    (async () => {
      try {
        await taskFn();
      }
      catch (e) {
        console.error(`[DownloadManager] Task ${id} run error:`, e);
        await markTaskError(id, `下载异常: ${e}`);
      }
      finally {
        runningFetchers.delete(id);
      }
    })();
  }

  async function resumeTask(id: string) {
    console.log(`[DownloadManager] Resuming task: ${id}`);
    trafficMap.delete(id); // 重置网速统计，避免从旧值跳跃

    if (runningFetchers.has(id))
      return;

    const taskIndex = tasks.value.findIndex(t => t.id === id);
    if (taskIndex !== -1) {
      tasks.value[taskIndex] = {
        ...tasks.value[taskIndex],
        status: 'downloading',
      };
    }

    const task = tasks.value.find(t => t.id === id);
    if (!task)
      return;

    // 匹配注册的抓取器进行信息刷新（如 Headers/URL 等）
    let bestMatch: { prefix: string; fetcher: (id: string, task: DownloadTask) => void | Promise<void> } | null = null;
    for (const [prefix, fetcher] of fetcherRegistry.entries()) {
      if (id.startsWith(prefix)) {
        if (!bestMatch || prefix.length > bestMatch.prefix.length) {
          bestMatch = { prefix, fetcher };
        }
      }
    }

    if (bestMatch) {
      await bestMatch.fetcher(id, task);
    }

    // 后端执行恢复（启动引擎）
    await invokePlugin('resume_task', { id });
  }

  async function checkExistingTask(taskId: string): Promise<boolean> {
    const existingTask = tasks.value.find(t => t.id === taskId);
    if (!existingTask)
      return true;

    const statusObj = existingTask.status;
    const statusStr
      = typeof statusObj === 'string'
        ? statusObj.toLowerCase()
        : Object.keys(statusObj)[0].toLowerCase();

    if (statusStr === 'downloading' || statusStr === 'pending') {
      showToast('任务正在进行中');
      return false;
    }

    if (statusStr === 'completed') {
      try {
        await showConfirmDialog({
          title: '任务已完成',
          message: '该资源已经下载过了，是否重新下载？',
          confirmButtonText: '重新下载',
          cancelButtonText: '查看文件',
        });
        return true;
      }
      catch {
        showInFolder(taskId);
        return false;
      }
    }
    return true;
  }

  async function prepareCollectionTask(params: {
    id: string;
    sourceId: string;
    title: string;
    url: string;
    savePath: string;
    category: DownloadTask['category'];
    totalChunks: number;
    headers?: Record<string, string>;
    extra?: Record<string, string>;
  }) {
    if (!(await checkExistingTask(params.id)))
      return;

    await addTask(
      {
        ...params,
        headers: params.headers || {},
        extra: params.extra || {},
      },
      true,
    );

    showToast('下载任务已添加');
    resumeTask(params.id);
  }

  async function prepareSingleTask(params: {
    id: string;
    sourceId: string;
    title: string;
    url: string;
    savePath: string;
    category: DownloadTask['category'];
    headers?: Record<string, string>;
    extra?: Record<string, string>;
  }) {
    if (!(await checkExistingTask(params.id)))
      return;
    await addTask(
      {
        ...params,
        headers: params.headers || {},
        extra: params.extra || {},
      },
      true,
    );
    showToast('下载任务已添加');
    resumeTask(params.id);
  }

  // --- Category Fetchers Registration ---

  registerFetcher(TASK_PREFIX.BOOK, async (id, task) => {
    const store = useStore();
    const source = store.getBookSource(task.sourceId);
    const bookId = task.extra?.bookId;
    if (!source || !bookId)
      return;

    const book: BookItem = store.getBookItem(source, bookId) || {
      id: bookId,
      title: task.title,
      url: task.url,
      sourceId: task.sourceId,
      chapters: [],
    };
    await runBookFetcher(book, source, id, {
      getTasks: () => tasks.value,
      addTask,
      runBackgroundTask,
    });
  });

  registerFetcher(TASK_PREFIX.COMIC, async (id, task) => {
    const store = useStore();
    const source = store.getComicSource(task.sourceId);
    const comicId = task.extra?.comicId;
    if (!source || !comicId)
      return;

    const comic: ComicItem = store.getComicItem(source, comicId) || {
      id: comicId,
      title: task.title,
      url: task.url,
      sourceId: task.sourceId,
      chapters: [],
    };
    await runComicFetcher(comic, source, id, {
      getTasks: () => tasks.value,
      addTask,
      runBackgroundTask,
      markTaskError,
    });
  });

  registerFetcher(TASK_PREFIX.MUSIC_PLAYLIST, async (id, task) => {
    const store = useStore();
    const source = store.getSongSource(task.sourceId);
    const playlistId = task.extra?.playlistId;
    if (!source || !playlistId)
      return;

    const playlist: PlaylistInfo = {
      id: playlistId,
      name: task.title.replace('歌单: ', ''),
      url: task.url,
      sourceId: task.sourceId,
      picUrl: '',
      list: { list: [], page: 1, totalPage: 1 },
    };
    await runMusicPlaylistFetcher(playlist, source, id, {
      getTasks: () => tasks.value,
      runBackgroundTask,
      markTaskError,
    });
  });

  registerFetcher(TASK_PREFIX.PHOTO_ALBUM, async (id, task) => {
    const store = useStore();
    const source = store.getPhotoSource(task.sourceId);
    const photoId = task.extra?.photoId;
    if (!source || !photoId)
      return;

    const photoItem: PhotoItem = store.getPhotoItem(source, photoId) || {
      id: photoId,
      title: task.title,
      url: task.url,
      sourceId: task.sourceId,
      cover: '',
    };
    await runPhotoAlbumFetcher(photoItem, source, id, {
      getTasks: () => tasks.value,
      addTask,
      runBackgroundTask,
      markTaskError,
    });
  });

  registerFetcher(TASK_PREFIX.VIDEO, async (id, task) => {
    const store = useStore();
    const source = store.getVideoSource(task.sourceId);
    if (!source)
      return;

    const videoId = task.extra?.videoId || '';
    const episodeId = task.extra?.episodeId || '';

    if (!videoId) {
      console.warn(`[VideoFetcher] Missing videoId in extra for task ${id}`);
      return;
    }

    const video: VideoItem = {
      id: videoId,
      title: task.title.split(' - ')[0],
      url: videoId,
      sourceId: task.sourceId,
    };

    return runBackgroundTask(id, async () => {
      console.log(`[VideoFetcher] Refreshing URL for single video: ${task.title}`);
      const detail = await store.videoDetail(source, video);
      if (detail?.resources?.length) {
        const resourceId = task.extra?.resourceId;
        const resource = detail.resources.find(r => r.id === resourceId) || detail.resources[0];
        const episode = resource.episodes?.find(e => e.id === episodeId) || resource.episodes?.[0];

        if (episode) {
          const urlMap = await store.videoPlay(source, video, resource, episode);
          if (urlMap?.url) {
            await addTask({
              ...task,
              url: urlMap.url,
              headers: { ...(task.headers || {}), ...(urlMap.headers || {}) },
            });
            console.log(`[VideoFetcher] URL refreshed for ${task.title}`);
          }
        }
      }
    });
  });

  registerFetcher(TASK_PREFIX.VIDEO_COLL, async (id, task) => {
    if (id.includes('_sub_'))
      return;
    const store = useStore();
    const source = store.getVideoSource(task.sourceId);
    if (!source)
      return;

    const videoId = task.extra?.videoId;
    if (!source || !videoId)
      return;

    const video: VideoItem = {
      id: videoId,
      title: task.title,
      url: videoId,
      sourceId: task.sourceId,
    };

    return runBackgroundTask(id, async () => {
      try {
        console.log(`[VideoFetcher] Refetching detail for resume: ${video.title} (ID: ${video.id})`);
        const detail = await store.videoDetail(source, video);
        if (detail?.resources?.length) {
          console.log(`[VideoFetcher] Detail refreshed successfully.`);
          const resourceId = task.extra?.resourceId;
          const resource = detail.resources.find(r => r.id === resourceId) || detail.resources[0];

          await doRunVideoCollectionFetcher(
            detail,
            source,
            resource,
            id,
            { getTasks: () => tasks.value, addTask, markTaskError },
          );
        }
        else {
          console.warn(`[VideoFetcher] No resources found during resume for ${video.title}`);
          throw new Error('未发现内容资源');
        }
      }
      catch (e: any) {
        console.error(`[VideoFetcher] Error during task resume for ${id}:`, e);
        await markTaskError(id, `恢复下载失败: 解析详情出错 (${e.message || String(e)})`);
      }
    });
  });

  registerFetcher(TASK_PREFIX.MUSIC, async (id, task) => {
    const store = useStore();
    const songStore = useSongStore();
    const source = store.getSongSource(task.sourceId);
    if (!source)
      return;

    const songId = task.extra?.songId;
    if (!source || !songId)
      return;

    const song: SongInfo = {
      id: songId,
      name: task.title.split(' - ')[0],
      sourceId: task.sourceId,
    };

    return runBackgroundTask(id, async () => {
      console.log(`[MusicFetcher] Refreshing URL for music: ${task.title}`);
      const url = await songStore.getSongPlayUrl(song, { silent: true });
      if (url) {
        await addTask({
          ...task,
          url,
          headers: { ...(task.headers || {}), ...(song.playHeaders || {}) },
        });
        console.log(`[MusicFetcher] URL refreshed for ${task.title}`);
      }
    });
  });

  registerFetcher(TASK_PREFIX.PHOTO, (_id, _task) => {
    // 图片通常不需要刷新 URL
  });

  // --- External API ---

  async function showInFolder(id: string) {
    try {
      await invokePlugin('show_in_folder', { id });
    }
    catch (e) {
      console.error('打开文件夹失败:', e);
    }
  }

  async function startBookDownload(book: BookItem, source: BookSource) {
    const taskId = getBookTaskId(book);
    await prepareCollectionTask({
      id: taskId,
      sourceId: source.item.id,
      title: book.title || '未命名书籍',
      url: book.url || '',
      savePath: getBookSavePath(book),
      category: 'Book',
      totalChunks: book.chapters?.length || 0,
      extra: { bookId: book.id },
    });
  }

  async function startComicDownload(comic: ComicItem, source: ComicSource) {
    const taskId = getComicTaskId(comic);
    await prepareCollectionTask({
      id: taskId,
      sourceId: source.item.id,
      title: comic.title || '未命名漫画',
      url: comic.url || '',
      savePath: getComicSavePath(comic),
      category: 'Comic',
      totalChunks: comic.chapters?.length || 0,
      extra: { comicId: comic.id },
    });
  }

  async function startMusicDownload(
    song: SongInfo,
    source: SongSource,
    playUrl: string,
    headers: Record<string, string> = {},
  ) {
    const taskId = getMusicTaskId(song);
    if (!(await checkExistingTask(taskId)))
      return;

    const savePath = getMusicSavePath(song, playUrl);

    // 优先尝试缓存
    const songCacheStore = useSongCacheStore();
    const cachedData = await songCacheStore.getSongBuffer(song);
    if (cachedData) {
      await prepareCollectionTask({
        id: taskId,
        sourceId: source.item.id,
        title: song.name || '未知歌曲',
        url: playUrl.startsWith('blob:') ? '' : playUrl,
        savePath,
        category: 'Music',
        totalChunks: 1,
        extra: { songId: song.id },
      });
      return;
    }

    await prepareSingleTask({
      id: taskId,
      sourceId: source.item.id,
      title: song.name || '未知歌曲',
      url: playUrl,
      savePath,
      category: 'Music',
      headers,
      extra: { songId: song.id },
    });
  }

  async function startMusicPlaylistDownload(
    playlist: PlaylistInfo,
    source?: SongSource,
  ) {
    const taskId = getMusicPlaylistTaskId(playlist);
    await prepareCollectionTask({
      id: taskId,
      sourceId: source?.item.id || playlist.sourceId || 'local',
      title: `歌单: ${playlist.name}`,
      url: playlist.url || '',
      savePath: sanitizePathName(playlist.name || taskId, { removeSpaces: false }),
      category: 'Music',
      totalChunks: playlist.list?.list.length || 1,
      extra: { playlistId: playlist.id },
    });
  }

  async function directDownloadMusic(
    song: SongInfo,
    _source: SongSource,
    playUrl: string,
    headers: Record<string, string> = {},
  ) {
    try {
      const defaultName = getMusicSavePath(song, playUrl);
      const filePath = await save({
        filters: [{ name: 'Music', extensions: ['mp3', 'flac', 'wav'] }],
        defaultPath: defaultName,
      });

      if (!filePath)
        return;

      const toast = showLoadingToast({
        message: '正在准备下载...',
        duration: 0,
        forbidClick: true,
      });
      const response = await cachedFetch(playUrl, { headers });
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      toast.message = '正在写入文件...';
      const arrayBuffer = await response.arrayBuffer();
      await writeFile(filePath, new Uint8Array(arrayBuffer));

      toast.close();
      showToast('下载完成');
    }
    catch (e) {
      console.error('[Download] Direct download failed:', e);
      showFailToast(`下载失败: ${(e as Error).message}`);
    }
  }

  async function startPhotoDownload(
    photo: PhotoItem,
    source: PhotoSource,
    imageUrl: string,
    headers: Record<string, string> = {},
  ) {
    const taskId = getPhotoTaskId(photo);
    await prepareSingleTask({
      id: taskId,
      sourceId: source.item.id,
      title: photo.title || '图片素材',
      url: imageUrl,
      savePath: getPhotoSavePath(photo),
      category: 'Image',
      headers,
      extra: { photoId: photo.id },
    });
  }

  async function startPhotoAlbumDownload(
    photo: PhotoItem,
    source: PhotoSource,
  ) {
    const taskId = getPhotoAlbumTaskId(photo);
    await prepareCollectionTask({
      id: taskId,
      sourceId: source.item.id,
      title: photo.title || '未命名相册',
      url: photo.url || '',
      savePath: getPhotoAlbumSavePath(photo, taskId),
      category: 'Image',
      totalChunks: 1,
      extra: { photoId: photo.id },
    });
  }

  async function startVideoDownload(
    video: { id: string; title: string },
    source: VideoSource,
    playUrl: string,
    headers: Record<string, string> = {},
    episode?: { id: string; title: string },
  ) {
    const taskId = getVideoTaskId(video, episode);

    if (!(await checkExistingTask(taskId)))
      return;

    await prepareSingleTask({
      id: taskId,
      sourceId: source.item.id,
      title: episode ? `${video.title} - ${episode.title}` : video.title,
      url: playUrl,
      savePath: getVideoSavePath(video, playUrl, episode),
      category: 'Video',
      headers,
      extra: {
        videoId: video.id,
        episodeId: episode?.id || '',
      },
    });
  }

  async function startVideoCollectionDownload(
    video: VideoItem,
    source: VideoSource,
    resource: VideoResource,
  ) {
    const episodes = resource.episodes || [];
    if (episodes.length === 0) {
      showToast('该资源下没有可下载的剧集');
      return;
    }

    const taskId = getVideoCollectionTaskId(video);

    await prepareCollectionTask({
      id: taskId,
      sourceId: source.item.id,
      title: video.title || '未命名视频合集',
      url: video.id,
      savePath: getVideoCollectionSavePath(video),
      category: 'Video',
      totalChunks: episodes.length,
      extra: {
        videoId: video.id,
        resourceId: resource.id,
      },
    });
  }

  function setupListener() {
    if (initialized.value)
      return;
    initialized.value = true;

    listen<DownloadTask>('download-progress', (event) => {
      const updatedTask = event.payload;

      // 实时网速计算
      const now = Date.now();
      const prev = trafficMap.get(updatedTask.id);
      const status = updatedTask.status;
      const statusStr
        = typeof status === 'string'
          ? status.toLowerCase()
          : (status && typeof status === 'object' && Object.keys(status)[0].toLowerCase()) || '';

      if (statusStr === 'downloading') {
        if (prev) {
          const timeDiff = now - prev.lastTime;
          if (timeDiff >= 1000) {
            const sizeDiff = Math.max(
              0,
              updatedTask.downloadedSize - prev.lastSize,
            );
            const bytesPerSecond = (sizeDiff * 1000) / timeDiff;

            if (sizeDiff > 0 || timeDiff > 3000) {
              updatedTask.speed
                = bytesPerSecond > 0
                  ? `${bytesToSize(bytesPerSecond)}/s`
                  : '0 B/s';
              trafficMap.set(updatedTask.id, {
                lastSize: updatedTask.downloadedSize,
                lastTime: now,
                lastSpeed: updatedTask.speed,
              });
            }
            else {
              updatedTask.speed = prev.lastSpeed;
            }
          }
          else {
            updatedTask.speed = prev.lastSpeed;
          }
        }
        else {
          trafficMap.set(updatedTask.id, {
            lastSize: updatedTask.downloadedSize,
            lastTime: now,
            lastSpeed: '0 B/s',
          });
          updatedTask.speed = '0 B/s';
        }
      }
      else if (statusStr === 'pending') {
        updatedTask.speed = '0 B/s';
      }
      else {
        updatedTask.speed = '';
        trafficMap.delete(updatedTask.id);
      }

      const index = tasks.value.findIndex(t => t.id === updatedTask.id);
      if (index !== -1) {
        const currentTask = tasks.value[index];

        // 状态转换逻辑辅助
        const getStatusStr = (s: any) =>
          typeof s === 'string'
            ? s.toLowerCase()
            : (s && typeof s === 'object' && Object.keys(s)[0].toLowerCase()) || '';

        const currentStatus = getStatusStr(currentTask.status);
        const newStatus = getStatusStr(updatedTask.status);

        // 如果是正在下载中，且新上报的进度比当前记录的还要小，且状态没有变，则可能是乱序事件，忽略它
        if (
          currentStatus === 'downloading'
          && newStatus === 'downloading'
          && updatedTask.downloadedSize < currentTask.downloadedSize
        ) {
          return;
        }

        tasks.value[index] = { ...updatedTask };
      }
      else {
        tasks.value.push(updatedTask);
      }
    });

    listen<string>('showSuccessToast', (event) => {
      showSuccessToast(event.payload);
    });

    loadTasks();
    loadDownloadPath();
  }

  async function checkFileExist(id: string) {
    return await invokePlugin<boolean>('check_task_file_exist', { id });
  }

  return {
    tasks,
    downloadPath,
    loadTasks,
    loadDownloadPath,
    updateDownloadPath: (path: string) => (settingStore.downloadPath = path),
    addTask,
    pauseTask,
    resumeTask,
    removeTask,
    showInFolder,
    markTaskError,
    setupListener,
    startBookDownload,
    startVideoDownload,
    startVideoCollectionDownload,
    startComicDownload,
    startMusicDownload,
    startMusicPlaylistDownload,
    directDownloadMusic,
    startPhotoDownload,
    startPhotoAlbumDownload,
    checkFileExist,
  };
});
