<script setup lang="ts">
import type { FieldType } from 'vant';
import { Field } from 'vant';
import { onMounted, ref } from 'vue';
import { sleep } from '@/utils';

defineProps<{
  modelValue: string;
  placeholder?: string;
  inputType?: FieldType;
  formatter?: (value: string) => string;
}>();

const emit = defineEmits(['update:modelValue', 'enter']);

const inputRef = ref<HTMLInputElement>();
onMounted(async () => {
  await sleep(200);
  inputRef.value?.focus();
});
</script>

<template>
  <div class="prompt-dialog-content">
    <Field
      ref="inputRef"
      :model-value="modelValue"
      :placeholder="placeholder"
      :type="inputType"
      :formatter="formatter"
      class="prompt-input"
      @update:model-value="emit('update:modelValue', $event)"
      @keydown.enter="emit('enter')"
    />
  </div>
</template>

<style scoped>
.prompt-dialog-content {
  padding: 4px;
}
.prompt-input {
  margin-top: 2px;
}
</style>
