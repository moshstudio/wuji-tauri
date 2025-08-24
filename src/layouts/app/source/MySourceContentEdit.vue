<script setup lang="ts">
import _ from 'lodash';
import {
  MarketSource,
  MarketSourceContent,
} from '@wuji-tauri/source-extension';
import MNavBar from '@/components/header/MNavBar.vue';
import { ref, reactive, watch, computed } from 'vue';
import { FormInstance, showToast } from 'vant';
import IEditor from '@/components/codeEditor/IEditor.vue';
import { useServerStore } from '@/store';

const props = defineProps<{
  source?: MarketSource;
  sourceContent?: MarketSourceContent;
  save: (source: MarketSource, sourceContent: MarketSourceContent) => void;
}>();

const serverStore = useServerStore();
const sourceContentWithCode = ref<MarketSourceContent>();

const sourceContentName = ref<string>();
const sourceContentCode = ref<string>();

const formRef = ref<FormInstance>();

const nameRules = [
  { required: true, message: '请输入名称' },
  {
    pattern: /^[a-zA-Z0-9_\u4e00-\u9fa5]{2,80}$/,
    message: '名称只能包含字母、数字、下划线，2-80个字符',
  },
];

watch(
  () => props.sourceContent,
  async (sourceContent) => {
    if (sourceContent) {
      sourceContentWithCode.value =
        await serverStore.getMarketSourceContent(sourceContent);
      sourceContentName.value = sourceContentWithCode.value?.name;
      sourceContentCode.value = sourceContentWithCode.value?.code;
    }
  },
  { immediate: true },
);

const isModified = computed(() => {
  if (!props.sourceContent) return false;
  return (
    sourceContentName.value != sourceContentWithCode.value?.name ||
    sourceContentCode.value != sourceContentWithCode.value?.code
  );
});

const save = async () => {
  if (!sourceContentWithCode.value || !props.source) return;
  try {
    // 验证表单
    await formRef.value?.validate();
    if (!sourceContentName.value || !sourceContentCode.value) {
      showToast('请检查输入内容');
      return false;
    }
    sourceContentWithCode.value.name = sourceContentName.value;
    sourceContentWithCode.value.code = sourceContentCode.value;
    props.save(props.source, sourceContentWithCode.value);
  } catch (error) {
    showToast('请检查输入内容');
    return false;
  }
};
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
      class="flex w-full flex-grow flex-col overflow-y-auto bg-[--van-background-2] p-2"
    >
      <van-form class="px-4 py-1" ref="formRef">
        <van-field
          v-model="sourceContentName"
          name="name"
          label="名称"
          placeholder="中文、字母、数字、下划线"
          :rules="nameRules"
        />
      </van-form>
      <IEditor
        v-model:value="sourceContentCode"
        path="my-source-content-edit"
        :init="() => {}"
        :editorChange="() => {}"
      />
    </div>
  </div>
</template>

<style scoped lang="less"></style>
