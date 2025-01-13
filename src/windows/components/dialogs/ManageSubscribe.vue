<script setup lang="ts">
import { useStore, useDisplayStore, useSubscribeSourceStore } from "@/store";
import { SubscribeItem, SubscribeSource } from "@/types";
import { storeToRefs } from "pinia";
import { ref, reactive, triggerRef } from "vue";

const store = useStore();
const displayStore = useDisplayStore();
const sourceStore = useSubscribeSourceStore();
const { showManageSubscribeDialog } = storeToRefs(displayStore);
const activeNames = ref([]);
const checked = ref([]);
const showClearPopover = ref(false);

function sourceSwitch(item: SubscribeSource, value: boolean) {
  // 启用时，value是false；禁用时，value是true
  // value=true时，disable应为true；value=false时，disable应为false

  if (value) {
    //禁用此source
    item.detail?.urls.forEach((url) => {
      url.disable = true;
    });
  } else {
    //启用此source
    item.detail?.urls.forEach((url) => {
      url.disable = false;
    });
  }
}

function urlSwitch(item: SubscribeSource, url: SubscribeItem, value: boolean) {
  // 启用时，value是false；禁用时，value是true
  // value=true时，disable应为true；value=false时，disable应为false
  if (value) {
    //禁用此url
    url.disable = true;
    if (item.detail?.urls.every((url) => url.disable)) {
      item.disable = true;
    }
  } else {
    //启用此url
    url.disable = false;
    item.disable = false;
  }
}

function save() {
  sourceStore.saveSubscribeSources();
  store.loadSubscribeSources(true);
}
function clearSources() {
  sourceStore.clearSubscribeSources();
  store.loadSubscribeSources(true);
}
</script>

<template>
  <van-dialog
    v-model:show="showManageSubscribeDialog"
    title="管理订阅源"
    :show-cancel-button="false"
    @confirm="save"
  >
    <van-row class="p-2" justify="end">
      <van-popover v-model:show="showClearPopover">
        <van-button size="small" type="danger" @click="clearSources">
          确认清空?
        </van-button>
        <template #reference>
          <van-button size="small">清空</van-button>
        </template>
      </van-popover>
    </van-row>

    <van-collapse v-model="activeNames" class="max-h-[50vh] overflow-y-auto">
      <van-checkbox-group v-model="checked" shape="square">
        <van-collapse-item
          v-for="item in sourceStore.subscribeSources"
          :key="item.detail.id"
          :name="item.detail.name"
          :title="item.detail.name"
        >
          <template #value>
            <van-row justify="end" align="center" @click.stop>
              <van-popover>
                <van-button size="small" type="danger"> 确认删除? </van-button>
                <template #reference>
                  <span class="text-button-2 mr-[12px] text-xs"> 删除 </span>
                </template>
              </van-popover>
              <van-switch
                v-model="item.disable"
                @click.stop
                :active-value="false"
                :inactive-value="true"
                size="18px"
                class="mx-[10px]"
                @change="(value) => sourceSwitch(item, value)"
              />
            </van-row>
          </template>
          <van-cell
            v-for="cell in item.detail?.urls"
            :key="cell.url"
            :title="cell.name"
            :label="cell.type"
          >
            <template #value>
              <van-switch
                v-model="cell.disable"
                @click.stop
                :active-value="false"
                :inactive-value="true"
                size="16px"
                @change="(value) => urlSwitch(item, cell, value)"
              />
            </template>
          </van-cell>
        </van-collapse-item>
      </van-checkbox-group>
    </van-collapse>
  </van-dialog>
</template>

<style scoped lang="less"></style>
