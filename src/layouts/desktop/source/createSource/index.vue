<script setup lang="ts">
import WNavbar from '@/components/header/WNavbar.vue';
import { useServerStore, useStore } from '@/store';
import { computed, nextTick, reactive, ref, watch } from 'vue';
import IEditor from '@/components/codeEditor/IEditor.vue';
import Guide from '@/components/codeEditor/Guide.vue';
import LocalSaveDialog from '@/components/codeEditor/dialogs/LocalSave.vue';
import { MoreOptionsSheet } from '@wuji-tauri/components/src';
import { guideExamplesMD } from '@/components/codeEditor/guides';
import PhotoList from './views/PhotoList.vue';
import PhotoSearchList from './views/PhotoSearchList.vue';
import PhotoDetail from './views/PhotoDetail.vue';
import SongList from './views/SongList.vue';
import SongSearchList from './views/SongSearchList.vue';
import SongPlaylist from './views/SongPlaylist.vue';
import SongSearchPlaylist from './views/SongSearchPlaylist.vue';
import SongPlaylistDetail from './views/SongPlaylistDetail.vue';
import SongPlayUrl from './views/SongPlayUrl.vue';
import SongLyric from './views/SongLyric.vue';
import BookList from './views/BookList.vue';
import BookSearchList from './views/BookSearchList.vue';
import BookDetail from './views/BookDetail.vue';
import BookContent from './views/BookContent.vue';
import ComicList from './views/ComicList.vue';
import ComicSearchList from './views/ComicSearchList.vue';
import ComicDetail from './views/ComicDetail.vue';
import ComicContent from './views/ComicContent.vue';
import VideoList from './views/VideoList.vue';
import VideoSearchList from './views/VideoSearchList.vue';
import VideoDetail from './views/VideoDetail.vue';
import VideoPlayUrl from './views/VideoPlayUrl.vue';
import _ from 'lodash';
import { format } from 'date-fns';
import { save as saveToDialog } from '@tauri-apps/plugin-dialog';
import * as fsApi from '@tauri-apps/plugin-fs';
import {
  showConfirmDialog,
  showFailToast,
  showLoadingToast,
  showToast,
} from 'vant';
import PHOTO_TEMPLATE from '@/components/codeEditor/templates/photoTemplate.txt?raw';
import SONG_TEMPLATE from '@/components/codeEditor/templates/songTemplate.txt?raw';
import BOOK_TEMPLATE from '@/components/codeEditor/templates/bookTemplate.txt?raw';
import COMIC_TEMPLATE from '@/components/codeEditor/templates/comicTemplate.txt?raw';
import VIDEO_TEMPLATE from '@/components/codeEditor/templates/videoTemplate.txt?raw';
import {
  loadBookExtensionString,
  loadComicExtensionString,
  loadPhotoExtensionString,
  loadSongExtensionString,
  loadVideoExtensionString,
  SourceType,
} from '@wuji-tauri/source-extension';
import { router } from '@/router';
import { storeToRefs } from 'pinia';
import { useSourceCreateStore } from '@/store/sourceCreateStore';
import { nanoid } from 'nanoid';
type Type = 'photo' | 'song' | 'book';

const store = useStore();
const serverStore = useServerStore();
const sourceCreateStore = useSourceCreateStore();
const { myMarketSources } = storeToRefs(serverStore);
const { form, showingType } = storeToRefs(sourceCreateStore);

const previewPages = {
  photo: {
    list: {
      page: PhotoList,
    },
    searchList: {
      page: PhotoSearchList,
    },
    detail: { page: PhotoDetail },
  },
  song: {
    songList: {
      page: SongList,
    },
    searchSongList: {
      page: SongSearchList,
    },
    playlist: {
      page: SongPlaylist,
    },
    searchPlaylist: {
      page: SongSearchPlaylist,
    },
    playlistDetail: {
      page: SongPlaylistDetail,
    },
    playUrl: {
      page: SongPlayUrl,
    },
    lyric: {
      page: SongLyric,
    },
  },
  book: {
    list: {
      page: BookList,
    },
    searchList: {
      page: BookSearchList,
    },
    detail: {
      page: BookDetail,
    },
    content: {
      page: BookContent,
    },
  },
  comic: {
    list: {
      page: ComicList,
    },
    searchList: {
      page: ComicSearchList,
    },
    detail: {
      page: ComicDetail,
    },
    content: {
      page: ComicContent,
    },
  },
  video: {
    list: {
      page: VideoList,
    },
    searchList: {
      page: VideoSearchList,
    },
    detail: {
      page: VideoDetail,
    },
    playUrl: {
      page: VideoPlayUrl,
    },
  },
};

