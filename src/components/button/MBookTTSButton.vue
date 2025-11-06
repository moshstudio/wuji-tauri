<script setup lang="ts">
import type { ReaderResult } from '@/utils/reader/types';
import { Icon } from '@iconify/vue';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useDisplayStore, useServerStore, useTTSStore } from '@/store';
import { showDialog as vantShowDialog } from 'vant';
import { router } from '@/router';
import ResponsiveGrid2 from '../grid/ResponsiveGrid2.vue';

const props = defineProps<{
  readingPagedContent: ReaderResult;
  onPlay: () => void;
}>();

const ttsStore = useTTSStore();
const serverStore = useServerStore();
const displayStore = useDisplayStore();
const showDialog = ref(false);

function onPlay() {
  if (ttsStore.selectedVoice.needVip) {
    if (!serverStore.isVipOrSuperVip) {
      vantShowDialog({
        message: '您选择的语音为会员专属哦\n是否立即开通会员?',
      }).then(() => {
        router.push({ name: 'VipDetail' });
      });
      return;
    }
  }
  if (ttsStore.autoStopOptions.enable) {
    ttsStore.startAutoStopTimer();
  }
  props.onPlay();
}
function onShowDialog() {
  showDialog.value = true;
}

function selectVoice(voice: any) {
  ttsStore.selectedVoice = voice;
  displayStore.showVoiceSelectSheet = false;
}
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
      @click="displayStore.showVoiceSelectSheet = true"
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
    v-model:show="displayStore.showVoiceSelectSheet"
    teleport="body"
    title="选择语音"
  >
    <ResponsiveGrid2
      class="px-8 py-4"
      :gap="4"
      :min-width="50"
      :max-width="100"
    >
      <template v-for="voice in ttsStore.voices" :key="voice.ChineseName">
        <van-badge color="#1989fa" :offset="[0, 0]">
          <template #content v-if="voice.needVip">
            <van-icon name="diamond" class="badge-icon" />
          </template>
          <div
            class="flex shrink-0 cursor-pointer items-center justify-center rounded-lg border-2 text-center text-sm text-[--van-text-color]"
            :class="[
              voice.ChineseName === ttsStore.selectedVoice.ChineseName
                ? 'border-[var(--van-primary-color)]'
                : 'border-gray-300',
            ]"
            @click="selectVoice(voice)"
          >
            <div class="flex flex-col items-center gap-1 p-1">
              <p>{{ voice.ChineseName }}</p>
              <p class="text-xs text-gray-500">
                {{ voice.Gender === 'Female' ? '女声' : '男声' }}
              </p>
            </div>
          </div>
        </van-badge>
      </template>
    </ResponsiveGrid2>
  </van-action-sheet>
</template>

<style scoped lang="less"></style>
