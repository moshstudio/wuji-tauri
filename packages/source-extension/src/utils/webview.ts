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
    const retInfo = JSON.parse(decodeURIComponent(atob(ret)));
    const document = new DOMParser().parseFromString(
      retInfo.content,
      'text/html',
    );
    if (!document) {
      console.warn(retInfo.content);
      return null;
    }

    // 创建自定义 cookie 存储
    (document as any)._customCookies = retInfo.cookie;
    (document as any)._title = retInfo.title;
    (document as any)._userAgent = retInfo.userAgent;

    Object.defineProperty(document, 'cookie', {
      get: function () {
        return this._customCookies || '';
      },
      set: function (value) {
        this._customCookies = value;
      },
      configurable: true,
    });

    Object.defineProperty(document, 'title', {
      get: function () {
        return this._title || '';
      },
      set: function (value) {
        this._title = value;
      },
      configurable: true,
    });

    Object.defineProperty(document, 'userAgent', {
      get: function () {
        return this._userAgent || '';
      },
      set: function (value) {
        this._userAgent = value;
      },
      configurable: true,
    });

    return document;
  } finally {
    // 无论成功还是失败，都要释放信号量
    semaphore.release();
  }
}
