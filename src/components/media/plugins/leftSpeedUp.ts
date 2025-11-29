import { Plugin } from 'xgplayer';
import { showToast, closeToast } from 'vant';

const { POSITIONS } = Plugin;

export default class LeftSpeedUpPlugin extends Plugin {
  private longPressTimer: number | null = null;
  private isLongPressing = false;
  private originalPlaybackRate = 1;
  private toastInstance: any = null;
  private readonly LONG_PRESS_DURATION = 500; // 长按判定时间（毫秒）

  static get pluginName() {
    return 'leftSpeedUp';
  }

  static get defaultConfig() {
    return {
      position: POSITIONS.ROOT,
      index: 9,
      // 不受控制栏显隐影响
      ignoreInteract: true,
    };
  }

  constructor(args: any) {
    super(args);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.handleTouchCancel = this.handleTouchCancel.bind(this);
    this.handleClick = this.handleClick.bind(this);
  }

  afterCreate() {
    // 绑定触摸事件到根元素（移动端）
    this.bind('touchstart', this.handleTouchStart);
    this.bind('touchend', this.handleTouchEnd);
    this.bind('touchcancel', this.handleTouchCancel);
    // 绑定鼠标事件（桌面端）
    this.bind('mousedown', this.handleTouchStart);
    this.bind('mouseup', this.handleTouchEnd);
    this.bind('mouseleave', this.handleTouchCancel);
    this.bind('click', this.handleClick);
  }

  private handleTouchStart(event: TouchEvent | MouseEvent) {
    // 防止默认行为和事件冒泡
    event.preventDefault();
    event.stopPropagation();

    // 开始长按计时
    this.longPressTimer = window.setTimeout(() => {
      this.startSpeedUp();
    }, this.LONG_PRESS_DURATION);
  }

  private handleTouchEnd(event: TouchEvent | MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    // 清除长按计时器
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    // 如果正在倍速播放，则停止
    if (this.isLongPressing) {
      this.stopSpeedUp();
      // 阻止后续的点击事件
      event.preventDefault();
    }
  }

  private handleTouchCancel(event: TouchEvent | MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    // 清除长按计时器
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    // 如果正在倍速播放，则停止
    if (this.isLongPressing) {
      this.stopSpeedUp();
    }
  }

  private handleClick(event: Event) {
    // 如果是长按后触发的点击，阻止它
    if (this.isLongPressing) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  private startSpeedUp() {
    if (this.isLongPressing) return;

    this.isLongPressing = true;
    this.originalPlaybackRate = this.player.playbackRate || 1;

    // 设置2倍速播放
    this.player.playbackRate = 2;
    this.player.play();

    // 显示持续提示
    this.toastInstance = showToast({
      message: '2倍速播放中',
      duration: 0, // 持续显示
      position: 'top',
      className: 'speed-up-toast',
      teleport: '.xgplayer-container',
    });
  }

  private stopSpeedUp() {
    if (!this.isLongPressing) return;

    this.isLongPressing = false;

    // 恢复原始播放速度
    this.player.playbackRate = this.originalPlaybackRate;

    // 关闭提示
    if (this.toastInstance) {
      closeToast();
      this.toastInstance = null;
    }

    // 延迟重置状态，避免触发点击事件
    setTimeout(() => {
      this.isLongPressing = false;
    }, 100);
  }

  destroy() {
    // 清除定时器
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    // 关闭提示
    if (this.toastInstance) {
      closeToast();
      this.toastInstance = null;
    }

    // 解绑事件
    this.unbind('touchstart', this.handleTouchStart);
    this.unbind('touchend', this.handleTouchEnd);
    this.unbind('touchcancel', this.handleTouchCancel);
    this.unbind('mousedown', this.handleTouchStart);
    this.unbind('mouseup', this.handleTouchEnd);
    this.unbind('mouseleave', this.handleTouchCancel);
    this.unbind('click', this.handleClick);
  }

  render() {
    return `
      <div class="left-speed-up-area" style="
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 38px;
        z-index: 9;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
      "></div>
    `;
  }
}
