<script setup lang="ts">
import type {
  ComicChapter,
  ComicContent,
  ComicItem,
  ComicList,
} from '@/extensions/comic';
import type { ComicSource } from '@/types';
import PlatformSwitch from '@/components/PlatformSwitch.vue';
import { router } from '@/router';
import {
  useComicShelfStore,
  useComicStore,
  useDisplayStore,
  useStore,
} from '@/store';
import { retryOnFalse, sleep } from '@/utils';
import { createCancellableFunction } from '@/utils/cancelableFunction';
import _ from 'lodash';
import { keepScreenOn } from 'tauri-plugin-keep-screen-on-api';
import { showConfirmDialog, showToast } from 'vant';
import {
  nextTick,
  onActivated,
  onDeactivated,
  ref,
  watch,
  onMounted,
} from 'vue';
import MobileComicRead from '../mobileView/comic/ComicRead.vue';
import WinComicRead from '../windowsView/comic/ComicRead.vue';

const { chapterId, comicId, sourceId } = defineProps({
  chapterId: String,
  comicId: String,
  sourceId: String,
});

const store = useStore();
const displayStore = useDisplayStore();
const comicStore = useComicStore();
const shelfStore = useComicShelfStore();

const comicSource = ref<ComicSource>();
const comic = ref<ComicItem>();
const chapterList = ref<ComicChapter[]>([]);
const readingChapter = ref<ComicChapter>();
const readingContent = ref<ComicContent>();
const shouldLoad = ref(true);

const showChapters = ref(false);
const showSettingDialog = ref(false);
const showComicShelf = ref(false);
const showNavBar = ref(true);

/**
 * 实现切换源功能
 */
const showSwitchSourceDialog = ref(false);
const allSourceResults = ref<ComicItem[]>([]);

const searchAllSources = createCancellableFunction(
  async (signal: AbortSignal, targetComic: ComicItem) => {
    allSourceResults.value = [];
    await Promise.all(
      store.comicSources.map(async (comicSource) => {
        await store.comicSearch(comicSource, targetComic.title);
        if (signal.aborted) return;
        if (comicSource.list) {
          for (const b of _.castArray<ComicList>(comicSource.list)[0].list) {
            if (b.title === targetComic.title) {
              if (signal.aborted) return;
              const detailedComic = await store.comicDetail(comicSource, b);
              if (detailedComic) {
                allSourceResults.value.push(detailedComic);
                return;
              }
            }
          }
        }
      }),
    );
  },
);

async function switchSource(newComicItem: ComicItem) {
  if (!readingChapter.value) {
    showToast('请重新加载章节');
    return;
  }
  if (!newComicItem.chapters) {
    showToast('章节为空');
    return;
  }
  const chapter =
    newComicItem.chapters?.find((chapter) => chapter.id === chapterId) ||
    newComicItem.chapters?.find(
      (chapter) => chapter.title === readingChapter.value?.title,
    ) ||
    newComicItem.chapters?.[
      comic.value?.chapters?.findIndex((chapter) => chapter.id === chapterId) ||
        0
    ];
  if (!chapter) {
    showToast('章节不存在');
    return;
  }

  chapter.readingPage = readingChapter.value.readingPage;
  showSwitchSourceDialog.value = false;
  router.push({
    name: 'ComicRead',
    params: {
      chapterId: chapter.id,
      comicId: newComicItem.id,
      sourceId: newComicItem.sourceId,
    },
  });
}

async function back(checkShelf: boolean = false) {
  displayStore.showTabBar = true;
  if (checkShelf && comic.value) {
    if (!shelfStore.isComicInShelf(comic.value)) {
      try {
        const d = await showConfirmDialog({
          title: '放入书架',
          message: `是否将《${comic.value.title}》放入书架？`,
        });
        if (d == 'confirm') {
          shelfStore.addToComicSelf(comic.value);
          if (comic.value && readingChapter.value) {
            shelfStore.updateComicReadInfo(comic.value, readingChapter.value);
          }
        }
      } catch (error) {}
    }
  }
  shouldLoad.value = true;
  router.push({ name: 'Comic' });
}

const loadData = retryOnFalse({ onFailed: back })(async () => {
  comic.value = undefined;
  chapterList.value = [];
  readingChapter.value = undefined;
  readingContent.value = undefined;

  if (!comicId || !sourceId || !chapterId) {
    return false;
  }

  const source = store.getComicSource(sourceId!);
  if (!source) {
    showToast('源不存在或未启用');
    return false;
  }
  comicSource.value = source;
  const item = store.getComicItem(source, comicId);

  if (!item) {
    return false;
  }
  comic.value = item;

  return true;
});
async function loadChapter(chapter?: ComicChapter) {
  if (!comic.value) {
    showToast('书籍不存在');
    back();
    return;
  }
  if (!chapter) {
    chapter = comic.value.chapters?.find((chapter) => chapter.id === chapterId);
  }

  if (!chapter) {
    showToast('章节不存在');
    back();
    return;
  }
  shelfStore.updateComicReadInfo(comic.value, chapter);
  showNavBar.value = true;
  const displayStore = useDisplayStore();
  const t = displayStore.showToast();
  chapterList.value = comic.value.chapters || [];
  readingChapter.value = chapter;
  readingContent.value =
    (await store.comicRead(comicSource.value!, comic.value, chapter)) ||
    undefined;
  displayStore.closeToast(t);
  if (!readingContent.value) {
    showToast('本章内容为空');
  }
}

