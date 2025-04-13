import type { PlaylistInfo, SongInfo, SongShelf } from '@/extensions/song';

import HeartSVG from '@/assets/heart-fill.svg';

import { SongShelfType } from '@/types/song';
import { useStorageAsync } from '@vueuse/core';

import _ from 'lodash';
import { nanoid } from 'nanoid';
import { defineStore } from 'pinia';
import { showToast } from 'vant';

import { createKVStore } from './utils';

export const useSongShelfStore = defineStore('songShelfStore', () => {
  const kvStorage = createKVStore('songShelfStore');

  const songCreateShelf = useStorageAsync<SongShelf[]>(
    'songShelf',
    [],
    kvStorage.storage,
  );
  const songPlaylistShelf = useStorageAsync<SongShelf[]>(
    'songPlaylistShelf',
    [],
    kvStorage.storage,
  );
  const songLikeShelf = useStorageAsync<SongShelf>('songLikeShelf', {
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
  });
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

  const createShelf = (name: string): SongShelf | null => {
    // 创建收藏
    if (songCreateShelf.value.some(item => item.playlist.name === name)) {
      showToast('收藏夹已存在');
      return null;
    }
    const newShelf = {
      type: SongShelfType.create,
      playlist: {
        id: nanoid(),
        name,
        picUrl: '',
        sourceId: 'create',
      },
      createTime: Date.now(),
    };
    songCreateShelf.value.push(newShelf);
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
    return true;
  };
  const addPlaylistToShelf = (playlist: PlaylistInfo): boolean => {
    const find = songPlaylistShelf.value.find(
      item => item.playlist.id === playlist.id,
    );
    if (find) {
      showToast('已存在');
      return false;
    }
    songPlaylistShelf.value.push({
      type: SongShelfType.playlist,
      playlist,
      createTime: Date.now(),
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
      return true;
    }
    const removed2 = _.remove(
      songPlaylistShelf.value,
      item => item.playlist.id === songShelfId,
    );
    if (removed2.length) {
      showToast('删除成功');
      return true;
    }
    return false;
  };
  const clear = () => {
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
  };
  return {
    songCreateShelf,
    songPlaylistShelf,
    songLikeShelf,
    songInLikeShelf,
    playlistInShelf,
    createShelf,
    addSongToShelf,
    removeSongFromShelf,
    addPlaylistToShelf,
    removeSongShelf,
    clear,
  };
});
