import { IBasePluginOptions, Plugin } from 'xgplayer';

const { POSITIONS } = Plugin;

export default class BackButtonPlugin extends Plugin {
  btn: HTMLElement | null = null;
  onClick?: () => void;

  static get pluginName() {
    return 'backBtn';
  }

  static get defaultConfig() {
    return {
      position: POSITIONS.ROOT_TOP,
      index: 0,
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
    this.btn = this.find('#back-btn');
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
    <xg-icon id="back-btn" class="flex items-center">
      <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 512 512"><path fill="none" stroke="#d9d4d4" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M244 400L100 256l144-144M120 256h292"/></svg>
    </xg-icon>`;
  }
}
