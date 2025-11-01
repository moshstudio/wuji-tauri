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

// 创建最大并发数为5的信号量实例
const semaphore = new Semaphore(5);

export async function fetchWebview(url: string): Promise<Document | null> {
  // 尝试获取信号量许可，最多等待25秒
  const acquired = await semaphore.acquire(25000);

  if (!acquired) {
    console.warn('fetchWebview等待超时,无法获取执行许可', url);
    return null;
  }

  try {
    const ret = await _fetchWebview(url);

    if (!ret) {
      console.warn('fetchWebview获取失败', url);
      return null;
    }
    const content = decodeURIComponent(atob(ret.content));

    const document = new DOMParser().parseFromString(content, 'text/html');
    if (!document) {
      console.warn('解析content失败', content);
      return null;
    }

    // 创建自定义 cookie 存储
    (document as any)._customCookies = ret.cookie;

    Object.defineProperty(document, 'cookie', {
      get: function () {
        return this._customCookies || '';
      },
      set: function (value) {
        this._customCookies = value;
      },
      configurable: true,
    });

    return document;
  } finally {
    // 无论成功还是失败，都要释放信号量
    semaphore.release();
  }
}
