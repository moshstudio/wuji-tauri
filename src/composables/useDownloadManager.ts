import { open } from '@tauri-apps/plugin-dialog';
import { showConfirmDialog, showToast } from 'vant';
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
      alsoDeleteFile.value = false;
      showDeleteDialog.value = true;
    }
  };

  const executeDelete = async () => {
    if (!taskToDelete.value)
      return;
    const id = taskToDelete.value.id;
    const deleteFile = alsoDeleteFile.value;

    await downloadStore.removeTask(id, deleteFile);
    showToast(
      deleteFile ? '已删除任务及物理文件' : '已移除任务（保留本地文件）',
    );
    showDeleteDialog.value = false;
    taskToDelete.value = null;
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

    showConfirmDialog({
      title: '提示',
      message: `确认清理所有已完成的任务（共 ${completedTasks.length} 个）吗？`,
    })
      .then(async () => {
        for (const task of completedTasks) {
          await downloadStore.removeTask(task.id);
        }
        showToast(`已清理 ${completedTasks.length} 个任务`);
      })
      .catch(() => {});
  };

  const getCategoryTheme = (category: string) => {
    switch (category) {
      case 'Image':
        return {
          icon: 'photo',
          emoji: '🖼️',
          label: '图片',
          unit: '张',
          color: 'teal',
          bg: 'bg-teal-50 dark:bg-teal-500/10',
          text: 'text-teal-600 dark:text-teal-400',
        };
      case 'Video':
        return {
          icon: 'video',
          emoji: '🎬',
          label: '视频',
          unit: '个',
          color: 'blue',
          bg: 'bg-blue-50 dark:bg-blue-500/10',
          text: 'text-blue-600 dark:text-blue-400',
        };
      case 'Music':
        return {
          icon: 'music',
          emoji: '🎵',
          label: '音乐',
          unit: '首',
          color: 'purple',
          bg: 'bg-purple-50 dark:bg-purple-500/10',
          text: 'text-purple-600 dark:text-purple-400',
        };
      case 'Book':
        return {
          icon: 'description',
          emoji: '📖',
          label: '小说',
          unit: '章节',
          color: 'orange',
          bg: 'bg-orange-50 dark:bg-orange-500/10',
          text: 'text-orange-600 dark:text-orange-400',
        };
      case 'Comic':
        return {
          icon: 'photo-o',
          emoji: '🎨',
          label: '漫画',
          unit: '话',
          color: 'pink',
          bg: 'bg-pink-50 dark:bg-pink-500/10',
          text: 'text-pink-600 dark:text-pink-400',
        };
      default:
        return {
          icon: 'question-o',
          emoji: '❔',
          label: '未知',
          unit: '项',
          color: 'gray',
          bg: 'bg-gray-50 dark:bg-zinc-800',
          text: 'text-gray-600 dark:text-gray-400',
        };
    }
  };

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
