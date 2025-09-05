<script setup lang="ts">
import type { PhotoItem, PhotoSource } from '@wuji-tauri/source-extension';
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
const emit = defineEmits<{
  (e: 'click', item: PhotoItem, source?: PhotoSource): void;
}>();

const selected = defineModel('selected');
</script>

<template>
  <MPhotoShelfCard
    v-bind="$attrs"
    v-model:selected="selected"
    :item="item"
    :selecte-mode="selecteMode"
    :source="source"
    @click="() => emit('click', item, source)"
  />
</template>
