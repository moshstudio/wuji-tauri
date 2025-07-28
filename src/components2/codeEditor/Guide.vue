<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';
import 'github-markdown-css/github-markdown-dark.css';
import 'highlight.js/styles/github-dark.css'; // 代码块的黑暗主题
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import css from 'highlight.js/lib/languages/css';
import html from 'highlight.js/lib/languages/xml';
import { guideCommonMD } from './guides';

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

const props = withDefaults(defineProps<Props>(), {
  title: '详情',
  width: '50%',
});

const show = defineModel<boolean>('show');

const htmlContent = computed(() => {
  console.log(props.content);
  return marked.parse(props.content);
});

const open = () => {
  show.value = true;
};

const close = () => {
  show.value = false;
};

// 添加复制功能
const addCopyButtons = () => {
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
};

// 暴露方法给父组件
defineExpose({
  open,
  close,
});
</script>

<template>
  <van-popup
    v-model:show="show"
    position="right"
    teleport="body"
    z-index="1000"
    :style="{ width: props.width, height: '100%' }"
    :overlay="false"
    :overlay-style="{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }"
    @opened="addCopyButtons"
  >
    <div class="relative flex h-full flex-col">
      <div
        class="z-10 flex h-[60px] shrink-0 items-center justify-between border-b border-gray-200 bg-[--van-background] p-2 text-[--van-text-color]"
      >
        <h3 class="text-lg font-semibold">{{ title }}</h3>
        <button @click="close" class="text-gray-500 hover:text-gray-700">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- Markdown内容区域 -->
      <van-tabs
        shrink
        animated
        sticky
        offset-top="60"
        class="markdown-tab h-full w-full overflow-auto"
      >
        <van-tab title="示例">
          <div
            class="markdown-body github-markdown-dark flex-1 overflow-auto p-4"
            v-html="htmlContent"
          ></div>
        </van-tab>
        <van-tab title="通用函数">
          <div
            class="markdown-body github-markdown-dark flex-1 overflow-auto p-4"
            v-html="marked.parse(guideCommonMD)"
          ></div>
        </van-tab>
      </van-tabs>
    </div>
  </van-popup>
</template>

<style>
/* 调整Markdown样式 */
.markdown-body {
  box-sizing: border-box;
  min-width: 200px;
  max-width: 100%;
  margin: 0 auto;
  padding: 20px;
  cursor: auto;
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
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

@media (max-width: 767px) {
  .markdown-body {
    padding: 15px;
    user-select: text;
    -webkit-user-select: text;
    -moz-user-select: text;
    -ms-user-select: text;
  }
}
</style>
