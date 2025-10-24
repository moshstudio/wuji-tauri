<script lang="ts" setup>
import type { FormInstance } from 'vant';
import { nanoid } from 'nanoid';
import { showToast } from 'vant';
import { reactive, ref } from 'vue';

const props = defineProps<{
  confirm: (data: { id: string; name: string }) => void;
}>();

const show = defineModel<boolean>();

const formRef = ref<FormInstance>();

const formData = reactive({
  id: generateRawUUID(),
  name: '',
});

// 验证规则
const nameRules = [
  { required: true, message: '请输入名称' },
  {
    pattern: /^[\w\u4E00-\u9FA5]{2,80}$/,
    message: '名称只能包含字母、数字、下划线，2-80个字符',
  },
];

// 生成没有中划线的UUID
function generateRawUUID(): string {
  return nanoid();
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
      generateUUID();
      props.confirm({
        id: formData.id,
        name: formData.name,
      });
      return true;
    } catch (error) {
      showToast('请检查输入内容');
      return false;
    }
  }
  return true;
}
</script>

<template>
  <van-dialog
    v-model:show="show"
    title="保存"
    show-cancel-button
    :before-close="beforeClose"
  >
    <van-form ref="formRef" class="p-4">
      <van-field
        v-model="formData.id"
        name="id"
        label="ID"
        placeholder="自动生成的UUID"
        readonly
        class="!hidden"
      >
        <template #button>
          <van-button size="small" class="ml-2" @click="generateUUID">
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
    </van-form>
  </van-dialog>
</template>

<style scoped lang="less">
:deep(.van-cell__title) {
  width: 40px;
}
</style>
