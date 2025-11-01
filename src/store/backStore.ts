import type { LocationQuery, RouteParamsGeneric } from 'vue-router';
import _ from 'lodash';
import { defineStore } from 'pinia';
import { onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { router } from '@/router';
import { useDisplayStore } from './displayStore';
import Fullscreen from 'xgplayer/es/plugins/fullscreen';

type CatelogName = 'book' | 'photo' | 'song' | 'comic' | 'video';
interface RoutePath {
  name: string;
  path: string;
  params: RouteParamsGeneric;
  query: LocationQuery;
}
export const useBackStore = defineStore('back', () => {
  const displayStore = useDisplayStore();
  const route = useRoute();
  const names: CatelogName[] = ['photo', 'song', 'book', 'comic', 'video'];
  const _paths: RoutePath[] = [];
  const _catelogPaths: Record<CatelogName, RoutePath[]> = {
    book: [],
    photo: [],
    song: [],
    comic: [],
    video: [],
  };
  const savePath = (route: RoutePath) => {
    _.remove(_paths, (item) => item.name === route.name);
    _paths.push(route);

    for (const name of names) {
      if (route.name.toLowerCase().startsWith(name)) {
        _.remove(_catelogPaths[name], (item) => item.name === route.name);
        _catelogPaths[name].push(route);
      }
    }
  };
  const getPrevPath = (): RoutePath | undefined | null => {
    // null: 退出软件
    // undefined: 返回首页
    const pathName = route.name?.toString();
    if (pathName) {
      for (const name of names) {
        if (pathName.toLowerCase() === name) {
          // 主路径可以返回桌面
          return null;
        } else if (pathName.toLowerCase().startsWith(name)) {
          // 子路径返回上一级
          while (_catelogPaths[name].length) {
            const ret = _catelogPaths[name].pop();
            if (ret && ret.name !== pathName) {
              return ret;
            }
          }
          return {
            name: _.capitalize(name),
            path: `/${name}`,
            params: {},
            query: {},
          };
        }
      }
      // 默认返回上一级
      while (_paths.length) {
        const ret = _paths.pop();
        if (ret && ret.name !== pathName) {
          return ret;
        }
      }
    }
    return undefined;
  };
  const back = async (buttonClick = false) => {
    if (route.name === 'VideoDetail') {
      if (!buttonClick && displayStore.showVideoPlaylist) {
        displayStore.showVideoPlaylist = false;
        return;
      } else {
        if (displayStore.fullScreenMode) {
          if (displayStore.videoPlayer) {
            if (displayStore.isAndroid) {
              displayStore.fullScreenMode = false;
              const plugin = displayStore.videoPlayer.getPlugin(
                'fullscreen',
              ) as Fullscreen;
              plugin.animate(false);
            } else {
              displayStore.videoPlayer.exitFullscreen();
            }
          } else {
            displayStore.fullScreenMode = false;
          }
          return;
        }
      }
    }

    // if (displayStore.fullScreenMode) {
    //   displayStore.fullScreenMode = false;
    //   return;
    // }
    // if (route.name === 'VideoDetail') {
    //   if (buttonClick) {
    //     displayStore.fullScreenMode = false;
    //   }
    // }
    // if (!path) {
    //   if (displayStore.fullScreenMode) {
    //     displayStore.fullScreenMode = false;
    //     return;
    //   }
    //   if (
    //     route.name?.toString().startsWith('Video') &&
    //     displayStore.showVideoComponent
    //   ) {
    //     displayStore.showVideoComponent = false;
    //     displayStore.fullScreenMode = false;
    //     return;
    //   }
    //   if (
    //     route.name?.toString().startsWith('Song') &&
    //     displayStore.showSongPlayingList
    //   ) {
    //     displayStore.showSongPlayingList = false;
    //     return;
    //   }
    // }

    if (
      route.name?.toString().startsWith('Song') &&
      displayStore.showSongPlayingList
    ) {
      displayStore.showSongPlayingList = false;
      return;
    }

    const prevPath = getPrevPath();
    console.log('get prev path:', prevPath);

    if (prevPath === undefined) {
      if (_paths.length === 0) {
        await router.push('/');
      } else {
        _paths.pop();
        router.back();
      }
    } else if (prevPath === null) {
      const displayStore = useDisplayStore();
      if (displayStore.isAndroid) {
        await displayStore.exitApp();
      }
    } else {
      await router.push({
        name: prevPath.name,
        params: prevPath.params,
        query: prevPath.query,
      });
    }
  };

  onMounted(() => {
    watch(
      () => ({
        path: route.path,
        name: route.name,
        params: _.cloneDeep(route.params),
        query: _.cloneDeep(route.query),
      }),
      (newRoute) => {
        if (typeof newRoute.name === 'string') {
          savePath({
            name: newRoute.name,
            path: newRoute.path,
            params: newRoute.params,
            query: newRoute.query,
          });
        }
      },
      { immediate: true },
    );
  });
  window.androidBackCallback = back;
  return { back };
});
