<script setup lang="ts">
import { SourceType, SubscribeItem, SubscribeSource } from '@/types';
import { useDisplayStore, useStore, useSubscribeSourceStore } from '@/store';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import ResponsiveGrid2 from '@/components/ResponsiveGrid2.vue';

const store = useStore();
const displayStore = useDisplayStore();
const sourceStore = useSubscribeSourceStore();
const { showManageSubscribeDialog } = storeToRefs(displayStore);
const activeNames = ref([]);

const checked = ref([]);
const showClearPopover = ref(false);

function isDisable(item: SubscribeSource) {
  return item.detail?.urls.every((url) => url.disable === true) || false;
}

function sourceSwitch(item: SubscribeSource, value: boolean) {
  // 启用时，value是false；禁用时，value是true
  // value=true时，disable应为true；value=false时，disable应为false

  if (value) {
    // 禁用此source
    item.detail?.urls.forEach((url) => {
      url.disable = true;
    });
  } else {
    // 启用此source
    item.detail?.urls.forEach((url) => {
      url.disable = false;
    });
  }
}

function urlSwitch(item: SubscribeSource, url: SubscribeItem, value: boolean) {
  // 启用时，value是false；禁用时，value是true
  // value=true时，disable应为true；value=false时，disable应为false
  if (value) {
    // 禁用此url
    url.disable = true;
    if (item.detail?.urls.every((url) => url.disable)) {
      item.disable = true;
    }
  } else {
    // 启用此url
    url.disable = false;
    item.disable = false;
  }
}

function typeChineseName(type: SourceType) {
  switch (type) {
    case SourceType.Book:
      return '小说';
    case SourceType.Comic:
      return '漫画';
    case SourceType.Photo:
      return '图片';
    case SourceType.Song:
      return '音乐';
    case SourceType.Video:
      return '影视';
    case SourceType.Resource:
      return '资源';
    default:
      return '未知';
  }
}

function typeIcon(type: SourceType) {
  switch (type) {
    case SourceType.Book:
      return 'bookmark-o';
    case SourceType.Comic:
      return 'comment-circle-o';
    case SourceType.Photo:
      return 'photo-o';
    case SourceType.Song:
      return 'music-o';
    case SourceType.Video:
      return 'video-o';
    case SourceType.Resource:
      return 'cross';
    default:
      return 'cross';
  }
}

function save() {
  showManageSubscribeDialog.value = false;
  sourceStore.saveSubscribeSources();
  store.loadSubscribeSources(true);
}
function clearSources() {
  sourceStore.clearSubscribeSources();
  store.loadSubscribeSources(true);
}
</script>

<template>
  <van-popup
    v-model:show="showManageSubscribeDialog"
    position="bottom"
    teleport="body"
    :overlay="false"
    z-index="1003"
    destroy-on-close
    class="w-full h-full overflow-hidden"
  >
    <div class="relative h-full flex flex-col">
      <van-nav-bar :title="'管理订阅源2'" left-arrow @click-left="save" />
      <van-collapse
        v-remember-scroll
        v-model="activeNames"
        class="overflow-y-auto touch-auto scrollbar-hide"
        @touchmove.stop
      >
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
                  <van-button
                    size="small"
                    type="danger"
                    @click="() => sourceStore.removeSubscribeSource(item)"
                  >
                    确认删除{{ item.detail.name }}?
                  </van-button>
                  <template #reference>
                    <span class="text-button-2 mr-[12px] text-xs">删除</span>
                  </template>
                </van-popover>
                <van-switch
                  :model-value="isDisable(item)"
                  :active-value="false"
                  :inactive-value="true"
                  size="18px"
                  class="mx-[10px]"
                  @click.stop
                  @update:model-value="(value) => sourceSwitch(item, value)"
                />
              </van-row>
            </template>
            <ResponsiveGrid2 :gap="1" class="p-0">
              <van-cell
                v-for="cell in item.detail?.urls"
                :key="cell.url"
                :icon="typeIcon(cell.type)"
                :title="cell.name"
                :label="typeChineseName(cell.type)"
                class="break-all"
              >
                <template #value>
                  <div class="flex items-center">
                    <van-popover>
                      <van-button
                        size="small"
                        type="danger"
                        @click="() => sourceStore.removeSubscribeSource(item)"
                      >
                        确认删除?
                      </van-button>
                      <template #reference>
                        <span class="text-button-2 mr-[12px] text-xs">
                          删除
                        </span>
                      </template>
                    </van-popover>
                    <van-switch
                      :model-value="cell.disable || false"
                      :active-value="false"
                      :inactive-value="true"
                      size="16px"
                      @click.stop
                      @update:model-value="
                        (value) => urlSwitch(item, cell, value)
                      "
                    />
                  </div>
                </template>
              </van-cell>
            </ResponsiveGrid2>
          </van-collapse-item>
        </van-checkbox-group>
      </van-collapse>
    </div>
  </van-popup>
</template>

<style scoped lang="less">
:deep(.van-cell__value) {
  flex: none;
}
</style>
