<script setup lang="ts">
import type { ComicChapter, ComicContent, ComicItem } from '@/extensions/comic';

import type { ComicSource } from '@/types';
import type { PropType } from 'vue';
import ComicShelfButton from '@/components/ComicShelfButton.vue';
import LoadImage from '@/components/LoadImage.vue';
import { useComicStore, useDisplayStore } from '@/store';
import ComicShelf from '@/views/comic/ComicShelf.vue';
import { Icon } from '@iconify/vue';
import { useScroll } from '@vueuse/core';
import { keepScreenOn } from 'tauri-plugin-keep-screen-on-api';
import { onActivated, onDeactivated, onMounted, ref, watch } from 'vue';

const emit = defineEmits<{
  (e: 'back', checkShelf?: boolean): void;
  (e: 'loadData'): void;
  (e: 'toChapter', chapter: ComicChapter): void;
  (e: 'prevChapter'): void;
  (e: 'nextChapter'): void;
  (e: 'openChapterPopup'): void;
  (e: 'searchAllSources', targetComic: ComicItem): void;
  (e: 'switchSource', newComicItem: ComicItem): void;
}>();
const comic = defineModel('comic', { type: Object as PropType<ComicItem> });
const comicSource = defineModel('comicSource', {
  type: Object as PropType<ComicSource>,
});
const chapterList = defineModel('chapterList', {
  type: Array as PropType<ComicChapter[]>,
});
const readingChapter = defineModel('readingChapter', {
  type: Object as PropType<ComicChapter>,
});
const readingContent = defineModel('readingContent', {
  type: Object as PropType<ComicContent>,
});
const showChapters = defineModel('showChapters', {
  type: Boolean,
  required: true,
});
const showSettingDialog = defineModel('showSettingDialog', {
  type: Boolean,
  required: true,
});
const showNavBar = defineModel('showNavBar', {
  type: Boolean,
  required: true,
});
const allSourceResults = defineModel('allSourceResults', {
  type: Array as PropType<ComicItem[]>,
});
const showSwitchSourceDialog = defineModel('showSwitchSourceDialog', {
  type: Boolean,
  required: true,
});

const displayStore = useDisplayStore();
const comicStore = useComicStore();

const bubbleOffset = ref({
  x: document.querySelector('body')!.clientWidth - 50,
  y: document.querySelector('body')!.clientHeight - 160,
});
watch(bubbleOffset, (offset) => {
  const ch = document.querySelector('body')!.clientHeight;
  if (offset.y > ch - 140) {
    offset.y = ch - 140;
  }
});

function goBack() {
  // uni.navigateBack();
  emit('back', true);
}
/** 上一章 */
function chapterPrev() {
  emit('prevChapter');
}

/** 下一章 */
function chapterNext() {
  emit('nextChapter');
}

const showMenu = ref(false);
// watch(
//   showMenu,
//   () => {
//     displayStore.showTabBar = showMenu.value;
//   },
//   {
//     immediate: true,
//   }
// );
// onActivated(() => {
//   displayStore.showTabBar = showMenu.value;
// });
</script>

