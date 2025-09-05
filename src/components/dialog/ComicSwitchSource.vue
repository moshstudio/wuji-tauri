<script setup lang="ts">
import type { ComicItem } from '@wuji-tauri/source-extension';
import { useStore } from '@/store';

withDefaults(
  defineProps<{
    comic?: ComicItem;
    searchResult?: ComicItem[];
    search: (comic?: ComicItem) => void;
    select: (comic: ComicItem) => void;
  }>(),
  {
    searchResult: () => [],
  },
);

const show = defineModel('show', {
  type: Boolean,
  required: true,
});

const store = useStore();
</script>

<template>
  <van-dialog
    v-model:show="show"
    teleport="body"
    show-cancel-button
    close-on-click-overlay
    :show-confirm-button="false"
  >
    <template #title>
      <div class="flex select-none items-center justify-between gap-2 px-4">
        <div class="flex flex-col items-start text-[var(--van-text-color)]">
          <p class="text-base">
            {{ comic?.title }}
          </p>
          <p v-if="comic?.author" class="text-xs text-gray-500">
            {{ comic.author }}
          </p>
        </div>
        <div class="flex gap-2">
          <van-icon
            name="replay"
            class="van-haptics-feedback"
            @click="() => search(comic)"
          />
        </div>
      </div>
    </template>
    <div class="flex max-h-[60vh] select-none flex-col gap-2 overflow-y-auto">
      <template v-for="item in searchResult" :key="item.id">
        <van-cell-group>
          <van-cell
            center
            clickable
            :title="store.getBookSource(item.sourceId)?.item.name"
            :label="item.latestChapter?.toString()"
            @click="() => select(item)"
          >
            <template #value>
              <div class="flex flex-shrink items-center gap-2">
                <p v-if="item.author">
                  {{ item.author }}
                </p>
                <van-icon
                  v-if="
                    comic?.id === item.id && comic.sourceId === item.sourceId
                  "
                  name="success"
                />
              </div>
            </template>
          </van-cell>
        </van-cell-group>
      </template>
    </div>
  </van-dialog>
</template>

<style scoped lang="less"></style>
