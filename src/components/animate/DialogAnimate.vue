<script setup lang="ts">
import _ from 'lodash';
import { ref, reactive, h, computed, watch } from 'vue';
import DialogWindow from './DialogWindow.vue';
import { useResizeObserver } from '@vueuse/core';
import { sleep } from '@/utils';
import tinycolor from 'tinycolor2';

const messages = [
  '今天要加油！保持积极心态，一切都会好起来的。',
  '你是最棒的！相信自己，你可以的。',
  '每一天都是新的开始，把握当下，创造美好。',
  '困难只是暂时的，你有足够的力量克服一切。',
  '微笑是最好的礼物，今天也要开心哦！',
  '你的努力终将开花结果，继续前进吧。',
  '生活因你而精彩，保持这份独特的魅力。',
  '不要害怕失败，每一次尝试都是成长的机会。',
  '你是自己人生的主角，演绎出最精彩的故事。',
  '保持善良的心，世界会因你而更美好。',
  '今天的付出，是明天成功的基石。',
  '放松一下，给自己一个深呼吸的空间。',
  '你的存在本身就是一种美好，珍惜自己。',
  '追逐梦想的路上，每一步都算数。',
  '阳光总在风雨后，坚持就是胜利。',
  '你的潜力无限，勇敢去探索未知。',
  '感恩当下，珍惜拥有的每一刻。',
  '小小的进步也是进步，为自己骄傲吧。',
  '保持好奇心，生活会给你更多惊喜。',
  '你是独一无二的，无需与他人比较。',
  '给自己一个拥抱，你已经做得很好了。',
  '梦想不会逃跑，逃跑的永远是自己。',
  '保持学习的热情，知识会让你更强大。',
  '善良的人运气不会太差，继续发光吧。',
  '今天的你比昨天更优秀，这就是进步。',
  '放下焦虑，专注于当下能做的事情。',
  '你的微笑可以感染他人，分享快乐吧。',
  '坚持做对的事，时间会证明一切。',
  '你是生活的勇士，勇敢面对每个挑战。',
  '保持希望的光芒，黑暗终将过去。',
  '爱自己是最重要的课题，好好照顾自己。',
  '相信宇宙的安排，一切都是最好的安排。',
];

const maxDialogs = ref(30);
const container = ref<HTMLDivElement>();
const containerWidth = ref(0);
const containerHeight = ref(0);

const dialogConfigs = ref<
  Array<{
    id: number;
    message: string;
    color: string;
    bgColor: string;
    index: number;
    position: { top: number; left: number };
  }>
>([]);

const currentDialogCount = computed(() => dialogConfigs.value.length);

function dialogClose(id: number) {
  dialogConfigs.value = dialogConfigs.value.filter(
    (config) => config.id !== id,
  );
}

function dialogFocus(id: number) {
  dialogConfigs.value = dialogConfigs.value.map((config) => {
    if (config.id === id) {
      config.index = 2;
    } else {
      config.index = 1;
    }
    return config;
  });
}
const getRandomPosition = (): { top: number; left: number } => {
  const maxX = containerWidth.value - 20;
  const maxY = containerHeight.value - 100;
  const top = Math.max(-20, Math.random() * maxY);
  const left = Math.max(-20, Math.random() * maxX);
  return { top, left };
};

let dialogId = 0;

function addDialog() {
  if (currentDialogCount.value >= maxDialogs.value) return;

  const bgColor = tinycolor.random();
  const newDialog = {
    id: dialogId++,
    message: _.sample(messages)!,
    color: bgColor.isLight() ? '#000' : '#fff',
    bgColor: bgColor.toHexString(),
    index: 1,
    position: getRandomPosition(),
  };

  dialogConfigs.value.push(newDialog);
}

useResizeObserver(container, (entries) => {
  const entry = entries[0];
  containerWidth.value = entry.contentRect.width;
  containerHeight.value = entry.contentRect.height;
});

watch(
  currentDialogCount,
  async (count) => {
    if (count < maxDialogs.value) {
      await sleep(_.random(10, 100));
      addDialog();
    }
  },
  {
    immediate: true,
  },
);
</script>

<template>
  <div ref="container" class="absolute inset-0 h-full w-full overflow-hidden">
    <DialogWindow
      v-for="config in dialogConfigs"
      :key="config.id"
      :id="config.id"
      :message="config.message"
      :index="config.index"
      :color="config.color"
      :bg-color="config.bgColor"
      :position="config.position"
      @close="dialogClose"
      @focus="dialogFocus"
    />
  </div>
</template>

<style scoped lang="less"></style>
