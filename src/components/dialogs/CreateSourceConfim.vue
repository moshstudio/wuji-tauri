<template>
  <van-dialog
    v-model:show="showDialog"
    title="保存文件"
    show-cancel-button
    :before-close="beforeClose"
    @confirm="handleConfirm"
  >
    <van-form ref="formRef" class="p-4">
      <van-field
        v-model="formData.id"
        name="id"
        label="ID"
        placeholder="自动生成的UUID"
        readonly
      >
        <template #button>
          <van-button size="small" @click="generateUUID" class="ml-2">
            <template #icon>
              <van-icon name="replay" />
            </template>
          </van-button>
        </template>
      </van-field>

      <van-field
        v-model="formData.name"
        name="name"
        label="名称"
        placeholder="中文、字母、数字、下划线"
        :rules="nameRules"
      />
      <van-field
        v-model="formData.author"
        name="author"
        label="作者"
        placeholder="中文、字母、数字、下划线"
        :rules="authorRules"
      />

      <van-field
        v-model="formData.version"
        name="version"
        label="版本"
        placeholder="请输入版本号，如1.0.0"
        :rules="versionRules"
      />
    </van-form>
  </van-dialog>
</template>

<script lang="ts" setup>
import { ref, reactive, watch, nextTick } from 'vue';
import { showToast } from 'vant';
import { v4 as uuidv4 } from 'uuid';
import type { FormInstance } from 'vant';

interface Props {
  show: boolean;
}

interface Emits {
  (e: 'update:show', value: boolean): void;
  (
    e: 'confirm',
    data: { id: string; name: string; author: string; version: string },
  ): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const showDialog = ref(props.show);
const formRef = ref<FormInstance>();

const formData = reactive({
  id: generateRawUUID(),
  name: '',
  author: '',
  version: '1.0.0',
});

// 验证规则
const nameRules = [
  { required: true, message: '请输入名称' },
  {
    pattern: /^[a-zA-Z0-9_\u4e00-\u9fa5]{2,12}$/,
    message: '名称只能包含字母、数字、下划线，2-12个字符',
  },
];

const authorRules = [
  { required: true, message: '请输入作者' },
  {
    pattern: /^[a-zA-Z0-9_\u4e00-\u9fa5]{1,12}$/,
    message: '作者只能包含字母、数字、下划线，1-12个字符',
  },
];

const versionRules = [
  { required: true, message: '请输入版本号' },
  {
    pattern: /^\d+\.\d+\.\d+$/,
    message: '版本号格式应为x.x.x',
  },
];

// 生成没有中划线的UUID
function generateRawUUID(): string {
  return uuidv4().replace(/-/g, '').substring(0, 10);
}

// 重新生成UUID
function generateUUID() {
  formData.id = generateRawUUID();
}

// 关闭前的回调
async function beforeClose(action: string): Promise<boolean> {
  if (action === 'confirm') {
    try {
      // 验证表单
      await formRef.value?.validate();
      return true;
    } catch (error) {
      showToast('请检查输入内容');
      return false;
    }
  }
  return true;
}

// 确认保存
function handleConfirm() {
  emit('confirm', {
    id: formData.id,
    name: formData.name,
    author: formData.author,
    version: formData.version,
  });
}

// 监听props.show变化
watch(
  () => props.show,
  (val) => {
    showDialog.value = val;
    if (val) {
      generateUUID();
    }
  },
);

// 监听showDialog变化
watch(showDialog, (val) => {
  emit('update:show', val);
  if (val) {
    // 每次打开对话框时重置表单
    formData.id = generateRawUUID();
    formData.name = '';
    formData.author = '';
    formData.version = '1.0.0';
    // 重置验证状态
    nextTick(() => {
      formRef.value?.resetValidation();
    });
  }
});
</script>

<style scoped lang="less">
:deep(.van-cell__title) {
  width: 40px;
}
</style>
