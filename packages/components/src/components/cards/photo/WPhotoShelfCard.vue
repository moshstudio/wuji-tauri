<template>
  <MPhotoShelfCard
    v-bind="$attrs"
    v-model:selected="selected"
    :item="item"
    :selecte-mode="selecteMode"
    :source="source"
    @click="() => emit('click', item, source)"
  ></MPhotoShelfCard>
</template>

<script setup lang="ts">
import type { PhotoItem } from '@wuji-tauri/source-extension';
import type { PhotoSource } from '@wuji-tauri/source-extension';
import type { PropType } from 'vue';
import MPhotoShelfCard from './MPhotoShelfCard.vue';

const { item, selecteMode, source } = defineProps({
  item: {
    type: Object as PropType<PhotoItem>,
    required: true,
  },
  selecteMode: {
    type: Boolean,
    default: false,
  },
  source: {
    type: Object as PropType<PhotoSource | undefined>,
    required: true,
  },
});
const selected = defineModel('selected');

const emit = defineEmits<{
  (e: 'click', item: PhotoItem, source?: PhotoSource): void;
}>();
</script>
