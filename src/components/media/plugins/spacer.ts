import { Plugin } from 'xgplayer';

const { POSITIONS } = Plugin;

export default class SpacerPlugin extends Plugin {
  static get pluginName() {
    return 'spacer';
  }

  static get defaultConfig() {
    return {
      position: POSITIONS.ROOT_TOP,
      index: 500, // 放在 BackButton 和 FavoriteButton 之间
    };
  }

  render() {
    return `<div style="flex: 1;"></div>`;
  }
}
