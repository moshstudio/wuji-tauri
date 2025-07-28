<template>
  <VAceEditor
    class="edit_box"
    v-model:value="editValue"
    v-bind="attr"
    :lang="lang"
    :theme="theme"
    :readonly="readonly"
    ref="aces"
    :class="{ border: hasBorder }"
    :options="editorOptions"
    @init="editorInit"
    @change="() => emit('editorChange')"
  />
</template>

<script setup lang="ts">
import { ref, useAttrs, watch, computed } from 'vue';
import { VAceEditor } from 'vue3-ace-editor';
import ace from 'ace-builds';
import { addCompleter } from 'ace-builds/src-noconflict/ext-language_tools';

// 引入必要的模块
import 'ace-builds/src-noconflict/ext-language_tools';
import 'ace-builds/src-noconflict/ext-searchbox';

// 动态导入主题和语言模式
import themeDraculaUrl from 'ace-builds/src-noconflict/theme-dracula?url';
import themeOneDarkUrl from 'ace-builds/src-noconflict/theme-one_dark?url';
import themeGithubUrl from 'ace-builds/src-noconflict/theme-github?url';
import themeTomorrowUrl from 'ace-builds/src-noconflict/theme-tomorrow?url';

import modeJsonUrl from 'ace-builds/src-noconflict/mode-json?url';
import modeJson5Url from 'ace-builds/src-noconflict/mode-json5?url';
import modeJavascriptUrl from 'ace-builds/src-noconflict/mode-javascript?url';
import modeProtobufUrl from 'ace-builds/src-noconflict/mode-protobuf?url';
import modeHtmlUrl from 'ace-builds/src-noconflict/mode-html?url';
import modeCssUrl from 'ace-builds/src-noconflict/mode-css?url';
import modeTypescriptUrl from 'ace-builds/src-noconflict/mode-typescript?url';
import {
  getFetchAutocompleteItems,
  getFetchDomAutocompleteItems,
  getMaxPageAutocompleteItems,
  getQueryBookElementsAutocompleteItems,
  getQueryComicElementsAutocompleteItems,
  getQueryVideoElementsAutocompleteItems,
  getQueryPhotoElementsAutocompleteItems,
  getQueryPlaylistElementsAutocompleteItems,
  getQuerySongElementsAutocompleteItems,
  getQueryChaptersElementsAutocompleteItems,
  getContentTextAutocompleteItems,
  getUrlJoinAutocompleteItems,
  getGetProxyUrlAutocompleteItems,
  getCryptoJsAutocompleteItems,
  getForgeAutocompleteItems,
  getIconvAutocompleteItems,
  getLodashAutocompleteItems,
  getNanoidAutocompleteItems,
} from './completions';

// 配置模块路径
ace.config.setModuleUrl('ace/theme/dracula', themeDraculaUrl);
ace.config.setModuleUrl('ace/theme/github', themeGithubUrl);
ace.config.setModuleUrl('ace/theme/tomorrow', themeTomorrowUrl);
ace.config.setModuleUrl('ace/theme/one_dark', themeOneDarkUrl);

ace.config.setModuleUrl('ace/mode/json', modeJsonUrl);
ace.config.setModuleUrl('ace/mode/json5', modeJson5Url);
ace.config.setModuleUrl('ace/mode/javascript', modeJavascriptUrl);
ace.config.setModuleUrl('ace/mode/protobuf', modeProtobufUrl);
ace.config.setModuleUrl('ace/mode/html', modeHtmlUrl);
ace.config.setModuleUrl('ace/mode/css', modeCssUrl);
ace.config.setModuleUrl('ace/mode/typescript', modeTypescriptUrl);

