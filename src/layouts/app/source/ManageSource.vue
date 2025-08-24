<script setup lang="ts">
import { SourceType, type SubscribeItem, type SubscribeSource } from '@/types';
import { SubscribeSourceCard } from '@wuji-tauri/components/src';
import MNavBar from '@/components/header/MNavBar.vue';
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
    importSource: () => void;
    updateSources: (source?: SubscribeSource) => void;
    removeSource: (source: SubscribeSource) => void;
    isLocalSource: (source: SubscribeSource) => boolean;
    updateItem: (source: SubscribeSource, item: SubscribeItem) => void;
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
</script>

<template>
  <div class="relative flex h-full w-full flex-col">
    <MNavBar title="管理订阅源"></MNavBar>
    <div
      class="flex w-full flex-grow flex-col overflow-y-auto bg-[--van-background] p-2"
    >
      <div class="flex items-center gap-2 p-2">
        <van-button size="small" type="primary" plain @click="updateSources">
          更新订阅源
        </van-button>
        <van-button size="small" type="success" plain @click="importSource">
          导入订阅源
        </van-button>
      </div>
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
                class="van-haptics-feedback rounded bg-blue-500 p-1 text-white"
                @click.stop="() => updateSources(source)"
              >
                <Icon :icon="'dashicons:update-alt'" width="16" height="16" />
              </div>
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
            <SubscribeSourceCard
              v-for="item in source.detail.urls"
              :key="item.url"
              :source="source"
              :item="item"
              :on-click="() => enableItem(source, item, !!!item.disable)"
              :class="!!item.disable ? 'opacity-50' : ''"
            >
              <template #right>
                <div class="flex items-center gap-3">
                  <div
                    class="van-haptics-feedback rounded bg-blue-500 p-1 text-white"
                    @click.stop="() => updateItem(source, item)"
                  >
                    <Icon :icon="'uil:edit'" width="16" height="16" />
                  </div>
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
            </SubscribeSourceCard>
          </div>
        </div>
      </van-cell-group>
    </div>
  </div>
</template>

<style scoped lang="less"></style>
