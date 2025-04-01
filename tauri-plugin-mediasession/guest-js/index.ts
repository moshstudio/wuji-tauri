import { invoke } from '@tauri-apps/api/core';
import { MusicItem, Playlist, PlayMode } from './types';
export * from './types';

export async function set_playlist(value: Playlist): Promise<Boolean | null> {
  return await invoke<{ value?: boolean }>('plugin:mediasession|set_playlist', {
    payload: value,
  }).then((r) => (r.value ? r.value : null));
}

export async function update_playlist_order(
  value: Playlist
): Promise<Boolean | null> {
  return await invoke<{ value?: boolean }>(
    'plugin:mediasession|update_playlist_order',
    {
      payload: value,
    }
  ).then((r) => (r.value ? r.value : null));
}

export async function play_target_music(
  value: MusicItem
): Promise<Boolean | null> {
  return await invoke<{ value?: boolean }>(
    'plugin:mediasession|play_target_music',
    {
      payload: value,
    }
  ).then((r) => (r.value ? r.value : null));
}

export async function update_music_item(
  oldItem: MusicItem,
  newItem: MusicItem
): Promise<Boolean | null> {
  return await invoke<{ value?: boolean }>(
    'plugin:mediasession|update_music_item',
    {
      payload: {
        oldItem,
        newItem,
      },
    }
  ).then((r) => (r.value ? r.value : null));
}

export async function play(): Promise<Boolean | null> {
  return await invoke<{ value?: boolean }>('plugin:mediasession|play', {
    payload: {},
  }).then((r) => (r.value ? r.value : null));
}

export async function pause(): Promise<Boolean | null> {
  return await invoke<{ value?: boolean }>('plugin:mediasession|pause', {
    payload: {},
  }).then((r) => (r.value ? r.value : null));
}

export async function stop(): Promise<Boolean | null> {
  return await invoke<{ value?: boolean }>('plugin:mediasession|stop', {
    payload: {},
  }).then((r) => (r.value ? r.value : null));
}

export async function set_volume(value: number): Promise<Boolean | null> {
  return await invoke<{ value?: boolean }>('plugin:mediasession|set_volume', {
    payload: {
      volume: value,
    },
  }).then((r) => (r.value ? r.value : null));
}
export async function seek_to(value: number): Promise<Boolean | null> {
  return await invoke<{ value?: boolean }>('plugin:mediasession|seek_to', {
    payload: {
      milliseconds: value,
    },
  }).then((r) => (r.value ? r.value : null));
}

export async function set_play_mode(playMode: PlayMode): Promise<Boolean | null> {
  return await invoke<{ value?: boolean }>(
    'plugin:mediasession|set_play_mode',
    {
      payload: {
        mode: playMode,
      },
    }
  ).then((r) => (r.value ? r.value : null));
}
