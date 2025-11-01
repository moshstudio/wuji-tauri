<script setup lang="ts">
import type {
  ComicChapter,
  ComicContent,
  ComicItem,
  ComicList,
} from '@wuji-tauri/source-extension';
import type { ComicSource } from '@/types';
import _ from 'lodash';
import { storeToRefs } from 'pinia';
import { keepScreenOn } from 'tauri-plugin-keep-screen-on-api';
import { showFailToast, showToast } from 'vant';
import { computed, onActivated, onDeactivated, ref, watch } from 'vue';
import ComicSwitchSourceDialog from '@/components/dialog/ComicSwitchSource.vue';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import AppComicRead from '@/layouts/app/comic/ComicRead.vue';
import DesktopComicRead from '@/layouts/desktop/comic/ComicRead.vue';
import { router } from '@/router';
import {
  useComicShelfStore,
  useComicStore,
  useDisplayStore,
  useStore,
} from '@/store';
import { useBackStore } from '@/store/backStore';
import { retryOnFalse } from '@/utils';
import { createCancellableFunction } from '@/utils/cancelableFunction';
import { onMountedOrActivated } from '@vant/use';

const { chapterId, comicId, sourceId } = defineProps<{
  sourceId: string;
  comicId: string;
  chapterId: string;
}>();

const store = useStore();
const backStore = useBackStore();
const displayStore = useDisplayStore();
const comicStore = useComicStore();
const shelfStore = useComicShelfStore();
const { comicShelf } = storeToRefs(shelfStore);

const comicSource = ref<ComicSource>();
const comic = ref<ComicItem>();
const chapterList = ref<ComicChapter[]>([]);
const readingChapter = ref<ComicChapter>();
const readingContent = ref<ComicContent>();
const showSettingDialog = ref(false);
const showNavBar = ref(true);

/**
 * 实现切换源功能
 */
const showSwitchSourceDialog = ref(false);
const allSourceResults = ref<ComicItem[]>([]);

const searchAllSources = createCancellableFunction(
  async (signal: AbortSignal, targetComic?: ComicItem) => {
    allSourceResults.value = [];
    if (!targetComic) return;
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

const loadData = retryOnFalse({ onFailed: backStore.back })(async () => {
  comic.value = undefined;
  chapterList.value = [];
  readingChapter.value = undefined;
  readingContent.value = undefined;

  if (!comicId || !sourceId || !chapterId) {
    return false;
  }

  comicSource.value = store.getComicSource(sourceId);
  if (!comicSource.value) {
    showToast('源不存在或未启用');
    return false;
  }
  comic.value = store.getComicItem(comicSource.value, comicId);
  if (!comic.value) {
    return false;
  }

  return true;
});
async function loadChapter(chapter?: ComicChapter) {
  if (!comic.value) {
    showToast('漫画不存在');
    backStore.back();
    return;
  }
  if (!comic.value.chapters?.length) {
    if (!comicSource.value) {
      showFailToast('源不存在或未启用');
      return;
    }
    const ret = await store.comicDetail(comicSource.value, comic.value);
    if (ret) {
      Object.assign(comic.value, ret);
    }
  }
  if (!chapter) {
    chapter = comic.value.chapters?.find((chapter) => chapter.id === chapterId);
  }

  if (!chapter) {
    showToast('章节不存在');
    backStore.back();
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
    router.replace({
      // name: 'ComicRead',
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
    router.replace({
      // name: 'ComicRead',
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

  router.replace({
    params: {
      chapterId: chapter.id,
      comicId: comic.value?.id,
      sourceId: comic.value?.sourceId,
    },
  });
}

async function resfreshChapter() {
  await loadChapter(undefined);
}

const comicInShelf = computed(() => {
  if (!comic.value) return false;
  for (const item of comicShelf.value) {
    for (const comic of item.comics) {
      if (comic.comic.id === comicId) {
        return true;
      }
    }
  }
  return false;
});

const showSelectShelf = ref(false);
function addToShelf() {
  if (!comic.value) {
    return;
  }
  if (shelfStore.comicShelf.length === 1) {
    shelfStore.addToComicSelf(comic.value);
  } else {
    showSelectShelf.value = true;
  }
}

const selectShelfActions = computed(() => {
  return shelfStore.comicShelf.map((shelf) => {
    return {
      name: shelf.name,
      subname: `${shelf.comics.length || 0} 本漫画`,
      callback: () => {
        if (comic.value) {
          shelfStore.addToComicSelf(comic.value, shelf.id);
          showSelectShelf.value = false;
        }
      },
    };
  });
});

watch(
  [() => chapterId, () => comicId, () => sourceId],
  async () => {
    await loadData();
    await loadChapter();
  },
  { immediate: true },
);

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

onMountedOrActivated(() => {
  if (displayStore.isAndroid && displayStore.comicKeepScreenOn) {
    keepScreenOn(true);
  }
});
onDeactivated(() => {
  if (displayStore.isAndroid && displayStore.comicKeepScreenOn) {
    keepScreenOn(false);
  }
});
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppComicRead
        :comic="comic"
        :comic-source="comicSource"
        :chapter-list="chapterList"
        :chapter="readingChapter"
        :chapter-content="readingContent"
        :in-shelf="comicInShelf"
        :add-to-shelf="addToShelf"
        :show-setting="() => (showSettingDialog = true)"
        :show-switch-source="
          () => {
            showSwitchSourceDialog = true;
            searchAllSources(comic);
          }
        "
        :to-chapter="toChapter"
        :prev-chapter="prevChapter"
        :next-chapter="nextChapter"
        :refresh-chapter="resfreshChapter"
      />
    </template>
    <template #desktop>
      <DesktopComicRead
        :comic="comic"
        :comic-source="comicSource"
        :chapter-list="chapterList"
        :chapter="readingChapter"
        :chapter-content="readingContent"
        :in-shelf="comicInShelf"
        :add-to-shelf="addToShelf"
        :show-setting="() => (showSettingDialog = true)"
        :show-switch-source="
          () => {
            showSwitchSourceDialog = true;
            searchAllSources(comic);
          }
        "
        :to-chapter="toChapter"
        :prev-chapter="prevChapter"
        :next-chapter="nextChapter"
        :refresh-chapter="resfreshChapter"
      />
    </template>
    <ComicSwitchSourceDialog
      v-model:show="showSwitchSourceDialog"
      :comic="comic"
      :search-result="allSourceResults"
      :search="searchAllSources"
      :select="switchSource"
    />
    <van-dialog
      v-model:show="showSettingDialog"
      title="阅读设置"
      close-on-click-overlay
      :show-confirm-button="false"
      class="setting-dialog"
    >
      <div class="flex flex-col gap-2 p-2 text-sm">
        <van-cell v-if="displayStore.isAndroid" title="保持屏幕常亮">
          <template #value>
            <van-switch
              v-model="displayStore.bookKeepScreenOn"
              @change="
                (v) => {
                  displayStore.bookKeepScreenOn = v;
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
        <van-cell v-else title="暂无设置" />
      </div>
    </van-dialog>
    <van-action-sheet
      v-model:show="showSelectShelf"
      :actions="selectShelfActions"
      cancel-text="取消"
      title="选择书架"
      teleport="body"
    />
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
