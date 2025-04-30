import { invoke } from '@tauri-apps/api/core';
import { PlayMusicItem, PlaybackState, PositionState } from './types';
export * from './types';

export async function setMetedata(value: PlayMusicItem): Promise<Boolean | null> {
  return await invoke<{ value?: boolean }>('plugin:mediasession|set_metadata', {
    payload: value,
  }).then((r) => (r.value ? r.value : null));
}

export async function setPlaybackState(
  value: PlaybackState
): Promise<Boolean | null> {
  return await invoke<{ value?: boolean }>(
    'plugin:mediasession|set_playback_state',
    {
      payload: value,
    }
  ).then((r) => (r.value ? r.value : null));
}

export async function setPositionState(
  value: PositionState
): Promise<Boolean | null> {
  return await invoke<{ value?: boolean }>(
    'plugin:mediasession|set_position_state',
    {
      payload: value,
    }
  ).then((r) => (r.value ? r.value : null));
}
