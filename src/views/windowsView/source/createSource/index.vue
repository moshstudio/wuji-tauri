<script setup lang="ts">
import { useDisplayStore, useStore } from '@/store';
import { storeToRefs } from 'pinia';
import { computed, markRaw, nextTick, reactive, ref, watch } from 'vue';
import IEditor from '@/components/codeEditor/IEditor.vue';
import Guide from '@/components/codeEditor/Guide.vue';
import {
  PHOTO_CONSTRUCTOR,
  PHOTO_DETAIL,
  PHOTO_LIST,
  PHOTO_SEARCH,
  SONG_CONSTRUCTOR,
  SONG_LIST,
  SONG_SEARCH_LIST,
  SONG_PLAYLIST,
  SONG_SEARCH_PLAYLIST,
  SONG_PLAYLIST_DETAIL,
  SONG_PLAY_URL,
  SONG_LYRIC,
} from '@/components/codeEditor/templates';
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
import CreateSourceConfimDialog from '@/components/dialogs/CreateSourceConfim.vue';
import _ from 'lodash';
import { save as saveToDialog } from '@tauri-apps/plugin-dialog';
import * as fsApi from 'tauri-plugin-fs-api';
import { showConfirmDialog, showDialog, showToast } from 'vant';
import PHOTO_TEMPLATE from '@/components/codeEditor/templates/photoTemplate.txt?raw';
import SONG_TEMPLATE from '@/components/codeEditor/templates/songTemplate.txt?raw';

type Type = 'photo' | 'song';

const store = useStore();
const displayStore = useDisplayStore();
const { showCreateSubscribeDialog } = storeToRefs(displayStore);

const previewPages = reactive({
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
});

const form = reactive({
  photo: {
    type: 'photo',
    chineseName: '图片',
    id: '',
    name: '',
    version: '',
    pages: [
      {
        type: 'constructor',
        chineseName: '初始化',
        code: PHOTO_CONSTRUCTOR,
        defaultCode: PHOTO_CONSTRUCTOR,
        passed: false,
        result: undefined,
      },
      {
        type: 'list',
        chineseName: '推荐图片',
        code: PHOTO_LIST,
        defaultCode: PHOTO_LIST,
        passed: false,
        result: undefined,
      },
      {
        type: 'searchList',
        chineseName: '搜索图片',
        code: PHOTO_SEARCH,
        defaultCode: PHOTO_SEARCH,
        passed: false,
        result: undefined,
      },
      {
        type: 'detail',
        chineseName: '详情页',
        code: PHOTO_DETAIL,
        defaultCode: PHOTO_DETAIL,
        passed: false,
        result: undefined,
      },
    ],
  },
  song: {
    type: 'song',
    chineseName: '音乐',
    id: '',
    name: '',
    version: '',
    pages: [
      {
        type: 'constructor',
        chineseName: '初始化',
        code: SONG_CONSTRUCTOR,
        defaultCode: SONG_CONSTRUCTOR,
        passed: false,
        result: undefined,
      },
      {
        type: 'songList',
        chineseName: '推荐音乐',
        code: SONG_LIST,
        defaultCode: SONG_LIST,
        passed: false,
        result: undefined,
      },
      {
        type: 'searchSongList',
        chineseName: '搜索音乐',
        code: SONG_SEARCH_LIST,
        defaultCode: SONG_SEARCH_LIST,
        passed: false,
        result: undefined,
      },
      {
        type: 'playlist',
        chineseName: '推荐歌单',
        code: SONG_PLAYLIST,
        defaultCode: '',
        passed: false,
        result: undefined,
      },
      {
        type: 'searchPlaylist',
        chineseName: '搜索歌单',
        code: SONG_SEARCH_PLAYLIST,
        defaultCode: SONG_SEARCH_PLAYLIST,
        passed: false,
        result: undefined,
      },
      {
        type: 'playlistDetail',
        chineseName: '歌单详情',
        code: SONG_PLAYLIST_DETAIL,
        defaultCode: SONG_PLAYLIST_DETAIL,
        passed: false,
        result: undefined,
      },
      {
        type: 'playUrl',
        chineseName: '播放音乐',
        code: SONG_PLAY_URL,
        defaultCode: SONG_PLAY_URL,
        passed: false,
        result: undefined,
      },
      {
        type: 'lyric',
        chineseName: '歌词',
        code: SONG_LYRIC,
        defaultCode: SONG_LYRIC,
        passed: false,
        result: undefined,
      },
    ],
  },
});
// 设置监听器
Object.values(form).forEach((category) => {
  category.pages.forEach((page) => {
    watch(
      () => page.code,
      (newVal, oldVal) => {
        if (newVal.trim() !== oldVal.trim()) {
          page.passed = false;
        }
      },
    );
  });
});
const logs = ref([]);

const showingType = ref<Type>('photo');
const selectedPage = ref<string>('constructor');
const showingCode = computed({
  get() {
    return form[showingType.value].pages.find(
      (p) => p.type === selectedPage.value,
    )?.code;
  },
  set(newValue) {
    const page = form[showingType.value].pages.find(
      (p) => p.type === selectedPage.value,
    );
    if (page != undefined) {
      page.code = newValue || '';
    }
  },
});

const showingContent = computed(() => {
  return form[showingType.value];
});

const showTypePicker = ref(false);
const typePickerActions = computed(() =>
  Object.values(form).map((t) => ({
    name: t.chineseName,
    color: t.type === showingType.value ? 'var(--van-primary-color)' : '',
    callback: () => {
      onSelectType(t.type as Type);
      showTypePicker.value = false;
    },
  })),
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
  const f = form[type].pages.find((p) => p.type === page);
  if (f) {
    f.passed = passed;
    f.result = result;
  }
};

