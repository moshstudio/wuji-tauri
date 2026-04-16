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
      class="flex-grow overflow-y-auto bg-[--van-background] px-6 py-6 dark:bg-zinc-950/20"
    >
      <!-- 控制面板 / 仪表盘 -->
      <section
        class="mb-8 overflow-hidden rounded-2xl border border-gray-100 bg-[--van-background-2] p-6 shadow-sm backdrop-blur-md dark:border-zinc-800/50 dark:bg-zinc-900/60"
      >
        <div
          class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between"
        >
          <div class="flex items-center gap-5">
            <div
              class="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500 text-white shadow-lg shadow-blue-500/20"
            >
              <van-icon name="down" size="24" />
            </div>
            <div>
              <h3 class="text-lg font-bold text-gray-800 dark:text-gray-100">
                下载中心
              </h3>
              <p class="text-xs text-gray-400">
                当前有
                <span class="font-bold text-blue-500">
                  {{ stats.downloading }}
                </span>
                个任务进行中，共 {{ stats.total }} 个任务
              </p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <button
              class="flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-600 transition-all hover:bg-blue-100 active:scale-95 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
              @click="resumeAll"
            >
              <van-icon name="play" />
              全部开始
            </button>
            <button
              class="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2 text-sm font-bold text-amber-600 transition-all hover:bg-amber-100 active:scale-95 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20"
              @click="pauseAll"
            >
              <van-icon name="pause" />
              全部暂停
            </button>
            <button
              class="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition-all hover:bg-red-100 active:scale-95 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
              @click="clearCompleted"
            >
              <van-icon name="clear" />
              清理完成
            </button>
          </div>
        </div>

        <div class="mt-6 h-px w-full bg-gray-100 dark:bg-zinc-800" />

        <van-tabs
          v-model:active="activeTab"
          shrink
          :border="false"
          background="transparent"
          color="#3b82f6"
          class="mt-4"
          line-width="20"
        >
          <van-tab title="全部任务" name="all" />
          <van-tab title="正在下载" name="downloading" />
          <van-tab title="已完成" name="completed" />
        </van-tabs>
      </section>

      <!-- 任务网格 -->
      <div
        class="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4"
      >
        <van-empty
          v-if="filteredTasks.length === 0"
          description="暂无下载任务"
          class="col-span-full py-20"
        />

        <div
          v-for="task in filteredTasks"
          :key="task.id"
          class="group relative flex cursor-pointer select-none flex-col gap-4 rounded-2xl border border-gray-100 bg-[--van-background-2] p-5 transition-all hover:border-blue-500/30 hover:shadow-xl hover:shadow-blue-500/5 active:scale-[0.99] dark:border-zinc-800/50 dark:bg-zinc-900/90 dark:backdrop-blur-sm dark:hover:border-blue-500/50 dark:hover:shadow-blue-500/10"
          @dblclick="openFolder(task.id)"
        >
          <!-- 头部：图标 + 标题 + 动作 -->
          <div class="flex items-center justify-between gap-3">
            <div class="flex min-w-0 items-center gap-3">
              <div
                class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl transition-all group-hover:scale-110 group-hover:shadow-lg"
                :class="[
                  getCategoryTheme(task.category).bg,
                  getCategoryTheme(task.category).text,
                ]"
              >
                <van-icon
                  :name="getCategoryTheme(task.category).icon"
                  size="22"
                />
              </div>
              <div class="min-w-0">
                <h4
                  class="truncate text-sm font-extrabold text-gray-800 dark:text-zinc-100"
                >
                  {{ task.title }}
                </h4>
                <div
                  class="mt-1 flex items-center gap-2 overflow-hidden whitespace-nowrap text-[11px] font-medium text-gray-400"
                >
                  <span class="flex items-center gap-1">
                    <span
                      class="rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider"
                      :class="[
                        getCategoryTheme(task.category).bg,
                        getCategoryTheme(task.category).text,
                      ]"
                    >
                      {{ getCategoryTheme(task.category).label }}
                    </span>
                  </span>
                  <span class="opacity-30">|</span>
                  <span class="truncate">
                    {{ getTaskTotalText(task) }}
                  </span>
                  <span
                    v-if="task.speed && getStatusText(task.status) === '下载中'"
                    class="flex items-center gap-1.5 font-bold text-blue-500"
                  >
                    <span
                      class="h-1 w-1 animate-pulse rounded-full bg-blue-500"
                    />
                    {{ task.speed }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 悬浮/激活 动作按钮 -->
            <div class="flex shrink-0 items-center gap-1">
              <button
                v-if="getStatusText(task.status) !== '已完成'"
                class="flex h-8 w-8 items-center justify-center rounded-lg bg-[--van-background] text-gray-400 transition-all hover:bg-blue-500/10 hover:text-blue-500 active:scale-90 dark:bg-zinc-800/80 dark:text-zinc-500 dark:hover:bg-blue-500/20 dark:hover:text-blue-400"
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
                class="flex h-8 w-8 items-center justify-center rounded-lg bg-[--van-background] text-gray-400 transition-all hover:bg-red-500/10 hover:text-red-500 active:scale-90 dark:bg-zinc-800/80 dark:text-zinc-500 dark:hover:bg-red-500/20 dark:hover:text-red-400"
                @click.stop="confirmRemoveTask(task.id)"
                @dblclick.stop
              >
                <van-icon name="delete-o" size="16" />
              </button>
            </div>
          </div>

          <!-- 进度部分 -->
          <div class="space-y-2">
            <div
              class="flex items-center justify-between overflow-hidden whitespace-nowrap text-[11px]"
            >
              <div class="flex min-w-0 items-center gap-2">
                <span
                  class="truncate font-bold transition-colors"
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
                <span class="truncate text-gray-400 dark:text-zinc-500">
                  {{ getTaskProgressText(task) }}
                </span>
              </div>
              <span class="font-bold text-gray-700 dark:text-zinc-300">
                {{ getProgress(task) }}%
              </span>
            </div>

            <!-- 自定义进度条 -->
            <div
              class="h-1.5 w-full overflow-hidden rounded-full bg-[--van-background] dark:bg-zinc-800/80"
            >
              <div
                class="h-full transition-all duration-500 ease-out"
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
