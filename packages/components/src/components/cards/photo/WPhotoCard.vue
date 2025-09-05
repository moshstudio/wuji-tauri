<script setup lang="ts">
import type { PhotoItem } from '@wuji-tauri/source-extension';
import type { PropType } from 'vue';
import MPhotoCard from './MPhotoCard.vue';

const { item } = defineProps({
  item: {
    type: Object as PropType<PhotoItem>,
    required: true,
  },
});

const emit = defineEmits<{
  (e: 'click', item: PhotoItem): void;
}>();
</script>

<template>
  <MPhotoCard v-bind="$attrs" :item="item" @click="() => emit('click', item)" />
</template>