const onCodeChange = _.debounce(() => {}, 500);

const onSelectType = (typeName: Type) => {
  showingType.value = typeName;
  selectedPage.value = form[typeName].pages[0].type;
};

const backDefaultCode = () => {
  const page = form[showingType.value].pages.find(
    (p) => p.type === selectedPage.value,
  );
  if (page) {
    page.code = page.defaultCode;
  }
};

const showSaveDialog = ref(false);
const importAfterSave = ref(false);
const handleSaveConfirm = async (data: {
  id: string;
  name: string;
  author: string;
  version: string;
}) => {
  const findPage = (name: string) => {
    return form[showingType.value].pages.find((page) => page.type === name);
  };

  let code;
  switch (showingType.value) {
    case 'photo':
      code = PHOTO_TEMPLATE.replace("id = 'testPhoto';", `id = '${data.id}';`)
        .replace('constructor() {}', findPage('constructor')!.code)
        .replace("name = '测试';", `name = '${data.name}';`)
        .replace("author = '';", `author = '${data.author}';`)
        .replace("version = '';", `version = '${data.version}';`)
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
        .replace("author = '';", `author = '${data.author}';`)
        .replace("version = '';", `version = '${data.version}';`)
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
  }
  if (!code) {
    showConfirmDialog({
      title: '保存失败',
      message: '代码为空',
    });
  }
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
  if (importAfterSave.value) {
    showToast('进行导入');
    store.addLocalSubscribeSource(path);
  }
};
const handleSave = () => {
  if (
    form[showingType.value].pages.every((p) => {
      if (p.type === 'constructor') {
        return true;
      }
      return p.passed;
    })
  ) {
    importAfterSave.value = false;
    showSaveDialog.value = true;
  } else {
    showConfirmDialog({
      title: '保存失败',
      message: '请先运行通过所有接口',
    });
    return;
  }
};

const handleSaveAndImport = () => {
  if (
    form[showingType.value].pages.every((p) => {
      if (p.type === 'constructor') {
        return true;
      }
      return p.passed;
    })
  ) {
    importAfterSave.value = true;
    showSaveDialog.value = true;
  } else {
    showConfirmDialog({
      title: '保存失败',
      message: '请先运行通过所有接口',
    });
    return;
  }
};

const handleRun = async () => {
  showPreview.value = true;
  nextTick(() => {
    (previewComponentRef.value as any)?.initLoad();
  });
};

function save() {
  showCreateSubscribeDialog.value = false;
}
</script>

<template>
  <van-popup
    v-model:show="showCreateSubscribeDialog"
    position="bottom"
    teleport="body"
    :overlay="false"
    z-index="1000"
    destroy-on-close
    class="w-full h-full overflow-hidden p-1"
  >
    <div class="relative w-full h-full flex flex-col">
      <van-nav-bar :title="'创建订阅源'" left-arrow @click-left="save" />
      <div
        class="container flex w-full h-full overflow-hidden gap-1 min-w-full"
      >
        <div
          class="page-select flex flex-col gap-2 w-[120px] h-full overflow-y-auto"
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

        <div class="flex-1 w-full h-full flex flex-col">
          <div
            class="flex items-center gap-1.5 px-2 py-1.5 bg-gray-900 rounded"
          >
            <!-- 按钮组 -->
            <button
              class="px-2 py-1 text-xs font-medium bg-gray-700 text-gray-200 rounded hover:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-gray-600 transition-colors"
              @click="showGuide = true"
            >
              教程
            </button>

            <button
              class="px-2 py-1 text-xs font-medium bg-gray-700 text-gray-200 rounded hover:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-gray-600 transition-colors"
              @click="backDefaultCode"
            >
              恢复默认
            </button>
            <button
              class="px-2 py-1 text-xs font-medium bg-gray-700 text-gray-200 rounded hover:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-gray-600 transition-colors"
              @click="handleSave"
            >
              保存
            </button>

            <button
              class="px-2 py-1 text-xs font-medium bg-gray-700 text-gray-200 rounded hover:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-gray-600 transition-colors"
              @click="handleSaveAndImport"
            >
              保存 & 导入
            </button>

            <button
              class="px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:bg-blue-500 transition-colors"
              @click="handleRun"
              v-if="selectedPage != 'constructor'"
            >
              运行
            </button>
          </div>
          <IEditor
            v-model:value="showingCode"
            :lang="'javascript'"
            :readonly="false"
            :showLineNumbers="true"
            :showGutter="true"
            :hasBorder="true"
            :highlightActiveLine="true"
            @editorChange="onCodeChange"
          />
        </div>
        <div
          v-show="showPreview"
          class="text-[--van-text-color] flex-1 flex flex-col overflow-auto"
        >
          <div class="flex items-center justify-end p-1">
            <van-icon
              name="cross van-haptics-feedback"
              @click="showPreview = false"
            />
          </div>
          <keep-alive>
            <component
              :is="previewPage"
              ref="previewComponentRef"
              :content="showingContent"
              :update-result="updatePreviewResult"
              :close="() => (showPreview = false)"
              class="code-preview-page"
            ></component>
          </keep-alive>
        </div>
      </div>
    </div>
  </van-popup>
  <Guide v-model:show="showGuide" :content="guideContent" />

  <van-action-sheet
    v-model:show="showTypePicker"
    v-model:value="form[showingType].chineseName"
    :actions="typePickerActions"
    cancel-text="取消"
    title="更多选项"
    teleport="body"
  />
  <CreateSourceConfimDialog
    v-model:show="showSaveDialog"
    @confirm="handleSaveConfirm"
  />
</template>

<style scoped lang="less"></style>
