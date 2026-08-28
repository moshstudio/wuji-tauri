<script setup lang="ts">
import type { ReaderResult } from '@/utils/reader/types';
import { Icon } from '@iconify/vue';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import MembershipFeatureWrap from '@/components/badge/MembershipFeatureWrap.vue';
import { useServerStore, useTTSStore } from '@/store';
import { showVipDialog } from '@/utils/vip';
import ResponsiveGrid2 from '../grid/ResponsiveGrid2.vue';

const props = defineProps<{
  readingPagedContent: ReaderResult;
  onPlay: () => void;
}>();

const ttsStore = useTTSStore();
const serverStore = useServerStore();
const showDialog = ref(false);
const showVoiceSheet = ref(false);

const ratePresets = [0.75, 1, 1.25, 1.5, 2] as const;
const timerPresets = [
  { label: '关闭', minutes: 0 },
  { label: '15分钟', minutes: 15 },
  { label: '30分钟', minutes: 30 },
  { label: '45分钟', minutes: 45 },
  { label: '60分钟', minutes: 60 },
  { label: '90分钟', minutes: 90 },
  { label: '2小时', minutes: 120 },
  { label: '3小时', minutes: 180 },
] as const;

function formatRate(rate: number) {
  return `${rate}×`;
}

function setPlaybackRate(rate: number) {
  ttsStore.playbackRate = rate;
}

function isTimerSelected(minutes: number) {
  if (minutes === 0)
    return !ttsStore.autoStopOptions.enable;
  return ttsStore.autoStopOptions.enable && ttsStore.autoStopOptions.duration === minutes;
}

function setTimer(minutes: number) {
  if (minutes === 0) {
    ttsStore.autoStopOptions.enable = false;
    return;
  }
  ttsStore.autoStopOptions.enable = true;
  ttsStore.autoStopOptions.duration = minutes;
}

function selectVoice(voice: (typeof ttsStore.voices)[number]) {
  if (voice.feature && !serverStore.hasFeature(voice.feature)) {
    showVipDialog('您选择的语音为会员专属哦\n是否立即开通会员?');
    return;
  }
  ttsStore.selectedVoice = voice;
  showVoiceSheet.value = false;
}

function onStart() {
  if (ttsStore.selectedVoice.feature) {
    if (!serverStore.hasFeature(ttsStore.selectedVoice.feature)) {
      showVipDialog('您选择的语音为会员专属哦\n是否立即开通会员?');
      return;
    }
  }
  if (ttsStore.autoStopOptions.enable)
    ttsStore.startAutoStopTimer();
  props.onPlay();
  showDialog.value = false;
}

const now = ref(Date.now());

onMounted(() => {
  const timer = setInterval(() => {
    now.value = Date.now();
  }, 1000);

  onUnmounted(() => {
    clearInterval(timer);
  });
});

