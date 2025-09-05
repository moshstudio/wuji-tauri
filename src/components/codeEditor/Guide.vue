<script setup lang="ts">
import hljs from 'highlight.js';
import css from 'highlight.js/lib/languages/css';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import html from 'highlight.js/lib/languages/xml';
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import { computed, nextTick } from 'vue';
import { guideCommonMD } from './guides';
import 'github-markdown-css/github-markdown-dark.css';
import 'highlight.js/styles/github-dark.css'; // 代码块的黑暗主题

const props = withDefaults(defineProps<Props>(), {
  title: '详情',
  width: '50%',
});
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('css', css);
hljs.registerLanguage('html', html);

const marked = new Marked(
  markedHighlight({
    emptyLangClass: 'hljs',
    langPrefix: 'hljs language-',
    highlight(code, lang, info) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    },
  }),
);

interface Props {
  content: string;
  title?: string;
  width?: string;
}

const show = defineModel<boolean>('show');

const htmlContent = computed(() => {
  return marked.parse(props.content);
});

function open() {
  show.value = true;
}

function close() {
  show.value = false;
}

// 添加复制功能
function addCopyButtons() {
  nextTick(() => {
    document
      .querySelectorAll('.markdown-tab .markdown-body pre')
      .forEach((pre) => {
        if (!pre.querySelector('.copy-button')) {
          const button = document.createElement('button');
          button.className = 'copy-button';
          button.textContent = '复制';
          button.addEventListener('click', () => {
            const code = pre.querySelector('code')?.innerText || '';
            navigator.clipboard.writeText(code).then(() => {
              button.textContent = '已复制!';
              setTimeout(() => {
                button.textContent = '复制';
              }, 2000);
            });
          });
          pre.appendChild(button);
        }
      });
  });
}

// 暴露方法给父组件
defineExpose({
  open,
  close,
});
</script>

<template>
  <div
    v-if="show"
    class="relative flex h-full w-[30%] flex-shrink-0 flex-col overflow-hidden"
  >
    <div
      class="flex h-[40px] flex-shrink-0 items-center justify-between border-b border-gray-200 text-[--van-text-color]"
    >
      <div class="text-base font-semibold">
        {{ title }}
      </div>
      <van-icon name="cross" class="van-haptics-feedback p-2" @click="close" />
    </div>

    <!-- Markdown内容区域 -->
    <van-tabs
      shrink
      animated
      class="markdown-tab flex h-full w-full flex-col overflow-hidden bg-[black]"
    >
      <van-tab title="示例">
        <div
          class="markdown-body github-markdown-dark flex-1 overflow-auto p-4"
          v-html="htmlContent"
        />
      </van-tab>
      <van-tab title="通用函数">
        <div
          class="markdown-body github-markdown-dark flex-1 overflow-auto p-4"
          v-html="marked.parse(guideCommonMD)"
        />
      </van-tab>
    </van-tabs>
  </div>
</template>

<style lang="less" scoped>
/* 调整Markdown样式 */
.markdown-body {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  margin: 0 auto;
  padding: 20px;
  cursor: auto;
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
}

@media (max-width: 767px) {
  .markdown-body {
    padding: 15px;
    user-select: text;
    -webkit-user-select: text;
    -moz-user-select: text;
    -ms-user-select: text;
  }
}

/* 确保代码块也可以选择 */
.markdown-body pre,
.markdown-body code {
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
}

/* 添加代码块的复制按钮 */
.markdown-body pre {
  position: relative;
}

.markdown-body pre:hover .copy-button {
  opacity: 1;
}

.copy-button {
  position: absolute;
  right: 10px;
  top: 10px;
  opacity: 0;
  transition: opacity 0.3s;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 12px;
}

:deep(.van-tabs__content),
:deep(.van-tab__panel) {
  height: 100%;
}
</style>
