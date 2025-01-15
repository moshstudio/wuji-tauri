<script setup lang="ts">
import { BookChapter, BookItem } from "@/extensions/book";
import { router } from "@/router";
import { useStore, useDisplayStore, useBookShelfStore } from "@/store";
import { BookSource } from "@/types";
import { purifyText, retryOnFalse, sleep } from "@/utils";
import { storeToRefs } from "pinia";
import { showConfirmDialog, showToast } from "vant";
import {
  ref,
  reactive,
  watch,
  onActivated,
  nextTick,
  toRaw,
  onMounted,
  onDeactivated,
} from "vue";
import { toast } from "vue3-toastify";
import PositionBackTop from "@/components/PositionBackTop.vue";
import BookShelfButton from "@/components/BookShelfButton.vue";
import BookShelf from "./BookShelf.vue";
import NavBar from "@/components/NavBar.vue";
import { useScroll } from "@vueuse/core";

const { chapterId, bookId, sourceId } = defineProps({
  chapterId: String,
  bookId: String,
  sourceId: String,
});

const store = useStore();
const displayStore = useDisplayStore();
const shelfStore = useBookShelfStore();

const bookSource = ref<BookSource>();
const book = ref<BookItem>();
const chapterList = ref<BookChapter[]>([]);
const readingChapter = ref<BookChapter>();
const readingContent = ref<string>();
const shouldLoad = ref(true);

const showChapters = ref(false);
const showSettingDialog = ref(false);
const showBookShelf = ref(false);
const showNavBar = ref(true);

let savedScrollPosition = 0;

async function back(checkShelf: boolean = false) {
  if (checkShelf && book.value) {
    if (!shelfStore.isBookInShelf(book.value)) {
      try {
        const d = await showConfirmDialog({
          title: "放入书架",
          message: `是否将《${book.value.title}》放入书架？`,
        });
        if (d == "confirm") {
          shelfStore.addToBookSelf(book.value);
          if (book.value && readingChapter.value) {
            shelfStore.updateBookReadInfo(book.value, readingChapter.value);
          }
        }
      } catch (error) {}
    }
  }
  shouldLoad.value = true;
  router.push({ name: "Book" });
}

const loadData = retryOnFalse({ onFailed: back })(async () => {
  book.value = undefined;
  chapterList.value = [];
  readingChapter.value = undefined;
  readingContent.value = undefined;

  if (!bookId || !sourceId || !chapterId) {
    return false;
  }

  const source = store.getBookSource(sourceId!);
  if (!source) {
    showToast("源不存在或未启用");
    return false;
  }
  bookSource.value = source;
  const item = store.getBookItem(source, bookId);

  if (!item) {
    return false;
  }
  book.value = item;

  return true;
});
async function loadChapter(chapter?: BookChapter) {
  if (!chapter) {
    chapter = book.value?.chapters?.find((chapter) => chapter.id === chapterId);
  }
  if (!chapter) {
    showToast("章节不存在");
    return;
  }
  showNavBar.value = true;
  const t = toast.loading("内容加载中", {
    onClick: () => {
      toast.remove(t);
    },
  });
  chapterList.value = book.value?.chapters || [];
  readingChapter.value = chapter;
  readingContent.value =
    (await store.bookRead(bookSource.value!, book.value!, chapter)) || "";

  readingContent.value = purifyText(readingContent.value);
  toast.remove(t);
  if (!readingContent.value) {
    showToast("本章内容为空");
    // toast很搞笑，立即remove会失败，所以延迟个1秒
    await sleep(1000);
    toast.remove(t);
  }

  nextTick(() => {
    const content = document.querySelector("#content");
    if (content) {
      content.innerHTML = "";
      readingContent.value?.split("\n").forEach((line) => {
        // 创建 <p> 元素
        const p = document.createElement("p");
        // p.style.marginTop = "0.8em";
        // 设置 <p> 的内容
        p.textContent = line;
        // 将 <p> 插入到目标 div 中
        content.appendChild(p);
      });
      document
        .querySelector(".scroll-container")
        ?.scrollTo({ top: 0, behavior: "instant" });
      if (book.value && readingChapter.value) {
        shelfStore.updateBookReadInfo(book.value, readingChapter.value);
      }
    }
  });
}

function prevChapter() {
  const index = chapterList.value.findIndex(
    (chapter) => chapter.id === readingChapter.value?.id
  );
  if (index === -1) {
    return;
  }
  if (index > 0) {
    router.push({
      name: "BookRead",
      params: {
        chapterId: chapterList.value[index - 1].id,
        bookId: book.value?.id,
        sourceId: book.value?.sourceId,
      },
    });
  } else {
    showToast("没有上一章了");
  }
}

function nextChapter() {
  const index = chapterList.value.findIndex(
    (chapter) => chapter.id === readingChapter.value?.id
  );
  if (index === -1) {
    return;
  }
  if (index < chapterList.value.length - 1) {
    router.push({
      name: "BookRead",
      params: {
        chapterId: chapterList.value[index + 1].id,
        bookId: book.value?.id,
        sourceId: book.value?.sourceId,
      },
    });
  } else {
    showToast("没有下一章了");
  }
}
function openChapterPopup() {
  showChapters.value = true;
  nextTick(() => {
    document
      .querySelector(".reading-chapter")
      ?.scrollIntoView({ block: "center", behavior: "instant" });
  });
}

watch([() => chapterId, () => bookId, () => sourceId], async () => {
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
        behavior: "instant",
      });
    });
  }
});
</script>

