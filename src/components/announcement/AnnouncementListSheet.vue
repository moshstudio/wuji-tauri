<script setup lang="ts">
import type { Announcement } from '@/types/announcement';
import { openUrl } from '@tauri-apps/plugin-opener';
import { format, isValid, parseISO } from 'date-fns';
import { storeToRefs } from 'pinia';
import { computed, watch } from 'vue';
import { useServerStore } from '@/store';

const DATE_FMT = 'M/d';

const show = defineModel<boolean>('show', { default: false });

const serverStore = useServerStore();
const { announcements } = storeToRefs(serverStore);

const list = computed(() => {
  return [...announcements.value]
    .filter(a => a.enabled !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
});

watch(show, (v) => {
  if (v) {
    void serverStore.fetchAnnouncements();
  }
});

function lineText(item: Announcement) {
  const body = item.title ? `${item.title}：${item.content}` : item.content;
  return item.emoji ? `${item.emoji} ${body}` : body;
}

function formatAt(value?: string) {
  if (!value) {
    return undefined;
  }
  const d = parseISO(value);
  if (!isValid(d)) {
    return value;
  }
  return format(d, DATE_FMT);
}

function timeRangeText(item: Announcement) {
  const start = formatAt(item.startAt);
  const end = formatAt(item.endAt);
  if (start && end) {
    return `${start} - ${end}`;
  }
  return start ?? end;
}

async function openLink(link: string) {
  await openUrl(link);
}
</script>

<template>
  <van-popup
    v-model:show="show"
    position="bottom"
    round
    teleport="body"
    destroy-on-close
    class="announcement-list-popup"
    :style="{ maxHeight: '75vh' }"
  >
    <div class="flex max-h-[75vh] flex-col overflow-hidden">
      <div
        class="shrink-0 border-b border-[var(--van-border-color)] px-4 py-3 text-center text-base font-semibold"
      >
        全部公告
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 pb-safe">
        <van-empty v-if="!list.length" description="暂无公告" />
        <van-cell-group v-else inset>
          <van-cell
            v-for="(item, index) in list"
            :key="item._id"
            center
            :clickable="!!item.link"
            :is-link="!!item.link"
            class="announcement-cell"
            @click="item.link && openLink(item.link)"
          >
            <template #title>
              <div class="announcement-row">
                <span class="announcement-index">
                  {{ index + 1 }}.
                </span>
                <div class="announcement-body">
                  <div class="announcement-text">
                    {{ lineText(item) }}
                  </div>
                  <div v-if="timeRangeText(item)" class="announcement-time">
                    {{ timeRangeText(item) }}
                  </div>
                  <div v-if="item.link" class="announcement-link-hint">
                    点击打开链接
                  </div>
                </div>
              </div>
            </template>
          </van-cell>
        </van-cell-group>
      </div>
    </div>
  </van-popup>
</template>

<style scoped lang="less">
.pb-safe {
  padding-bottom: max(12px, env(safe-area-inset-bottom, 0px));
}

.announcement-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.announcement-index {
  flex-shrink: 0;
  width: 28px;
  text-align: right;
  font-size: 12px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  line-height: 1.5;
  color: var(--van-gray-6);
}

.announcement-body {
  flex: 1;
  min-width: 0;
}

.announcement-text {
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
  white-space: pre-wrap;
}

.announcement-time {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--van-gray-6);
}

.announcement-link-hint {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--van-gray-6);
}

:deep(.announcement-cell.van-cell) {
  align-items: center;
}

:deep(.announcement-cell .van-cell__title) {
  display: flex;
  align-items: center;
  flex: 1;
}

:deep(.announcement-cell .van-cell__value) {
  display: flex;
  align-items: center;
}

:deep(.announcement-cell .van-cell__right-icon) {
  display: flex;
  align-items: center;
  align-self: center;
  height: auto;
  line-height: inherit;
}
</style>
