<script setup lang="ts">
import { inject } from 'vue';
import { DownloadManagerKey } from '@/composables/useDownloadManager';
import { useDisplayStore } from '@/store';

const manager = inject(DownloadManagerKey)!;
const {
  showSettings,
  showDeleteDialog,
  alsoDeleteFile,
  isClearingCompleted,
  downloadStore,
  chooseDirectory,
  executeDelete,
} = manager;
const displayStore = useDisplayStore();
</script>

<template>
  <!-- 下载设置弹窗 -->
  <van-dialog
    v-model:show="showSettings"
    title="下载设置"
    show-cancel-button
    :show-confirm-button="false"
    cancel-button-text="完成"
    close-on-click-overlay
    class="download-settings-dialog !rounded-[1.5rem] dark:!bg-zinc-900"
  >
    <div class="px-5 py-6">
      <div class="space-y-6">
        <div class="flex flex-col gap-3">
          <div
            class="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400"
          >
            <van-icon name="folder-o" />
            当前保存路径
          </div>
          <div
            class="rounded-2xl border border-gray-100 bg-[--van-background] p-4 dark:border-zinc-800 dark:bg-zinc-950/40"
          >
            <span
              class="break-all text-[11px] font-medium leading-relaxed text-gray-500 dark:text-gray-400"
            >
              {{ downloadStore.downloadPath || '尚未配置下载路径' }}
            </span>
          </div>
          <div v-if="displayStore.isAndroid" class="px-1 text-[10px] text-gray-400">
            * 安卓端默认保存至系统下载目录，暂不支持修改
          </div>
        </div>

        <button
          v-if="!displayStore.isAndroid"
          class="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all active:scale-95"
          @click="chooseDirectory"
        >
          <van-icon name="edit" />
          修改存储目录
        </button>
      </div>
    </div>
  </van-dialog>

  <!-- 删除确认弹窗 -->
  <van-dialog
    v-model:show="showDeleteDialog"
    :title="isClearingCompleted ? '清理已完成' : '删除任务'"
    show-cancel-button
    :confirm-button-text="isClearingCompleted ? '确认清理' : '确认删除'"
    confirm-button-color="#ef4444"
    close-on-click-overlay
    class="delete-confirm-dialog !rounded-[1.5rem] dark:!bg-zinc-900"
    @confirm="executeDelete"
  >
    <div class="px-5 py-6">
      <div class="flex flex-col gap-5">
        <div
          class="flex items-center gap-3 rounded-2xl bg-red-50 p-4 text-red-600 dark:bg-red-500/10 dark:text-red-400"
        >
          <van-icon name="warning-o" size="20" />
          <span class="text-xs font-bold">
            {{
              isClearingCompleted
                ? '确定要清理所有已完成的任务吗？'
                : '确定要从列表中移除此下载任务吗？'
            }}
          </span>
        </div>

        <div
          class="flex cursor-pointer select-none items-center justify-between rounded-xl border border-gray-100 bg-[--van-background] px-4 py-2 transition-colors active:bg-gray-100 dark:border-zinc-800 dark:bg-zinc-950/40 dark:active:bg-zinc-900"
          @click="alsoDeleteFile = !alsoDeleteFile"
        >
          <span class="text-[11px] font-bold text-gray-500 dark:text-gray-400">
            同时删除已下载的文件
          </span>
          <van-checkbox
            v-model="alsoDeleteFile"
            icon-size="16px"
            @click.stop
          />
        </div>
      </div>
    </div>
  </van-dialog>
</template>
