import type { FormItem } from '@/store/sourceCreateStore';
import { showDialog, showFailToast } from 'vant';
import { ref } from 'vue';
import {
  CreateSourceRunStatus,
  mergeCategoryListResult,
} from './useCreateSourceListRunner';

type PageRow = FormItem['pages'][number];

export function useCreateSourceSearchListRunner<TResult>(options: {
  getContent: () => FormItem<TResult>;
  updateResult: (result: TResult | undefined, passed: boolean) => void;
  prereqDialogMessage: string;
  buildAndFetch: (
    findPage: (name: string) => PageRow | undefined,
    pageNo?: number,
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

  async function load(pageNo?: number, _type?: string) {
    if (!findPage('constructor')?.code) {
      showFailToast('《初始化》code未定义!');
      return;
    }
    if (!findPage('list')?.passed) {
      showDialog({
        message: options.prereqDialogMessage,
        showCancelButton: false,
      });
      return;
    }
    if (!findPage('searchList')?.code) {
      showFailToast('code未定义!');
      return;
    }
    runStatus.value = CreateSourceRunStatus.running;
    try {
      const res = await options.buildAndFetch(findPage, pageNo);
      if (!res) {
        throw new Error('获取搜索列表失败! 返回结果为空');
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
