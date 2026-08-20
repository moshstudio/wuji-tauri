import { closeDialog } from 'vant';

type OverlayBackHandler = () => boolean;

const customHandlers: OverlayBackHandler[] = [];

/** 注册自定义浮层返回处理（后注册优先） */
export function registerOverlayBackHandler(handler: OverlayBackHandler) {
  customHandlers.push(handler);
  return () => {
    const index = customHandlers.indexOf(handler);
    if (index >= 0)
      customHandlers.splice(index, 1);
  };
}

function isVisibleElement(el: HTMLElement) {
  if (typeof el.checkVisibility === 'function') {
    return el.checkVisibility({
      checkOpacity: true,
      checkVisibilityCSS: true,
    });
  }
  const style = window.getComputedStyle(el);
  return style.display !== 'none'
    && style.visibility !== 'hidden'
    && style.opacity !== '0';
}

function getVisiblePopups() {
  // Toast 也是 Popup（role=dialog），但不应拦截返回手势
  return Array.from(
    document.querySelectorAll<HTMLElement>('.van-popup[role="dialog"]'),
  ).filter(el => isVisibleElement(el) && !el.classList.contains('van-toast'));
}

function getVisibleOverlays() {
  return Array.from(document.querySelectorAll<HTMLElement>('.van-overlay'))
    .filter(isVisibleElement);
}

function sortByZIndex(elements: HTMLElement[]) {
  return [...elements].sort((a, b) => {
    const za = Number.parseInt(window.getComputedStyle(a).zIndex, 10) || 0;
    const zb = Number.parseInt(window.getComputedStyle(b).zIndex, 10) || 0;
    return zb - za;
  });
}

function dispatchPopstate() {
  window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
}

function closeTopVantOverlay(): boolean {
  const popups = sortByZIndex(getVisiblePopups());
  if (!popups.length)
    return false;

  const topPopup = popups[0];
  const closeIcon = topPopup.querySelector<HTMLElement>(
    '.van-popup__close-icon, .van-action-sheet__close',
  );
  if (closeIcon) {
    closeIcon.click();
    return true;
  }

  const overlays = sortByZIndex(getVisibleOverlays());
  if (overlays.length) {
    overlays[0].click();
    return true;
  }

  dispatchPopstate();
  return true;
}

function hasOpenVantOverlay() {
  return getVisiblePopups().length > 0
    || document.body.classList.contains('van-overflow-hidden');
}

/**
 * 尝试关闭当前最上层浮层（Dialog / ActionSheet / Popup 及函数式 Dialog）。
 * @returns 是否已消费返回事件（为 true 时不应再执行路由返回）
 */
export function tryDismissOverlay(): boolean {
  for (let i = customHandlers.length - 1; i >= 0; i--) {
    if (customHandlers[i]())
      return true;
  }

  if (!hasOpenVantOverlay())
    return false;

  if (closeTopVantOverlay())
    return true;

  closeDialog();
  return true;
}
