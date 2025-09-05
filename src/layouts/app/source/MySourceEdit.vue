<script setup lang="ts">
import type {
  MarketSource,
  MarketSourceContent,
  MarketSourcePermission,
} from '@wuji-tauri/source-extension';
import type { FormInstance } from 'vant';
import { Icon } from '@iconify/vue';
import {
  MarketSourceContentCard,
  MoreOptionsSheet,
} from '@wuji-tauri/components/src';
import _ from 'lodash';
import { showToast } from 'vant';
import { computed, reactive, ref, watch } from 'vue';
import MNavBar from '@/components/header/MNavBar.vue';
import { router } from '@/router';
import { permissionRules } from '@/utils/marketSource';

const props = defineProps<{
  source?: MarketSource;
  save: (source: MarketSource) => void;
  clickSourceContent: (
    source: MarketSource,
    content: MarketSourceContent,
  ) => void;
  deleteSourceContent: (
    source: MarketSource,
    content: MarketSourceContent,
  ) => void;
}>();

const formData = reactive<Partial<MarketSource>>({});

const formRef = ref<FormInstance>();

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

function refreshPermission(...permissions: MarketSourcePermission[]) {
  formData.permissions = permissions;
}

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

watch(
  () => props.source,
  (source) => {
    if (source) {
      Object.assign(formData, source);
    }
  },
  { immediate: true },
);

const isModified = computed(() => {
  if (!props.source) return false;
  return JSON.stringify(props.source) !== JSON.stringify(formData);
});

async function save() {
  if (!props.source) return;
  try {
    // 验证表单
    await formRef.value?.validate();
    const data = {
      _id: formData._id!,
      name: formData.name!,
      version: formData.version!,
      permissions: formData.permissions!,
      sourceContents: formData.sourceContents!,
      isPublic: formData.isPublic!,
      isBanned: formData.isBanned!,
      thumbsUp: formData.thumbsUp!,
    };

    props.save(data);
  } catch (error) {
    showToast('请检查输入内容');
    return false;
  }
}
</script>

<template>
  <div class="relative flex h-full w-full flex-col">
    <MNavBar :title="source?.name">
      <template #right>
        <div
          v-if="isModified"
          class="p-2 text-[var(--van-nav-bar-text-color)]"
          @click="save"
        >
          保存
        </div>
      </template>
    </MNavBar>
    <div
      class="flex w-full flex-grow flex-col overflow-y-auto bg-[--van-background-1] p-2"
    >
      <div class="flex w-full items-center justify-start gap-2" />
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
      <van-list v-if="source" class="p-2">
        <MarketSourceContentCard
          v-for="sourceContent in source.sourceContents"
          :key="source._id"
          :source="source"
          :item="sourceContent"
          :on-click="() => clickSourceContent(source!, sourceContent)"
        >
          <template #right>
            <div class="flex items-center gap-3">
              <div
                class="van-haptics-feedback rounded bg-green-500 p-1 text-white"
                @click.stop="() => clickSourceContent(source!, sourceContent)"
              >
                <Icon icon="uil:edit" width="16" height="16" />
              </div>
              <div
                class="van-haptics-feedback bg-red rounded p-1 text-white"
                @click.stop="() => deleteSourceContent(source!, sourceContent)"
              >
                <Icon icon="mdi:delete-outline" width="16" height="16" />
              </div>
            </div>
          </template>
        </MarketSourceContentCard>
      </van-list>
      <div
        v-if="!source?.sourceContents?.length"
        class="flex items-center justify-center"
      >
        <span class="pr-2 text-[var(--van-text-color)]">未添加任何源</span>
        <span
          class="van-haptics-feedback text-[var(--van-nav-bar-text-color)]"
          @click="
            () => {
              router.push({ name: 'SourceContentCreate' });
            }
          "
        >
          去添加
        </span>
      </div>
    </div>
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
  </div>
</template>

<style scoped lang="less"></style>