<template>
  <div
    class="relative flex flex-col w-full h-full overflow-hidden items-center"
    :style="{ backgroundColor: displayStore.readBgColor }"
  >
    <NavBar
      v-model:show="showNavBar"
      left-arrow
      @click-left="() => back(true)"
      class="absolute w-full h-[70px]"
      target="#content"
    >
      <template #title>
        <div class="flex flex-col gap-1 items-center truncate">
          <span class="text-xl">{{ readingChapter?.title }}</span>
          <div class="flex gap-1">
            <span class="text-xs text-[--van-text-color-2]">
              <van-icon name="orders-o" />
              {{ book?.title }}
            </span>
            <span class="text-xs text-[--van-text-color-2]">
              <van-icon name="user-o" />
              {{ book?.author }}
            </span>
            <span
              class="text-xs text-[--van-text-color-2]"
              v-if="readingContent?.length"
            >
              <van-icon name="points" />
              {{ readingContent?.length }} 字
            </span>
          </div>
        </div>
      </template>
    </NavBar>
    <div
      class="scroll-container flex h-full overflow-y-auto min-w-[400px] w-[95%] sm:w-[90%] md:w-[75%] lg:w-[60%] bg-gray-50/50 dark:bg-gray-950/50"
    >
      <div
        id="content"
        class="pt-[70px] relative overflow-y-auto p-4 text-justify leading-[1.8] text-[--van-text-color]"
        :style="{ fontSize: displayStore.readFontSize + 'px' }"
        v-if="readingContent"
      ></div>
      <div
        class="read-sidebar absolute right-[8px] bottom-[8px] flex flex-col gap-1 opacity-0 sm:opacity-100 hover:opacity-100"
      >
        <BookShelfButton
          :book="book"
          mode="square"
          @show-shelf="showBookShelf = true"
        ></BookShelfButton>
        <van-button
          icon="bars"
          square
          size="small"
          class="w-[46px] h-[46px] opacity-50 hover:opacity-100"
          @click="openChapterPopup"
        >
          <span>章节</span>
        </van-button>
        <van-button
          icon="arrow-up"
          square
          size="small"
          class="w-[46px] h-[46px] opacity-50 hover:opacity-100"
          @click="prevChapter"
        >
          <span>上章</span>
        </van-button>
        <van-button
          icon="arrow-down"
          square
          plain
          type="primary"
          size="small"
          class="w-[46px] h-[46px] opacity-50 hover:opacity-100"
          @click="nextChapter"
        >
          <span class="font-bold">下章</span>
        </van-button>
        <van-button
          icon="setting"
          square
          size="small"
          class="w-[46px] h-[46px] opacity-50 hover:opacity-100"
          @click="showSettingDialog = true"
        >
          <span>设置</span>
        </van-button>
        <!-- <PositionBackTop
          target=".scroll-container"
          placeholder
          class="w-[46px] h-[46px] flex items-center justify-center"
        >
          <van-button
            square
            size="small"
            class="w-[46px] h-[46px] opacity-50 hover:opacity-100"
          >
            <template #icon>
              <van-icon name="back-top" size="20" />
            </template>
          </van-button>
        </PositionBackTop> -->
      </div>
    </div>
    <van-popup
      v-model:show="showChapters"
      position="right"
      :style="{ width: '300px', height: '100%' }"
    >
      <van-list>
        <van-cell
          v-for="item in book?.chapters"
          :key="item.id"
          :title="item.title"
          :class="{
            'bg-[--van-background] reading-chapter':
              readingChapter?.id === item.id,
          }"
          :icon="readingChapter?.id === item.id ? 'eye-o' : ''"
          clickable
          @click="
            () => {
              loadChapter(item);
              showChapters = false;
            }
          "
        />
      </van-list>
    </van-popup>
    <van-dialog
      v-model:show="showSettingDialog"
      title="阅读设置"
      width="350px"
      closeOnClickOverlay
      class="setting-dialog"
    >
      <van-cell-group>
        <van-cell>
          <template #title>
            <p class="w-[60px]">背景色</p>
          </template>
          <template #value>
            <div class="grow flex gap-2">
              <div
                class="h-[30px] w-[30px] rounded-full cursor-pointer border flex justify-center items-center"
                :style="{ backgroundColor: color }"
                v-for="color in [
                  '',
                  '#ebe5d8',
                  '#cfe1cf',
                  '#e3d0a1',
                  '#040a17',
                  '#200e20',
                  '#0c1f4e',
                ]"
                :key="color"
                @click="displayStore.readBgColor = color"
              >
                <van-icon
                  name="success"
                  class="text-[--van-text-color]"
                  v-if="displayStore.readBgColor === color"
                />
              </div>
            </div>
          </template>
        </van-cell>
        <van-cell>
          <template #title>
            <p class="w-[60px]">文本大小</p>
          </template>
          <template #value>
            <van-stepper
              v-model="displayStore.readFontSize"
              step="1"
              min="10"
              max="50"
            />
          </template>
        </van-cell>
      </van-cell-group>
    </van-dialog>
    <BookShelf v-model:show="showBookShelf"></BookShelf>
  </div>
</template>

<style scoped lang="less">
.read-sidebar {
  :deep(.van-button__content) {
    flex-direction: column;
  }
}
#content > :is(p) {
  margin-top: 0.8em;
}
:deep(.setting-dialog .van-cell__value) {
  flex: auto;
}
:deep(.van-nav-bar__content) {
  height: 68px;
}
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(30px);
}
</style>
