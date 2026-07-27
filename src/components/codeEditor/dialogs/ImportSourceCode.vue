<script lang="ts" setup>
import { showFailToast, showSuccessToast } from 'vant';
import { ref, watch } from 'vue';
import {
  applyParsedExtensionCode,
  parseExtensionCode,
} from '@/layouts/desktop/source/createSource/parseExtensionCode';
import { useSourceCreateStore } from '@/store/sourceCreateStore';

const emit = defineEmits<{
  imported: [type: string];
}>();

const show = defineModel<boolean>();

const sourceCreateStore = useSourceCreateStore();
const codeText = ref('');

watch(show, async (visible) => {
  if (!visible) {
    return;
  }
  codeText.value = '';
  try {
    const clip = await navigator.clipboard.readText();
    if (clip.trim() && /extends\s+\w+Extension/.test(clip)) {
      codeText.value = clip.trim();
    }
  }
  catch {
    // ignore clipboard permission errors
  }
});

async function pasteFromClipboard() {
  try {
    const clip = await navigator.clipboard.readText();
    if (!clip.trim()) {
      showFailToast('剪贴板为空');
      return;
    }
    codeText.value = clip.trim();
  }
  catch {
    showFailToast('无法读取剪贴板');
  }
}

async function beforeClose(action: string): Promise<boolean> {
  if (action !== 'confirm') {
    return true;
  }

  const code = codeText.value.trim();
  if (!code) {
    showFailToast('请粘贴源代码');
    return false;
  }

  try {
    const parsed = parseExtensionCode(code);
    const formItem = sourceCreateStore.form[parsed.type];
    applyParsedExtensionCode(formItem, parsed);
    sourceCreateStore.showingType = parsed.type;
    emit('imported', parsed.type);
    showSuccessToast(`已导入「${parsed.name || formItem.chineseName}」`);
    return true;
  }
  catch (error) {
    showFailToast(error instanceof Error ? error.message : '解析失败');
    return false;
  }
}
</script>

<template>
  <van-dialog
    v-model:show="show"
    title="导入代码"
    show-cancel-button
    confirm-button-text="导入"
    width="min(90vw, 720px)"
    :before-close="beforeClose"
  >
    <div class="import-source-code-body">
      <div class="import-source-code-actions">
        <van-button size="small" @click="pasteFromClipboard">
          从剪贴板粘贴
        </van-button>
      </div>
      <van-field
        v-model="codeText"
        type="textarea"
        rows="14"
        placeholder="粘贴完整源代码（含 class ... extends BookExtension 与 return 语句）"
        class="import-source-code-field"
      />
    </div>
  </van-dialog>
</template>

<style scoped lang="less">
.import-source-code-body {
  display: flex;
  max-height: 60vh;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
  padding: 16px;
}

.import-source-code-actions {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 8px;
}

.import-source-code-field {
  flex: 1;
  min-height: 0;
  overflow: hidden;

  :deep(.van-cell) {
    padding: 0;
  }

  :deep(.van-field__body) {
    border: 1px solid var(--van-gray-4);
    border-radius: 4px;
    padding: 8px;
  }

  :deep(textarea) {
    display: block;
    height: calc(60vh - 88px);
    max-height: calc(60vh - 88px);
    overflow-y: auto !important;
    resize: none;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 12px;
    line-height: 1.5;
  }
}
</style>
