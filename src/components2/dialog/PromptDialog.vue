<script setup lang="ts">
import { sleep } from '@/utils';
import { Field, FieldType } from 'vant';
import { onMounted, ref } from 'vue';

defineProps<{
  modelValue: string;
  placeholder?: string;
  inputType?: FieldType;
  formatter?: (value: string) => string;
}>();

const emit = defineEmits(['update:modelValue']);

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
      @update:model-value="emit('update:modelValue', $event)"
      :placeholder="placeholder"
      :type="inputType"
      :formatter="formatter"
      class="prompt-input"
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