const remainingTime = computed(() => {
  const seconds
    = (ttsStore.autoStopOptions.startTime
      + ttsStore.autoStopOptions.duration * 60 * 1000
      - now.value)
    / 1000;
  if (seconds === Infinity)
    return '';

  if (!seconds)
    return '--:--';
  if (seconds < 0)
    return '00:00';
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
        }
        else {
          showDialog = true;
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
    width="min(90vw, 360px)"
    class="wuji-tts-dialog"
    close-on-click-overlay
    :show-confirm-button="false"
    teleport="body"
  >
    <div class="tts-panel">
      <header class="tts-header">
        <div>
          <h3>听书设置</h3>
          <p>选择适合你的朗读方式</p>
        </div>
        <button type="button" class="tts-close" aria-label="关闭" @click="showDialog = false">
          <Icon icon="material-symbols:close-rounded" />
        </button>
      </header>

      <button type="button" class="tts-setting-row" @click="showVoiceSheet = true">
        <span class="tts-setting-icon">
          <Icon icon="solar:user-speak-rounded-linear" />
        </span>
        <span class="tts-setting-copy">
          <span class="tts-setting-label">朗读声音</span>
          <span class="tts-setting-value">
            {{ ttsStore.selectedVoice.ChineseName }}
            · {{ ttsStore.selectedVoice.Gender === 'Female' ? '女声' : '男声' }}
          </span>
        </span>
        <Icon icon="material-symbols:chevron-right-rounded" class="tts-chevron" />
      </button>

      <section class="tts-section">
        <div class="tts-section-head">
          <span>语速</span>
          <span>{{ formatRate(ttsStore.playbackRate) }}</span>
        </div>
        <div class="tts-segments">
          <button
            v-for="rate in ratePresets"
            :key="rate"
            type="button"
            :class="{ active: ttsStore.playbackRate === rate }"
            @click="setPlaybackRate(rate)"
          >
            {{ rate }}×
          </button>
        </div>
      </section>

      <section class="tts-section">
        <div class="tts-section-head">
          <span>定时关闭</span>
          <span>
            {{
              ttsStore.autoStopOptions.enable
                ? `${ttsStore.autoStopOptions.duration}分钟后`
                : '不启用'
            }}
          </span>
        </div>
        <div class="tts-segments timer">
          <button
            v-for="item in timerPresets"
            :key="item.minutes"
            type="button"
            :class="{ active: isTimerSelected(item.minutes) }"
            @click="setTimer(item.minutes)"
          >
            {{ item.label }}
          </button>
        </div>
      </section>

      <button
        type="button"
        class="tts-start"
        @click="onStart"
      >
        <Icon icon="solar:play-bold" />
        开始听书
      </button>
    </div>
  </van-dialog>

  <van-action-sheet
    v-model:show="showVoiceSheet"
    title="选择声音"
    teleport="body"
  >
    <ResponsiveGrid2
      class="max-h-[60vh] overflow-y-auto px-8 py-4"
      :gap="4"
      :min-width="50"
      :max-width="100"
    >
      <MembershipFeatureWrap
        v-for="voice in ttsStore.voices"
        :key="voice.ChineseName"
        :feature="voice.feature"
        class="shrink-0"
      >
        <button
          type="button"
          class="flex w-full cursor-pointer items-center justify-center rounded-lg border-2 text-center text-sm text-[var(--van-text-color)]"
          :class="[
            voice.ChineseName === ttsStore.selectedVoice.ChineseName
              ? 'border-[var(--van-primary-color)]'
              : 'border-[var(--van-border-color)]',
          ]"
          @click="selectVoice(voice)"
        >
          <span class="flex flex-col items-center gap-1 p-1">
            <span>{{ voice.ChineseName }}</span>
            <span class="text-xs text-[var(--van-text-color-2)]">
              {{ voice.Gender === 'Female' ? '女声' : '男声' }}
            </span>
          </span>
        </button>
      </MembershipFeatureWrap>
    </ResponsiveGrid2>
  </van-action-sheet>
</template>

<style lang="less">
.wuji-tts-dialog.van-dialog {
  overflow: hidden;
  border-radius: 20px;
}

.tts-panel {
  padding: 22px;
}

.tts-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
}

.tts-header h3 {
  color: var(--van-text-color);
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
}

.tts-header p {
  margin-top: 3px;
  color: var(--van-text-color-2);
  font-size: 12px;
}

.tts-close {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  color: var(--van-text-color-2);
  font-size: 20px;
  background: var(--van-background-2);
  border-radius: 50%;
}

.tts-setting-row {
  display: flex;
  width: 100%;
  align-items: center;
  padding: 14px;
  text-align: left;
  background: var(--van-background-2);
  border-radius: 14px;
}

.tts-setting-icon {
  display: grid;
  width: 38px;
  height: 38px;
  flex: none;
  place-items: center;
  color: var(--van-primary-color);
  font-size: 21px;
  background: var(--van-background);
  border-radius: 12px;
}

.tts-setting-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  margin-left: 12px;
}

.tts-setting-label {
  color: var(--van-text-color);
  font-size: 14px;
  font-weight: 500;
}

.tts-setting-value {
  overflow: hidden;
  color: var(--van-text-color-2);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tts-chevron {
  flex: none;
  margin-left: 8px;
  color: var(--van-text-color-3);
  font-size: 21px;
}

.tts-section {
  margin-top: 22px;
}

.tts-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  color: var(--van-text-color);
  font-size: 13px;
  font-weight: 500;
}

.tts-section-head span:last-child {
  color: var(--van-text-color-2);
  font-size: 12px;
  font-weight: 400;
}

.tts-segments {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}

.tts-segments.timer {
  grid-template-columns: repeat(4, 1fr);
  row-gap: 7px;
}

.tts-segments button {
  height: 34px;
  color: var(--van-text-color-2);
  font-size: 12px;
  background: var(--van-background-2);
  border: 1px solid transparent;
  border-radius: 10px;
  transition: 0.15s ease;
}

.tts-segments button.active {
  color: var(--van-primary-color);
  background: var(--van-background);
  border-color: var(--van-primary-color);
}

.tts-start {
  display: flex;
  width: 100%;
  height: 44px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  margin-top: 26px;
  color: white;
  font-size: 15px;
  font-weight: 500;
  background: var(--van-primary-color);
  border-radius: 12px;
}

.tts-start:active {
  opacity: 0.82;
}

</style>
