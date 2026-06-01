import type { VideoUrlMap } from '@wuji-tauri/source-extension';
import type { IBasePluginOptions } from 'xgplayer';
import VideoJs from 'video.js';
import { BasePlugin, Events } from 'xgplayer';
import { toVideoJsMimeType } from '@/utils/videoMediaType';

type VideoSourceType = NonNullable<VideoUrlMap['type']>;

class VideoJsPlugin extends BasePlugin {
  url?: string;
  sourceType?: VideoSourceType;
  videoPlayer?: VideoJs.Player;
  static get pluginName() {
    return 'VideoJsPlugin';
  }

  static get defaultConfig() {
    return {
      videoJsOpts: {},
    };
  }

  constructor(args: IBasePluginOptions) {
    super(args);
  }

  private loadSource(url?: string, type?: VideoSourceType) {
    if (!url)
      return;
    const mimeType = toVideoJsMimeType(type);
    console.log('videojs load url', url, type ? `(type: ${type})` : '');
    if (mimeType) {
      this.videoPlayer?.src({
        src: url,
        type: mimeType,
      });
      return;
    }
    this.videoPlayer?.src(url);
  }

  beforePlayerInit() {
    this.videoPlayer = VideoJs(this.player.video as Element, {
      controlBar: false,
      controls: false,
    });
    this.videoPlayer.crossOrigin('anonymous');
    this.loadSource(this.url, this.sourceType);
  }

  afterPlayerInit() {
    // TODO 播放器调用start初始化播放源之后的逻辑
  }

  afterCreate() {
    // 在afterCreate中可以加入DOM的事件监听
    this.url = this.player.config.url as string;
    this.sourceType = (this.player.config as any).videoType;
    this.on(Events.URL_CHANGE, (url: string) => {
      this.url = url;
      this.sourceType = (this.player.config as { videoType?: VideoSourceType })
        .videoType;
      this.loadSource(this.url, this.sourceType);
    });
  }

  destroy() {
    this.videoPlayer?.src([]);
    this.videoPlayer?.dispose();
    this.videoPlayer = undefined;
  }
}

export default VideoJsPlugin;
