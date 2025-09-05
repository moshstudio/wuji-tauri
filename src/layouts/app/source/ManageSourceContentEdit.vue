<script setup lang="ts">
import type {
  SubscribeItem,
  SubscribeSource,
} from '@wuji-tauri/source-extension';
import type { FormInstance } from 'vant';
import { showToast } from 'vant';
import { computed, ref, watch } from 'vue';
import IEditor from '@/components/codeEditor/IEditor.vue';
import MNavBar from '@/components/header/MNavBar.vue';

const props = defineProps<{
  source?: SubscribeSource;
  sourceContent?: SubscribeItem;
  save: (
    source: SubscribeSource,
    sourceContent: {
      id: string;
      name?: string;
      code?: string;
    },
  ) => void;
}>();

const name = ref<string>();
const code = ref<string>();

const formRef = ref<FormInstance>();

const nameRules = [
  { required: true, message: '请输入名称' },
  {
    pattern: /^[\w\u4E00-\u9FA5]{2,80}$/,
    message: '名称只能包含字母、数字、下划线，2-80个字符',
  },
];

watch(
  () => props.sourceContent,
  async (sourceContent) => {
    if (sourceContent) {
      name.value = sourceContent.name;
      code.value = sourceContent.code;
    }
  },
  { immediate: true },
);

const isModified = computed(() => {
  if (!props.sourceContent) return false;
  return (
    name.value != props.sourceContent?.name ||
    code.value != props.sourceContent?.code
  );
});

async function save() {
  if (!props.source || !props.sourceContent) return;
  try {
    // 验证表单
    await formRef.value?.validate();
    if (!name.value || !code.value) {
      showToast('请检查输入内容');
      return false;
    }

    props.save(props.source, {
      id: props.sourceContent.id,
      name: name.value,
      code: code.value,
    });
  } catch (error) {
    showToast('请检查输入内容');
    return false;
  }
}
</script>

<template>
  <div class="relative flex h-full w-full flex-col">
    <MNavBar :title="sourceContent?.name">
      <template #right>
        <div
          v-if="isModified"
          class="p-2 text-[var(--van-nav-bar-text-color)]"
          @click="save"
        >
          保存
        </div>
      </template>
    </MNavBar>
    <div
      class="flex w-full flex-grow flex-col overflow-y-auto bg-[--van-background-1] p-2"
    >
      <van-form ref="formRef" class="px-4 py-1">
        <van-field
          v-model="name"
          name="name"
          label="名称"
          placeholder="中文、字母、数字、下划线"
          :rules="nameRules"
        />
      </van-form>
      <IEditor
        v-model:value="code"
        path="my-source-content-edit"
        :init="() => {}"
        :editor-change="() => {}"
      />
    </div>
  </div>
</template>

<style scoped lang="less"></style>
