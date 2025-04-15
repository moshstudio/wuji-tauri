<script setup lang="ts">
import { useTTSStore } from '@/store';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { Icon } from '@iconify/vue';
import { ReaderResult } from '@/utils/reader/types';

const props = defineProps<{
  readingPagedContent: ReaderResult;
  onPlay: () => void;
}>();

const ttsStore = useTTSStore();
const showDialog = ref(false);

const onPlay = () => {
  if (ttsStore.autoStopOptions.enable) {
    ttsStore.startAutoStopTimer();
  }
  props.onPlay();
};
const onShowDialog = () => {
  showDialog.value = true;
};

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
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
});
</script>

<template>
  <div
    class="flex flex-col gap-1 items-center van-haptics-feedback p-2"
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
    class="select-none"
    :confirmButtonText="ttsStore.isReading ? '停止' : '开始听书'"
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
      @click="showVoiceSelectSheet = true"
      is-link
    />
    <van-cell
      title="语速"
      :value="ttsStore.playbackRate + 'x'"
      :border="false"
    ></van-cell>
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
        <van-switch
          v-model="ttsStore.autoStopOptions.enable"
          size="22"
        ></van-switch>
      </template>
    </van-cell>
    <div class="px-[16px]" v-if="ttsStore.autoStopOptions.enable">
      <div class="flex gap-3 items-center flex-nowrap">
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
          class="text-nowrap min-w-[45px] text-xs text-[var(--van-text-color)] select-none"
        >
          {{ ttsStore.autoStopOptions.duration }}分钟
        </span>
      </div>
      <van-divider />
    </div>
  </van-dialog>
  <van-action-sheet
    teleport="body"
    v-model:show="showVoiceSelectSheet"
    :actions="voiceSelectSheetActions"
  />
</template>

<style scoped lang="less"></style>
