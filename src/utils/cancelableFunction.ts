type CancellableFunction<T, Args extends any[]> = (...args: Args) => Promise<T>;

function createCancellableFunction<T, Args extends any[]>(
  fn: (signal: AbortSignal, ...args: Args) => Promise<T>,
): CancellableFunction<T, Args> {
  let abortController: AbortController | null = null;

  return async (...args: Args) => {
    // 如果之前有调用在进行，中断它
    const temp = abortController;
    temp?.abort();

    // 创建新的 AbortController
    abortController = new AbortController();
    const signal = abortController.signal;

    try {
      // 将原函数包装为一个支持中断的 Promise
      const result = await new Promise<T>((resolve, reject) => {
        // 执行原函数
        const originalPromise = fn(signal, ...args);

        // 监听中断信号
        signal.addEventListener('abort', () => {
          reject(new DOMException('操作中断', 'AbortError'));
        });
        // 等待原函数完成
        originalPromise.then(resolve).catch(reject);
      });

      return result;
    }
    catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // 处理中断错误
        console.log('操作被中断');
      }
      else {
        // 处理其他错误
        console.error('操作失败:', error);
      }
      throw error;
    }
    finally {
      // abortController = null;
    }
  };
}

export { createCancellableFunction };