// 设置监听器
watch(
  form,
  (_) => {
    if (form.value) {
      Object.values(form.value).forEach((category) => {
        category.pages.forEach((page) => {
          watch(
            () => page.code,
            (newVal, oldVal) => {
              if (newVal.trim() !== oldVal.trim()) {
                page.passed = false;
                if (page.type === 'constructor') {
                  category.pages.forEach((p) => {
                    p.passed = false;
                  });
                }
              }
            },
          );
        });
      });
    }
  },
  { once: true },
);

const logs = ref<
  {
    id: string;
    message: string;
    time: number;
  }[]
>([]);

function deepToString(
  obj: any,
  depth = 0,
  maxDepth = 10,
  isJsonLike = true, // 新增参数，标记是否按 JSON 风格格式化
  indent = '  ', // 缩进字符串
): string {
  if (depth > maxDepth) return '[Max Depth Reached]';

  if (obj === null) return 'null';
  if (obj === undefined) return 'undefined';

  if (typeof obj === 'string') return `"${obj}"`;
  if (typeof obj !== 'object') return String(obj);

  // 处理 DOM 节点
  if (obj instanceof Node) {
    if (obj.nodeType === Node.TEXT_NODE) {
      return obj.textContent || '';
    }
    return (obj as Element).outerHTML || obj.toString();
  }

  // 如果是数组
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';

    // 如果是 JSON 风格且不是深层嵌套，进行多行格式化
    if (isJsonLike && depth < 2) {
      const items = obj.map(
        (item) =>
          `${indent.repeat(depth + 1)}${deepToString(item, depth + 1, maxDepth, isJsonLike, indent)}`,
      );
      return `[\n${items.join(',\n')}\n${indent.repeat(depth)}]`;
    }
    return `[${obj.map((item) => deepToString(item, depth + 1, maxDepth, isJsonLike, indent)).join(', ')}]`;
  }

  // 如果是普通对象
  const entries = Object.entries(obj);
  if (entries.length === 0) return '{}';

  // 检查是否是纯 JSON 对象（没有方法、DOM 节点等）
  const isPureJson =
    isJsonLike &&
    entries.every(([_, value]) => {
      const type = typeof value;
      return (
        value === null ||
        type === 'string' ||
        type === 'number' ||
        type === 'boolean' ||
        (type === 'object' && !(value instanceof Node))
      );
    });

  // 如果是纯 JSON 对象且不是深层嵌套，进行多行格式化
  if (isPureJson && depth < 2) {
    const items = entries.map(
      ([key, value]) =>
        `${indent.repeat(depth + 1)}"${key}": ${deepToString(value, depth + 1, maxDepth, isJsonLike, indent)}`,
    );
    return `{\n${items.join(',\n')}\n${indent.repeat(depth)}}`;
  }

  // 默认单行输出
  const singleLineEntries = entries.map(
    ([key, value]) =>
      `"${key}": ${deepToString(value, depth + 1, maxDepth, isJsonLike, indent)}`,
  );
  return `{${singleLineEntries.join(', ')}}`;
}

const logFunction = (...args: any[]) => {
  logs.value.push({
    id: nanoid(),
    message: args
      .map((arg) => {
        return deepToString(arg);
      })
      .join(' '),
    time: Date.now(),
  });
};

const selectedPage = ref<string>('constructor');
const showingCode = computed({
  get() {
    return form.value[showingType.value].pages.find(
      (p) => p.type === selectedPage.value,
    )?.code;
  },
  set(newValue) {
    const page = form.value[showingType.value].pages.find(
      (p) => p.type === selectedPage.value,
    );
    if (page != undefined) {
      page.code = newValue || '';
    }
  },
});

const showingContent = computed(() => {
  return form.value[showingType.value];
});

const showTypePicker = ref(false);
const typePickerActions = computed(() =>
  Object.values(form.value).map((t) => {
    return {
      name: t.chineseName,
      color: t.type === showingType.value ? 'var(--van-primary-color)' : '',
      callback: () => {
        onSelectType(t.type as Type);
        showTypePicker.value = false;
      },
    };
  }),
);

const showGuide = ref(false);
const guideContent = computed(() => {
  return (guideExamplesMD[showingType.value] as any)[selectedPage.value];
});

