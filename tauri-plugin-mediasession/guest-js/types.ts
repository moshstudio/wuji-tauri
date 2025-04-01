export interface MusicItem {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  duration?: number;
  uri: string;
  forbidSeek?: boolean;
  iconUri?: string;
  extra?: String;
}
export interface Playlist {
  name: string;
  musics: MusicItem[];
  position?: number;
  extra?: String;
  playImmediately?: boolean;
}

export enum PlayMode {
  playlistLoop = 0,
  loop = 1,
  shuffle = 2,
  singleOnce = 3,
}
