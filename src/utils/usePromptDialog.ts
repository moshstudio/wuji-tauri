import { h, ref, type Ref } from 'vue';
import { showDialog, showToast } from 'vant';
import type { DialogOptions, FieldType } from 'vant';
import PromptDialog from '@/components2/dialog/PromptDialog.vue';

interface PromptDialogOptions {
  title?: string;
  message?: string;
  placeholder?: string;
  inputType?: FieldType;
  formatter?: (value: string) => string; // 格式化函数，返回处理后的字符串
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
}

export function showPromptDialog(
  options: PromptDialogOptions = {},
): Promise<string | null> {
  options.formatter ||= (value: string) => {
    return value.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_\-]/g, '');
  };
  return new Promise((resolve) => {
    const inputRef: Ref<string> = ref(options.defaultValue || '');

    showDialog({
      title: options.title || '输入',
      message: () =>
        h(PromptDialog, {
          modelValue: inputRef.value,
          'onUpdate:modelValue': (val: string) => (inputRef.value = val),
          placeholder: options.placeholder,
          inputType: options.inputType || 'text',
          formatter: options.formatter,
        }),
      closeOnClickOverlay: true,
      destroyOnClose: true,
      className: 'custom-prompt-dialog',
      showCancelButton: true,

      confirmButtonText: options.confirmText || '确认',
      cancelButtonText: options.cancelText || '取消',
      closeOnPopstate: true,

      // 关键：自定义对话框内容
      messageAlign: 'left',
      teleport: 'body',

      // 自定义内容渲染
      beforeClose: (action: string) => {
        if (action === 'confirm') {
          if (!inputRef.value.trim()) {
            showToast('请输入内容');
            return false;
          }
          resolve(inputRef.value.trim());
        } else {
          resolve(null);
        }
        return true; // 关闭对话框
      },
    } as DialogOptions & { message?: any });
  });
}
