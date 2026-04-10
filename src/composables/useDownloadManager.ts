import { useDownloadStore } from '@/store';
import { bytesToSize } from '@/utils';
import { showConfirmDialog, showToast } from 'vant';

export function useDownloadManager() {
  const downloadStore = useDownloadStore();

  const getStatusText = (status: any) => {
    if (typeof status === 'string') {
      const s = status.toLowerCase();
      if (s === 'pending') return '等待中';
      if (s === 'downloading') return '下载中';
      if (s === 'paused') return '已暂停';
      if (s === 'completed') return '已完成';
    } else if (status && typeof status === 'object') {
      if ('pending' in status || 'Pending' in status) return '等待中';
      if ('downloading' in status || 'Downloading' in status) return '下载中';
      if ('paused' in status || 'Paused' in status) return '已暂停';
      if ('completed' in status || 'Completed' in status) return '已完成';
      if ('error' in status || 'Error' in status) {
        return `错误: ${status.error || status.Error}`;
      }
    }
    return '未知';
  };

  const getStatusType = (status: any) => {
    const text = getStatusText(status);
    if (text === '下载中') return 'primary';
    if (text === '已暂停') return 'warning';
    if (text === '已完成') return 'success';
    if (text.startsWith('错误')) return 'danger';
    return 'default';
  };

  const getProgress = (task: any) => {
    if (task.totalSize > 0) {
      return Math.floor((task.downloadedSize / task.totalSize) * 100);
    } else if (task.totalChunks && task.totalChunks > 0) {
      return Math.floor((task.completedChunks.length / task.totalChunks) * 100);
    }
    return 0;
  };

  const handleAction = async (task: any) => {
    const status = getStatusText(task.status);
    if (status === '下载中') {
      await downloadStore.pauseTask(task.id);
    } else {
      await downloadStore.resumeTask(task.id);
    }
  };

  const removeTask = (id: string) => {
    return showConfirmDialog({
      title: '提示',
      message: '确认删除该下载任务吗？',
    }).then(async () => {
      await downloadStore.removeTask(id);
      showToast('已删除');
    });
  };

  const pauseAll = async () => {
    for (const task of downloadStore.tasks) {
      const status = getStatusText(task.status);
      if (status === '下载中' || status === '等待中') {
        await downloadStore.pauseTask(task.id);
      }
    }
    showToast('已全部暂停');
  };

  const resumeAll = async () => {
    for (const task of downloadStore.tasks) {
      const status = getStatusText(task.status);
      if (status === '已暂停') {
        await downloadStore.resumeTask(task.id);
      }
    }
    showToast('已全部开始');
  };

  const clearCompleted = async () => {
    const completedTasks = downloadStore.tasks.filter(
      (t) => getStatusText(t.status) === '已完成',
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
      .catch(() => {
        // 用户取消清理
      });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Video':
        return 'video-o';
      case 'Music':
        return 'music-o';
      case 'Book':
        return 'orders-o';
      case 'Comic':
        return 'photo-o';
      default:
        return 'description-o';
    }
  };

  const getCategoryEmoji = (category: string) => {
    switch (category) {
      case 'Video':
        return '🎬';
      case 'Music':
        return '🎵';
      case 'Book':
        return '📖';
      case 'Comic':
        return '🎨';
      default:
        return '📄';
    }
  };

  return {
    downloadStore,
    getStatusText,
    getStatusType,
    getProgress,
    handleAction,
    removeTask,
    pauseAll,
    resumeAll,
    clearCompleted,
    getCategoryIcon,
    getCategoryEmoji,
    bytesToSize,
  };
}
