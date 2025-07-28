import { defineStore } from 'pinia';
import { onMounted, watch } from 'vue';
import { useDisplayStore } from './displayStore';
import { LocationQuery, RouteParamsGeneric, useRoute } from 'vue-router';
import _ from 'lodash';
import { router } from '@/router';

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
    const path = route.path;
    const pathName = route.name;
    if (!(typeof pathName === 'string')) {
      while (_paths.length) {
        const ret = _paths.pop();
        if (ret && ret.path !== path) {
          return ret;
        }
      }
      return undefined;
    }
    for (const name of names) {
      if (pathName.toLowerCase() === name) {
        // 主路径可以返回桌面
        return null;
      }
    }
    for (const name of names) {
      if (pathName.toLowerCase().startsWith(name)) {
        // 子路径返回上一级
        while (_catelogPaths[name].length) {
          const ret = _catelogPaths[name].pop();
          if (ret && ret.path !== path) {
            return ret;
          }
        }
        return {
          name: _.capitalize(name),
          path: '/' + name,
          params: {},
          query: {},
        };
      }
    }
    return _.findLast(_paths, (p) => p.path !== path);
  };
  const back = async () => {
    if (displayStore.fullScreenMode) {
      displayStore.fullScreenMode = false;
      return;
    }
    const prevPath = getPrevPath();
    if (prevPath === undefined) {
      if (!window.history.length) {
        await router.push('/');
      } else {
        router.back();
      }
    } else if (prevPath === null) {
      const displayStore = useDisplayStore();
      if (displayStore.isAndroid) {
        await displayStore.exitApp();
      }
    } else {
      await router.push(prevPath);
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
