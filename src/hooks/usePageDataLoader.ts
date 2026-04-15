import { onActivated, onDeactivated, onUnmounted, ref } from 'vue';

interface UsePageDataLoaderOptions {
  /** 最大重试次数，默认 3 */
  maxRetries?: number;
  /** 重试间隔（ms），默认 1200 */
  retryDelay?: number;
  /** 所有重试失败后的回调（仅在组件活跃时触发） */
  onFailed?: () => void;
}

/**
 * 页面数据加载器。
 *
 * 合并了 retryOnFalse + createCancellableFunction 的功能，
 * 并通过 Vue 生命周期自动管理取消，无需手动检查 route.name。
 *
 * 适用于 keep-alive 下的详情页组件。
 *
 * @example
 * ```ts
 * const { run: loadPage, isActive } = usePageDataLoader({
 *   onFailed: () => showFailToast('加载失败'),
 * });
 *
 * async function toPage(pageNo?: number) {
 *   await loadPage(async (signal) => {
 *     // signal 在 deactivated/unmounted/新调用时自动 abort
 *     const data = await fetchData(pageNo);
 *     if (signal.aborted) return true;
 *     // 处理数据...
 *     return !!data; // true=成功, false=需要重试
 *   });
 * }
 * ```
 */
export function usePageDataLoader(options: UsePageDataLoaderOptions = {}) {
  const { maxRetries = 3, retryDelay = 1200, onFailed } = options;

  let currentController: AbortController | null = null;
  const isActive = ref(true);

  /** 取消当前正在进行的加载 */
  function cancel() {
    currentController?.abort();
    currentController = null;
  }

  onActivated(() => {
    isActive.value = true;
  });

  onDeactivated(() => {
    isActive.value = false;
    cancel();
  });

  onUnmounted(() => {
    isActive.value = false;
    cancel();
  });

  /**
   * 执行加载函数，支持自动重试和取消。
   *
   * - 调用 run() 会自动取消上一次正在进行的 run()。
   * - 组件 deactivated/unmounted 时自动取消。
   *
   * @param fn 加载函数。接收 AbortSignal，返回 true 表示成功，false 表示需要重试。
   * @returns 最终是否成功
   */
  async function run(
    fn: (signal: AbortSignal) => Promise<boolean>,
  ): Promise<boolean> {
    // 取消上一次正在进行的调用
    cancel();

    // run() 被调用说明组件正在使用中（可能来自 watcher 或事件）。
    // 在 keep-alive 中，watcher 在 onActivated 之前触发，
    // 此时 isActive 尚为 false，需要在此处显式设置为 true。
    isActive.value = true;

    const controller = new AbortController();
    currentController = controller;
    const { signal } = controller;

    let retries = 0;
    while (retries < maxRetries) {
      if (signal.aborted || !isActive.value)
        return false;

      try {
        const result = await fn(signal);
        if (signal.aborted || !isActive.value)
          return false;
        if (result)
          return true;
      }
      catch (error) {
        if (signal.aborted || !isActive.value)
          return false;
        console.error('[PageDataLoader] 加载出错:', error);
      }

      retries++;
      if (retries < maxRetries) {
        console.log(
          `[PageDataLoader] 重试 ${retries}/${maxRetries}，${retryDelay}ms 后...`,
        );
        // 可中断的延时等待
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, retryDelay);
          signal.addEventListener(
            'abort',
            () => {
              clearTimeout(timer);
              resolve();
            },
            { once: true },
          );
        });
      }
    }

    // 所有重试都失败，且仍处于活跃状态时触发回调
    if (!signal.aborted && isActive.value) {
      onFailed?.();
    }
    return false;
  }

  return { run, cancel, isActive };
}
