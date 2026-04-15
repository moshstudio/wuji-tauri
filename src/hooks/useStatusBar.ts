import type { MaybeRefOrGetter } from 'vue';
import {

  onActivated,
  onDeactivated,
  onUnmounted,
  toValue,
  watch,
} from 'vue';
import { useDisplayStore } from '@/store';

/**
 * 声明式状态栏控制 Hook
 */
export function useStatusBar(
  color?: MaybeRefOrGetter<string | undefined>,
  style?: MaybeRefOrGetter<'light' | 'dark' | undefined>,
) {
  const displayStore = useDisplayStore();
  // 每个 Hook 实例拥有唯一标识，确保只有活跃页面能控制状态栏
  const ownerId = Symbol('StatusBarOwner');

  const sync = () => {
    displayStore.setStatusBar(toValue(color), toValue(style), ownerId);
  };

  const reset = () => {
    displayStore.setStatusBar(undefined, undefined, ownerId);
  };

  watch(
    [() => toValue(color), () => toValue(style)],
    () => {
      sync();
    },
    { immediate: true },
  );

  onActivated(sync);
  onDeactivated(reset);
  onUnmounted(reset);
}
