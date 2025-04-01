<template>
  <div class="relative w-full h-full" @mouseenter="showControlsAction">
    <video-player
      :src="src"
      playsinline
      :loop="false"
      crossorigin="anonymous"
      :volume="1"
      :height="320"
      :playback-rates="[0.5, 0.75, 1.0, 1.25, 1.5, 2.0]"
      @loadedmetadata="(args) => emit('canPlay', args)"
      @timeupdate="(args) => emit('timeUpdate', args)"
      @mounted="handleMounted"
      class="flex w-full h-full items-center"
    >
      <template
        v-slot="{
          player,
          state,
        }: {
          player: VideoJsPlayer;
          state: VideoPlayerState;
        }"
      >
        <div
          class="bg-mask absolute w-full h-full bg-transparent"
          @click="
            () => {
              state.playing ? player.pause() : player.play();
            }
          "
          v-show="showControls"
        >
          <div
            class="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/90 to-transparent pointer-events-none"
          ></div>

          <div
            class="control-bar absolute left-0 right-0 bottom-0 flex flex-col gap-2 p-2"
            @mouseenter.stop="showControlsAction"
            @click.stop
          >
            <VideoProgressBar
              :state="state"
              @seek="(time) => player.currentTime(time)"
            ></VideoProgressBar>

            <div class="flex gap-2 items-center justify-between">
              <div class="flex items-center gap-2">
                <PlayPauseButton
                  :is-playing="state.playing"
                  :play-or-pause="
                    () => {
                      state.playing ? player.pause() : player.play();
                    }
                  "
                ></PlayPauseButton>
                <TimeShow :state="state" :is-playing="state.playing"></TimeShow>
                <QuickSeekButton
                  :seconds="10"
                  :quick-forward="quickForward"
                  :quick-back="quickBackward"
                ></QuickSeekButton>
              </div>
              <div class="flex items-center gap-2">
                <PlaybackRateButton
                  :state="state"
                  :player="player"
                ></PlaybackRateButton>
                <FullScreenButton
                  :state="state"
                  :player="player"
                ></FullScreenButton>
              </div>
            </div>
          </div>
        </div>
      </template>
    </video-player>
    <div
      class="absolute bottom-0 left-0 right-0 h-[76px] bg-transparent"
      v-if="!showControls"
      @mouseenter.stop="showControlsAction"
    ></div>
  </div>
</template>

<script lang="ts" setup>
import VideoProgressBar from '@/components/media/win/ProgressBar.vue';
import PlayPauseButton from '@/components/media/win/PlayPauseButton.vue';
import TimeShow from '@/components/media/win/TimeShow.vue';
import PlaybackRateButton from '@/components/media/win/PlaybackRateButton.vue';
import FullScreenButton from '@/components/media/win/FullScreenButton.vue';
import QuickSeekButton from '@/components/media/win/QuickSeekButton.vue';
import {
  defineComponent,
  onBeforeUnmount,
  PropType,
  ref,
  shallowRef,
  watch,
} from 'vue';
import videojs from 'video.js';
import { VideoPlayer, VideoPlayerState } from '@videojs-player/vue';
import 'video.js/dist/video-js.css';
import { setTimeout, clearTimeout } from 'worker-timers';
type VideoJsPlayer = ReturnType<typeof videojs>;

const player = defineModel('player', {
  type: Object as PropType<VideoJsPlayer>,
});
const { src } = defineProps({
  src: {
    type: String,
  },
});
const emit = defineEmits<{
  (e: 'canPlay', args: any): void;
  (e: 'timeUpdate', args: any): void;
}>();

const state = shallowRef<VideoPlayerState>();
const handleMounted = (payload: any) => {
  state.value = payload.state;
  player.value = payload.player;
};

const showControls = ref(false);
let hideTimer: number | null = null;

const showControlsAction = () => {
  if (hideTimer) {
    clearTimeout(hideTimer);
  }
  showControls.value = true;
  // 设置新的定时器
  hideTimer = setTimeout(() => {
    showControls.value = false;
  }, 2000); // 2秒后隐藏
};

const quickForward = (seconds: number) => {
  if (player.value) {
    player.value.currentTime(
      Math.min(player.value.currentTime() + seconds, player.value.duration())
    );
  }
};
const quickBackward = (seconds: number) => {
  if (player.value) {
    player.value.currentTime(Math.max(player.value.currentTime() - seconds, 0));
  }
};

// 组件卸载时清除定时器
onBeforeUnmount(() => {
  if (hideTimer) {
    clearTimeout(hideTimer);
  }
});
</script>

<style lang="less" scoped></style>
