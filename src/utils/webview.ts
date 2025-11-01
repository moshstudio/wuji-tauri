import { fetchWebview as _fetchWebview } from 'tauri-plugin-mywebview-api';

// 信号量类，用于控制并发数量
class Semaphore {
  private permits: number;
  private waiting: Array<{ resolve: () => void; timeoutId: NodeJS.Timeout }> =
    [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(timeoutMs: number): Promise<boolean> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve(true);
    }

    return new Promise<boolean>((resolve) => {
      const timeoutId = setTimeout(() => {
        const index = this.waiting.findIndex(
          (item) => item.timeoutId === timeoutId,
        );
        if (index !== -1) {
          this.waiting.splice(index, 1);
          resolve(false);
        }
      }, timeoutMs);

      this.waiting.push({
        resolve: () => {
          clearTimeout(timeoutId);
          resolve(true);
        },
        timeoutId,
      });
    });
  }

  release(): void {
    this.permits++;
    if (this.waiting.length > 0) {
      const next = this.waiting.shift();
      if (next) {
        this.permits--;
        next.resolve();
      }
    }
  }
}

// 创建最大并发数为3的信号量实例
const semaphore = new Semaphore(3);

export async function fetWebview(url: string): Promise<string | null> {
  // 尝试获取信号量许可，最多等待20秒
  const acquired = await semaphore.acquire(20000);

  if (!acquired) {
    throw new Error('等待超时，无法获取执行许可');
  }

  try {
    const ret = await _fetchWebview(url);
    return ret;
  } finally {
    // 无论成功还是失败，都要释放信号量
    semaphore.release();
  }
}
