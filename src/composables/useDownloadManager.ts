import { open } from '@tauri-apps/plugin-dialog';
import { getSourceTypeTheme } from '@wuji-tauri/components';
import { showToast } from 'vant';
import { computed, onMounted, ref } from 'vue';
import { useDownloadStore } from '@/store';
import { bytesToSize } from '@/utils';

export function useDownloadManager() {
  const downloadStore = useDownloadStore();

  // 1. 响应式状态 (UI 状态)
  const activeTab = ref('all');
  const showSettings = ref(false);
  const showDeleteDialog = ref(false);
  const taskToDelete = ref<any>(null);
  const alsoDeleteFile = ref(false);
  const isClearingCompleted = ref(false);

  // 2. 状态监听
  onMounted(() => {
    downloadStore.setupListener();
  });

  // 3. 基础解析辅助函数
  const getStatusText = (status: any) => {
    if (typeof status === 'string') {
      const s = status.toLowerCase();
      if (s === 'pending')
        return '等待中';
      if (s === 'downloading')
        return '下载中';
      if (s === 'paused')
        return '已暂停';
      if (s === 'completed')
        return '已完成';
    }
    else if (status && typeof status === 'object') {
      if ('pending' in status || 'Pending' in status)
        return '等待中';
      if ('downloading' in status || 'Downloading' in status)
        return '下载中';
      if ('paused' in status || 'Paused' in status)
        return '已暂停';
      if ('completed' in status || 'Completed' in status)
        return '已完成';
      if ('error' in status || 'Error' in status) {
        return `错误: ${status.error || status.Error}`;
      }
    }
    return '未知';
  };

  const getTaskError = (status: any) => {
    if (status && typeof status === 'object') {
      if ('error' in status || 'Error' in status) {
        return status.error || status.Error;
      }
    }
    return '';
  };

  const getStatusType = (status: any) => {
    const text = getStatusText(status);
    if (text === '下载中')
      return 'primary';
    if (text === '已暂停')
      return 'warning';
    if (text === '已完成')
      return 'success';
    if (text.startsWith('错误'))
      return 'danger';
    return 'default';
  };

  const isCollectionTask = (task: any) => {
    if (task.totalChunks && task.totalChunks > 0) {
      if (['Image', 'Comic', 'Book'].includes(task.category))
        return true;
      if (
        task.id.startsWith('music_playlist_')
        || task.id.startsWith('video_collection_')
        || task.id.startsWith('video_coll_')
        || task.id.startsWith('photo_album_')
      ) {
        return true;
      }
      // 只要指定了总片数，且属于视频/音乐类别，均视为按片计量的任务
      if (['Video', 'Music'].includes(task.category))
        return true;
    }
    return false;
  };

  const getProgress = (task: any) => {
    const statusText = getStatusText(task.status);
    if (statusText === '已完成')
      return 100;

    if (task.totalSize > 0 && !isCollectionTask(task)) {
      return Math.floor((task.downloadedSize / task.totalSize) * 100);
    }
    else if (task.totalChunks && task.totalChunks > 0) {
      const completedCount = task.completedChunks.length;
      let partialProgress = 0;

      if (task.chunkProgress) {
        Object.entries(task.chunkProgress).forEach(([idx, progress]) => {
          const i = Number.parseInt(idx);
          // 排除掉已经计入 completedChunks 的部分，避免重复累加
          if (i < 1000000 && !task.completedChunks.includes(i)) {
            partialProgress += progress as number;
          }
        });
      }

      const totalProgress
        = (completedCount + partialProgress) / task.totalChunks;

      const p = Math.floor(totalProgress * 100);
      return Math.min(99, p);
    }
    return 0;
  };

  // 4. 统计与过滤
  const stats = computed(() => {
    const downloading = downloadStore.tasks.filter(
      t => getStatusText(t.status) === '下载中',
    ).length;
    const total = downloadStore.tasks.length;
    return { downloading, total };
  });

  const filteredTasks = computed(() => {
    const sorted = [...downloadStore.tasks]
      .filter(t => !t.id.includes('_sub_'))
      .sort((a, b) => b.createdAt - a.createdAt);

    if (activeTab.value === 'all')
      return sorted;
    if (activeTab.value === 'downloading') {
      return sorted.filter((t) => {
        const status = getStatusText(t.status);
        return status === '下载中' || status === '等待中' || status === '已暂停';
      });
    }
    if (activeTab.value === 'completed') {
      return sorted.filter(t => getStatusText(t.status) === '已完成');
    }
    return sorted;
  });

  // 5. 交互动作
  const handleAction = async (task: any) => {
    const status = getStatusText(task.status);
    if (status === '下载中') {
      await downloadStore.pauseTask(task.id);
    }
    else {
      downloadStore.resumeTask(task.id);
      showToast('已开始');
    }
  };

  const chooseDirectory = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      defaultPath: downloadStore.downloadPath,
    });
    if (selected && typeof selected === 'string') {
      await downloadStore.updateDownloadPath(selected);
      showToast('下载路径已更新');
    }
  };

  // 6. 删除任务流程 (整合弹窗状态)
  const confirmRemoveTask = (id: string) => {
    taskToDelete.value = downloadStore.tasks.find(t => t.id === id);
    if (taskToDelete.value) {
      isClearingCompleted.value = false;
      alsoDeleteFile.value = false;
      showDeleteDialog.value = true;
    }
  };

  const executeDelete = async () => {
    const deleteFile = alsoDeleteFile.value;

    if (isClearingCompleted.value) {
      const completedTasks = downloadStore.tasks.filter(
        t => getStatusText(t.status) === '已完成',
      );
      for (const task of completedTasks) {
        await downloadStore.removeTask(task.id, deleteFile);
      }
      showToast(
        deleteFile
          ? `已清理 ${completedTasks.length} 个任务及相关文件`
          : `已清理 ${completedTasks.length} 个任务`,
      );
    }
    else {
      if (!taskToDelete.value)
        return;
      const id = taskToDelete.value.id;
      await downloadStore.removeTask(id, deleteFile);
      showToast(
        deleteFile ? '已删除任务及物理文件' : '已移除任务（保留本地文件）',
      );
    }

    showDeleteDialog.value = false;
    taskToDelete.value = null;
    isClearingCompleted.value = false;
  };

  const pauseAll = async () => {
    for (const task of downloadStore.tasks) {
      if (task.id.includes('_sub_'))
        continue;
      const status = getStatusText(task.status);
      if (status === '下载中' || status === '等待中') {
        await downloadStore.pauseTask(task.id);
      }
    }
    showToast('已全部暂停');
  };

  const resumeAll = async () => {
    for (const task of downloadStore.tasks) {
      if (task.id.includes('_sub_'))
        continue;
      const status = getStatusText(task.status);
      if (status === '已暂停') {
        downloadStore.resumeTask(task.id);
      }
    }
    showToast('已全部开始');
  };

  const clearCompleted = async () => {
    const completedTasks = downloadStore.tasks.filter(
      t => getStatusText(t.status) === '已完成',
    );
    if (completedTasks.length === 0) {
      showToast('没有已完成的任务');
      return;
    }

    isClearingCompleted.value = true;
    taskToDelete.value = null;
    alsoDeleteFile.value = false;
    showDeleteDialog.value = true;
  };

  const getCategoryTheme = (category: string) => getSourceTypeTheme(category);

  const getTaskProgressText = (task: any) => {
    if (isCollectionTask(task)) {
      return `${task.completedChunks.length} / ${task.totalChunks}`;
    }
    if (task.totalSize > 0) {
      return bytesToSize(task.downloadedSize);
    }
    if (
      task.category === 'Video'
      && !task.id.startsWith('video_collection_')
      && !task.id.startsWith('video_coll_')
    ) {
      return getStatusText(task.status) === '已完成' ? '1 / 1' : '';
    }
    return `${task.completedChunks.length} / ${task.totalChunks || 0}`;
  };

  const getTaskTotalText = (task: any) => {
    if (isCollectionTask(task)) {
      return `${task.totalChunks} ${getCategoryTheme(task.category).unit}`;
    }
    if (task.totalSize > 0) {
      return bytesToSize(task.totalSize);
    }
    return `${task.totalChunks || 0} ${getCategoryTheme(task.category).unit}`;
  };

  const openFolder = (id: string) => downloadStore.showInFolder(id);

  return {
    // 状态
    downloadStore,
    activeTab,
    showSettings,
    showDeleteDialog,
    taskToDelete,
    alsoDeleteFile,
    isClearingCompleted,
    stats,
    filteredTasks,
    // 绘图相关
    getCategoryTheme,
    // 进度与状态
    getStatusText,
    getStatusType,
    getProgress,
    getTaskProgressText,
    getTaskTotalText,
    getTaskError,
    // 单项操作
    handleAction,
    confirmRemoveTask,
    executeDelete,
    openFolder,
    // 目录操作
    chooseDirectory,
    // 批量操作
    pauseAll,
    resumeAll,
    clearCompleted,
    // 辅助
    bytesToSize,
    isCollectionTask,
  };
}

export const DownloadManagerKey = Symbol('DownloadManager') as import('vue').InjectionKey<
  ReturnType<typeof useDownloadManager>
>;
