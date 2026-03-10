<script setup lang="ts">
import type { EditorProps, MonacoEditor } from '@guolao/vue-monaco-editor';
import { VueMonacoEditor } from '@guolao/vue-monaco-editor';
import { shallowRef, watch } from 'vue';
import { addCompletions } from './completions';

const props = defineProps<{
  path: string;
  value?: string;
  init: (editor: any) => void;
  editorChange: (value: string) => void;
}>();

const editorValue = defineModel<string>('value');

const monaco = shallowRef<any>();

const editorProps: EditorProps = {
  language: 'javascript',
  saveViewState: true,
  width: '100%',
  height: '100%',
  theme: 'vs-dark',
  options: {
    fontSize: 16,
    lineNumbers: 'on',
    minimap: { enabled: true },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    wordWrap: 'on',
    folding: true,
    lineDecorationsWidth: 10,
    contextmenu: true,
  },
  overrideServices: {},
};

// 处理外部 value 变化
watch(
  () => props.value,
  (newVal) => {
    if (!monaco.value) return;
    const currentVal = monaco.value.getValue();
    const normalizedNew = newVal?.replace(/\r\n/g, '\n') || '';
    if (normalizedNew !== currentVal) {
      monaco.value.setValue(normalizedNew);
    }
  },
);

const handleEditorChange = (value: string | undefined) => {
  editorValue.value = value;
  props.editorChange(value || '');
};

// 编辑器初始化
function editorInit(editorInstance: any, monacoInstance: MonacoEditor) {
  monaco.value = editorInstance;

  if (props.value) {
    monaco.value.setValue(props.value.replace(/\r\n/g, '\n'));
  }

  addCompletions(monacoInstance);

  props.init(editorInstance);
}

// 暴露编辑器实例方法
defineExpose({
  getEditor: () => monaco.value,
});
</script>

<template>
  <VueMonacoEditor
    :value="value"
    v-bind="editorProps"
    :path="path"
    @mount="editorInit"
    @change="handleEditorChange"
  />
</template>

<style scoped lang="less"></style>
