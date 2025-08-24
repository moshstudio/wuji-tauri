<script setup lang="ts">
import { useDisplayStore, useStore } from '@/store';
import { permissionRules } from '@/utils/marketSource';
import { MoreOptionsSheet } from '@wuji-tauri/components/src';
import { MarketSourcePermission } from '@wuji-tauri/source-extension';
import _ from 'lodash';
import { FormInstance, showToast } from 'vant';
import { computed, reactive, ref } from 'vue';

const show = defineModel<boolean>('show');

const props = defineProps<{
  create: (
    name: string,
    permissions: MarketSourcePermission[],
    isPublic: boolean,
  ) => void;
}>();

const formRef = ref<FormInstance>();

const formData = reactive({
  name: '',
  permissions: [MarketSourcePermission.Login] as MarketSourcePermission[],
  isPublic: true,
});

const nameRules = [
  { required: true, message: '请输入名称' },
  {
    pattern: /^[a-zA-Z0-9_\u4e00-\u9fa5]{2,80}$/,
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

const refreshPermission = (...permissions: MarketSourcePermission[]) => {
  formData.permissions = permissions;
};

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
    <van-form class="p-4" ref="formRef">
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
      ></van-cell>
      <van-cell
        title="是否公开"
        :value="formData.isPublic ? '公开' : '私有'"
        clickable
        is-link
        @click="() => (showPublicMoreOptions = true)"
      ></van-cell>
    </van-form>
    <MoreOptionsSheet
      title="使用权限"
      v-model="showPermissionMoreOptions"
      :actions="permissionOptions"
    ></MoreOptionsSheet>
    <MoreOptionsSheet
      title="是否公开"
      v-model="showPublicMoreOptions"
      :actions="publicOptions"
    ></MoreOptionsSheet>
  </van-dialog>
</template>

<style scoped lang="less">
:deep(.van-cell__title) {
  width: 40px;
}
</style>
