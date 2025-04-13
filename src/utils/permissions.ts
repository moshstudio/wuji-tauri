import type { PermissionState } from '@tauri-apps/api/core';
import { invoke } from '@tauri-apps/api/core';

export interface MediaSessionPermissions {
  foregroundService: PermissionState;
  foregroundServiceMediaPlayback: PermissionState;
  wakeLock: PermissionState;
}

export enum MediaSessionPermissionType {
  ForegroundService = 'foregroundService',
  ForegroundServiceMediaPlayback = 'foregroundServiceMediaPlayback',
  WakeLock = 'wakeLock',
}

export async function handlePermissionRequest(type: MediaSessionPermissionType) {
  const permission = await invoke<MediaSessionPermissions>(
    'plugin:mediasession|check_permissions',
  );

  const state = permission[type];

  if (state === 'prompt-with-rationale') {
    // 显示解释信息，告诉用户为什么需要这个权限
    // 例如弹出对话框或提示用户权限的重要性
  }

  if (state.startsWith('prompt')) {
    await invoke<Permissions>('plugin:mediasession|request_permissions', {
      permissions: [type],
    });
    // return checkPermission(type); // 请求后重新检查
  }
}
