<script setup lang="ts">
import type { FormInstance } from 'vant';
import { MoreOptionsSheet } from '@wuji-tauri/components/src';
import { MarketSourcePermission } from '@wuji-tauri/source-extension';
import _ from 'lodash';
import { showToast } from 'vant';
import { reactive, ref } from 'vue';
import { permissionRules } from '@/utils/marketSource';

const props = defineProps<{
  create: (
    name: string,
    permissions: MarketSourcePermission[],
    isPublic: boolean,
  ) => void;
}>();

const show = defineModel<boolean>('show');

const formRef = ref<FormInstance>();

const formData = reactive({
  name: '',
  permissions: [MarketSourcePermission.Login] as MarketSourcePermission[],
  isPublic: true,
});

const nameRules = [
  { required: true, message: '请输入名称' },
  {
    pattern: /^[\w\u4E00-\u9FA5]{2,80}$/,
    message: '名称只能包含字母、数字、下划线，2-80个字符',
  },
];

const showPermissionMoreOptions = ref(false);

const permissionOptions = permissionRules.map((rule) => {
  return {
    name: rule.name,
    callback: () => refreshPermission(...rule.permissions),
  };
});

const showPublicMoreOptions = ref(false);
const publicOptions = [
  {
    name: '公开',
    callback: () => (formData.isPublic = true),
  },
  {
    name: '私有',
    callback: () => (formData.isPublic = false),
  },
];

function refreshPermission(...permissions: MarketSourcePermission[]) {
  formData.permissions = permissions;
}

async function beforeClose(action: string): Promise<boolean> {
  if (action === 'confirm') {
    try {
      // 验证表单
      await formRef.value?.validate();
      props.create(formData.name, formData.permissions, formData.isPublic);
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
    title="创建订阅源"
    show-cancel-button
    :before-close="beforeClose"
  >
    <van-form ref="formRef" class="p-4">
      <van-field
        v-model="formData.name"
        name="name"
        label="名称"
        placeholder="中文、字母、数字、下划线"
        :rules="nameRules"
      />
      <van-cell
        title="使用权限"
        :value="
          permissionRules.find((rule) =>
            _.isEqual(rule.permissions, formData.permissions),
          )?.name
        "
        clickable
        is-link
        @click="() => (showPermissionMoreOptions = true)"
      />
      <van-cell
        title="是否公开"
        :value="formData.isPublic ? '公开' : '私有'"
        clickable
        is-link
        @click="() => (showPublicMoreOptions = true)"
      />
    </van-form>
    <MoreOptionsSheet
      v-model="showPermissionMoreOptions"
      title="使用权限"
      :actions="permissionOptions"
    />
    <MoreOptionsSheet
      v-model="showPublicMoreOptions"
      title="是否公开"
      :actions="publicOptions"
    />
  </van-dialog>
</template>

<style scoped lang="less">
:deep(.van-cell__title) {
  width: 40px;
}
</style>
