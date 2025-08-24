<template>
  <vue-monaco-editor
    v-model:value="editorValue"
    v-bind="editorProps"
    :path="path"
    @mount="editorInit"
  />
</template>

<script setup lang="ts">
import { shallowRef } from 'vue';
import { VueMonacoEditor } from '@guolao/vue-monaco-editor';
import type { EditorProps, MonacoEditor } from '@guolao/vue-monaco-editor';
import _ from 'lodash';
import { addCompletions } from './completions';

const editorValue = defineModel<string>('value');

const props = defineProps<{
  path: string;
  init: (editor: any) => void;
  editorChange: (value: string) => void;
}>();

const monaco = shallowRef<MonacoEditor>();

const editorProps: EditorProps = {
  language: 'javascript',
  overrideServices: {
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
  saveViewState: true,
  width: '100%',
  height: '100%',
  theme: 'vs-dark',
  options: {},
};

// 编辑器初始化
const editorInit = (_editorInstance: any, monacoInstance: MonacoEditor) => {
  monaco.value = monacoInstance;

  addCompletions(monaco.value);

  props.init(monaco.value);
};

// 暴露编辑器实例方法
defineExpose({
  getEditor: () => monaco.value,
});
</script>

<style scoped lang="less"></style>
