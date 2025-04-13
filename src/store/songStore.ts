import type { SongExtension, SongInfo } from "@/extensions/song";

import type { PluginListener } from "@tauri-apps/api/core";
import { SongPlayMode } from "@/types/song";
import { joinSongArtists, songUrlToString } from "@/utils";
import { fetch } from "@/utils/fetch";
import { getSongCover } from "@/utils/songCover";
import { useStorageAsync } from "@vueuse/core";
import _ from "lodash";
import { defineStore } from "pinia";
import * as androidMedia from "tauri-plugin-mediasession-api";
import { showNotify, showToast } from "vant";
import { onMounted, onUnmounted, ref, watch } from "vue";
import { setTimeout } from "worker-timers";
import { useDisplayStore } from "./displayStore";
import { useSongCacheStore } from "./songCacheStore";
import { useStore } from "./store";

import { tauriAddPluginListener } from "./utils";

export const useSongStore = defineStore("song", () => {
  const displayStore = useDisplayStore();
  const songCacheStore = useSongCacheStore();

  const audioRef = ref<HTMLAudioElement>();
  const volumeVisible = ref<boolean>(false); // 设置音量弹窗
  const playlist = useStorageAsync<SongInfo[]>("songPlaylist", []);
  const playingPlaylist = useStorageAsync<SongInfo[]>(
    "songPlayingPlaylist",
    []
  ); // 当前播放列表
  const audioDuration = ref(0); // 音频总时长
  const audioCurrent = ref(0); // 音频当前播放时间
  const audioVolume = useStorageAsync<number>("songVolume", 1); // 音频声音，范围 0-1
  const isPlaying = ref<boolean>(false); // 音频播放状态：true 播放，false 暂停
  const playMode = useStorageAsync<SongPlayMode>(
    "songPlayMode",
    SongPlayMode.list
  );
  const playProgress = ref(0); // 音频播放进度

  const playingSong = useStorageAsync<SongInfo>(
    "songPlayingSong",
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
    }
  ); // 当前播放

  const switchSongSource = async function* (
    song: SongInfo
  ): AsyncIterableIterator<SongInfo> {
    const store = useStore();
    for (const source of store.songSources) {
      const songName = song.name;
      if (!songName) continue;
      const singer = joinSongArtists(song.artists);
      try {
        const sc = (await store.sourceClass(source.item)) as SongExtension;
        const songList = await sc?.execSearchSongs(songName);
        if (!songList) continue;
        for (const s of songList.list) {
          if (s.name === songName && joinSongArtists(s.artists) === singer) {
            // 当前歌曲满足条件
            yield s;
            break;
          }
        }
      } catch (error) {
        console.warn("switchSongSource", error);
      }
    }
  };

  const getSongPlayUrl = async (
    song: SongInfo,
    switchSource: boolean = true
  ): Promise<string | undefined> => {
    // 返回有两种类型
    // 1. blobUrl, 前端(win)使用
    // 2. filePath, 安卓段使用
    const cached_url = await songCacheStore.getSong(song);
    if (cached_url) {
      console.log(`${song.name}返回缓存的播放地址${cached_url}`);
      return cached_url;
    }
    let src = null;
    let headers = null;
    let t: string | null = null;
    t = displayStore.showToast();
    if (!song.playUrl) {
      const store = useStore();
      const source = store.getSongSource(song.sourceId);
      // if (!source) {
      //   showToast(`${song.name} 所属源不存在或未启用`);
      //   return;
      // }
      if (source) {
        const sc = (await store.sourceClass(source.item)) as SongExtension;

        const newUrl = await sc?.execGetSongUrl(song);
        if (typeof newUrl === "string") {
          src = newUrl;
        } else if (newUrl instanceof Object) {
          src = newUrl["128k"] || newUrl["320k"] || newUrl.flac || "";
          headers = newUrl.headers || null;
          if (newUrl.lyric) {
            song.lyric = newUrl.lyric;
          }
        }
      }
    } else {
      if (typeof song.playUrl === "string") {
        src = song.playUrl;
      } else if (song.playUrl instanceof Object) {
        src = songUrlToString(song.playUrl);
        headers = song.playUrl.headers || null;
      }
    }
    if (!src) {
      // 使用其他源的播放地址
      if (switchSource) {
        let newSrc: string | undefined;
        for await (const s of switchSongSource(song)) {
          console.log(`${song.name} 使用其他源播放地址`, JSON.stringify(s));
          newSrc = await getSongPlayUrl(s, false);

          if (newSrc) {
            await songCacheStore.replaceSongSrc(song, s);
            break;
          }
        }
        if (!newSrc) {
          showNotify(`歌曲 ${song.name} 无法播放`);
        }
      }
    }
    try {
      if (src) {
        await songCacheStore.saveSongv2(song, src, {
          headers: headers || undefined,
          verify: false,
        });
      }
    } catch (error) {
      console.warn(`saveSongv2`, error);
    }
    if (t) displayStore.closeToast(t);

    const ret = await songCacheStore.getSong(song);
    console.log(`${song.name}返回播放地址${ret}`);
    return ret;
  };
  abstract class BaseHelper {
    constructor() {
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
    abstract onMounted(): Promise<void> | void;
    abstract watch(): Promise<void> | void;
    abstract setPlaylist(
      list: SongInfo[],
      firstSong: SongInfo
    ): Promise<void> | void;
    abstract onPlay(): Promise<void> | void;
    abstract onPause(): Promise<void> | void;
    abstract prevSong(): Promise<void> | void;
    abstract nextSong(): Promise<void> | void;
    abstract onSetVolume(value: number): Promise<void> | void;
    abstract seek(value: number): Promise<void> | void;
  }

  class WinSongHelper extends BaseHelper {
    constructor() {
      super();
    }

    onMounted() {
      onMounted(() => {
        audioRef.value = document.createElement("audio");
        audioRef.value.style.width = "0px";
        audioRef.value.style.height = "0px";
        document.body.appendChild(audioRef.value);
        audioRef.value.volume = audioVolume.value;

        // audioRef.value.oncanplay = () => {
        //   onPlay();
        // };
        audioRef.value.onplay = () => {
          isPlaying.value = true;
        };
        audioRef.value.onpause = () => {
          isPlaying.value = false;
        };
        audioRef.value.onloadedmetadata = () => {
          audioDuration.value = audioRef.value!.duration;
        };
        audioRef.value.ondurationchange = () => {
          audioDuration.value = audioRef.value!.duration;
        };
        audioRef.value.ontimeupdate = () => {
          audioCurrent.value = audioRef.value!.currentTime;
        };
        audioRef.value.onended = () => {
          if (playMode.value === SongPlayMode.single) {
            this.onPlay();
          } else {
            this.nextSong();
          }
        };
        if ("mediaSession" in navigator) {
          navigator.mediaSession.setActionHandler("play", () => {
            this.onPlay();
          });
          navigator.mediaSession.setActionHandler("pause", () => {
            this.onPause();
          });
          navigator.mediaSession.setActionHandler("nexttrack", () => {
            this.nextSong();
          });
          navigator.mediaSession.setActionHandler("previoustrack", () => {
            this.prevSong();
          });
          if (playingSong.value) {
            this.setMedisSession(playingSong.value, "paused");
          }
        }
      });
    }

    watch() {
      watch(
        playMode,
        (__) => {
          // 播放模式变化时，重置播放列表索引
          if (playMode.value === SongPlayMode.random) {
            playingPlaylist.value = _.shuffle([...playlist.value]);
          } else {
            playingPlaylist.value = [...playlist.value];
          }
        },
        {
          immediate: true,
        }
      );
      watch(
        audioVolume,
        (newValue) => {
          if (!audioRef.value) return;
          audioRef.value.volume = newValue;
        },
        {
          immediate: true,
        }
      );
    }

    async setPlaylist(list: SongInfo[], firstSong: SongInfo): Promise<void> {
      if (list !== playlist.value) {
        playlist.value = list;
        if (playMode.value === SongPlayMode.random) {
          playingPlaylist.value = _.shuffle(list);
        } else {
          playingPlaylist.value = [...list];
        }
      }

      if (firstSong.id !== playingSong.value?.id) {
        if (audioRef.value) {
          // audioRef.value.pause();
          audioRef.value.removeAttribute("src");
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
      if (!audioRef.value) return;
      if (!playingSong.value.picUrl) {
        // 获取封面
        getSongCover(playingSong.value);
      }
      if (!audioRef.value.src && !audioRef.value.srcObject) {
        // 暂停并重置音频
        audioRef.value.removeAttribute("src");
        audioRef.value.srcObject = null;
        audioRef.value.currentTime = 0;
        audioCurrent.value = 0;
        audioDuration.value = 0;
        isPlaying.value = false;
        const url = await getSongPlayUrl(playingSong.value);

        if (!url) {
          showToast("歌曲无法播放");
          return;
        } else {
          audioRef.value.src = url;
          const song = playingSong.value;
          if (!song.lyric) {
            const store = useStore();
            const source = store.getSongSource(song.sourceId);
            if (source) {
              const sc = (await store.sourceClass(
                source?.item
              )) as SongExtension;
              sc?.execGetLyric(song).then((lyric) => {
                song.lyric = lyric || undefined;
              });
            }
          }
        }
      }
      await audioRef.value.play();
      if (playingSong.value && "mediaSession" in navigator) {
        this.setMedisSession(playingSong.value, "playing");
      }
    }

    onPause(): Promise<void> | void {
      if (!audioRef.value) return;
      audioRef.value.pause();
      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "paused";
      }
    }

    async prevSong(): Promise<void> {
      if (!playingPlaylist.value) return;
      const index = playingPlaylist.value.findIndex(
        (item) => item.id === playingSong.value?.id
      );
      if (index === -1) return;
      let prevIndex;
      if (index === 0) {
        prevIndex = playingPlaylist.value.length - 1;
      } else {
        prevIndex = index - 1;
      }
      await this.setPlaylist(playlist.value, playingPlaylist.value[prevIndex]);
    }

    async nextSong(): Promise<void> {
      if (!playingPlaylist.value) return;
      const index = playingPlaylist.value.findIndex(
        (item) => item.id === playingSong.value?.id
      );
      if (index === -1) return;
      let nextIndex;
      if (index + 1 === playingPlaylist.value.length) {
        nextIndex = 0;
      } else {
        nextIndex = index + 1;
      }
      await this.setPlaylist(playlist.value, playingPlaylist.value[nextIndex]);
    }

    onSetVolume(value: number): Promise<void> | void {
      if (!audioRef.value) return;
      audioRef.value.volume = value;
      audioVolume.value = value;
    }

    seek(value: number): Promise<void> | void {
      if (!audioRef.value) return;
      audioRef.value.currentTime = value;
    }

    setMedisSession = async (
      song: SongInfo,
      playbackState?: MediaSessionPlaybackState
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
              type: "image/png",
            });

            const b64: string = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                // reader.result 是一个包含 Base64 编码的字符串
                const base64String = reader.result as string;
                resolve(base64String);
              };
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            artwork.push({
              src: b64,
              type: "image/png",
            });
          } else {
            artwork.push({
              src: song.picUrl,
            });
          }
        }
        const metaData = new MediaMetadata({
          // 媒体标题
          title: song.name,
          // 媒体类型
          artist: joinSongArtists(song.artists),
          // 媒体封面
          artwork,
        });
        // 设置媒体元数据
        navigator.mediaSession.metadata = metaData;
        if (playbackState) {
          navigator.mediaSession.playbackState = playbackState;
        }
      } catch (error) {
        console.warn("setMediaSession", error);
      }
    };
  }
  class AndroidSongHelper extends BaseHelper {
    constructor() {
      super();
    }

    androidPlugins: PluginListener[] = [];
    getUrlPlugin: PluginListener | undefined = undefined;
    getUrlTasks: androidMedia.MusicItem[] = [];
    onMounted() {
      onMounted(async () => {
        tauriAddPluginListener(
          "mediasession",
          "getUrl",
          async (payload: any) => {
            // 将要播放的歌曲获取url
            const musicItem: androidMedia.MusicItem = JSON.parse(payload.value);
            let song: SongInfo = JSON.parse(musicItem.extra as string);
            if (playingSong.value && playingSong.value.id === song.id) {
              song = playingSong.value;
            }
            if (!playingSong.value.picUrl) {
              // 获取封面
              await getSongCover(song);
            }
            musicItem.iconUri = song.picUrl;
            const newItem = _.cloneDeep(musicItem);
            const url = await getSongPlayUrl(song);
            if (url) {
              newItem.uri = url;
            } else {
              showToast(`${song.name} 播放地址失败`);
            }
            const coverUrl = await songCacheStore.getCover(song);

            if (coverUrl) {
              newItem.iconUri = coverUrl;
            }
            await androidMedia.update_music_item(musicItem, newItem);
          }
        ).then((listener) => {
          this.androidPlugins.push(listener);
        });
        tauriAddPluginListener("mediasession", "play", async (_: any) => {
          isPlaying.value = true;
        }).then((listener) => {
          this.androidPlugins.push(listener);
        });
        tauriAddPluginListener(
          "mediasession",
          "progress",
          async (payload: any) => {
            const progress = Number(payload.progress);
            const duration = Number(payload.duration);
            audioDuration.value = duration;
            audioCurrent.value = progress;
          }
        ).then((listener) => {
          this.androidPlugins.push(listener);
        });
        tauriAddPluginListener("mediasession", "pause", async (_: any) => {
          isPlaying.value = false;
        }).then((listener) => {
          this.androidPlugins.push(listener);
        });
        tauriAddPluginListener("mediasession", "stop", async (_: any) => {
          isPlaying.value = false;
        }).then((listener) => {
          this.androidPlugins.push(listener);
        });

        tauriAddPluginListener(
          "mediasession",
          "playingMusicItemChanged",
          async (payload: any) => {
            const item = payload.musicItem;
            if (item) {
              const musicItem: androidMedia.MusicItem = JSON.parse(
                payload.musicItem
              );
              playingSong.value = playingPlaylist.value.find(
                (item) => item.id === musicItem.id
              );
            }
          }
        ).then((listener) => {
          this.androidPlugins.push(listener);
        });
        tauriAddPluginListener(
          "mediasession",
          "volumeChanged",
          async (payload: any) => {
            audioVolume.value = Math.min(Number(payload.volume), 100);
          }
        ).then((listener) => {
          this.androidPlugins.push(listener);
        });
        tauriAddPluginListener(
          "mediasession",
          "seekComplete",
          async (payload: any) => {
            const progress = Number(payload.progress);
            // const updateTime = Number(payload.updateTime);
            audioCurrent.value = progress;
          }
        );
        setTimeout(() => {
          // playlist初始同步
          if (playingPlaylist.value.length) {
            // android播放列表初始化
            androidMedia.set_playlist(
              this.playlistToAndroidMusics(
                playingPlaylist.value,
                Math.max(
                  playingPlaylist.value.findIndex(
                    (s) => s.id === playingSong.value.id
                  ),
                  0
                ),
                false
              )
            );
          }
        }, 1000);
      });

      onUnmounted(() => {
        for (const plugin of this.androidPlugins) {
          plugin.unregister();
        }
        this.androidPlugins.length = 0;
      });
    }

    watch() {
      watch(
        playMode,
        (newMode, oldMode) => {
          // 播放模式变化时，重置播放列表索引
          switch (oldMode) {
            case SongPlayMode.single:
              switch (newMode) {
                case SongPlayMode.list:
                  androidMedia.set_play_mode(
                    androidMedia.PlayMode.playlistLoop
                  );
                  break;
                case SongPlayMode.random:
                  playingPlaylist.value = _.shuffle(playlist.value);
                  androidMedia.update_playlist_order(
                    this.playlistToAndroidMusics(playingPlaylist.value)
                  );
                  androidMedia.set_play_mode(
                    androidMedia.PlayMode.playlistLoop
                  );
                  break;
                case SongPlayMode.single:
                  break;
              }
              break;
            case SongPlayMode.list:
              switch (newMode) {
                case SongPlayMode.list:
                  break;
                case SongPlayMode.random:
                  playingPlaylist.value = _.shuffle(playlist.value);
                  androidMedia.update_playlist_order(
                    this.playlistToAndroidMusics(playingPlaylist.value)
                  );
                  break;
                case SongPlayMode.single:
                  androidMedia.set_play_mode(androidMedia.PlayMode.loop);
                  break;
              }
              break;
            case SongPlayMode.random:
              switch (newMode) {
                case SongPlayMode.list:
                  playingPlaylist.value = [...playlist.value];
                  androidMedia.update_playlist_order(
                    this.playlistToAndroidMusics(playingPlaylist.value)
                  );
                  break;
                case SongPlayMode.random:
                  break;
                case SongPlayMode.single:
                  androidMedia.set_play_mode(androidMedia.PlayMode.loop);
                  break;
              }
              break;
            case undefined:
              switch (newMode) {
                case SongPlayMode.list:
                  androidMedia.update_playlist_order(
                    this.playlistToAndroidMusics(playingPlaylist.value)
                  );
                  break;
                case SongPlayMode.random:
                  androidMedia.update_playlist_order(
                    this.playlistToAndroidMusics(playingPlaylist.value)
                  );
                  break;
                case SongPlayMode.single:
                  playingPlaylist.value = [playingSong.value];
                  androidMedia.update_playlist_order(
                    this.playlistToAndroidMusics(playingPlaylist.value)
                  );
                  androidMedia.set_play_mode(androidMedia.PlayMode.loop);
                  break;
              }
              break;
          }
        },
        {
          immediate: true,
        }
      );
    }

    async setPlaylist(list: SongInfo[], firstSong: SongInfo): Promise<void> {
      try {
        if (!list.length) {
          showNotify("播放列表为空");
          return;
        }
        firstSong ||= list[0];
        if (list !== playlist.value) {
          // 新的播放列表
          playlist.value = list;
          if (playMode.value === SongPlayMode.random) {
            playingPlaylist.value = _.shuffle(list);
          } else {
            playingPlaylist.value = [...list];
          }
          let index = playingPlaylist.value.findIndex(
            (item) => item.id === firstSong?.id
          );
          if (index === -1) index = 0;
          const res = await androidMedia.set_playlist(
            this.playlistToAndroidMusics(playingPlaylist.value, index)
          );
          if (!res) {
            showNotify("播放列表设置失败");
            return;
          }
        } else {
          // 当前播放列表切换歌曲
          androidMedia.play_target_music(this.musicToAndroidMusic(firstSong));
        }
        playingSong.value = firstSong;
        audioCurrent.value = 0;
        audioDuration.value = 0;
        isPlaying.value = false;
      } catch (error) {
        console.log(String(error));
      }
    }

    musicToAndroidMusic(song: SongInfo): androidMedia.MusicItem {
      return {
        id: song.id,
        title: song.name || "未知歌曲",
        artist: joinSongArtists(song.artists),
        album: song.album?.name,
        duration: song.duration,
        uri: songUrlToString(song.playUrl),
        iconUri: song.picUrl,
        extra: JSON.stringify(song),
      };
    }

    playlistToAndroidMusics(
      songs: SongInfo[],
      position?: number,
      playImmediately?: boolean
    ): androidMedia.Playlist {
      return {
        name: "播放列表",
        musics: songs
          .filter((item) => item !== undefined && item != null)
          .map((item) => this.musicToAndroidMusic(item)),
        position,
        playImmediately,
      };
    }

    async cache_playlist(songs: SongInfo[]) {
      await Promise.all(
        songs.map(async (song) => {
          await getSongPlayUrl(song);
        })
      );
    }

    async onPlay(): Promise<void> {
      await androidMedia.play();
    }

    async onPause(): Promise<void> {
      await androidMedia.pause();
    }

    async prevSong(): Promise<void> {
      const currIndex = playingPlaylist.value.findIndex(
        (item) => item.id === playingSong.value.id
      );
      let prevIndex = 0;
      if (!playingPlaylist.value.length) return;
      if (currIndex !== -1) {
        if (currIndex === 0) {
          prevIndex = playingPlaylist.value.length - 1;
        } else {
          prevIndex = currIndex - 1;
        }
      }
      playingSong.value = playingPlaylist.value[prevIndex];
      await androidMedia.play_target_music(
        this.musicToAndroidMusic(playingSong.value)
      );
    }

    async nextSong(): Promise<void> {
      const currIndex = playingPlaylist.value.findIndex(
        (item) => item.id === playingSong.value.id
      );
      let nextIndex = 0;
      if (!playingPlaylist.value.length) return;
      if (currIndex !== -1) {
        if (currIndex === playingPlaylist.value.length - 1) {
          nextIndex = 0;
        } else {
          nextIndex = currIndex + 1;
        }
      }
      playingSong.value = playingPlaylist.value[nextIndex];
      await androidMedia.play_target_music(
        this.musicToAndroidMusic(playingSong.value)
      );
    }

    async onSetVolume(value: number): Promise<void> {
      await androidMedia.set_volume(value);
      throw new Error("Method not implemented.");
    }

    async seek(value: number): Promise<void> {
      await androidMedia.seek_to(value * 1000);
    }
  }

  let helper: BaseHelper;
  if (displayStore.isAndroid) {
    helper = new AndroidSongHelper();
  } else {
    helper = new WinSongHelper();
  }

  helper.onMounted();
  helper.watch();

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
  };
});
