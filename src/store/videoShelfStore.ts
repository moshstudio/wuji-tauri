import type {
  VideoEpisode,
  VideoItem,
  VideoItemInShelf,
  VideoResource,
  VideoShelf,
} from '@wuji-tauri/source-extension';

import { debounceFilter, useStorageAsync } from '@vueuse/core';

import _ from 'lodash';
import { nanoid } from 'nanoid';

import { defineStore } from 'pinia';

import { showToast } from 'vant';
import { createKVStore } from './utils';
import { VideoHistory } from '@/types/video';

export const useVideoShelfStore = defineStore('videoShelfStore', () => {
  const kvStorage = createKVStore('videoShelfStore');
  const storage = kvStorage.storage;

  const historyKVStorage = createKVStore('videoHistoryStore');
  const historyStorage = historyKVStorage.storage;

  // 影视收藏⬇️
  const videoShelf = useStorageAsync<VideoShelf[]>(
    'videoShelf',
    [
      {
        id: nanoid(),
        name: '默认收藏',
        videos: [],
        createTime: Date.now(),
      },
    ],
    storage,
    {
      eventFilter: debounceFilter(1000),
    },
  );

  // 阅读历史
  const videoHistory = useStorageAsync<Array<VideoHistory>>(
    'videoHistory',
    [],
    historyStorage,
    {
      eventFilter: debounceFilter(1000),
    },
  );

  const createVideoShelf = (name: string) => {
    if (videoShelf.value.some((item) => item.name === name)) {
      // 收藏已存在
    } else {
      videoShelf.value.push({
        id: nanoid(),
        name,
        videos: [],
        createTime: Date.now(),
      });
    }
  };
  const removeVideoShelf = (shelfId: string) => {
    if (videoShelf.value.length === 1) {
      showToast('至少需要保留一个收藏夹');
      return false;
    }
    _.remove(videoShelf.value, (item) => item.id === shelfId);
    return true;
  };
  const isVideoInShelf = (
    video: VideoItem | string,
    shelfId?: string,
  ): boolean => {
    let id: string;
    if (typeof video === 'string') {
      id = video;
    } else {
      id = video.id;
    }
    if (shelfId) {
      return !!videoShelf.value
        .find((shelf) => shelf.id === shelfId)
        ?.videos.find((b) => b.video.id === id);
    } else {
      for (const shelf of videoShelf.value) {
        const find = shelf.videos.find((b) => b.video.id === id);
        if (find) {
          return true;
        }
      }
    }
    return false;
  };

  const isVideoInHistory = (video: VideoItem | string): boolean => {
    let id: string;
    if (typeof video === 'string') {
      id = video;
    } else {
      id = video.id;
    }
    return !!videoHistory.value.find((item) => item.video.id === id);
  };

  const addToViseoSelf = (videoItem: VideoItem, shelfId?: string): boolean => {
    if (!videoShelf.value.length) {
      showToast('收藏为空，请先创建收藏');
      return false;
    }
    const shelf = shelfId
      ? videoShelf.value.find((item) => item.id === shelfId)
      : videoShelf.value[0];
    if (!shelf) {
      showToast('收藏夹不存在');
      return false;
    }
    if (shelf.videos.find((item) => item.video.id === videoItem.id)) {
      showToast('收藏中已存在此视频');
      return false;
    }
    videoItem.extra ||= {};
    videoItem.extra.selected ||= false; // 用作从书架中删除
    shelf.videos.push({
      video: _.cloneDeep(videoItem),
      createTime: Date.now(),
    });
    showToast(`已添加到 ${shelf.name}`);
    return true;
  };
  const getVideoFromShelf = (
    videoItem: VideoItem,
    shelfId?: string,
  ): VideoItemInShelf | undefined => {
    if (shelfId) {
      return videoShelf.value
        .find((item) => item.id === shelfId)
        ?.videos.find((b) => b.video.id === videoItem.id);
    } else {
      // 遍历所有videoShelf.value， 获取第一个
      for (const shelf of videoShelf.value) {
        const find = shelf.videos.find((b) => b.video.id === videoItem.id);
        if (find) {
          return find;
        }
      }
    }
  };
  const removeVideoFromShelf = (
    videoItem: VideoItem | VideoItem[],
    shelfId?: string,
  ) => {
    if (!videoShelf.value.length) {
      showToast('收藏为空');
      return;
    }
    if (!shelfId) shelfId = videoShelf.value[0].id;
    const shelf = videoShelf.value.find((item) => item.id === shelfId);
    if (!shelf) {
      showToast('收藏不存在');
      return;
    }
    shelf.videos = shelf.videos.filter((i) => {
      if (_.isArray(videoItem)) {
        return !_.some(videoItem, { id: i.video.id });
      } else {
        return i.video.id !== videoItem.id;
      }
    });
  };
  const updateVideoPlayInfo = (
    videoItem: VideoItem,
    options: {
      episode: VideoEpisode;
      resource: VideoResource;
      position?: number;
    },
  ) => {
    if (!videoShelf.value) return;
    for (const shelf of videoShelf.value) {
      for (const video of shelf.videos) {
        if (video.video.id === videoItem.id) {
          video.video.lastWatchEpisodeId = options.episode.id;
          video.video.lastWatchResourceId = options.resource.id;
          if (options.position) {
            const r = video.video.resources?.find(
              (item) => item.id === video.video.lastWatchResourceId,
            );
            const e = r?.episodes?.find(
              (item) => item.id === video.video.lastWatchEpisodeId,
            );
            if (e) {
              e.lastWatchPosition = options.position;
            }
          }
        }
      }
    }
    updateVideoHistoryInfo(videoItem, options);
  };

  const updateVideoHistoryInfo = (
    videoItem: VideoItem,
    options: {
      episode: VideoEpisode;
      resource: VideoResource;
      position?: number;
    },
  ) => {
    const video = videoHistory.value.find(
      (item) => item.video.id === videoItem.id,
    );
    if (video) {
      video.lastReadTime = Date.now();
      video.video.lastWatchEpisodeId = options.episode.id;
      video.video.lastWatchResourceId = options.resource.id;
      if (options.position) {
        const r = video.video.resources?.find(
          (item) => item.id === video.video.lastWatchResourceId,
        );
        const e = r?.episodes?.find(
          (item) => item.id === video.video.lastWatchEpisodeId,
        );
        if (e) {
          e.lastWatchPosition = options.position;
        }
      }

      videoHistory.value = [...videoHistory.value].sort(
        (a, b) => b.lastReadTime - a.lastReadTime,
      );
    } else {
      const newVideo: VideoHistory = {
        video: videoItem,
        lastReadTime: Date.now(),
      };
      newVideo.video.lastWatchEpisodeId = options.episode.id;
      newVideo.video.lastWatchResourceId = options.resource.id;
      if (options.position) {
        const r = newVideo.video.resources?.find(
          (item) => item.id === newVideo.video.lastWatchResourceId,
        );
        const e = r?.episodes?.find(
          (item) => item.id === newVideo.video.lastWatchEpisodeId,
        );
        if (e) {
          e.lastWatchPosition = options.position;
        }
      }
      videoHistory.value = [newVideo, ...videoHistory.value]
        .sort((a, b) => b.lastReadTime - a.lastReadTime)
        .slice(0, 10);
    }
  };

  const clearVideoHistory = () => {
    videoHistory.value = [];
  };
  const deleteVideoFromShelf = (videoItem: VideoItem, shelfId: string) => {
    const shelf = videoShelf.value.find((item) => item.id === shelfId);
    if (!shelf) return;
    _.remove(shelf.videos, (item) => item.video.id === videoItem.id);
  };
  const syncData = () => {
    const clone = _.cloneDeep(videoShelf.value);
    clone.forEach((shelf) => {
      shelf.videos.forEach((video) => {
        video.video.resources = undefined;
      });
    });
    return clone;
  };
  const loadSyncData = async (data: VideoShelf[]) => {
    videoShelf.value = data;
    for (const shelf of videoShelf.value) {
      for (const video of shelf.videos) {
        if (isVideoInHistory(video.video)) {
          const resource = video.video.resources?.find(
            (item) => item.id === video.video.lastWatchResourceId,
          );
          const episode = resource?.episodes?.find(
            (item) => item.id === video.video.lastWatchEpisodeId,
          );
          if (resource && episode) {
            updateVideoHistoryInfo(video.video, {
              resource,
              episode,
              position: episode.lastWatchPosition,
            });
          }
        }
      }
    }
  };
  const clear = async () => {
    videoShelf.value = [
      {
        id: nanoid(),
        name: '默认收藏',
        videos: [],
        createTime: Date.now(),
      },
    ];
    clearVideoHistory();
    await storage.clear();
  };

  return {
    storage,
    videoShelf,
    videoHistory,
    createVideoShelf,
    removeVideoShelf,
    isVideoInShelf,
    isVideoInHistory,
    addToViseoSelf,
    removeVideoFromShelf,
    getVideoFromShelf,
    updateVideoPlayInfo,
    updateVideoHistoryInfo,
    clearVideoHistory,
    deleteVideoFromShelf,
    syncData,
    loadSyncData,
    clear,
  };
});
