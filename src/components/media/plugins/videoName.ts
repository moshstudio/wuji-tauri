import { IBasePluginOptions, Plugin } from 'xgplayer';

const { POSITIONS } = Plugin;

export default class VideoNamePlugin extends Plugin {
  static get pluginName() {
    return 'videoNamePlugin';
  }

  static get defaultConfig() {
    return {
      position: POSITIONS.ROOT_TOP,
      index: 501,
    };
  }

  constructor(args: IBasePluginOptions & { videoName?: string }) {
    super(args);
  }

  setVideoName(name: string) {
    if (this.root) {
      this.root.textContent = name;
    }
  }

  render() {
    const videoName = this.config.videoName || '';
    return `
    <xg-icon id="video-name" class="flex items-center !w-auto">
      <p style="
        color: #d9d4d4;
        font-size: 14px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex-shrink: 0;
        line-height: 24px;
      ">${videoName}</p>
    </xg-icon>`;
  }
}
