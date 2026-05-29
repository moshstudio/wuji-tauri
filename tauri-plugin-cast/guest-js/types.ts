export interface CastDevice {
  id: string;
  name: string;
  address: string;
  isTv: boolean;
}

export interface CastState {
  isConnected: boolean;
  deviceId?: string;
  deviceName?: string;
  playbackState: string;
  positionMs?: number;
  durationMs?: number;
  /** 电视端正在播放中（根据实时进度判断） */
  isPlaying?: boolean;
  /** 电视端进度已到达片尾 */
  hasFinished?: boolean;
}

export type CastControlAction
  = | 'play'
    | 'pause'
    | 'stop'
    | 'seek'
    | 'setVolume'
    | 'mute';

export interface DiscoverDevicesResult {
  devices: CastDevice[];
  lanIp?: string | null;
  error?: string;
}

export interface CastMediaResult {
  success: boolean;
  error?: string;
}
