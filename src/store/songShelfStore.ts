import type {
  PlaylistInfo,
  SongInfo,
  SongShelf,
} from '@wuji-tauri/source-extension';

import { debounceFilter, useStorageAsync } from '@vueuse/core';

import { SongShelfType } from '@wuji-tauri/source-extension';
import _ from 'lodash';

import { nanoid } from 'nanoid';
import { defineStore } from 'pinia';
import { showToast } from 'vant';
import { markRaw } from 'vue';

import HeartSVG from '@/assets/heart-fill.svg';
import { SyncTypes } from '@/types/sync';
import { enqueueOp } from './cloudSyncOps';
import { createKVStore } from './utils';

export const useSongShelfStore = defineStore('songShelfStore', () => {
  const kvStorage = createKVStore('songShelfStore');
  const storage = kvStorage.storage;

  const songCreateShelf = useStorageAsync<SongShelf[]>(
    'songShelf',
    [],
    storage,
    {
      eventFilter: debounceFilter(500),
    },
  );
  const songPlaylistShelf = useStorageAsync<SongShelf[]>(
    'songPlaylistShelf',
    [],
    storage,
    {
      eventFilter: debounceFilter(500),
    },
  );
  const songLikeShelf = useStorageAsync<SongShelf>(
    'songLikeShelf',
    {
      type: SongShelfType.like,
      playlist: {
        id: nanoid(),
        name: '我喜欢的音乐',
        picUrl: HeartSVG,
        sourceId: '',
        list: {
          list: [],
          page: 1,
          totalPage: 1,
        },
      },
      createTime: Date.now(),
    },
    storage,
    {
      eventFilter: debounceFilter(500),
    },
  );
  const songInLikeShelf = (song: SongInfo) => {
    if (!song)
      return false;
    return (
      songLikeShelf.value?.playlist.list?.list.some(
        item => item.id === song.id,
      ) || false
    );
  };
  const playlistInShelf = (playlist?: PlaylistInfo) => {
    if (!playlist)
      return false;
    return songPlaylistShelf.value.some(
      item => item.playlist.id === playlist.id,
    );
  };

  const enqueueSongShelf = (shelf: SongShelf) => {
    const now = Date.now();
    if (shelf.type === SongShelfType.like) {
      enqueueOp({
        type: SyncTypes.SongShelf,
        op: 'upsertSongLike',
        entityId: shelf.playlist.id,
        payload: { ..._.cloneDeep(shelf) },
        clientUpdatedAt: now,
      });
      return;
    }
    enqueueOp({
      type: SyncTypes.SongShelf,
      op: 'upsertSongPlaylist',
      entityId: shelf.playlist.id,
      payload: {
        ..._.cloneDeep(shelf),
        _bucket: shelf.type === SongShelfType.playlist ? 'playlist' : 'create',
      },
      clientUpdatedAt: now,
    });
  };

  const createShelf = (name: string): SongShelf | null => {
    // 创建收藏
    if (songCreateShelf.value.some(item => item.playlist.name === name)) {
      showToast('收藏夹已存在');
      return null;
    }
    const createTime = Date.now();
    const newShelf = {
      type: SongShelfType.create,
      playlist: {
        id: nanoid(),
        name,
        picUrl: '',
        sourceId: 'create',
      },
      createTime,
    };
    songCreateShelf.value.push(newShelf);
    enqueueOp({
      type: SyncTypes.SongShelf,
      op: 'upsertSongPlaylist',
      entityId: newShelf.playlist.id,
      payload: { ..._.cloneDeep(newShelf), _bucket: 'create' },
      clientUpdatedAt: createTime,
    });
    return newShelf;
  };
  const addSongToShelf = (song: SongInfo, shelfId?: string): boolean => {
    let shelf: SongShelf | undefined;
    if (!shelfId || shelfId === songLikeShelf.value?.playlist.id) {
      shelf = songLikeShelf.value;
    }
    else {
      shelf = songCreateShelf.value.find(
        item => item.playlist.id === shelfId,
      );
    }
    if (!shelf) {
      showToast('收藏夹不存在');
      return false;
    }
    shelf.playlist.list ||= {
      list: [],
      page: 1,
      totalPage: 1,
    };
    if (shelf.playlist.list.list.find(item => item.id === song.id)) {
      showToast('已存在');
      return false;
    }
    else {
      shelf.playlist.list.list.push(song);
      showToast(`已添加到${shelf.playlist.name}`);
      enqueueSongShelf(shelf);
      return true;
    }
  };
  const removeSongFromShelf = (song: SongInfo, shelfId?: string): boolean => {
    let shelf: SongShelf | undefined;
    if (!shelfId || shelfId === songLikeShelf.value?.playlist.id) {
      shelf = songLikeShelf.value;
    }
    else {
      shelf = songCreateShelf.value.find(
        item => item.playlist.id === shelfId,
      );
    }
    if (!shelf) {
      showToast('收藏夹不存在');
      return false;
    }
    _.remove(shelf?.playlist.list?.list || [], item => item.id === song.id);
    showToast(`已从 ${shelf.playlist.name} 移除`);
    enqueueSongShelf(shelf);
    return true;
  };
  const importNeteasePlaylist = (playlist: PlaylistInfo): SongShelf | null => {
    const newShelf = createShelf(playlist.name);
    if (!newShelf)
      return null;

    newShelf.playlist.picUrl = playlist.picUrl;
    newShelf.playlist.picHeaders = playlist.picHeaders;
    newShelf.playlist.desc = playlist.desc;
    newShelf.playlist.list = playlist.list;
    showToast(`已导入歌单「${playlist.name}」`);
    enqueueSongShelf(newShelf);
    return newShelf;
  };

  const addPlaylistToShelf = (playlist: PlaylistInfo): boolean => {
    const find = songPlaylistShelf.value.find(
      item => item.playlist.id === playlist.id,
    );
    if (find) {
      showToast('已存在');
      return false;
    }
    const createTime = Date.now();
    const newShelf: SongShelf = {
      type: SongShelfType.playlist,
      playlist,
      createTime,
    };
    songPlaylistShelf.value.push(newShelf);
    enqueueOp({
      type: SyncTypes.SongShelf,
      op: 'upsertSongPlaylist',
      entityId: playlist.id,
      payload: { ..._.cloneDeep(newShelf), _bucket: 'playlist' },
      clientUpdatedAt: createTime,
    });
    return true;
  };
  const removeSongShelf = (songShelfId: string): boolean => {
    const removed = _.remove(
      songCreateShelf.value,
      item => item.playlist.id === songShelfId,
    );
    if (removed.length) {
      showToast('删除成功');
      enqueueOp({
        type: SyncTypes.SongShelf,
        op: 'removeSongPlaylist',
        entityId: songShelfId,
        clientUpdatedAt: Date.now(),
      });
      return true;
    }
    const removed2 = _.remove(
      songPlaylistShelf.value,
      item => item.playlist.id === songShelfId,
    );
    if (removed2.length) {
      showToast('删除成功');
      enqueueOp({
        type: SyncTypes.SongShelf,
        op: 'removeSongPlaylist',
        entityId: songShelfId,
        clientUpdatedAt: Date.now(),
      });
      return true;
    }
    return false;
  };

  const syncData = () => {
    return {
      songCreateShelf: markRaw(songCreateShelf.value),
      songPlaylistShelf: markRaw(songPlaylistShelf.value),
      songLikeShelf: markRaw(songLikeShelf.value),
    };
  };
  const loadSyncData = async (data: {
    songCreateShelf: SongShelf[];
    songPlaylistShelf: SongShelf[];
    songLikeShelf: SongShelf;
  }) => {
    songCreateShelf.value = data.songCreateShelf;
    songPlaylistShelf.value = data.songPlaylistShelf;
    songLikeShelf.value = data.songLikeShelf;
  };
  const clear = async () => {
    songCreateShelf.value = [];
    songPlaylistShelf.value = [];
    songLikeShelf.value = {
      type: SongShelfType.like,
      playlist: {
        id: nanoid(),
        name: '我喜欢的音乐',
        picUrl: HeartSVG,
        sourceId: '',
        list: {
          list: [],
          page: 1,
          totalPage: 1,
        },
      },
      createTime: Date.now(),
    };
    await storage.clear();
  };
  return {
    storage,
    songCreateShelf,
    songPlaylistShelf,
    songLikeShelf,
    songInLikeShelf,
    playlistInShelf,
    createShelf,
    importNeteasePlaylist,
    addSongToShelf,
    removeSongFromShelf,
    addPlaylistToShelf,
    removeSongShelf,
    syncData,
    loadSyncData,
    clear,
  };
});
