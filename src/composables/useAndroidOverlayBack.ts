import type { Ref } from 'vue';
import { onUnmounted } from 'vue';
import { registerOverlayBackHandler } from '@/utils/overlayBack';

/** 为本地 ref 控制的浮层注册 Android 返回关闭（close-on-popstate 未开启时使用） */
export function useAndroidOverlayBack(
  visible: Ref<boolean>,
  onClose?: () => void,
) {
  const unregister = registerOverlayBackHandler(() => {
    if (!visible.value)
      return false;
    if (onClose)
      onClose();
    else
      visible.value = false;
    return true;
  });

  onUnmounted(unregister);
}
