import type { Directive, DirectiveBinding } from 'vue';

import { router } from '@/router';

interface TooltipState {
  anchor: HTMLElement;
  binding: DirectiveBinding<string | undefined | null>;
  tip: HTMLElement | null;
  onEnter: () => void;
  onLeave: () => void;
  onReposition: () => void;
}

const stateMap = new WeakMap<HTMLElement, TooltipState>();
const openTooltipStates = new Set<TooltipState>();

let globalListenersAttached = false;

function dismissAllTooltips() {
  for (const state of [...openTooltipStates]) {
    removeTip(state);
  }
}

function onDocumentPointerDown(ev: Event) {
  if (openTooltipStates.size === 0)
    return;
  const target = ev.target;
  if (!(target instanceof Node))
    return;
  for (const state of [...openTooltipStates]) {
    const tip = state.tip;
    if (!tip)
      continue;
    if (state.anchor.contains(target) || tip.contains(target))
      continue;
    removeTip(state);
  }
}

function ensureGlobalDismissHandlers() {
  if (globalListenersAttached)
    return;
  globalListenersAttached = true;
  document.addEventListener('pointerdown', onDocumentPointerDown, true);
  router.afterEach(() => {
    dismissAllTooltips();
  });
}

function textFrom(binding: DirectiveBinding<string | undefined | null>): string {
  const v = binding.value;
  return typeof v === 'string' ? v : '';
}

function removeTip(state: TooltipState) {
  if (state.tip?.parentNode) {
    state.tip.parentNode.removeChild(state.tip);
  }
  state.tip = null;
  openTooltipStates.delete(state);
}

function placeTip(anchor: HTMLElement, tip: HTMLElement) {
  const rect = anchor.getBoundingClientRect();
  tip.style.visibility = 'hidden';
  tip.style.left = '0';
  tip.style.top = '0';
  void tip.offsetWidth;
  const tw = tip.offsetWidth;
  const th = tip.offsetHeight;
  let top = rect.top - th - 8;
  let left = rect.left + rect.width / 2 - tw / 2;
  if (top < 8) {
    top = rect.bottom + 8;
  }
  left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
  tip.style.top = `${top}px`;
  tip.style.left = `${left}px`;
  tip.style.visibility = '';
}

function showTip(anchor: HTMLElement, state: TooltipState) {
  const text = textFrom(state.binding).trim();
  if (!text) {
    removeTip(state);
    return;
  }
  removeTip(state);
  const tip = document.createElement('div');
  tip.className = 'app-native-tooltip';
  tip.setAttribute('role', 'tooltip');
  tip.textContent = text;
  document.body.appendChild(tip);
  state.tip = tip;
  openTooltipStates.add(state);
  requestAnimationFrame(() => placeTip(anchor, tip));
}

export const tooltip: Directive<
  HTMLElement,
  string | undefined | null
> = {
  mounted(el, binding) {
    ensureGlobalDismissHandlers();
    const state: TooltipState = {
      anchor: el,
      binding,
      tip: null,
      onEnter: () => showTip(el, state),
      onLeave: () => removeTip(state),
      onReposition: () => removeTip(state),
    };

    el.addEventListener('mouseenter', state.onEnter);
    el.addEventListener('mouseleave', state.onLeave);
    window.addEventListener('scroll', state.onReposition, true);
    window.addEventListener('resize', state.onReposition);
    stateMap.set(el, state);
  },
  updated(el, binding) {
    const state = stateMap.get(el);
    if (!state)
      return;
    state.binding = binding;
    if (state.tip) {
      const text = textFrom(binding).trim();
      if (!text) {
        removeTip(state);
      }
      else {
        state.tip.textContent = text;
        requestAnimationFrame(() => {
          if (state.tip) {
            placeTip(el, state.tip);
          }
        });
      }
    }
  },
  unmounted(el) {
    const state = stateMap.get(el);
    if (!state)
      return;
    el.removeEventListener('mouseenter', state.onEnter);
    el.removeEventListener('mouseleave', state.onLeave);
    window.removeEventListener('scroll', state.onReposition, true);
    window.removeEventListener('resize', state.onReposition);
    removeTip(state);
    stateMap.delete(el);
  },
};

export default tooltip;
