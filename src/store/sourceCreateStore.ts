import { debounceFilter, useStorageAsync } from '@vueuse/core';
import _ from 'lodash';
import { defineStore } from 'pinia';
import { watch } from 'vue';
import {
  BOOK_CONSTRUCTOR,
  BOOK_CONTENT,
  BOOK_DETAIL,
  BOOK_LIST,
  BOOK_SEARCH,
  COMIC_CONSTRUCTOR,
  COMIC_CONTENT,
  COMIC_DETAIL,
  COMIC_LIST,
  COMIC_SEARCH,
  PHOTO_CONSTRUCTOR,
  PHOTO_DETAIL,
  PHOTO_LIST,
  PHOTO_SEARCH,
  SONG_CONSTRUCTOR,
  SONG_LIST,
  SONG_LYRIC,
  SONG_PLAY_URL,
  SONG_PLAYLIST,
  SONG_PLAYLIST_DETAIL,
  SONG_SEARCH_LIST,
  SONG_SEARCH_PLAYLIST,
  VIDEO_CONSTRUCTOR,
  VIDEO_DETAIL,
  VIDEO_LIST,
  VIDEO_PLAY_URL,
  VIDEO_SEARCH,
} from '@/components/codeEditor/templates';
import { createKVStore } from './utils';

interface FormItem {
  type: string;
  chineseName: string;
  id: string;
  name: string;
  version: string;
  pages: {
    type: string;
    chineseName: string;
    code: string;
    defaultCode: string;
    passed: boolean;
    result: undefined;
  }[];
}

type Type = 'photo' | 'song' | 'book' | 'comic' | 'video';
type Form = Record<Type, FormItem>;

export const useSourceCreateStore = defineStore('sourceCreateStore', () => {
  const kvStorage = createKVStore('sourceCreateStore');
  const storage = kvStorage.storage;

  const defaultForm = {
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
    book: {
      type: 'book',
      chineseName: '书籍',
      id: '',
      name: '',
      version: '',
      pages: [
        {
          type: 'constructor',
          chineseName: '初始化',
          code: BOOK_CONSTRUCTOR,
          defaultCode: BOOK_CONSTRUCTOR,
          passed: false,
          result: undefined,
        },
        {
          type: 'list',
          chineseName: '推荐书籍',
          code: BOOK_LIST,
          defaultCode: BOOK_LIST,
          passed: false,
          result: undefined,
        },
        {
          type: 'searchList',
          chineseName: '搜索书籍',
          code: BOOK_SEARCH,
          defaultCode: BOOK_SEARCH,
          passed: false,
          result: undefined,
        },
        {
          type: 'detail',
          chineseName: '详情页',
          code: BOOK_DETAIL,
          defaultCode: BOOK_DETAIL,
          passed: false,
          result: undefined,
        },
        {
          type: 'content',
          chineseName: '章节内容',
          code: BOOK_CONTENT,
          defaultCode: BOOK_CONTENT,
          passed: false,
          result: undefined,
        },
      ],
    },
    comic: {
      type: 'comic',
      chineseName: '漫画',
      id: '',
      name: '',
      version: '',
      pages: [
        {
          type: 'constructor',
          chineseName: '初始化',
          code: COMIC_CONSTRUCTOR,
          defaultCode: COMIC_CONSTRUCTOR,
          passed: false,
          result: undefined,
        },
        {
          type: 'list',
          chineseName: '推荐漫画',
          code: COMIC_LIST,
          defaultCode: COMIC_LIST,
          passed: false,
          result: undefined,
        },
        {
          type: 'searchList',
          chineseName: '搜索漫画',
          code: COMIC_SEARCH,
          defaultCode: COMIC_SEARCH,
          passed: false,
          result: undefined,
        },
        {
          type: 'detail',
          chineseName: '详情页',
          code: COMIC_DETAIL,
          defaultCode: COMIC_DETAIL,
          passed: false,
          result: undefined,
        },
        {
          type: 'content',
          chineseName: '章节内容',
          code: COMIC_CONTENT,
          defaultCode: COMIC_CONTENT,
          passed: false,
          result: undefined,
        },
      ],
    },
    video: {
      type: 'video',
      chineseName: '影视',
      id: '',
      name: '',
      version: '',
      pages: [
        {
          type: 'constructor',
          chineseName: '初始化',
          code: VIDEO_CONSTRUCTOR,
          defaultCode: VIDEO_CONSTRUCTOR,
          passed: false,
          result: undefined,
        },
        {
          type: 'list',
          chineseName: '推荐影视',
          code: VIDEO_LIST,
          defaultCode: VIDEO_LIST,
          passed: false,
          result: undefined,
        },
        {
          type: 'searchList',
          chineseName: '搜索影视',
          code: VIDEO_SEARCH,
          defaultCode: VIDEO_SEARCH,
          passed: false,
          result: undefined,
        },
        {
          type: 'detail',
          chineseName: '详情页',
          code: VIDEO_DETAIL,
          defaultCode: VIDEO_DETAIL,
          passed: false,
          result: undefined,
        },
        {
          type: 'playUrl',
          chineseName: '播放地址',
          code: VIDEO_PLAY_URL,
          defaultCode: VIDEO_PLAY_URL,
          passed: false,
          result: undefined,
        },
      ],
    },
  };

  const form = useStorageAsync<Form>('form', defaultForm, storage, {
    eventFilter: debounceFilter(1000),
    deep: true,
    serializer: {
      read: async (raw: string) => {
        if (!raw) return undefined;
        return JSON.parse(raw);
      },
      write: async (value: Form | undefined) => {
        if (!value) return '';
        const cloneForm = _.cloneDeep(value);
        Object.values(cloneForm).forEach((item) => {
          item.pages.forEach((page) => {
            page.result = undefined;
          });
        });
        return JSON.stringify(value);
      },
    },
  });
  const showingType = useStorageAsync<Type>('createSourceShowingType', 'photo');

  const clear = async () => {
    form.value = defaultForm;
    showingType.value = 'photo';
    await storage.clear();
  };

  watch(
    form,
    (_) => {
      // 同步defaultForm的改动
      if (Object.keys(form.value).length !== Object.keys(defaultForm).length) {
        form.value = defaultForm;
      }
      Object.entries(form.value).forEach(([type, page]) => {
        if (type in defaultForm) {
          page.chineseName = defaultForm[type as Type].chineseName;
          page.pages.forEach((p, index) => {
            p.defaultCode = defaultForm[type as Type].pages[index].defaultCode;
          });
        }
      });
    },
    { once: true },
  );

  return { form, showingType, clear };
});
