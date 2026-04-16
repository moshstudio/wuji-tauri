<script setup lang="ts">
import { inject } from 'vue';
import WNavbar from '@/components/header/WNavbar.vue';
import { DownloadManagerKey } from '@/composables/useDownloadManager';

const manager = inject(DownloadManagerKey)!;
const {
  activeTab,
  stats,
  filteredTasks,
  getCategoryTheme,
  getTaskTotalText,
  getTaskProgressText,
  getStatusText,
  getTaskError,
  getProgress,
  handleAction,
  confirmRemoveTask,
  openFolder,
  pauseAll,
  resumeAll,
  clearCompleted,
} = manager;
</script>

<template>
  <div
    class="flex h-full w-full flex-col overflow-hidden bg-[--van-background]"
  >
    <WNavbar
      title="下载中心"
      right-text="设置"
      :click-right="
        () => {
          manager.showSettings.value = true;
        }
      "
    />

    <div
      class="flex-grow overflow-y-auto bg-[--van-background] px-4 py-3 dark:bg-zinc-950/20"
    >
      <!-- 控制面板 / 仪表盘 -->
      <section
        class="mb-3 overflow-hidden rounded-[1.25rem] border border-gray-100 bg-[--van-background-2] p-3.5 shadow-sm backdrop-blur-md dark:border-zinc-800/50 dark:bg-zinc-900/40"
      >
        <div class="flex flex-col gap-3">
          <div class="flex items-center gap-4">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/20"
            >
              <van-icon name="down" size="20" />
            </div>
            <div class="flex-1">
              <h3 class="text-sm font-bold text-gray-800 dark:text-gray-100">
                下载中心
              </h3>
              <div
                class="flex flex-wrap items-center gap-y-0.5 text-[11px] text-gray-500 dark:text-gray-400"
              >
                <div class="flex items-center whitespace-nowrap">
                  进行中
                  <span class="ml-1 font-bold text-blue-500">
                    {{ stats.downloading }}
                  </span>
                  <span class="mx-1.5 opacity-40">·</span>
                </div>
                <div class="whitespace-nowrap">
                  总任务数 {{ stats.total }}
                </div>
              </div>
            </div>
            <div class="flex gap-2">
              <button
                class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-all active:scale-90 active:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:active:bg-blue-500/20"
                title="全部开始"
                @click="resumeAll"
              >
                <van-icon name="play" size="16" />
              </button>
              <button
                class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 transition-all active:scale-90 active:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:active:bg-amber-500/20"
                title="全部暂停"
                @click="pauseAll"
              >
                <van-icon name="pause" size="16" />
              </button>
              <button
                class="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 transition-all active:scale-90 active:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:active:bg-red-500/20"
                title="清理完成"
                @click="clearCompleted"
              >
                <van-icon name="clear" size="16" />
              </button>
            </div>
          </div>

          <div class="h-px w-full bg-gray-100/80 dark:bg-zinc-800/50" />

          <div class="flex items-center justify-between">
            <van-tabs
              v-model:active="activeTab"
              shrink
              :border="false"
              background="transparent"
              color="#3b82f6"
              class="download-tabs"
              line-width="16px"
              line-height="3px"
            >
              <van-tab title="全部" name="all" />
              <van-tab title="正在下载" name="downloading" />
              <van-tab title="已完成" name="completed" />
            </van-tabs>
          </div>
        </div>
      </section>

      <!-- 任务列表 -->
      <div class="flex flex-col gap-2.5">
        <van-empty
          v-if="filteredTasks.length === 0"
          description="暂无下载任务"
          class="py-12"
        />

        <div
          v-for="task in filteredTasks"
          :key="task.id"
          class="group relative flex flex-col gap-3.5 rounded-2xl border border-gray-100 bg-[--van-background-2] p-4 shadow-sm transition-all active:scale-[0.98] dark:border-zinc-800/60 dark:bg-zinc-900/90 dark:backdrop-blur-sm dark:active:bg-zinc-800"
          @dblclick="openFolder(task.id)"
        >
          <!-- 任务主体 -->
          <div class="flex items-start gap-3">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform active:scale-90"
              :class="[
                getCategoryTheme(task.category).bg,
                getCategoryTheme(task.category).text,
              ]"
            >
              <van-icon
                :name="getCategoryTheme(task.category).icon"
                size="18"
              />
            </div>

            <div class="min-w-0 flex-1">
              <h4
                class="truncate text-sm font-bold text-gray-800 dark:text-zinc-100"
              >
                {{ task.title }}
              </h4>
              <div
                class="mt-1 flex items-center gap-2 text-[10px] font-medium text-gray-400 dark:text-zinc-500"
              >
                <span
                  class="rounded px-1 py-0.5 text-[8px] font-black uppercase tracking-tight shadow-sm"
                  :class="[
                    getCategoryTheme(task.category).bg,
                    getCategoryTheme(task.category).text,
                  ]"
                >
                  {{ getCategoryTheme(task.category).label }}
                </span>
                <span class="opacity-40">/</span>
                <span class="font-medium">
                  {{ getTaskTotalText(task) }}
                </span>
                <span
                  v-if="task.speed && getStatusText(task.status) === '下载中'"
                  class="flex items-center gap-1 font-bold text-blue-500"
                >
                  <span
                    class="h-1 w-1 animate-pulse rounded-full bg-blue-500"
                  />
                  {{ task.speed }}
                </span>
              </div>
            </div>

            <div class="flex gap-1.5">
              <button
                v-if="getStatusText(task.status) !== '已完成'"
                class="flex h-8 w-8 items-center justify-center rounded-lg bg-[--van-background] text-gray-400 transition-all active:scale-90 dark:bg-zinc-800/80 dark:text-zinc-500 dark:active:bg-blue-500/20 dark:active:text-blue-400"
                @click.stop="handleAction(task)"
                @dblclick.stop
              >
                <van-icon
                  :name="
                    getStatusText(task.status) === '下载中' ? 'pause' : 'play'
                  "
                  size="16"
                />
              </button>
              <button
                class="flex h-8 w-8 items-center justify-center rounded-lg bg-[--van-background] text-gray-400 transition-all active:scale-90 dark:bg-zinc-800/80 dark:text-zinc-500 dark:active:bg-red-500/20 dark:active:text-red-400"
                @click.stop="confirmRemoveTask(task.id)"
                @dblclick.stop
              >
                <van-icon name="delete-o" size="16" />
              </button>
            </div>
          </div>

          <!-- 进度区域 -->
          <div class="space-y-2">
            <div class="flex items-center justify-between text-[11px]">
              <div class="flex items-center gap-2">
                <span
                  class="font-extrabold uppercase tracking-tight"
                  :class="[
                    getStatusText(task.status) === '已完成'
                      ? 'text-emerald-500 dark:text-emerald-400'
                      : getStatusText(task.status) === '已暂停'
                        ? 'text-amber-500 dark:text-amber-400'
                        : getTaskError(task.status)
                          ? 'text-red-500 dark:text-red-400'
                          : 'text-blue-500 dark:text-blue-400',
                  ]"
                >
                  {{ getStatusText(task.status) }}
                </span>
                <span class="text-gray-300 dark:text-zinc-800">|</span>
                <span class="font-medium text-gray-400 dark:text-zinc-500">
                  {{ getTaskProgressText(task) }}
                </span>
              </div>
              <span class="font-black text-gray-700 dark:text-zinc-300">
                {{ getProgress(task) }}%
              </span>
            </div>

            <!-- 自定义进度条 -->
            <div
              class="h-1.5 w-full overflow-hidden rounded-full bg-[--van-background] dark:bg-zinc-800/80"
            >
              <div
                class="h-full transition-all duration-700 ease-out"
                :class="[
                  getStatusText(task.status) === '已完成'
                    ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)] dark:bg-emerald-400'
                    : getStatusText(task.status) === '已暂停'
                      ? 'bg-amber-500 dark:bg-amber-400'
                      : getTaskError(task.status)
                        ? 'bg-red-500 dark:bg-red-400 shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                        : 'bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.4)] dark:bg-blue-400',
                ]"
                :style="{ width: `${getProgress(task)}%` }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.download-tabs) {
  --van-tabs-line-height: 32px;
  --van-tabs-nav-background: transparent;
}

:deep(.download-tabs .van-tab) {
  padding: 0 12px;
  font-size: 13px;
  font-weight: 600;
}

:deep(.download-tabs .van-tabs__wrap) {
  height: 32px;
}
</style>