<template>
  <div
    class="relative flex flex-col w-full h-full overflow-hidden items-center"
    :class="[showMenu ? '' : 'hide_menu']"
  >
    <!-- 顶部菜单 -->
    <div
      class="top_menu fixed left-0 top-0 z-[5] p-2 flex flex-col gap-2 w-full transition bg-[#1f1f1f]"
    >
      <div class="flex flex-nowrap items-center justify-between">
        <div class="flex flex-nowrap items-center">
          <van-icon
            name="arrow-left"
            color="white"
            size="22"
            @click="goBack()"
          />
          <span class="ml-2 text-sm text-white line-clamp-1">
            {{ comic?.title }}
          </span>
        </div>
        <div class="options pr-2 flex gap-2 items-center">
          <van-icon
            name="exchange"
            class="text-white van-haptics-feedback"
            @click="() => (showSwitchSourceDialog = true)"
          />

          <ComicShelfButton :comic="comic" :reading-chapter="readingChapter" />
        </div>
      </div>
      <div
        class="flex flex-nowrap items-center justify-between text-white text-xs"
      >
        <span v-if="readingChapter">{{ readingChapter?.title }}</span>
        <div
          v-if="comicSource"
          class="p-1 rounded bg-[var(--van-primary-color)] mr-2"
        >
          {{ comicSource?.item.name }}
        </div>
      </div>
    </div>
    <div
      v-remember-scroll
      class="comic-scroll-container flex h-full overflow-y-auto w-full"
    >
      <div
        id="comic-read-content"
        class="w-full relativ text-justify py-2 leading-[0] text-[--van-text-color]"
        @click="() => (showMenu = !showMenu)"
      >
        <div
          v-for="(item, index) in readingContent?.photos"
          :key="index"
          class="w-full min-h-[50px] text-center leading-[0]"
        >
          <LoadImage
            :src="item"
            :headers="readingContent?.photosHeaders"
            fit="contain"
            lazy-load
          />
        </div>
      </div>
      <van-floating-bubble
        v-model:offset="bubbleOffset"
        axis="xy"
        magnetic="x"
        :gap="6"
        class="h-[90px] w-[40px] border border-[var(--van-border-color)] bg-[color:rgb(var(--van-background)/0.5)] active:opacity-100"
      >
        <div class="flex flex-col h-[90px] gap-[0px] items-center leading-[0]">
          <van-button
            icon="arrow-up"
            square
            hairline
            size="small"
            class="w-[40px] h-[45px]"
            @click="() => emit('prevChapter')"
          />
          <van-button
            icon="arrow-down"
            square
            hairline
            size="small"
            class="w-[40px] h-[45px]"
            @click="() => emit('nextChapter')"
          />
        </div>
      </van-floating-bubble>
    </div>

    <!-- 底部菜单 -->
    <div
      class="bottom fixed bottom-0 left-0 z-[6] w-full flex flex-col p-2 pb-[50px] bg-[#1f1f1f] text-white transition"
    >
      <div class="flex items-center justify-between gap-[10px]">
        <div class="text-sm w-[50px] van-haptics-feedback" @click="chapterPrev">
          上一章
        </div>

        <div class="text-sm w-[50px] van-haptics-feedback" @click="chapterNext">
          下一章
        </div>
      </div>
      <div class="w-full flex gap-1 items-center justify-between text-sm">
        <div
          class="flex flex-col gap-1 items-center van-haptics-feedback p-2"
          @click="() => emit('openChapterPopup')"
        >
          <Icon icon="tabler:list" width="20" height="20" />
          章节
        </div>
        <div
          class="flex flex-col gap-1 items-center van-haptics-feedback p-2"
          @click="() => (showSettingDialog = true)"
        >
          <Icon icon="ci:font" width="20" height="20" />
          界面
        </div>
      </div>
    </div>
    <van-popup
      v-model:show="showChapters"
      position="left"
      :style="{
        width: '70%',
        height: 'calc(100% - 50px)',
        top: 'calc(50% - 25px)',
        backgroundColor: '#1f1f1f',
      }"
    >
      <van-list>
        <template v-for="item in comic?.chapters" :key="item.id">
          <div
            class="flex justify-start items-center text-sm gap-2 p-2 flex-nowrap select-none van-haptics-feedback"
            :class="{
              'bg-black reading-chapter': readingChapter?.id === item.id,
            }"
            @click="
              () => {
                emit('toChapter', item);
                showChapters = false;
              }
            "
          >
            <Icon
              v-if="readingChapter?.id === item.id"
              icon="iconamoon:eye-thin"
              width="24"
              height="24"
              color="var(--van-primary-color)"
            />
            <span
              class="flex-grow text-left overflow-hidden text-nowrap text-ellipsis"
              :class="
                readingChapter?.id === item.id
                  ? 'text-[var(--van-primary-color)]'
                  : 'text-[#f5f5f5]'
              "
            >
              {{ item.title }}
            </span>
          </div>
        </template>
      </van-list>
    </van-popup>
    <van-dialog
      v-model:show="showSettingDialog"
      titl
      close-on-click-overlay
      :show-confirm-button="false"
      class="setting-dialog bg-[#1f1f1f] text-white"
    >
      <template #title>
        <div class="text-white">界面设置</div>
      </template>
      <div class="flex flex-col p-2 text-sm">
        <van-cell v-if="displayStore.isAndroid" class="bg-[#1f1f1f]">
          <template #title>
            <span class="text-white">保持屏幕常亮</span>
          </template>
          <template #value>
            <van-switch
              v-model="displayStore.comicKeepScreenOn"
              @change="
                (v) => {
                  if (v) {
                    keepScreenOn(true);
                  } else {
                    keepScreenOn(false);
                  }
                }
              "
            />
          </template>
        </van-cell>
      </div>
    </van-dialog>
    <ComicShelf />
    <!-- <SwitchComicSourceDialog
      v-model:show="showSwitchSourceDialog"
      :search-result="allSourceResults || []"
      :comic="comic"
      @search="
        () => {
          if (comic) {
            emit('searchAllSources', comic);
          }
        }
      "
      @select="(item) => emit('switchSource', item)"
      v-if="comic"
    ></SwitchComicSourceDialog> -->
  </div>
</template>

<style scoped lang="less">
.hide_menu {
  .top_menu {
    transform: translateY(-100%);
  }
  .bottom {
    transform: translateY(100%);
  }
}
</style>