function prevChapter(toLast: boolean = false) {
  const index = chapterList.value.findIndex(
    (chapter) => chapter.id === readingChapter.value?.id,
  );
  if (index === -1) {
    return;
  }
  if (index > 0) {
    if (!toLast) {
      chapterList.value[index - 1].readingPage = undefined;
    }
    router.push({
      name: 'ComicRead',
      params: {
        chapterId: chapterList.value[index - 1].id,
        comicId: comic.value?.id,
        sourceId: comic.value?.sourceId,
      },
    });
  } else {
    showToast('没有上一章了');
  }
}

function nextChapter() {
  const index = chapterList.value.findIndex(
    (chapter) => chapter.id === readingChapter.value?.id,
  );
  if (index === -1) {
    return;
  }
  if (index < chapterList.value.length - 1) {
    chapterList.value[index + 1].readingPage = undefined;
    router.push({
      name: 'ComicRead',
      params: {
        chapterId: chapterList.value[index + 1].id,
        comicId: comic.value?.id,
        sourceId: comic.value?.sourceId,
      },
    });
  } else {
    showToast('没有下一章了');
  }
}
function toChapter(chapter: ComicChapter) {
  chapter.readingPage = undefined;

  router.push({
    name: 'ComicRead',
    params: {
      chapterId: chapter.id,
      comicId: comic.value?.id,
      sourceId: comic.value?.sourceId,
    },
  });
}
function openChapterPopup() {
  showChapters.value = true;
  nextTick(() => {
    document
      .querySelector('.reading-chapter')
      ?.scrollIntoView({ block: 'center', behavior: 'instant' });
  });
}

watch([() => chapterId, () => comicId, () => sourceId], async () => {
  shouldLoad.value = false; // watch这里优先load
  await loadData();
  await loadChapter();
});
onActivated(async () => {
  await sleep(200);
  if (shouldLoad.value) {
    shouldLoad.value = false;
    await loadData();
    await loadChapter();
  }
});

watch(
  comic,
  (b) => {
    comicStore.readingComic = b;
    allSourceResults.value = [];
  },
  { immediate: true },
);
watch(readingChapter, (c) => (comicStore.readingChapter = c), {
  immediate: true,
});

onActivated(() => {
  if (displayStore.isAndroid && displayStore.comicKeepScreenOn) {
    keepScreenOn(true);
  }
});
onDeactivated(() => {
  if (displayStore.isAndroid && displayStore.comicKeepScreenOn) {
    keepScreenOn(false);
  }
});
onMounted(() => {
  displayStore.addBackCallback('ComicRead', async () => {
    back(true);
  });
});
</script>

<template>
  <PlatformSwitch>
    <template #mobile>
      <MobileComicRead
        v-model:comic="comic"
        v-model:comic-source="comicSource"
        v-model:chapter-list="chapterList"
        v-model:reading-chapter="readingChapter"
        v-model:reading-content="readingContent"
        v-model:show-chapters="showChapters"
        v-model:show-setting-dialog="showSettingDialog"
        v-model:show-comic-shelf="showComicShelf"
        v-model:show-nav-bar="showNavBar"
        v-model:all-source-results="allSourceResults"
        v-model:show-switch-source-dialog="showSwitchSourceDialog"
        @back="back"
        @load-data="loadData"
        @to-chapter="toChapter"
        @next-chapter="nextChapter"
        @open-chapter-popup="openChapterPopup"
        @prev-chapter="prevChapter"
        @search-all-sources="searchAllSources"
        @switch-source="switchSource"
      />
    </template>
    <template #windows>
      <WinComicRead
        v-model:comic="comic"
        v-model:comic-source="comicSource"
        v-model:chapter-list="chapterList"
        v-model:reading-chapter="readingChapter"
        v-model:reading-content="readingContent"
        v-model:show-chapters="showChapters"
        v-model:show-setting-dialog="showSettingDialog"
        v-model:show-comic-shelf="showComicShelf"
        v-model:show-nav-bar="showNavBar"
        v-model:all-source-results="allSourceResults"
        v-model:show-switch-source-dialog="showSwitchSourceDialog"
        @back="back"
        @load-data="loadData"
        @to-chapter="toChapter"
        @next-chapter="nextChapter"
        @open-chapter-popup="openChapterPopup"
        @prev-chapter="prevChapter"
        @search-all-sources="searchAllSources"
        @switch-source="switchSource"
      />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
