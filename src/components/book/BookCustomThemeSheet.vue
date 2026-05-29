<script setup lang="ts">
import type { ReadTheme } from '@/types/book';
import { Chrome } from '@ckpack/vue-color';
import { Icon } from '@iconify/vue';
import { computed, ref, watch } from 'vue';
import { useBookStore } from '@/store';
import { hasLowContrast, normalizeThemeColor } from '@/utils/readTheme';

const props = defineProps<{
  show: boolean;
  /** 编辑模式传入已有主题，新建模式不传 */
  editingTheme?: ReadTheme;
}>();

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void;
  (e: 'saved'): void;
}>();

const bookStore = useBookStore();

const textColor = ref('#2c2c2c');
const bgColor = ref('#f8f9fa');
/** 当前正在编辑的颜色类型，关闭动画结束后再清空 */
const pickerTarget = ref<'text' | 'bg' | null>(null);
/** 取色器弹层显隐，与 pickerTarget 分离以避免关闭动画时内容高度塌陷 */
const pickerPopupShow = ref(false);

const isEditMode = computed(() => !!props.editingTheme?.id);

const pickerTitle = computed(() =>
  pickerTarget.value === 'text' ? '选择文字颜色' : '选择背景颜色',
);

const lowContrast = computed(() =>
  hasLowContrast(textColor.value, bgColor.value),
);

const previewStyle = computed(() => ({
  color: textColor.value,
  backgroundColor: bgColor.value,
}));

const pickerModel = computed({
  get: () => (pickerTarget.value === 'text' ? textColor.value : bgColor.value),
  set: (value: string) => {
    const hex = normalizeThemeColor(value);
    if (pickerTarget.value === 'text')
      textColor.value = hex;
    else if (pickerTarget.value === 'bg')
      bgColor.value = hex;
  },
});

function onPickerUpdate(payload: { hex: string }) {
  pickerModel.value = payload.hex;
}

function openPicker(target: 'text' | 'bg') {
  pickerTarget.value = target;
  pickerPopupShow.value = true;
}

function closePicker() {
  pickerPopupShow.value = false;
}

function onPickerClosed() {
  pickerTarget.value = null;
}

function resetForm() {
  pickerPopupShow.value = false;
  pickerTarget.value = null;
  if (props.editingTheme) {
    textColor.value = normalizeThemeColor(
      props.editingTheme.color || '#2c2c2c',
    );
    bgColor.value = normalizeThemeColor(
      props.editingTheme.bgColor || '#f8f9fa',
    );
  }
  else {
    const fallback = bookStore.currTheme;
    const useFallback
      = fallback.color
        && fallback.bgColor
        && !fallback.color.startsWith('var(')
        && !fallback.bgColor.startsWith('var(');
    textColor.value = normalizeThemeColor(
      useFallback ? fallback.color! : '#2c2c2c',
    );
    bgColor.value = normalizeThemeColor(
      useFallback ? fallback.bgColor! : '#f8f9fa',
    );
  }
}

watch(
  () => [props.show, props.editingTheme] as const,
  ([visible]) => {
    if (visible)
      resetForm();
  },
);

function close() {
  closePicker();
  pickerTarget.value = null;
  emit('update:show', false);
}

function onSave() {
  if (isEditMode.value && props.editingTheme?.id) {
    bookStore.updateCustomTheme(props.editingTheme.id, {
      color: textColor.value,
      bgColor: bgColor.value,
    });
  }
  else {
    bookStore.addCustomTheme({
      color: textColor.value,
      bgColor: bgColor.value,
    });
  }
  emit('saved');
  close();
}

function onDelete() {
  if (props.editingTheme?.id) {
    bookStore.removeCustomTheme(props.editingTheme.id);
    emit('saved');
    close();
  }
}
</script>