const showPreview = ref(false);
const previewComponent = computed(() => {
  if (selectedPage.value === 'constructor') {
    return undefined;
  }
  const page = previewPages[showingType.value][
    selectedPage.value as keyof (typeof previewPages)[typeof showingType.value]
  ] as any;

  if (page === undefined) {
    return undefined;
  }

  return page;
});
const previewComponentRef = ref(null);

const previewPage = computed(() => {
  return previewComponent.value?.page;
});

const updatePreviewResult = (
  type: Type,
  page: string,
  result: any,
  passed: boolean,
) => {
  const f = form.value[type].pages.find((p) => p.type === page);
  if (f) {
    f.passed = passed;
    f.result = result;
  }
};

const allPassed = computed(() => {
  return form.value[showingType.value].pages.every((p) => {
    if (p.type === 'constructor') {
      return true;
    }
    return p.passed;
  });
});

const onCodeChange = _.debounce(() => {}, 500);

const onSelectType = (typeName: Type) => {
  showingType.value = typeName;
  selectedPage.value = form.value[typeName].pages[0].type;
};

const backDefaultCode = () => {
  const page = form.value[showingType.value].pages.find(
    (p) => p.type === selectedPage.value,
  );
  if (page) {
    page.code = page.defaultCode;
  }
};

const handleRun = async () => {
  showPreview.value = true;
  logs.value = [];
  nextTick(() => {
    (previewComponentRef.value as any)?.initLoad();
  });
};

const showButtonMoreOptions = ref(false);
const showLocalSaveDialog = ref(false);
const showMarketSaveDialog = ref(false);
const generateSaveCode = async (data: {
  id: string;
  name: string;
}): Promise<string | undefined> => {
  const findPage = (name: string) => {
    return form.value[showingType.value].pages.find(
      (page) => page.type === name,
    );
  };

  let code = undefined;
  switch (showingType.value) {
    case 'photo':
      code = PHOTO_TEMPLATE.replace("id = 'testPhoto';", `id = '${data.id}';`)
        .replace('constructor() {}', findPage('constructor')!.code)
        .replace("name = '测试';", `name = '${data.name}';`)
        .replace('async getRecommendList(pageNo) {}', findPage('list')!.code)
        .replace(
          'async search(keyword, pageNo) {}',
          findPage('searchList')!.code,
        )
        .replace(
          'async getPhotoDetail(item, pageNo) {}',
          findPage('detail')!.code,
        );

      break;
    case 'song':
      code = SONG_TEMPLATE.replace("id = 'testSong';", `id = '${data.id}';`)
        .replace('constructor() {}', findPage('constructor')!.code)
        .replace("name = '测试';", `name = '${data.name}';`)
        .replace(
          'async getRecommendPlaylists(pageNo) {}',
          findPage('playlist')!.code,
        )
        .replace(
          'async getRecommendSongs(pageNo) {}',
          findPage('songList')!.code,
        )
        .replace(
          'async searchPlaylists(keyword, pageNo) {}',
          findPage('searchPlaylist')!.code,
        )
        .replace(
          'async searchSongs(keyword, pageNo) {}',
          findPage('searchSongList')!.code,
        )
        .replace(
          'async getPlaylistDetail(item, pageNo) {}',
          findPage('playlistDetail')!.code,
        )
        .replace('async getSongUrl(item, size) {}', findPage('playUrl')!.code)
        .replace('async getLyric(item) {}', findPage('lyric')!.code);
      break;
    case 'book':
      code = BOOK_TEMPLATE.replace("id = 'testBook';", `id = '${data.id}';`)
        .replace('constructor() {}', findPage('constructor')!.code)
        .replace("name = '测试';", `name = '${data.name}';`)
        .replace(
          'async getRecommendBooks(pageNo, type) {}',
          findPage('list')!.code,
        )
        .replace(
          'async search(keyword, pageNo) {}',
          findPage('searchList')!.code,
        )
        .replace(
          'async getBookDetail(item, pageNo) {}',
          findPage('detail')!.code,
        )
        .replace(
          'async getContent(item, chapter) {}',
          findPage('content')!.code,
        );
      break;
    case 'comic':
      code = COMIC_TEMPLATE.replace("id = 'testComic';", `id = '${data.id}';`)
        .replace('constructor() {}', findPage('constructor')!.code)
        .replace("name = '测试';", `name = '${data.name}';`)
        .replace(
          'async getRecommendComics(pageNo, type) {}',
          findPage('list')!.code,
        )
        .replace(
          'async search(keyword, pageNo) {}',
          findPage('searchList')!.code,
        )
        .replace(
          'async getComicDetail(item, pageNo) {}',
          findPage('detail')!.code,
        )
        .replace(
          'async getContent(item, chapter) {}',
          findPage('content')!.code,
        );
      break;
    case 'video':
      code = VIDEO_TEMPLATE.replace("id = 'testVideo';", `id = '${data.id}';`)
        .replace('constructor() {}', findPage('constructor')!.code)
        .replace("name = '测试';", `name = '${data.name}';`)
        .replace(
          'async getRecommendVideos(pageNo, type) {}',
          findPage('list')!.code,
        )
        .replace(
          'async search(keyword, pageNo) {}',
          findPage('searchList')!.code,
        )
        .replace(
          'async getVideoDetail(item, pageNo) {}',
          findPage('detail')!.code,
        )
        .replace(
          'async getPlayUrl(item, resource, episode) {}',
          findPage('playUrl')!.code,
        );
      break;
  }
  try {
    switch (showingType.value) {
      case 'photo':
        loadPhotoExtensionString(code, true);
        break;
      case 'song':
        loadSongExtensionString(code, true);
        break;
      case 'book':
        loadBookExtensionString(code, true);
        break;
      case 'comic':
        loadComicExtensionString(code, true);
        break;
      case 'video':
        loadVideoExtensionString(code, true);
        break;
    }
    return code;
  } catch (error) {
    showFailToast('代码错误: ' + error);
  }
};

