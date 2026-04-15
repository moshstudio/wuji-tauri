import type {
  VideoEpisode,
  VideoExtension,
  VideoItem,
  VideoResource,
  VideoUrlMap,
} from '@wuji-tauri/source-extension';
import type { VideoSource } from '@/types';
import { debounceFilter, useStorageAsync } from '@vueuse/core';
import _ from 'lodash';
import { defineStore } from 'pinia';
import { showFailToast } from 'vant';
import { triggerRef } from 'vue';
import { useExtensionStore } from './extensionStore';
import { createKVStore } from './utils';
import { useVideoShelfStore } from './videoShelfStore';

export const useVideoStore = defineStore('video', () => {
  const kvStorage = createKVStore();
  const extensionStore = useExtensionStore();
  const shelfStore = useVideoShelfStore();

  const videoSources = useStorageAsync<VideoSource[]>(
    'videoSources',
    [],
    kvStorage.storage,
    {
      eventFilter: debounceFilter(1000),
    },
  );

  const videoRecommendList = async (
    source: VideoSource,
    pageNo: number = 1,
    type?: string,
  ) => {
    const sc = (await extensionStore.getSourceClass(
      source.item,
    )) as VideoExtension;
    const res = await sc?.execGetRecommendVideos(pageNo, type);

    if (res) {
      if (!type) {
        source.list = res;
      }
      else {
        const find = _.castArray(source.list).find(
          item => item.type === type,
        );
        if (find) {
          _.assign(find, res);
        }
        else {
          source.list = [..._.castArray(source.list), ..._.castArray(res)];
        }
      }
    }
    else {
      if (!type) {
        source.list = undefined;
      }
    }
    triggerRef(videoSources);
  };

  const videoSearch = async (
    source: VideoSource,
    keyword: string,
    pageNo: number = 1,
  ) => {
    const sc = (await extensionStore.getSourceClass(
      source.item,
    )) as VideoExtension;
    const res = await sc?.execSearch(keyword, pageNo);
    if (res) {
      if (!_.isArray(res)) {
        if (!res.list?.length) {
          source.list = undefined;
          return;
        }
      }
      source.list = res;
    }
    else {
      source.list = undefined;
    }
    triggerRef(videoSources);
  };

  const videoDetail = async (source: VideoSource, video: VideoItem) => {
    const sc = (await extensionStore.getSourceClass(
      source.item,
    )) as VideoExtension;
    const res = await sc?.execGetVideoDetail(video);
    if (res) {
      return res;
    }
    else {
      showFailToast(`${source.item.name} 获取内容失败`);
      return null;
    }
  };

  const videoPlay = async (
    source: VideoSource,
    video: VideoItem,
    resource: VideoResource,
    episode: VideoEpisode,
  ): Promise<VideoUrlMap | null> => {
    const sc = (await extensionStore.getSourceClass(
      source.item,
    )) as VideoExtension;
    const res = await sc?.execGetPlayUrl(video, resource, episode);
    return res;
  };

  const getVideoSource = (sourceId: string): VideoSource | undefined => {
    return videoSources.value.find(item => item.item.id === sourceId);
  };

  const getVideoItem = (
    source: VideoSource,
    videoId: string,
  ): VideoItem | undefined => {
    const checkFromShelf = () => {
      for (const shelf of shelfStore.videoShelf) {
        for (const video of shelf.videos) {
          if (video.video.id === videoId) {
            return video.video;
          }
        }
      }
    };

    const checkFromHistory = () => {
      for (const video of shelfStore.videoHistory) {
        if (video.video.id === videoId) {
          return video.video;
        }
      }
    };

    const fromSource = () => {
      if (source.list) {
        for (const videoList of _.castArray(source.list)) {
          if (videoList.list) {
            for (const videoItem of videoList.list) {
              if (videoItem.id === videoId) {
                return videoItem;
              }
            }
          }
        }
      }
    };

    if (shelfStore.isVideoInShelf(videoId)) {
      return checkFromShelf();
    }
    else {
      return checkFromHistory() || fromSource();
    }
  };

  return {
    videoSources,
    videoRecommendList,
    videoSearch,
    videoDetail,
    videoPlay,
    getVideoSource,
    getVideoItem,
  };
});