const props = defineProps({
  lang: {
    type: String,
    default: 'javascript',
    validator(value: string) {
      return [
        'javascript',
        'json',
        'json5',
        'protobuf',
        'html',
        'css',
        'typescript',
      ].includes(value);
    },
  },
  readonly: {
    type: Boolean,
    default: false,
  },
  showLineNumbers: {
    type: Boolean,
    default: true,
  },
  showGutter: {
    type: Boolean,
    default: true,
  },
  value: {
    type: String,
    default: '',
  },
  hasBorder: {
    type: Boolean,
    default: true,
  },
  highlightActiveLine: {
    type: Boolean,
    default: true,
  },
  // 新增主题属性
  theme: {
    type: String,
    default: 'one_dark',
    validator(value: string) {
      return ['dracula', 'github', 'tomorrow', 'one_dark'].includes(value);
    },
  },
  // 新增自动补全功能
  enableAutocomplete: {
    type: Boolean,
    default: true,
  },
  // 新增字体大小
  fontSize: {
    type: Number,
    default: 14,
  },
  // 新增是否显示打印边距
  showPrintMargin: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:value', 'init', 'editorChange']);

const attr = useAttrs();
const editValue = ref(props.value);
const aces = ref();

const allItems = [
  getFetchAutocompleteItems(),
  ...getFetchDomAutocompleteItems(),
  ...getMaxPageAutocompleteItems(),
  ...getQueryBookElementsAutocompleteItems(),
  ...getQueryComicElementsAutocompleteItems(),
  ...getQueryVideoElementsAutocompleteItems(),
  ...getQueryPhotoElementsAutocompleteItems(),
  ...getQueryPlaylistElementsAutocompleteItems(),
  ...getQuerySongElementsAutocompleteItems(),
  ...getQueryChaptersElementsAutocompleteItems(),
  ...getContentTextAutocompleteItems(),
  ...getUrlJoinAutocompleteItems(),
  ...getGetProxyUrlAutocompleteItems(),
  ...getCryptoJsAutocompleteItems(),
  ...getForgeAutocompleteItems(),
  ...getIconvAutocompleteItems(),
  ...getLodashAutocompleteItems(),
  ...getNanoidAutocompleteItems(),
];
addCompleter({
  identifierRegexps: [/[a-zA-Z_0-9\.\$]/], // 允许点号触发补全
  getCompletions: (
    editor: any,
    session: any,
    pos: any,
    prefix: any,
    callback: any,
  ) => {
    callback(null, allItems);
  },
  getDocTooltip: function (item: any) {
    return {
      docText: item.docText || `Type: ${item.meta}`,
    };
  },
});

// 计算编辑器选项
const editorOptions = computed(() => ({
  fontSize: props.fontSize,
  tabSize: 2,
  showPrintMargin: props.showPrintMargin,
  highlightActiveLine: props.highlightActiveLine,
  showLineNumbers: props.showLineNumbers,
  showGutter: props.showGutter,
  enableBasicAutocompletion: true,
  enableLiveAutocompletion: true,
  enableSnippets: props.enableAutocomplete,
  useWorker: true,
  fontFamily: "'Cascadia Code', 'Courier New', monospace",
  cursorStyle: 'slim',
  scrollPastEnd: 0.3,
  behavioursEnabled: true,
  autoScrollEditorIntoView: true,
  highlightSelectedWord: true,
  animatedScroll: true,
  fadeFoldWidgets: true,
}));

// 编辑器初始化
const editorInit = (editor: any) => {
  // 设置更接近 VS Code 的样式
  // editor.setOptions({
  //   // 自定义 gutter 样式
  //   gutterStyle: 'width: 40px; background: #1e1e1e; color: #858585;',
  // });

  // 触发初始化事件
  emit('init', editor);
};

// 监听值变化
watch(
  () => editValue.value,
  (val) => {
    if (!props.readonly) {
      emit('update:value', val);
    }
  },
);

watch(
  () => props.value,
  (val) => {
    if (val !== editValue.value) {
      editValue.value = val;
    }
  },
);

// 暴露编辑器实例方法
defineExpose({
  getEditor: () => aces.value?.editor,
  focus: () => aces.value?.editor.focus(),
  blur: () => aces.value?.editor.blur(),
  resize: () => aces.value?.editor.resize(),
});
</script>

<style scoped lang="scss">
.edit_box {
  width: 100%;
  height: 100%;
  background-color: #1e1e1e;
  border-radius: 4px;
  overflow: hidden;
  user-select: auto;
  overscroll-behavior: contain;

  :deep(.ace_scrollbar) {
    &::-webkit-scrollbar {
      width: 12px;
      height: 12px;
    }

    &::-webkit-scrollbar-track {
      background: #1e1e1e;
    }

    &::-webkit-scrollbar-thumb {
      background: #4a4a4a;
      border-radius: 5px;
      border: 2px solid #1e1e1e;

      &:hover {
        background: #5a5a5a;
      }
    }
  }
}

.border {
  border: 1px solid #383838;
}
</style>
