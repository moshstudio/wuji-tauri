import type { PluginListener } from '@tauri-apps/api/core';
import type {
  PlaylistInfo,
  SongExtension,
  SongInfo,
} from '@wuji-tauri/source-extension';
import type { SongSource } from '@/types';
import { debounceFilter, useStorageAsync } from '@vueuse/core';
import { joinSongArtists } from '@wuji-tauri/components';
import { fetch } from '@wuji-tauri/fetch';
import { SongPlayMode } from '@wuji-tauri/source-extension';
import _ from 'lodash';
import { defineStore } from 'pinia';
import * as androidMedia from 'tauri-plugin-mediasession-api';
import { showFailToast, showLoadingToast, showToast } from 'vant';
import { onMounted, onUnmounted, ref, triggerRef, watch } from 'vue';
import { setInterval, setTimeout } from 'worker-timers';
import { songUrlToString } from '@/utils';
import { getSongCover } from '@/utils/songCover';
import { useDisplayStore } from './displayStore';
import { useExtensionStore } from './extensionStore';
import { useSongCacheStore } from './songCacheStore';
import { createKVStore, tauriAddPluginListener } from './utils';

export const useSongStore = defineStore('song', () => {
  const displayStore = useDisplayStore();
  const songCacheStore = useSongCacheStore();
  const extensionStore = useExtensionStore();
  const kvStorage = createKVStore();

  const audioRef = ref<HTMLAudioElement>();
  const volumeVisible = ref<boolean>(false); // 设置音量弹窗
  const playlist = useStorageAsync<SongInfo[]>('songPlaylist', []);
  const playingPlaylist = useStorageAsync<SongInfo[]>(
    'songPlayingPlaylist',
    [],
  ); // 当前播放列表
  const audioDuration = ref(0); // 音频总时长
  const audioCurrent = ref(0); // 音频当前播放时间
  const audioVolume = useStorageAsync<number>('songVolume', 1); // 音频声音，范围 0-1
  const isPlaying = ref<boolean>(false); // 音频播放状态：true 播放，false 暂停
  const playMode = useStorageAsync<SongPlayMode>(
    'songPlayMode',
    SongPlayMode.list,
  );
  const playProgress = ref(0); // 音频播放进度

  const playingSong = useStorageAsync<SongInfo>(
    'songPlayingSong',
    null,
    undefined,
    {
      serializer: {
        read: (raw: string) => {
          return JSON.parse(raw);
        },
        write: (value: SongInfo) => {
          return JSON.stringify(value);
        },
      },
    },
  ); // 当前播放

  const songSources = useStorageAsync<SongSource[]>(
    'songSources',
    [],
    kvStorage.storage,
    {
      eventFilter: debounceFilter(1000),
    },
  );

  const now = ref(Date.now());

  // 每秒更新时间戳
  onMounted(() => {
    setInterval(() => {
      now.value = Date.now();
    }, 1000);
  });

  const getSongSource = (sourceId: string): SongSource | undefined => {
    return songSources.value.find(source => source.item.id === sourceId);
  };

  const switchSongSource = async function* (
    song: SongInfo,
  ): AsyncIterableIterator<SongInfo> {
    for (const source of songSources.value) {
      const songName = song.name;
      if (!songName)
        continue;
      const singer = joinSongArtists(song.artists);
      try {
        const sc = (await extensionStore.getSourceClass(
          source.item,
        )) as SongExtension;
        const songList = await sc?.execSearchSongs(songName);
        if (!songList)
          continue;
        for (const s of songList.list) {
          if (s.name === songName && joinSongArtists(s.artists) === singer) {
            // 当前歌曲满足条件
            yield s;
            break;
          }
        }
      }
      catch (error) {
        console.warn('switchSongSource', error);
      }
    }
  };

  const getSongPlayUrl = async (
    song: SongInfo,
    options?: {
      switchSource?: boolean;
      silent?: boolean;
    },
  ): Promise<string | undefined> => {
    let { switchSource, silent } = options || {};
    if (switchSource === undefined) {
      switchSource = displayStore.songAutoSwitchSource;
    }
    const cached_url = !silent ? await songCacheStore.getSong(song) : undefined;
    if (cached_url) {
      console.log(`${song.name}返回缓存的播放地址${cached_url}`);
      return cached_url;
    }
    let src = null;
    let headers = null;
    let t: string | null = null;
    if (!silent) {
      t = displayStore.showToast();
    }
    if (!song.playUrl) {
      const source = getSongSource(song.sourceId);
      if (source) {
        const sc = (await extensionStore.getSourceClass(
          source.item,
        )) as SongExtension;
        const newUrl = await sc?.execGetSongUrl(song);
        if (typeof newUrl === 'string') {
          src = newUrl;
        }
        else if (newUrl instanceof Object) {
          src
            = newUrl['128k']
              || newUrl['128']
              || newUrl['320k']
              || newUrl['320']
              || newUrl.flac
              || '';
          headers = newUrl.headers || null;
          if (headers) {
            song.playHeaders = headers;
          }
          if (newUrl.lyric) {
            song.lyric = newUrl.lyric;
          }
        }
      }
    }
    else {
      if (typeof song.playUrl === 'string') {
        src = song.playUrl;
      }
      else if (song.playUrl instanceof Object) {
        src = songUrlToString(song.playUrl);
        headers = song.playUrl.headers || null;
        if (headers) {
          song.playHeaders = headers;
        }
      }

      if (src && src.startsWith('blob:') && silent) {
        src = null;
      }
    }
    if (!src) {
      // 使用其他源的播放地址
      if (switchSource) {
        let newSrc: string | undefined;
        for await (const s of switchSongSource(song)) {
          if (song.id !== playingSong.value.id) {
            // 切换了歌曲
            return;
          }
          console.log(`${song.name} 使用其他源播放地址`, JSON.stringify(s));
          newSrc = await getSongPlayUrl(s, { switchSource: false, silent });

          if (newSrc) {
            src = newSrc;
            await songCacheStore.replaceSongSrc(song, s);
            break;
          }
        }
      }
    }
    try {
      if (src && !silent) {
        await songCacheStore.saveSongv2(song, src, {
          headers: headers || undefined,
          verify: false,
        });
      }
    }
    catch (error) {
      console.warn(`saveSongv2`, error);
    }
    if (t)
      displayStore.closeToast(t);

    if (silent) {
      console.log(`${song.name}返回远程地址${src}`);
      return src || undefined;
    }

    const ret = await songCacheStore.getSong(song);
    console.log(`${song.name}返回播放地址${ret}`);
    return ret;
  };

  abstract class BaseHelper {
    constructor() {
      audioRef.value = new Audio();
      this.onMounted = this.onMounted.bind(this);
      this.watch = this.watch.bind(this);
      this.setPlaylist = this.setPlaylist.bind(this);
      this.onPlay = this.onPlay.bind(this);
      this.onPause = this.onPause.bind(this);
      this.prevSong = this.prevSong.bind(this);
      this.nextSong = this.nextSong.bind(this);
      this.onSetVolume = this.onSetVolume.bind(this);
      this.seek = this.seek.bind(this);
    }

    onMounted() {
      onMounted(() => {
        if (!audioRef.value)
          return;
        audioRef.value.volume = audioVolume.value;

        audioRef.value.addEventListener('play', () => {
          isPlaying.value = true;
        });
        audioRef.value.addEventListener('pause', () => {
          isPlaying.value = false;
        });
        audioRef.value.addEventListener('loadedmetadata', () => {
          audioDuration.value = audioRef.value!.duration;
        });
        audioRef.value.addEventListener('durationchange', () => {
          audioDuration.value = audioRef.value!.duration;
        });
        audioRef.value.addEventListener('timeupdate', () => {
          audioCurrent.value = audioRef.value!.currentTime;
        });
        audioRef.value.addEventListener('ended', () => {
          if (playMode.value === SongPlayMode.single) {
            this.onPlay();
          }
          else {
            this.nextSong();
          }
        });
      });
    }

    watch() {
      watch(
        playMode,
        (__) => {
          if (playMode.value === SongPlayMode.random) {
            playingPlaylist.value = _.shuffle([...playlist.value]);
          }
          else {
            playingPlaylist.value = [...playlist.value];
          }
        },
        {
          immediate: true,
        },
      );
      watch(
        audioVolume,
        (newValue) => {
          if (!audioRef.value)
            return;
          audioRef.value.volume = newValue;
        },
        {
          immediate: true,
        },
      );
    }

    async setPlaylist(list: SongInfo[], firstSong: SongInfo): Promise<void> {
      if (list !== playlist.value) {
        playlist.value = list;
        if (playMode.value === SongPlayMode.random) {
          playingPlaylist.value = _.shuffle(list);
        }
        else {
          playingPlaylist.value = [...list];
        }
      }

      if (firstSong.id !== playingSong.value?.id) {
        if (audioRef.value) {
          audioRef.value.removeAttribute('src');
          audioRef.value.srcObject = null;
          audioRef.value.currentTime = 0;
        }
        playingSong.value = firstSong;
        audioCurrent.value = 0;
        audioDuration.value = 0;
        isPlaying.value = false;
      }
      await this.onPlay();
    }

    async onPlay() {
      if (!audioRef.value)
        return;
      if (!playingSong.value.picUrl) {
        // 获取封面
        await getSongCover(playingSong.value);
      }
      if (!audioRef.value.src && !audioRef.value.srcObject) {
        // 暂停并重置音频
        audioRef.value.removeAttribute('src');
        audioRef.value.srcObject = null;
        audioRef.value.currentTime = 0;
        audioCurrent.value = 0;
        audioDuration.value = 0;
        isPlaying.value = false;
        const song = _.cloneDeep(playingSong.value);
        const url = await getSongPlayUrl(song);
        if (song.id !== playingSong.value.id) {
          // 切换了歌曲
          return;
        }
        if (!url) {
          showToast(`歌曲 ${song.name} 无法播放`);
          return;
        }
        else {
          audioRef.value.src = url;
          const song = playingSong.value;
          if (!song.lyric) {
            const source = getSongSource(song.sourceId);
            if (source) {
              const sc = (await extensionStore.getSourceClass(
                source?.item,
              )) as SongExtension;
              sc?.execGetLyric(song).then((lyric) => {
                song.lyric = lyric || undefined;
              });
            }
          }
        }
      }
      await audioRef.value.play();
    }

    async onPause(): Promise<void> {
      if (!audioRef.value)
        return;
      audioRef.value.pause();
    }

    async prevSong(): Promise<void> {
      if (!playingPlaylist.value)
        return;
      const index = playingPlaylist.value.findIndex(
        item => item.id === playingSong.value?.id,
      );
      if (index === -1)
        return;
      let prevIndex;
      if (index === 0) {
        prevIndex = playingPlaylist.value.length - 1;
      }
      else {
        prevIndex = index - 1;
      }
      await this.setPlaylist(playlist.value, playingPlaylist.value[prevIndex]);
    }

    async nextSong(): Promise<void> {
      if (!playingPlaylist.value)
        return;
      const index = playingPlaylist.value.findIndex(
        item => item.id === playingSong.value?.id,
      );
      if (index === -1)
        return;
      let nextIndex;
      if (index + 1 === playingPlaylist.value.length) {
        nextIndex = 0;
      }
      else {
        nextIndex = index + 1;
      }
      await this.setPlaylist(playlist.value, playingPlaylist.value[nextIndex]);
    }

    onSetVolume(value: number): Promise<void> | void {
      if (!audioRef.value)
        return;
      audioRef.value.volume = value;
      audioVolume.value = value;
    }

    seek(value: number): Promise<void> | void {
      if (!audioRef.value)
        return;
      audioRef.value.currentTime = value;
    }
  }

  class WinSongHelper extends BaseHelper {
    constructor() {
      super();
    }

    onMounted(): void {
      super.onMounted();
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', () => {
          this.onPlay();
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          this.onPause();
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          this.nextSong();
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          this.prevSong();
        });
        if (playingSong.value) {
          this.setMedisSession(playingSong.value, 'paused');
        }
      }
    }

    async onPlay(): Promise<void> {
      await super.onPlay();
      if (playingSong.value && 'mediaSession' in navigator) {
        this.setMedisSession(playingSong.value, 'playing');
      }
    }

    async onPause(): Promise<void> {
      await super.onPause();
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    }

    setMedisSession = async (
      song: SongInfo,
      playbackState?: MediaSessionPlaybackState,
    ) => {
      try {
        const artwork = [];
        if (song.picUrl) {
          if (song.picHeaders) {
            const response = await fetch(song.picUrl, {
              headers: song.picHeaders,
              verify: false,
            });
            const blob = new Blob([await response.blob()], {
              type: 'image/png',
            });

            const b64: string = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64String = reader.result as string;
                resolve(base64String);
              };
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            artwork.push({
              src: b64,
              type: 'image/png',
            });
          }
          else {
            artwork.push({
              src: song.picUrl,
            });
          }
        }
        const metaData = new MediaMetadata({
          title: song.name,
          artist: joinSongArtists(song.artists),
          artwork,
        });
        navigator.mediaSession.metadata = metaData;
        if (playbackState) {
          navigator.mediaSession.playbackState = playbackState;
        }
      }
      catch (error) {
        console.warn('setMediaSession', error);
      }
    };
  }

  class AndroidSongHelper extends BaseHelper {
    constructor() {
      super();
    }

    androidPlugins: PluginListener[] = [];
    onMounted() {
      onMounted(async () => {
        tauriAddPluginListener('mediasession', 'play', async (_: any) => {
          await this.onPlay();
        }).then((listener) => {
          this.androidPlugins.push(listener);
        });
        tauriAddPluginListener('mediasession', 'pause', async (_: any) => {
          await this.onPause();
        }).then((listener) => {
          this.androidPlugins.push(listener);
        });

        tauriAddPluginListener(
          'mediasession',
          'seekto',
          async (payload: any) => {
            let newPosition = payload.value;
            if (newPosition !== null && newPosition !== undefined) {
              newPosition = Number(newPosition) / 1000;
              if (audioRef.value && audioDuration.value >= newPosition) {
                audioRef.value.currentTime = newPosition;
              }
            }
          },
        ).then((listener) => {
          this.androidPlugins.push(listener);
        });
        tauriAddPluginListener(
          'mediasession',
          'seekbackward',
          async (_: any) => {
            audioRef.value!.currentTime = Math.max(
              0,
              audioRef.value!.currentTime - 30,
            );
          },
        ).then((listener) => {
          this.androidPlugins.push(listener);
        });
        tauriAddPluginListener(
          'mediasession',
          'seekforward',
          async (_: any) => {
            audioRef.value!.currentTime = Math.min(
              audioRef.value!.duration,
              audioRef.value!.currentTime + 30,
            );
          },
        ).then((listener) => {
          this.androidPlugins.push(listener);
        });
        tauriAddPluginListener(
          'mediasession',
          'previoustrack',
          async (_: any) => {
            await this.prevSong();
          },
        ).then((listener) => {
          this.androidPlugins.push(listener);
        });
        tauriAddPluginListener('mediasession', 'nexttrack', async (_: any) => {
          await this.nextSong();
        }).then((listener) => {
          this.androidPlugins.push(listener);
        });
        tauriAddPluginListener('mediasession', 'stop', async (_: any) => {
          await this.onPause();
        }).then((listener) => {
          this.androidPlugins.push(listener);
        });

        setTimeout(() => {
          if (playingSong.value) {
            androidMedia.setMetedata({
              title: playingSong.value.name || '未知歌曲',
              artist: joinSongArtists(playingSong.value.artists),
              album: playingSong.value.album?.name,
              cover: playingSong.value.picUrl,
            });
          }
        }, 1000);
        if (!audioRef.value)
          return;
        audioRef.value.addEventListener('play', () => {
          androidMedia.setPlaybackState({
            state: 'playing',
          });
        });
        audioRef.value.addEventListener('pause', () => {
          androidMedia.setPlaybackState({
            state: 'paused',
          });
        });
        audioRef.value.addEventListener('durationchange', () => {
          androidMedia.setPositionState({
            duration: audioRef.value!.duration,
            position: audioRef.value!.currentTime,
          });
        });
        audioRef.value.addEventListener('timeupdate', () => {
          if (
            Math.ceil(audioCurrent.value)
            !== Math.ceil(audioRef.value!.currentTime)
          ) {
            androidMedia.setPositionState({
              duration: audioRef.value!.duration,
              position: audioRef.value!.currentTime,
            });
          }
        });
      });
      super.onMounted();

      onUnmounted(() => {
        for (const plugin of this.androidPlugins) {
          plugin.unregister();
        }
        this.androidPlugins.length = 0;
      });
    }

    watch() {
      super.watch();
      watch(
        playMode,
        (__) => {
          // 通知栏更新
        },
        {
          immediate: true,
        },
      );
    }

    async setPlaylist(list: SongInfo[], firstSong: SongInfo): Promise<void> {
      await androidMedia.setPlaybackState({
        state: 'paused',
      });
      await super.setPlaylist(list, firstSong);
    }

    async onPlay() {
      if (playingSong.value) {
        await androidMedia.setMetedata({
          title: playingSong.value.name || '未知歌曲',
          artist: joinSongArtists(playingSong.value.artists),
          album: playingSong.value.album?.name,
        });
      }

      await super.onPlay();
      if (playingSong.value) {
        await androidMedia.setMetedata({
          title: playingSong.value.name || '未知歌曲',
          artist: joinSongArtists(playingSong.value.artists),
          album: playingSong.value.album?.name,
          cover: await songCacheStore.getCover(playingSong.value),
        });
      }
    }
  }

  let helper: BaseHelper;
  if (displayStore.isAndroid) {
    helper = new AndroidSongHelper();
  }
  else {
    helper = new WinSongHelper();
  }

  helper.onMounted();
  helper.watch();

  const songRecommendPlayist = async (
    source: SongSource,
    pageNo: number = 1,
  ) => {
    const sc = (await extensionStore.getSourceClass(
      source.item,
    )) as SongExtension;
    const res = await sc?.execGetRecommendPlaylists(pageNo);
    if (res) {
      source.playlist = res;
    }
    else {
      source.playlist = undefined;
    }
    triggerRef(songSources);
  };

  const songPlaylistDetail = async (
    source: SongSource,
    item: PlaylistInfo,
    pageNo: number = 1,
    options?: { silent?: boolean },
  ) => {
    const { silent } = options || {};
    let toast: any;
    if (!silent) {
      toast = showLoadingToast({
        message: '加载中',
        duration: 0,
        closeOnClick: true,
        closeOnClickOverlay: false,
      });
    }

    const sc = (await extensionStore.getSourceClass(
      source.item,
    )) as SongExtension;
    const res = await sc?.execGetPlaylistDetail(item, pageNo);
    toast?.close();
    if (res) {
      return res;
    }
    else {
      if (!silent)
        showFailToast(`${source.item.name} 获取内容失败`);
      return null;
    }
  };

  const songPlaylistPlayAll = async (item: PlaylistInfo) => {
    const source = getSongSource(item.sourceId);
    if (!source) {
      showFailToast(`获取内容失败`);
      return;
    }
    const songs: SongInfo[] = [];
    let pageNo = 1;
    while (true) {
      const sc = (await extensionStore.getSourceClass(
        source.item,
      )) as SongExtension;
      const res = await sc?.execGetPlaylistDetail(
        _.cloneDeep(item), // 不修改原对象
        pageNo,
      );

      if (res && res.list?.list) {
        songs.push(...res.list.list);
        pageNo += 1;
        const totalPage = res.totalPage || res.list.totalPage;
        if (!totalPage || pageNo > totalPage) {
          break;
        }
      }
      else {
        break;
      }
    }
    if (!songs) {
      showFailToast(`内容为空`);
    }
    else {
      await helper.setPlaylist(songs, songs[0]);
    }
  };

  const songRecommendSong = async (source: SongSource, pageNo: number = 1) => {
    const sc = (await extensionStore.getSourceClass(
      source.item,
    )) as SongExtension;
    const res = await sc?.execGetRecommendSongs(pageNo);
    if (res) {
      source.songList = res;
    }
    else {
      source.songList = undefined;
    }
    triggerRef(songSources);
  };

  const songSearchSong = async (
    source: SongSource,
    keyword: string,
    pageNo: number = 1,
  ) => {
    const sc = (await extensionStore.getSourceClass(
      source.item,
    )) as SongExtension;
    const res = await sc?.execSearchSongs(keyword, pageNo);
    if (res) {
      source.songList = res;
    }
    else {
      source.songList = undefined;
    }
    triggerRef(songSources);
  };

  const songSearchPlaylist = async (
    source: SongSource,
    keyword: string,
    pageNo: number = 1,
  ) => {
    const sc = (await extensionStore.getSourceClass(
      source.item,
    )) as SongExtension;
    const res = await sc?.execSearchPlaylists(keyword, pageNo);
    if (res) {
      source.playlist = res;
    }
    else {
      source.playlist = undefined;
    }
    triggerRef(songSources);
  };

  const getPlaylistInfo = (
    source: SongSource,
    playlistId: string,
  ): PlaylistInfo | undefined => {
    return source.playlist?.list.find(
      (item: PlaylistInfo) => item.id === playlistId,
    );
  };

  return {
    volumeVisible,
    playlist,
    playingPlaylist,
    playingSong,
    audioDuration,
    audioCurrent,
    audioVolume,
    isPlaying,
    playMode,
    playProgress,
    onPlay: helper.onPlay,
    onPause: helper.onPause,
    nextSong: helper.nextSong,
    prevSong: helper.prevSong,
    onSetVolume: helper.onSetVolume,
    setPlayingList: helper.setPlaylist,
    seek: helper.seek,
    songSources,
    songRecommendPlayist,
    songPlaylistDetail,
    songPlaylistPlayAll,
    songRecommendSong,
    songSearchSong,
    songSearchPlaylist,
    getPlaylistInfo,
    getSongSource,
    getSongPlayUrl,
  };
});
