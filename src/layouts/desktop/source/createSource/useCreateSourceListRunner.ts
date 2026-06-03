import type { FormItem } from '@/store/sourceCreateStore';
import _ from 'lodash';
import { showFailToast } from 'vant';
import { ref } from 'vue';

export enum CreateSourceRunStatus {
  not_running = 'not_running',
  running = 'running',
  success = 'success',
  error = 'error',
}

type PageRow = FormItem['pages'][number];

interface CategorySlice { type?: string; [key: string]: unknown }

/** 非首次加载：切换分类 tab、翻页等，避免卸载预览内容 */
export function isIncrementalCreateSourceLoad(
  hasResult: boolean,
  pageNo?: number,
  type?: string,
) {
  return hasResult && (!!type || (pageNo ?? 1) > 1);
}

/** 多分类列表：按 type 合并到对应 tab，与 videoStore.videoRecommendList 行为一致 */
export function mergeCategoryListResult<TResult>(
  prev: TResult | undefined,
  res: TResult,
): TResult {
  if (!prev) {
    return res;
  }

  const prevItems = _.castArray(prev) as CategorySlice[];
  const wasArray = _.isArray(prev);

  function mergeOne(incoming: CategorySlice): TResult {
    const type = incoming.type;
    const idx = type
      ? prevItems.findIndex(item => item.type === type)
      : -1;

    if (idx >= 0) {
      const next = prevItems.map((item, i) =>
        i === idx ? { ...item, ...incoming } : item,
      );
      return (wasArray ? next : next[0]) as TResult;
    }

    if (wasArray) {
      return [...prevItems, incoming] as TResult;
    }

    const only = prevItems[0];
    if (type && only?.type && only.type !== type) {
      return [only, incoming] as TResult;
    }

    return { ...only, ...incoming } as TResult;
  }

  if (!_.isArray(res)) {
    return mergeOne(res as CategorySlice);
  }

  if (wasArray) {
    const next = [...prevItems];
    for (const incoming of res as CategorySlice[]) {
      const type = incoming.type;
      const idx = type ? next.findIndex(item => item.type === type) : -1;
      if (idx >= 0) {
        next[idx] = { ...next[idx], ...incoming };
      }
      else {
        next.push(incoming);
      }
    }
    return next as TResult;
  }

  return res;
}

export function useCreateSourceListRunner<TResult>(options: {
  getContent: () => FormItem<TResult>;
  updateResult: (result: TResult | undefined, passed: boolean) => void;
  buildAndFetch: (
    findPage: (name: string) => PageRow | undefined,
    pageNo?: number,
    type?: string,
  ) => Promise<TResult | undefined>;
}) {
  const runStatus = ref<CreateSourceRunStatus>(
    CreateSourceRunStatus.not_running,
  );
  const errorMessage = ref('运行失败');
  const result = ref<TResult | undefined>();

  function findPage(name: string) {
    return options.getContent().pages.find(p => p.type === name);
  }

  async function load(pageNo?: number, type?: string) {
    if (!findPage('constructor')?.code) {
      showFailToast('《初始化》code未定义!');
      return;
    }
    if (!findPage('list')?.code) {
      showFailToast('code未定义!');
      return;
    }

    const silent = isIncrementalCreateSourceLoad(
      result.value !== undefined,
      pageNo,
      type,
    );

    if (!silent) {
      runStatus.value = CreateSourceRunStatus.running;
    }
    try {
      const res = await options.buildAndFetch(findPage, pageNo, type);
      if (!res) {
        throw new Error('获取推荐列表失败! 返回结果为空');
      }
      result.value = mergeCategoryListResult(result.value, res);
      options.updateResult(result.value, true);
      runStatus.value = CreateSourceRunStatus.success;
    }
    catch (error) {
      errorMessage.value = String(error);
      runStatus.value = CreateSourceRunStatus.error;
      options.updateResult(result.value, false);
    }
  }

  async function initLoad() {
    result.value = undefined;
    await load(1);
  }

  return {
    runStatus,
    errorMessage,
    result,
    load,
    initLoad,
  };
}