<template>
  <van-action-sheet
    :show="show"
    :title="isEditMode ? '编辑自定义主题' : '新建自定义主题'"
    teleport="body"
    @update:show="emit('update:show', $event)"
    @cancel="close"
  >
    <div class="theme-editor flex flex-col gap-3 px-4 pb-6 pt-2">
      <!-- 预览 -->
      <div
        class="rounded-lg border border-[var(--van-border-color)] p-4 text-sm leading-relaxed transition-colors duration-200"
        :style="previewStyle"
      >
        <p class="mb-2 text-center text-base font-bold">
          预览标题
        </p>
        <p class="text-justify indent-[2em]" style="text-align-last: auto">
          这是一段预览文字，用于查看文字颜色与背景色的搭配效果。
        </p>
      </div>

      <p v-if="lowContrast" class="text-xs text-[var(--van-warning-color)]">
        文字与背景对比度较低，可能影响阅读体验
      </p>

      <!-- 颜色项：点击后弹出取色器 -->
      <div class="color-list">
        <button
          type="button"
          class="color-row"
          @click="openPicker('text')"
        >
          <span class="color-label">文字颜色</span>
          <span class="color-row-right">
            <span
              class="color-swatch"
              :style="{ backgroundColor: textColor }"
            />
            <span class="color-hex">{{ textColor }}</span>
            <Icon icon="mdi:chevron-right" class="color-arrow" />
          </span>
        </button>
        <button
          type="button"
          class="color-row"
          @click="openPicker('bg')"
        >
          <span class="color-label">背景颜色</span>
          <span class="color-row-right">
            <span
              class="color-swatch"
              :style="{ backgroundColor: bgColor }"
            />
            <span class="color-hex">{{ bgColor }}</span>
            <Icon icon="mdi:chevron-right" class="color-arrow" />
          </span>
        </button>
      </div>

      <!-- 操作按钮 -->
      <div class="flex gap-2 pt-1">
        <van-button
          v-if="isEditMode"
          type="danger"
          plain
          class="flex-1"
          @click="onDelete"
        >
          删除
        </van-button>
        <van-button type="primary" class="flex-1" @click="onSave">
          保存
        </van-button>
        <van-button plain class="flex-1" @click="close">
          取消
        </van-button>
      </div>
    </div>
  </van-action-sheet>

  <!-- 取色器弹层 -->
  <van-popup
    v-model:show="pickerPopupShow"
    close-on-popstate
    position="bottom"
    round
    teleport="body"
    :style="{ paddingBottom: 'env(safe-area-inset-bottom)' }"
    @closed="onPickerClosed"
  >
    <div class="picker-popup">
      <div class="picker-header">
        <span class="picker-title">{{ pickerTitle }}</span>
        <van-button
          size="small"
          type="primary"
          plain
          @click="closePicker"
        >
          完成
        </van-button>
      </div>
      <div class="picker-wrap">
        <Chrome
          v-if="pickerTarget"
          :key="pickerTarget"
          :model-value="pickerModel"
          disable-alpha
          @update:model-value="onPickerUpdate"
        />
      </div>
    </div>
  </van-popup>
</template>

<style scoped lang="less">
.theme-editor {
  .color-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .color-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 12px 14px;
    border-radius: 10px;
    border: 1px solid var(--van-border-color);
    background: var(--van-background-2);
    cursor: pointer;
    transition: background-color 0.2s;

    &:active {
      background: var(--van-active-color);
    }
  }

  .color-label {
    font-size: 14px;
    color: var(--van-text-color);
  }

  .color-row-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .color-swatch {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 1px solid var(--van-border-color);
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.06);
  }

  .color-hex {
    font-family: ui-monospace, monospace;
    font-size: 13px;
    color: var(--van-text-color-2);
    letter-spacing: 0.02em;
  }

  .color-arrow {
    font-size: 18px;
    color: var(--van-text-color-3);
  }
}

.picker-popup {
  padding: 12px 16px 20px;

  .picker-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .picker-title {
    font-size: 16px;
    font-weight: 500;
    color: var(--van-text-color);
  }

  .picker-wrap {
    display: flex;
    justify-content: center;

    :deep(.vc-chrome) {
      width: 100% !important;
      max-width: 320px;
      box-shadow: none !important;
      background: var(--van-background-2) !important;
      border-radius: 12px;
      border: 1px solid var(--van-border-color);
      font-family: inherit;
    }

    :deep(.vc-chrome-body) {
      background: var(--van-background-2) !important;
    }

    :deep(.vc-chrome-fields-wrap) {
      padding-top: 8px;
    }

    :deep(.vc-input__input) {
      color: var(--van-text-color) !important;
      background: var(--van-background) !important;
      border-color: var(--van-border-color) !important;
      box-shadow: inset 0 0 0 1px var(--van-border-color);
      border-radius: 4px;
    }

    :deep(.vc-chrome-toggle-btn) {
      display: none;
    }
  }
}
</style>
