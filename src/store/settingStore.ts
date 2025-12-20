import { useStorage, useStorageAsync } from '@vueuse/core';
import { defineStore } from 'pinia';
import { onMounted, watch } from 'vue';
import { setAutostartEnabled, checkAutostartEnabled } from '@/utils/autostart';
import { type as osType } from '@tauri-apps/plugin-os';

export const useSettingStore = defineStore('setting', () => {
  // 音乐自动切换源
  const songAutoSwitchSource = useStorageAsync('songAutoSwitchSource', true);

  // 显示历史记录
  const showViewHistory = useStorageAsync('showViewHistory', true);

  // 自动更新订阅源
  const autoUpdateSubscribeSource = useStorage(
    'autoUpdateSubscribeSource',
    false,
  );

  // 换页按钮位置设置：'top' - 列表上方, 'bottom' - 列表下方, 'both' - 列表上下方
  const paginationPosition = useStorageAsync<'top' | 'bottom' | 'both'>(
    'paginationPosition',
    'top',
  );

  // 开机自启设置（仅桌面端）
  const enableAutostart = useStorageAsync('enableAutostart', false);

  // 窗口关闭行为设置：'close' - 关闭应用, 'minimize' - 最小化到托盘
  const closeAction = useStorageAsync<'close' | 'minimize'>(
    'closeAction',
    'close',
  );

  // 初始化开机自启状态（仅 Windows）
  const isWindows = osType() === 'windows';

  if (isWindows) {
    onMounted(async () => {
      try {
        const isEnabled = await checkAutostartEnabled();
        if (enableAutostart.value !== isEnabled) {
          enableAutostart.value = isEnabled;
        }
      } catch (error) {
        console.error('检查开机自启状态失败:', error);
      }
    });

    // 监听开机自启开关变化
    watch(enableAutostart, async (newVal, oldVal) => {
      // 避免初始化时触发
      if (oldVal === undefined) return;
      try {
        await setAutostartEnabled(newVal);
      } catch (error) {
        console.error('设置开机自启失败:', error);
        // 回滚状态
        enableAutostart.value = oldVal;
      }
    });
  }

  return {
    songAutoSwitchSource,
    showViewHistory,
    autoUpdateSubscribeSource,
    paginationPosition,
    enableAutostart,
    closeAction,
  };
});
