type CancellableFunction<T, Args extends any[]> = (...args: Args) => Promise<T>;

function createCancellableFunction<T, Args extends any[]>(
  fn: CancellableFunction<T, Args>
): CancellableFunction<T, Args> {
  let abortController: AbortController | null = null;

  return async (...args: Args) => {
    // 如果之前有调用在进行，中断它
    if (abortController) {
      abortController.abort();
    }

    // 创建新的 AbortController
    abortController = new AbortController();

    const signal = abortController.signal;

    try {
      // 将原函数包装为一个支持中断的 Promise
      const result = await new Promise<T>((resolve, reject) => {
        // 执行原函数
        const originalPromise = fn(...args);

        // 监听中断信号
        signal.addEventListener('abort', () => {
          reject(new DOMException('操作中断', 'AbortError'));
        });
        // 等待原函数完成
        originalPromise.then(resolve).catch(reject);
      });

      return result;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
      } else {
      }
      throw error;
    } finally {
      abortController = null;
    }
  };
}

export { createCancellableFunction };
