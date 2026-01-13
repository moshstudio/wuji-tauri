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

    if (ret.title) {
      document.title = ret.title;
    }

    if (ret.url) {
      (document as any)._customUrl = ret.url;
    }

    const proxy = new Proxy(document, {
      get: (target, prop) => {
        if (prop === 'cookie') {
          return (target as any)._customCookies || '';
        }
        if (prop === 'URL' && (target as any)._customUrl) {
          return (target as any)._customUrl;
        }
        if (prop === 'location' && (target as any)._customUrl) {
          try {
            return new URL((target as any)._customUrl);
          } catch (e) {
            console.error(e);
            return {
              href: (target as any)._customUrl,
              toString: function () {
                return this.href;
              },
            };
          }
        }
        const value = Reflect.get(target, prop);
        return typeof value === 'function' ? value.bind(target) : value;
      },
      set: (target, prop, value, receiver) => {
        if (prop === 'cookie') {
          (target as any)._customCookies = value;
          return true;
        }
        if (
          (prop === 'URL' || prop === 'location') &&
          (target as any)._customUrl
        ) {
          (target as any)._customUrl = value;
          return true;
        }
        return Reflect.set(target, prop, value, receiver);
      },
    });
    
    return proxy;
  } finally {
    // 无论成功还是失败，都要释放信号量
    semaphore.release();
  }
}