const showLocalSave = () => {
  if (allPassed.value) {
    showLocalSaveDialog.value = true;
  } else {
    showConfirmDialog({
      title: '保存失败',
      message: '请先运行通过所有接口',
    });
    return;
  }
};

const handleSaveLocal = async (data: { id: string; name: string }) => {
  const code = await generateSaveCode(data);
  if (!code) return;
  const path = await saveToDialog({
    filters: [
      {
        name: 'js',
        extensions: ['js'],
      },
    ],
  });

  if (!path || !code) return;
  try {
    await fsApi.writeTextFile(path, code);
  } catch (error) {
    showConfirmDialog({
      title: '保存失败',
      message: '请检查文件权限',
    });
    return;
  }
  showConfirmDialog({
    title: '保存成功',
    message: '保存成功',
  });
  showConfirmDialog({
    title: '导入',
    message: '是否立即导入到本地源进行使用？',
    confirmButtonText: '导入',
    cancelButtonText: '取消',
  }).then(async (action) => {
    if (action === 'confirm') {
      showToast('进行导入');
      await store.addLocalSubscribeSource(path);
    }
  });
};

const showAddSourceDialog = ref(false);

const addSourceDialogActions = computed(() => {
  return myMarketSources.value.map((item) => {
    const exist = item.sourceContents?.find(
      (content) => content._id === form.value[showingType.value].id,
    );
    return {
      name: item.name,
      subname: exist
        ? '已存在'
        : `共 ${item.sourceContents?.length || 0} 个内容`,
      disabled: exist ? true : false,
      callback: async () => {
        console.log('添加到源', item.name);
        const data = form.value[showingType.value];
        const code = await generateSaveCode({
          id: data.id,
          name: data.name,
        });
        if (!code) return;
        serverStore.addMarketSourceContent({
          _id: data.id,
          name: data.name,
          type: data.type as SourceType,
          disabled: false,
          source: item._id,
          code: code,
          url: '',
        });
      },
    };
  });
});

const showMarketSave = () => {
  if (allPassed.value) {
    showMarketSaveDialog.value = true;
  } else {
    showConfirmDialog({
      title: '失败',
      message: '请先运行通过所有接口',
    });
    return;
  }
};

const handleSaveMarket = async (data: { id: string; name: string }) => {
  const code = await generateSaveCode(data);
  if (!code) return;
  const toast = showLoadingToast('获取中');
  await serverStore.getMyMarketSources();
  toast.close();
  if (!serverStore.myMarketSources.length) {
    showConfirmDialog({
      title: '添加失败',
      message: '你还没有创建任何订阅源，\n是否立即创建?',
      confirmButtonText: '创建订阅源',
      cancelButtonText: '取消',
    }).then(async (action) => {
      if (action === 'confirm') {
        router.push({ name: 'SourceMy' });
      }
    });
    return;
  } else {
    form.value[showingType.value].id = data.id;
    form.value[showingType.value].name = data.name;
    showAddSourceDialog.value = true;
  }
};
</script>

