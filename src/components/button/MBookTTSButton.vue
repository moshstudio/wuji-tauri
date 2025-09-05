<script setup lang="ts">
import type { ReaderResult } from '@/utils/reader/types';
import { Icon } from '@iconify/vue';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useTTSStore } from '@/store';

const props = defineProps<{
  readingPagedContent: ReaderResult;
  onPlay: () => void;
}>();

const ttsStore = useTTSStore();
const showDialog = ref(false);

function onPlay() {
  if (ttsStore.autoStopOptions.enable) {
    ttsStore.startAutoStopTimer();
  }
  props.onPlay();
}
function onShowDialog() {
  showDialog.value = true;
}

const showVoiceSelectSheet = ref(false);
const voiceSelectSheetActions = computed(() => {
  return ttsStore.voices.map((voice) => {
    return {
      name: voice.ChineseName,
      subname: voice.Gender === 'Female' ? '女声' : '男声',
      color:
        voice.ChineseName === ttsStore.selectedVoice.ChineseName
          ? 'var(--van-primary-color)'
          : '',
      callback: () => {
        ttsStore.selectedVoice = voice;
        showVoiceSelectSheet.value = false;
      },
    };
  });
});
const now = ref(Date.now());

// 每秒更新时间戳
onMounted(() => {
  const timer = setInterval(() => {
    now.value = Date.now();
  }, 1000);

  onUnmounted(() => {
    clearInterval(timer);
  });
});

const remainingTime = computed(() => {
  const seconds =
    (ttsStore.autoStopOptions.startTime +
      ttsStore.autoStopOptions.duration * 60 * 1000 -
      now.value) /
    1000;
  if (seconds === Infinity) return '';

  if (!seconds) return '--:--';
  if (seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
});
</script>

<template>
  <div
    class="van-haptics-feedback flex flex-col items-center gap-1 p-2"
    @click="
      () => {
        if (ttsStore.isReading) {
          ttsStore.stop();
        } else {
          onShowDialog();
        }
      }
    "
  >
    <template v-if="!ttsStore.isReading">
      <Icon icon="uil:ear" width="20" height="20" />
      听书
    </template>
    <template v-else-if="ttsStore.autoStopOptions.enable">
      <Icon
        icon="material-symbols-light:stop-circle-outline"
        width="24"
        height="24"
        color="var(--van-primary-color)"
      />
      <span class="text-xs">{{ remainingTime }}</span>
    </template>
    <template v-else>
      <Icon
        icon="material-symbols-light:stop-circle-outline"
        width="24"
        height="24"
        color="var(--van-primary-color)"
      />
      <span class="text-xs">听书中</span>
    </template>
  </div>

  <van-dialog
    v-model:show="showDialog"
    close-on-click-overlay
    teleport="body"
    title="听书设置"
    class="select-none transition"
    :confirm-button-text="ttsStore.isReading ? '停止' : '开始听书'"
    @confirm="
      () => {
        if (ttsStore.isReading) {
          ttsStore.stop();
        } else {
          onPlay();
        }
      }
    "
  >
    <van-cell
      title="语音"
      :value="ttsStore.selectedVoice.ChineseName"
      is-link
      @click="showVoiceSelectSheet = true"
    />
    <van-cell
      title="语速"
      :value="`${ttsStore.playbackRate}x`"
      :border="false"
    />
    <div class="px-[16px]">
      <van-slider
        v-model="ttsStore.playbackRate"
        :min="0.1"
        :max="3.0"
        :step="0.1"
        button-size="12"
        @change="
          (v) => {
            ttsStore.playbackRate = v;
          }
        "
      />
      <van-divider />
    </div>

    <van-cell title="定时关闭" :border="false">
      <template #value>
        <van-switch v-model="ttsStore.autoStopOptions.enable" size="22" />
      </template>
    </van-cell>
    <div v-if="ttsStore.autoStopOptions.enable" class="px-[16px]">
      <div class="flex flex-nowrap items-center gap-3">
        <van-slider
          v-model="ttsStore.autoStopOptions.duration"
          :min="1"
          :max="180"
          :step="1"
          button-size="12"
          @change="
            (v) => {
              ttsStore.autoStopOptions.duration = v;
            }
          "
        />
        <span
          class="min-w-[45px] select-none text-nowrap text-xs text-[var(--van-text-color)]"
        >
          {{ ttsStore.autoStopOptions.duration }}分钟
        </span>
      </div>
      <van-divider />
    </div>
  </van-dialog>
  <van-action-sheet
    v-model:show="showVoiceSelectSheet"
    teleport="body"
    :actions="voiceSelectSheetActions"
  />
</template>

<style scoped lang="less"></style>
