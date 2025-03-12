<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useStore, useDisplayStore } from '@/store';
import { storeToRefs } from 'pinia';
import { Icon } from '@iconify/vue';
import * as dialog from '@tauri-apps/plugin-dialog';
import * as fs from 'tauri-plugin-fs-api';

const store = useStore();
const displayStore = useDisplayStore();
const { showAddSubscribeDialog } = storeToRefs(displayStore);
const value = ref('');

function addSubscribe() {
  // TODO: 添加订阅源
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
  showAddSubscribeDialog.value = false;
}
</script>

<template>
  <van-dialog
    v-model:show="showAddSubscribeDialog"
    title="导入订阅源"
    show-cancel-button
    @confirm="addSubscribe"
  >
    <van-cell-group inset>
      <div class="flex justify-between items-center gap-2">
        <van-field v-model="value" placeholder="请输入地址" autofocus />
        <Icon
          icon="hugeicons:file-import"
          width="24"
          height="24"
          class="van-haptics-feedback"
          @click="selectLocalFile"
        />
      </div>
    </van-cell-group>
  </van-dialog>
</template>

<style scoped lang="less"></style>
