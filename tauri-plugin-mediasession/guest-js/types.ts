export interface PlayMusicItem {
  title: string;
  artist?: string;
  album?: string;
  cover?: string;
}
export interface PlaybackState {
  state: 'playing' | 'paused' | 'stopped';
}

export interface PositionState {
  duration?: number;
  position?: number;
  playbackRate?: number;
}
