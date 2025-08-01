<script setup lang="ts">
import { SourceType, type SubscribeItem, type SubscribeSource } from '@/types';
import MNavBar from '@/components2/header/MNavBar.vue';
import { Icon } from '@iconify/vue';
import { ref, computed } from 'vue';

withDefaults(
  defineProps<{
    sources: SubscribeSource[];

    sourceDisabled: (source: SubscribeSource) => boolean;
    enableSource: (source: SubscribeSource, enable: boolean) => void;
    enableItem: (
      source: SubscribeSource,
      item: SubscribeItem,
      enable: boolean,
    ) => void;
    removeSource: (source: SubscribeSource) => void;
    isLocalSource: (source: SubscribeSource) => boolean;
    removeItem: (source: SubscribeSource, item: SubscribeItem) => void;
  }>(),
  {},
);

const expandedGroups = ref<Record<string, boolean>>({});

const toggleGroup = (id: string) => {
  expandedGroups.value[id] = !expandedGroups.value[id];
};

const getSourceStats = (source: SubscribeSource) => {
  const total = source.detail.urls.length;
  const disabled = source.detail.urls.filter((item) => item.disable).length;
  return {
    total,
    disabled,
    enabled: total - disabled,
  };
};

const getTypeProperty = (type: SourceType) => {
  switch (type) {
    case SourceType.Book:
      return {
        name: '书籍',
        bgColor: '#dcfce7', // 绿色系
        textColor: '#166534',
      };
    case SourceType.Comic:
      return {
        name: '漫画',
        bgColor: '#fef3c7', // 黄色系
        textColor: '#92400e',
      };
    case SourceType.Photo:
      return {
        name: '图片',
        bgColor: '#f5f5f5', // 浅灰色系 (适合图片中性色)
        textColor: '#525252', // 深灰色
      };
    case SourceType.Song:
      return {
        name: '音乐',
        bgColor: '#fce7f3', // 粉色系
        textColor: '#9d174d',
      };
    case SourceType.Video:
      return {
        name: '影视',
        bgColor: '#fee2e2', // 红色系 (常见影视关联色)
        textColor: '#991b1b',
      };
    case SourceType.Resource:
      return {
        name: '资源',
        bgColor: '#e0e7ff', // 紫色系 (中性资源色)
        textColor: '#4338ca',
      };
  }
};
</script>

<template>
  <div class="relative flex h-full w-full flex-col">
    <MNavBar title="管理订阅源"></MNavBar>
    <div
      class="flex w-full flex-grow flex-col overflow-y-auto bg-[--van-background] p-2"
    >
      <van-cell-group
        v-for="source in sources"
        :key="source.detail.id"
        inset
        class="flex-shrink-0 overflow-hidden"
      >
        <template #title>
          <div
            class="van-haptics-feedback flex items-center justify-between"
            @click="toggleGroup(source.detail.id)"
          >
            <div class="flex flex-col">
              <div class="flex-grow">{{ source.detail.name }}</div>
              <div class="text-xs text-gray-500">
                {{ getSourceStats(source).enabled }}启用 /
                {{ getSourceStats(source).disabled }}禁用
              </div>
            </div>
            <div class="flex items-center gap-3">
              <div
                class="van-haptics-feedback rounded p-1 text-white"
                :class="sourceDisabled(source) ? 'bg-gray-400' : 'bg-green-500'"
                @click.stop="
                  () => enableSource(source, !sourceDisabled(source))
                "
              >
                <Icon
                  :icon="
                    sourceDisabled(source)
                      ? 'lsicon:disable-outline'
                      : 'mdi:success'
                  "
                  width="16"
                  height="16"
                />
              </div>
              <div
                class="van-haptics-feedback bg-red rounded p-1 text-white"
                @click.stop="removeSource(source)"
              >
                <Icon icon="mdi:delete-outline" width="16" height="16" />
              </div>
              <Icon
                icon="mdi:chevron-down"
                width="20"
                height="20"
                class="transition-transform duration-300"
                :class="{ 'rotate-180': expandedGroups[source.detail.id] }"
              />
            </div>
          </div>
        </template>
        <div
          class="grid transition-all duration-300 ease-in-out"
          :style="{
            'grid-template-rows': expandedGroups[source.detail.id]
              ? '1fr'
              : '0fr',
          }"
        >
          <div class="overflow-hidden">
            <van-cell
              v-for="item in source.detail.urls"
              :key="item.url"
              clickable
              @click="() => enableItem(source, item, !!!item.disable)"
            >
              <template #title>
                <div
                  class="flex items-center gap-2"
                  :class="!!item.disable ? 'opacity-50' : ''"
                >
                  <van-tag
                    :color="getTypeProperty(item.type).bgColor"
                    :text-color="getTypeProperty(item.type).textColor"
                  >
                    {{ getTypeProperty(item.type).name }}
                  </van-tag>
                  <div>
                    {{ item.name }}
                  </div>
                </div>
              </template>
              <template #value>
                <div class="flex items-center gap-3">
                  <div
                    class="van-haptics-feedback rounded p-1 text-white"
                    :class="item.disable ? 'bg-gray-400' : 'bg-green-500'"
                  >
                    <Icon
                      :icon="
                        item.disable ? 'lsicon:disable-outline' : 'mdi:success'
                      "
                      width="16"
                      height="16"
                    />
                  </div>
                  <div
                    v-if="isLocalSource(source)"
                    class="van-haptics-feedback bg-red rounded p-1 text-white"
                    @click.stop="removeItem(source, item)"
                  >
                    <Icon icon="mdi:delete-outline" width="16" height="16" />
                  </div>
                </div>
              </template>
            </van-cell>
          </div>
        </div>
      </van-cell-group>
    </div>
  </div>
</template>

<style scoped lang="less">
:deep(.van-cell__title) {
  flex: none;
  flex-grow: 1;
}
:deep(.van-cell__value) {
  flex: none;
}
</style>
