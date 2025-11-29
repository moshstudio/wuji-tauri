import { Plugin } from 'xgplayer';

const { POSITIONS } = Plugin;

export interface FavoritePluginOptions {
  isFavorited?: boolean;
  onClick?: () => void;
}

export default class FavoriteButtonPlugin extends Plugin {
  private isFavorited: boolean;
  private onClick?: () => void;

  static get pluginName() {
    return 'favoriteButtonPlugin';
  }

  static get defaultConfig() {
    return {
      position: POSITIONS.ROOT_TOP,
      isFavorited: false,
      onClick: null,
      index: 501, // 放在 spacer 之后
    };
  }

  constructor(args: any) {
    super(args);
    this.isFavorited = args.config?.isFavorited || false;
    this.setFavorited(this.isFavorited);
    this.onClick = args.config?.onClick;

    this.onBtnClick = this.onBtnClick.bind(this);
  }

  setFavorited(isFavorited: boolean) {
    this.isFavorited = isFavorited;
    this.updateButtonStyle();
  }

  getFavorited(): boolean {
    return this.isFavorited;
  }

  private updateButtonStyle() {
    if (this.root) {
      const newHTML = this.isFavorited
        ? this.getFavoritedSvg()
        : this.getUnfavoritedSvg();
      this.root.innerHTML = newHTML;
    } else {
      console.error('[FavoriteButton] root 元素不存在');
    }
  }

  private getFavoritedSvg(): string {
    return `
      <xg-icon id="favorite-btn" class="flex items-center !mr-0">
        <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24">
          <path fill="#ff4757" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>    
      </xg-icon>
    `;
  }

  private getUnfavoritedSvg(): string {
    return `
      <xg-icon id="favorite-btn" class="flex items-center !mr-0">
        <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24">
          <path fill="#d9d4d4" d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"/>
        </svg> 
      </xg-icon>
    `;
  }

  onBtnClick() {
    if (this.onClick) {
      this.onClick();
    }
  }

  render() {
    return this.isFavorited ? this.getFavoritedSvg() : this.getUnfavoritedSvg();
  }

  afterCreate() {
    if (this.onClick) {
      this.bind('click', this.onBtnClick);
    }
  }

  destroy() {
    if (this.onClick) {
      this.unbind('click', this.onBtnClick);
    }
  }
}
