<script setup lang="ts">
import { useTTSStore } from '@/store';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { Icon } from '@iconify/vue';

const props = defineProps<{
  readingContent: { content: string; index: number }[];
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
  <van-button
    square
    size="small"
    class="w-[46px] h-[46px] opacity-80 hover:opacity-100"
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
    <span v-if="!ttsStore.isReading">听书</span>
    <span v-else-if="ttsStore.autoStopOptions.enable">
      {{ remainingTime }}
    </span>
    <Icon
      icon="material-symbols-light:stop-circle-outline"
      width="24"
      height="24"
      color="var(--van-primary-color)"
      class="m-auto animate-spin-slow"
      :class="{ 'pause-spin': !ttsStore.isReading }"
      v-else
    />
  </van-button>
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
          class="text-nowrap text-xs text-[var(--van-text-color)] select-none"
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
