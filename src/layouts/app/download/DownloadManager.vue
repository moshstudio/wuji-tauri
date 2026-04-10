<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import { open } from '@tauri-apps/plugin-dialog';
import { showToast } from 'vant';
import WNavbar from '@/components/header/WNavbar.vue';
import { useDownloadManager } from '@/composables/useDownloadManager';

const {
  downloadStore,
  getStatusText,
  getStatusType,
  getProgress,
  handleAction,
  removeTask,
  pauseAll,
  resumeAll,
  clearCompleted,
  getCategoryEmoji,
  bytesToSize,
} = useDownloadManager();

const activeTab = ref('all');
const showSettings = ref(false);

onMounted(() => {
  downloadStore.setupListener();
});

const filteredTasks = computed(() => {
  if (activeTab.value === 'all') return downloadStore.tasks;
  if (activeTab.value === 'downloading') {
    return downloadStore.tasks.filter((t) => {
      const status = getStatusText(t.status);
      return status === '下载中' || status === '等待中' || status === '已暂停';
    });
  }
  if (activeTab.value === 'completed') {
    return downloadStore.tasks.filter(
      (t) => getStatusText(t.status) === '已完成',
    );
  }
  return downloadStore.tasks;
});

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

const stats = computed(() => {
  const downloading = downloadStore.tasks.filter(
    (t) => getStatusText(t.status) === '下载中',
  ).length;
  const paused = downloadStore.tasks.filter(
    (t) => getStatusText(t.status) === '已暂停',
  ).length;
  const completed = downloadStore.tasks.filter(
    (t) => getStatusText(t.status) === '已完成',
  ).length;
  return { downloading, paused, completed };
});
</script>

<template>
  <div
    class="relative flex h-full flex-col overflow-hidden bg-[--van-background]"
  >
    <WNavbar title="下载管理">
      <template #right>
        <van-button
          size="small"
          icon="folder-o"
          plain
          round
          type="primary"
          @click="showSettings = true"
        >
          目录
        </van-button>
      </template>
    </WNavbar>

    <!-- 顶层汇总与控制区 -->
    <div class="flex flex-col gap-2 p-4">
      <div
        class="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50"
      >
        <div class="flex items-center gap-4">
          <div class="flex flex-col">
            <span class="text-xs text-gray-500">正在下载</span>
            <span class="text-lg font-bold text-blue-600">
              {{ stats.downloading }}
            </span>
          </div>
          <div class="h-8 w-px bg-gray-200 dark:bg-zinc-800"></div>
          <div class="flex flex-col">
            <span class="text-xs text-gray-500">已完成</span>
            <span class="text-lg font-bold text-green-600">
              {{ stats.completed }}
            </span>
          </div>
        </div>
        <div class="flex gap-2">
          <van-button
            size="small"
            round
            type="primary"
            plain
            icon="play"
            @click="resumeAll"
          />
          <van-button
            size="small"
            round
            type="warning"
            plain
            icon="pause"
            @click="pauseAll"
          />
        </div>
      </div>

      <div class="flex items-center justify-between">
        <van-tabs
          v-model:active="activeTab"
          shrink
          :border="false"
          background="transparent"
          color="#3b82f6"
        >
          <van-tab title="全部" name="all" />
          <van-tab title="进行中" name="downloading" />
          <van-tab title="已完成" name="completed" />
        </van-tabs>
        <van-button
          v-if="stats.completed > 0"
          size="mini"
          plain
          type="danger"
          @click="clearCompleted"
          class="!border-none !bg-transparent"
        >
          清理已完成
        </van-button>
      </div>
    </div>

    <!-- 列表区 -->
    <div class="flex-grow overflow-y-auto px-4 pb-4">
      <van-empty v-if="filteredTasks.length === 0" description="暂无下载任务" />

      <van-cell-group
        inset
        v-else
        class="!mx-0 border border-gray-100 dark:border-zinc-800"
      >
        <van-swipe-cell v-for="task in filteredTasks" :key="task.id">
          <van-cell center class="download-item !py-3">
            <template #icon>
              <div
                class="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded bg-gray-100 text-xl dark:bg-zinc-800"
              >
                {{ getCategoryEmoji(task.category) }}
              </div>
            </template>

            <template #title>
              <div class="flex min-w-0 flex-col">
                <div class="flex items-center gap-1">
                  <span
                    class="flex-1 truncate text-sm font-medium text-gray-800 dark:text-gray-200"
                  >
                    {{ task.title }}
                  </span>
                  <van-tag
                    v-if="getStatusText(task.status) === '已完成'"
                    type="success"
                    plain
                  >
                    已完成
                  </van-tag>
                  <van-tag v-else :type="getStatusType(task.status)" plain>
                    {{ getStatusText(task.status) }}
                  </van-tag>
                </div>

                <div
                  class="mt-1 flex items-center justify-between text-xs text-gray-400"
                >
                  <span class="truncate">
                    {{
                      task.totalSize > 0
                        ? bytesToSize(task.downloadedSize) +
                          ' / ' +
                          bytesToSize(task.totalSize)
                        : task.completedChunks.length +
                          ' / ' +
                          task.totalChunks +
                          ' 章节'
                    }}
                  </span>
                  <span
                    v-if="task.speed && getStatusText(task.status) === '下载中'"
                    class="text-blue-500"
                  >
                    {{ task.speed }}
                  </span>
                </div>
              </div>
            </template>

            <template #label>
              <div class="mt-2 w-full">
                <van-progress
                  :percentage="getProgress(task)"
                  stroke-width="4"
                  :show-pivot="false"
                  :color="
                    getStatusText(task.status) === '已完成'
                      ? '#10b981'
                      : '#3b82f6'
                  "
                />
              </div>
            </template>

            <template #right-icon>
              <div class="ml-2 flex items-center">
                <van-button
                  v-if="getStatusText(task.status) !== '已完成'"
                  size="small"
                  plain
                  :type="
                    getStatusText(task.status) === '下载中'
                      ? 'warning'
                      : 'primary'
                  "
                  class="!h-7 !w-7 !border-none !bg-gray-50 dark:!bg-zinc-800"
                  :icon="getStatusText(task.status) === '下载中' ? 'pause' : 'play'"
                  @click.stop="handleAction(task)"
                />
              </div>
            </template>
          </van-cell>

          <template #right>
            <van-button
              square
              type="danger"
              text="删除"
              class="h-full"
              @click="removeTask(task.id)"
            />
          </template>
        </van-swipe-cell>
      </van-cell-group>
    </div>

    <!-- 下载设置弹窗 -->
    <van-dialog
      v-model:show="showSettings"
      title="下载设置"
      show-cancel-button
      :show-confirm-button="false"
      cancel-button-text="关闭"
      class="download-settings-dialog"
    >
      <div class="px-5 py-6">
        <div class="space-y-4">
          <div class="flex flex-col gap-2">
            <span class="text-xs font-medium text-gray-400">当前下载路径</span>
            <div
              class="flex items-center justify-between rounded-lg bg-gray-50 p-3 transition-colors dark:bg-zinc-800"
            >
              <span class="break-all text-sm text-gray-600 dark:text-gray-300">
                {{ downloadStore.downloadPath || '未配置' }}
              </span>
            </div>
          </div>
          <van-button
            block
            type="primary"
            plain
            size="small"
            icon="folder-o"
            @click="chooseDirectory"
          >
            更改保存目录
          </van-button>
        </div>
      </div>
    </van-dialog>
  </div>
</template>

<style scoped lang="less">
</style>
