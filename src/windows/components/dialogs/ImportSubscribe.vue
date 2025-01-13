<script setup lang="ts">
import { ref, reactive } from "vue";
import { useStore, useDisplayStore } from "@/store";
import { storeToRefs } from "pinia";

const store = useStore();
const displayStore = useDisplayStore();
const { showAddSubscribeDialog } = storeToRefs(displayStore);
const value = ref("");

function addSubscribe() {
  // TODO: 添加订阅源
  if (!value.value) return;
  store.addSubscribeSource(value.value);
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
      <van-field v-model="value" placeholder="请输入地址" autofocus />
    </van-cell-group>
  </van-dialog>
</template>

<style scoped lang="less"></style>
