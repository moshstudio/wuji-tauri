<script setup lang="ts">
import { Icon } from '@iconify/vue';
import * as dialog from '@tauri-apps/plugin-dialog';
import { ref } from 'vue';
import { useDisplayStore, useStore } from '@/store';

const show = defineModel<boolean>('show');

const store = useStore();
const displayStore = useDisplayStore();
const value = ref('');

function addSubscribe() {
  if (!value.value) return;
  store.addSubscribeSource(value.value);
}

async function selectLocalFile() {
  const file = await dialog.open({
    title: '选择本地文件',
    filters: !displayStore.isAndroid
      ? [
          {
            name: '订阅源',
            extensions: ['js'],
          },
        ]
      : [],
    multiple: false,
    directory: false,
  });
  if (!file) return;
  store.addLocalSubscribeSource(file);
  show.value = false;
}
</script>

<template>
  <van-dialog
    v-model:show="show"
    title="导入订阅源"
    show-cancel-button
    close-on-click-overlay
    @confirm="addSubscribe"
  >
    <van-cell-group inset>
      <div class="flex items-center justify-between gap-2">
        <van-field v-model="value" placeholder="请输入链接" autofocus />
        <Icon
          icon="hugeicons:file-import"
          width="24"
          height="24"
          class="van-haptics-feedback text-[var(--van-text-color)]"
          @click="selectLocalFile"
        />
      </div>
      <div class="flex items-center gap-1 px-4 py-2">
        <van-icon name="warning" color="red" />
        <div class="text-xs text-[var(--van-text-color-2)]">
          请勿加载未知来源的链接!
        </div>
      </div>
    </van-cell-group>
  </van-dialog>
</template>

<style scoped lang="less"></style>