<template>
  <div class="relative flex h-full w-full flex-col overflow-hidden">
    <WNavbar title="创建订阅源"></WNavbar>
    <div
      class="container flex h-full w-full min-w-full flex-grow gap-1 overflow-hidden bg-[var(--van-background-2)]"
    >
      <div
        class="page-select flex h-full w-[120px] flex-shrink-0 flex-col gap-2 overflow-y-auto"
      >
        <van-button size="small" @click="showTypePicker = true">
          {{ form[showingType].chineseName }}
        </van-button>
        <van-button
          v-for="(page, index) in form[showingType].pages"
          :key="page.type"
          :icon="page.passed ? 'success' : ''"
          size="small"
          class="border-none"
          :type="selectedPage == page.type ? 'primary' : 'default'"
          @click="selectedPage = page.type"
        >
          <span :class="selectedPage == page.type ? 'text-white' : ''">
            {{ page.chineseName }}
          </span>
        </van-button>
      </div>

      <div class="flex h-full flex-1 flex-grow flex-col overflow-hidden">
        <div
          class="flex items-center justify-start gap-2 rounded bg-gray-900 px-2 py-1.5"
        >
          <!-- 按钮组 -->
          <van-button
            size="small"
            type="primary"
            @click="handleRun"
            v-if="selectedPage != 'constructor'"
          >
            运行
          </van-button>
          <van-button size="small" type="success" plain @click="showLocalSave">
            保存本地
          </van-button>

          <van-button size="small" type="success" plain @click="showMarketSave">
            添加到订阅源
          </van-button>
          <van-button size="small" @click="showGuide = true">教程</van-button>
          <van-button
            size="small"
            @click="() => (showButtonMoreOptions = true)"
          >
            更多
          </van-button>
        </div>
        <IEditor
          v-model:value="showingCode"
          path="create-source-content"
          :lang="'javascript'"
          :init="() => {}"
          :editorChange="onCodeChange"
        />
      </div>
      <Guide v-model:show="showGuide" :content="guideContent" />
      <div
        v-show="showPreview"
        class="flex h-full w-[25%] flex-shrink-0 flex-col overflow-hidden border-l border-gray-500/50 text-[--van-text-color]"
      >
        <div
          class="flex h-[40px] flex-shrink-0 items-center justify-between border-b border-gray-200 px-2 text-[--van-text-color]"
        >
          <div class="text-base font-semibold">运行结果</div>
          <van-icon
            name="cross"
            class="van-haptics-feedback p-2"
            @click="() => (showPreview = false)"
          ></van-icon>
        </div>
        <div class="flex h-full w-full flex-grow flex-col overflow-auto">
          <keep-alive>
            <component
              :is="previewPage"
              ref="previewComponentRef"
              :content="showingContent"
              :update-result="updatePreviewResult"
              :log="logFunction"
              :close="() => (showPreview = false)"
              class="code-preview-page"
            ></component>
          </keep-alive>
        </div>
        <div
          class="flex items-center justify-between p-1 text-xs"
          v-if="logs.length"
        >
          <div>日志</div>
          <van-icon
            name="delete"
            class="van-haptics-feedback"
            @click="
              () => {
                logs.length = 0;
              }
            "
          ></van-icon>
        </div>
        <div
          class="log-area not-mobile-scrollbar h-[40%] flex-shrink-0 overflow-auto p-1 text-xs"
          v-if="logs.length"
        >
          <div
            class="log-item border-1 border"
            v-for="log in logs"
            :key="log.id"
          >
            <div class="text-[var(--van-text-color-2)]">
              {{ format(log.time, 'HH:mm:ss') }}
            </div>
            <div class="h-full w-full break-all p-1 pl-2">
              {{ log.message }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <van-action-sheet
      v-model:show="showTypePicker"
      v-model:value="form[showingType].chineseName"
      :actions="typePickerActions"
      cancel-text="取消"
      title="更多选项"
      teleport="body"
    />
    <MoreOptionsSheet
      v-model:show="showButtonMoreOptions"
      :actions="[
        {
          name: '恢复默认代码',
          callback: backDefaultCode,
        },
      ]"
    />
    <LocalSaveDialog
      v-model:show="showLocalSaveDialog"
      :confirm="handleSaveLocal"
    />
    <LocalSaveDialog
      v-model:show="showMarketSaveDialog"
      :confirm="handleSaveMarket"
    />
    <MoreOptionsSheet
      v-model:show="showAddSourceDialog"
      title="选择订阅源"
      :actions="addSourceDialogActions"
    ></MoreOptionsSheet>
  </div>
</template>

<style scoped lang="less"></style>
