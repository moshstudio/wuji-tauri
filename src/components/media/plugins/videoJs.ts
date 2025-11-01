import { BasePlugin, Events, IBasePluginOptions, Sniffer } from 'xgplayer';
import VideoJs from 'video.js';

class VideoJsPlugin extends BasePlugin {
  url?: string;
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

  beforePlayerInit() {
    this.videoPlayer = VideoJs(this.player.video as Element, {
      controlBar: false,
      controls: false,
    });
    this.videoPlayer.crossOrigin('anonymous');
    if (this.url) {
      console.log('videojs load url', this.url);
      this.videoPlayer.src(this.url);
    }
  }

  afterPlayerInit() {
    // TODO 播放器调用start初始化播放源之后的逻辑
  }

  afterCreate() {
    // 在afterCreate中可以加入DOM的事件监听
    this.url = this.player.config.url as string;
    this.on(Events.URL_CHANGE, (url: string) => {
      console.log('videojs load url', url);
      this.url = url;
      this.videoPlayer?.src(this.url);
    });
  }

  destroy() {
    this.videoPlayer?.src([]);
    this.videoPlayer?.dispose();
    this.videoPlayer = undefined;
  }
}

export default VideoJsPlugin;
