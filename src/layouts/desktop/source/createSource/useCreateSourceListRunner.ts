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

/** 多分类列表下，按 type 合并到已有 tab 项；否则整表替换 */
export function mergeCategoryListResult<TResult>(
  prev: TResult | undefined,
  res: TResult,
): TResult {
  if (
    prev
    && _.isArray(prev)
    && !_.isArray(res)
    && (prev as { type?: string }[]).find(
      item => item.type === (res as { type?: string }).type,
    )
  ) {
    const index = (prev as { type?: string }[]).findIndex(
      item => item.type === (res as { type?: string }).type,
    );
    Object.assign((prev as object[])[index], res);
    return prev;
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
    runStatus.value = CreateSourceRunStatus.running;
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
