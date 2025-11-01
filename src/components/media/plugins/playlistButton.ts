import { IBasePluginOptions, Plugin } from 'xgplayer';

const { POSITIONS } = Plugin;

export default class PlaylistButtonPlugin extends Plugin {
  btn: HTMLElement | null = null;
  onClick?: () => void;

  static get pluginName() {
    return 'playlistBtn';
  }

  static get defaultConfig() {
    return {
      position: POSITIONS.CONTROLS_RIGHT,
    };
  }

  constructor(args: IBasePluginOptions & { onClick: () => void }) {
    super(args);
    this.onClick = args.config.onClick;
  }

  beforePlayerInit() {
    // TODO 播放器调用start初始化播放源之前的逻辑
  }

  afterPlayerInit() {
    // TODO 播放器调用start初始化播放源之后的逻辑
  }

  afterCreate() {
    this.btn = this.find('#playlist-btn');
    if (this.onClick) {
      this.bind('click', this.onClick);
    }
  }

  destroy() {
    if (this.onClick) {
      this.unbind('click', this.onClick);
    }
    this.btn = null;
  }

  render() {
    return `
    <div id="playlist-btn" class="flex items-center">
      <svg xmlns="http://www.w3.org/2000/svg" width="28px" height="28px" viewBox="0 0 24 24"><path fill="#fff" fill-rule="evenodd" d="M2.25 6A.75.75 0 0 1 3 5.25h18a.75.75 0 0 1 0 1.5H3A.75.75 0 0 1 2.25 6m0 4A.75.75 0 0 1 3 9.25h18a.75.75 0 0 1 0 1.5H3a.75.75 0 0 1-.75-.75m0 4a.75.75 0 0 1 .75-.75h8a.75.75 0 0 1 0 1.5H3a.75.75 0 0 1-.75-.75m0 4a.75.75 0 0 1 .75-.75h8a.75.75 0 0 1 0 1.5H3a.75.75 0 0 1-.75-.75" clip-rule="evenodd"/><path fill="#fff" d="M18.875 14.118c1.654.955 2.48 1.433 2.602 2.121a1.5 1.5 0 0 1 0 .521c-.121.69-.948 1.167-2.602 2.122s-2.48 1.432-3.138 1.193a1.5 1.5 0 0 1-.451-.26c-.536-.45-.536-1.405-.536-3.315s0-2.864.536-3.314c.134-.113.287-.2.451-.26c.657-.24 1.484.238 3.138 1.192"/></svg>
    </div>`;
  }
}
