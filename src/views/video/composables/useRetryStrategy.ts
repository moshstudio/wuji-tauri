import type { VideoUrlMap } from '@wuji-tauri/source-extension';
import type { PlayableVideoMediaType } from '@/utils/videoMediaType';
import {
  canonicalizeVideoType,
  getVideoTypeRetryCandidates,
  shouldFastPathWebviewFallback,
} from '@/utils/videoMediaType';

export type RetryAction =
  | { type: 'switch-media-type'; nextType: PlayableVideoMediaType }
  | { type: 'webview-fallback'; originalUrl: string }
  | { type: 'refetch-url' };

export class RetryStrategy {
  private triedTypes = new Map<string, Set<PlayableVideoMediaType>>();
  private webviewTriedUrls = new Set<string>();

  reset() {
    this.triedTypes.clear();
    this.webviewTriedUrls.clear();
  }

  resetForNewUrl(url: string) {
    this.triedTypes.delete(url);
  }

  markTypeTried(url: string, type: PlayableVideoMediaType) {
    let set = this.triedTypes.get(url);
    if (!set) {
      set = new Set();
      this.triedTypes.set(url, set);
    }
    set.add(type);
  }

  markWebviewTried(url: string) {
    this.webviewTriedUrls.add(url);
    this.triedTypes.delete(url);
  }

  hasWebviewTried(url: string) {
    return this.webviewTriedUrls.has(url);
  }

  /**
   * 根据当前播放 URL 和失败类型，决策下一步重试动作。
   * 返回 null 表示没有更多重试手段。
   */
  decideOnError(src: VideoUrlMap | undefined): RetryAction | null {
    if (!src?.url || src.isLive || src.type === 'rtmp') {
      return null;
    }
    const url = src.url;

    if (shouldFastPathWebviewFallback(url) && !this.webviewTriedUrls.has(url)) {
      return { type: 'webview-fallback', originalUrl: url };
    }

    const currentType = canonicalizeVideoType(src.type);
    if (currentType) {
      this.markTypeTried(url, currentType);
    }

    const tried = this.triedTypes.get(url) ?? new Set();
    const [nextType] = getVideoTypeRetryCandidates(src.type, tried);
    if (nextType) {
      this.markTypeTried(url, nextType);
      return { type: 'switch-media-type', nextType };
    }

    if (!this.webviewTriedUrls.has(url)) {
      return { type: 'webview-fallback', originalUrl: url };
    }

    return null;
  }

  /**
   * URL resolve 成功后，标记已解析类型
   */
  markResolvedType(url: string, type: VideoUrlMap['type']) {
    const canonical = canonicalizeVideoType(type);
    if (canonical) {
      this.markTypeTried(url, canonical);
    }
  }
}
