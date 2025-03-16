<script setup lang="ts">
import { ComicChapter, ComicContent, ComicItem } from '@/extensions/comic';

import { useComicStore, useDisplayStore } from '@/store';
import { ComicSource } from '@/types';
import ComicShelfButton from '@/components/ComicShelfButton.vue';
import ComicShelf from '@/views/comic/ComicShelf.vue';
import { Icon } from '@iconify/vue';
import {
  nextTick,
  onActivated,
  onDeactivated,
  onMounted,
  PropType,
  ref,
  watch,
} from 'vue';
import { useScroll } from '@vueuse/core';
import LoadImage from '@/components/LoadImage.vue';
import SwitchComicSourceDialog from '@/components/dialogs/SwitchComicSource.vue';

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

const displayStore = useDisplayStore();
const comicStore = useComicStore();

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

let savedScrollPosition = 0;

onMounted(() => {
  const el: HTMLElement | null = document.querySelector(`.scroll-container`);
  if (el) {
    const { y } = useScroll(el);
    // 组件停用时保存滚动位置
    onDeactivated(() => {
      savedScrollPosition = y.value;
    });

    // 组件激活时恢复滚动位置
    onActivated(() => {
      el.scrollTo({
        top: savedScrollPosition,
        behavior: 'instant',
      });
    });
  }
});

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

          <ComicShelfButton
            :comic="comic"
            :reading-chapter="readingChapter"
          ></ComicShelfButton>
        </div>
      </div>
      <div
        class="flex flex-nowrap items-center justify-between text-white text-xs"
      >
        <span v-if="readingChapter">{{ readingChapter?.title }}</span>
        <div
          class="p-1 rounded bg-[var(--van-primary-color)] mr-2"
          v-if="comicSource"
        >
          {{ comicSource?.item.name }}
        </div>
      </div>
    </div>
    <div class="scroll-container flex h-full overflow-y-auto w-full">
      <div
        id="comic-read-content"
        class="w-full relative overflow-y-auto p-4 text-justify leading-[1.8] text-[--van-text-color]"
        @click="() => (showMenu = !showMenu)"
        v-if="readingContent"
      >
        <div class="w-full flex items-center justify-between">
          <div
            class="text-sm w-[50px] van-haptics-feedback"
            @click.stop="chapterPrev"
          >
            上一章
          </div>

          <div
            class="text-sm w-[50px] van-haptics-feedback"
            @click.stop="chapterNext"
          >
            下一章
          </div>
        </div>
        <div
          v-for="(item, index) in readingContent.photos"
          :key="index"
          class="w-full text-center"
        >
          <LoadImage
            :src="item"
            :headers="readingContent.photosHeaders"
            fit="contain"
            lazy-load
            class="rounded-lg max-w-[100%] max-h-[100%]"
          />
        </div>

        <div class="w-full flex items-center justify-between gap-[10px]">
          <div
            class="text-sm w-[50px] van-haptics-feedback"
            @click.stop="chapterPrev"
          >
            上一章
          </div>

          <div
            class="text-sm w-[50px] van-haptics-feedback"
            @click.stop="chapterNext"
          >
            下一章
          </div>
        </div>
      </div>
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
            class="flex justify-start items-center text-sm text-[--van-text-color-2] gap-2 p-2 flex-nowrap select-none van-haptics-feedback"
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
              icon="iconamoon:eye-thin"
              width="24"
              height="24"
              v-if="readingChapter?.id === item.id"
            />
            <span
              class="flex-grow text-left overflow-hidden text-nowrap text-ellipsis"
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
      closeOnClickOverlay
      :show-confirm-button="false"
      class="setting-dialog bg-[#1f1f1f] text-white"
    >
      <template #title>
        <div class="text-white">界面设置</div>
      </template>
      <div class="flex flex-col p-2 text-sm">
        <div class="pb-2">暂无设置</div>
      </div>
    </van-dialog>
    <ComicShelf></ComicShelf>
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
