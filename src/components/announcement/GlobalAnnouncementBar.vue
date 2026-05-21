<script setup lang="ts">
import { openUrl } from '@tauri-apps/plugin-opener';
import { storeToRefs } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useServerStore, useSubscribeSourceStore } from '@/store';
import { AnnouncementVariant } from '@/types/announcement';

const serverStore = useServerStore();
const subscribeSourceStore = useSubscribeSourceStore();
const { currentAnnouncement } = storeToRefs(serverStore);
const { isLoaded, startupDialogActive } = storeToRefs(subscribeSourceStore);

const showAnnouncementDialog = ref(false);

const VARIANT_COLORS: Record<AnnouncementVariant, string | undefined> = {
  [AnnouncementVariant.Default]: undefined,
  [AnnouncementVariant.Primary]: '#1989fa',
  [AnnouncementVariant.Success]: '#07c160',
  [AnnouncementVariant.Warning]: '#ed6a0c',
  [AnnouncementVariant.Promo]: '#7232dd',
};

const announcement = computed(() => currentAnnouncement.value);

const dialogTitle = computed(() => {
  const item = announcement.value;
  if (!item) {
    return '公告';
  }
  const title = item.title ?? '公告';
  return item.emoji ? `${item.emoji} ${title}` : title;
});

const dialogMessage = computed(() => announcement.value?.content ?? '');

const confirmButtonColor = computed(() => {
  const variant = announcement.value?.variant;
  if (!variant) {
    return undefined;
  }
  return VARIANT_COLORS[variant];
});

function canOpenAnnouncementDialog() {
  return (
    !!currentAnnouncement.value
    && isLoaded.value
    && !startupDialogActive.value
  );
}

watch(
  [currentAnnouncement, isLoaded, startupDialogActive],
  () => {
    if (canOpenAnnouncementDialog()) {
      showAnnouncementDialog.value = true;
    }
    else {
      showAnnouncementDialog.value = false;
    }
  },
  { immediate: true },
);

function onConfirm() {
  const item = currentAnnouncement.value;
  if (item) {
    serverStore.dismissAnnouncement(item._id);
  }
  showAnnouncementDialog.value = false;
}

async function onOpenLink() {
  const item = currentAnnouncement.value;
  if (item?.link) {
    await openUrl(item.link);
  }
}
</script>

<template>
  <van-dialog
    v-model:show="showAnnouncementDialog"
    :title="dialogTitle"
    teleport="body"
    :show-cancel-button="false"
    confirm-button-text="我知道了"
    :confirm-button-color="confirmButtonColor"
    :close-on-click-overlay="false"
    @confirm="onConfirm"
  >
    <div class="px-4 py-3 text-sm leading-relaxed text-[var(--van-text-color)]">
      {{ dialogMessage }}
      <div
        v-if="announcement?.link"
        class="mt-3 text-[var(--van-primary-color)]"
        @click="onOpenLink"
      >
        查看详情
      </div>
    </div>
  </van-dialog>
</template>
