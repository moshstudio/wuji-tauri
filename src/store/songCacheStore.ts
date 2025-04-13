import type { ArtistInfo, SongInfo } from '@/extensions/song';

import type { ClientOptions } from '@/utils/fetch';

import { sanitizePathName } from '@/utils';
import { fetch } from '@/utils/fetch';
import _ from 'lodash';
import { defineStore } from 'pinia';
import * as fsApi from 'tauri-plugin-fs-api';
import { ref, watch } from 'vue';
import { useDisplayStore } from './displayStore';

export const useSongCacheStore = defineStore('songCacheStore', () => {
  const displayStore = useDisplayStore();
  const baseDir = fsApi.BaseDirectory.AppCache;
  const dirName = 'song_cache';
  const baseFile = 'songs.json';
  const songs = ref<
    {
      song_id: string;
      song_name: string;
      source_id: string;
      update_time: number;
      cache_song_id: string;
    }[]
  >([]);
  let inited = false;
  watch(
    songs,
    _.debounce(async (newValue) => {
      if (!newValue) {
        return;
      }
      if (!inited) {
        await ensureBase();
      }
      await fsApi.writeFile(
        `${dirName}/${baseFile}`,
        new TextEncoder().encode(JSON.stringify(newValue)),
        {
          baseDir,
        },
      );
    }, 500),
    {
      deep: true,
    },
  );

  const ensureBase = async () => {
    if (!(await fsApi.exists(dirName, { baseDir }))) {
      await fsApi.mkdir(dirName, {
        baseDir,
        recursive: true,
      });
    }
    if (
      !(await fsApi.exists(`${dirName}/${baseFile}`, {
        baseDir,
      }))
    ) {
      await fsApi.writeFile(
        `${dirName}/${baseFile}`,
        new TextEncoder().encode('[]'),
        {
          baseDir,
        },
      );
      songs.value = [];
    } else {
      songs.value = JSON.parse(
        new TextDecoder().decode(
          await fsApi.readFile(`${dirName}/${baseFile}`, {
            baseDir,
          }),
        ),
      );
    }
    inited = true;
    if (songs.value.length > 200) {
      // 1. 获取update_time最小的20首歌曲
      const minUpdateTimeSongs = [...songs.value]
        .sort((a, b) => a.update_time - b.update_time)
        .slice(0, 20);
      // 2. 更新books.value
      songs.value = songs.value.filter(
        (song) => !minUpdateTimeSongs.includes(song),
      );
      // 3. 根据cache_song_id删除文件
      for (const song of minUpdateTimeSongs) {
        if (
          await fsApi.exists(`${dirName}/${song.cache_song_id}`, {
            baseDir,
          })
        ) {
          try {
            await fsApi.remove(`${dirName}/${song.cache_song_id}`, {
              baseDir,
              recursive: true,
            });
          } catch (error) {
            console.warn('删除歌曲缓存失败:', JSON.stringify(song));
          }
        }
        const cover_id = songIdToCoverId(song.cache_song_id);
        if (
          await fsApi.exists(`${dirName}/${cover_id}`, {
            baseDir,
          })
        ) {
          try {
            await fsApi.remove(`${dirName}/${cover_id}`, {
              baseDir,
              recursive: true,
            });
          } catch (error) {
            console.warn('删除封面缓存失败:', JSON.stringify(song));
          }
        }
      }
    }
  };
  const genCacheSongId = (song: SongInfo) => {
    let a = '';
    if (song.artists) {
      if (Array.isArray(song.artists)) {
        if (typeof song.artists[0] === 'string') {
          // 处理 string[] 类型
          a = `-${song.artists.join(',')}`;
        } else {
          // 处理 ArtistInfo[] 类型
          a = `-${song.artists
            .map((artist) => (artist as ArtistInfo).name)
            .join(',')}`;
        }
      }
    }
    return `${
      sanitizePathName(song.name || '') + a + sanitizePathName(song.sourceId)
    }.mp3`;
  };
  const songIdToCoverId = (songId: string) => {
    return `${songId}.png`;
  };
  const saveSong = async (
    song: SongInfo,
    url: string,
    force = false,
  ): Promise<boolean> => {
    if (!inited) {
      await ensureBase();
    }
    const cache_song_id = genCacheSongId(song);

    const find = songs.value.find(
      (s) => s.song_id === song.id && s.source_id === song.sourceId,
    );
    if (find && !force) {
      // 已经有了，不需要重复保存
      return true;
    }
    let blob: Blob;
    const t = displayStore.showToast();
    try {
      if (url.startsWith('blob')) {
        blob = await (await window.fetch(url)).blob();
      } else {
        blob = await (await fetch(url)).blob();
      }
      if (blob.size === 0) return false; // 获取失败

      const unit: Uint8Array = await new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          if (reader.result instanceof ArrayBuffer) {
            const arrayBuffer = reader.result;
            const uint8Array = new Uint8Array(arrayBuffer);
            resolve(uint8Array);
          } else {
            reject(new Error('Failed to read blob as ArrayBuffer'));
          }
        };

        reader.onerror = () => {
          reject(reader.error);
        };
        reader.readAsArrayBuffer(blob);
      });
      await fsApi.writeFile(`${dirName}/${cache_song_id}`, unit, {
        baseDir,
      });
      if (!find) {
        songs.value.unshift({
          song_id: song.id,
          song_name: song.name || '',
          source_id: song.sourceId,
          update_time: Date.now(),
          cache_song_id,
        });
      } else {
        find.update_time = Date.now();
      }
    } catch (error) {
      console.warn('saveSong:', error);
    }
    await saveCover(song, cache_song_id);
    displayStore.closeToast(t);
    return true;
  };

  const saveSongv2 = async (
    song: SongInfo,
    url: string,
    options: RequestInit & ClientOptions,
    force = false,
  ) => {
    if (!inited) {
      await ensureBase();
    }
    const cache_song_id = genCacheSongId(song);

    const find = songs.value.find(
      (s) => s.song_id === song.id && s.source_id === song.sourceId,
    );
    if (find && !force) {
      // 已经有了，不需要重复保存
      return true;
    }
    const t = displayStore.showToast();
    try {
      const option = {
        ...options,
        baseDir,
        path: `${dirName}/${cache_song_id}`,
      };
      const ret = await fsApi.fetchAndSave(url, option);
      if (!ret) {
        throw new Error('fetchAndSave 失败');
      }

      if (!find) {
        songs.value.unshift({
          song_id: song.id,
          song_name: song.name || '',
          source_id: song.sourceId,
          update_time: Date.now(),
          cache_song_id,
        });
      } else {
        find.update_time = Date.now();
      }
    } catch (error) {
      console.warn('saveSongv2:', error);
    }
    await saveCover(song, cache_song_id);
    displayStore.closeToast(t);
    return true;
  };

  const replaceSongSrc = async (song: SongInfo, goodSong: SongInfo) => {
    // 使用goodSong的播放地址覆盖song的播放地址
    if (!inited) {
      await ensureBase();
    }
    const find = songs.value.find(
      (s) => s.song_id === song.id && s.source_id === song.sourceId,
    );

    const cache_song_id = genCacheSongId(song);
    const good_cache_song_id = genCacheSongId(goodSong);
    await fsApi.copyFile(
      `${dirName}/${good_cache_song_id}`,
      `${dirName}/${cache_song_id}`,
      {
        fromPathBaseDir: baseDir,
        toPathBaseDir: baseDir,
      },
    );
    if (!find) {
      songs.value.unshift({
        song_id: song.id,
        song_name: song.name || '',
        source_id: song.sourceId,
        update_time: Date.now(),
        cache_song_id,
      });
    } else {
      find.update_time = Date.now();
    }
  };

  const saveCover = async (song: SongInfo, cache_song_id: string) => {
    if (!inited) {
      await ensureBase();
    }
    const cover_id = songIdToCoverId(cache_song_id);
    if (await fsApi.exists(`${dirName}/${cover_id}`, { baseDir })) {
      if ((await fsApi.stat(`${dirName}/${cover_id}`, { baseDir })).size > 0) {
        return;
      }
    }
    if (song.picUrl) {
      try {
        const response = await fetch(song.picUrl, { headers: song.picHeaders });
        const blob = await response.blob();
        if (blob.size === 0) return;
        const unit: Uint8Array = await new Promise((resolve, reject) => {
          const reader = new FileReader();

          reader.onload = () => {
            if (reader.result instanceof ArrayBuffer) {
              const arrayBuffer = reader.result;
              const uint8Array = new Uint8Array(arrayBuffer);
              resolve(uint8Array);
            } else {
              reject(new Error('Failed to read blob as ArrayBuffer'));
            }
          };

          reader.onerror = () => {
            reject(reader.error);
          };

          reader.readAsArrayBuffer(blob);
        });
        await fsApi.writeFile(`${dirName}/${cover_id}`, unit, {
          baseDir,
        });
      } catch (error) {
        console.warn('saveCover:', error);
      }
    }
  };
  const getSong = async (song: SongInfo): Promise<string | undefined> => {
    if (!inited) {
      await ensureBase();
    }

    const find = songs.value.find(
      (s) => s.song_id === song.id && s.source_id === song.sourceId,
    );
    if (
      find &&
      (await fsApi.exists(`${dirName}/${find.cache_song_id}`, {
        baseDir,
      }))
    ) {
      try {
        if (displayStore.isAndroid) {
          return `file://${dirName}/${find.cache_song_id}`;
        }

        const buffer = await fsApi.readFile(
          `${dirName}/${find.cache_song_id}`,
          {
            baseDir,
          },
        );
        if (buffer.byteLength === 0) {
          await removeSong(song);
          return undefined;
        }
        const blobUrl = URL.createObjectURL(
          new Blob([buffer], { type: 'audio/mpeg' }),
        );
        return blobUrl;
      } catch (error) {
        console.warn('getSong:', error);
      }
    }
  };
  const getCover = async (song: SongInfo): Promise<string | undefined> => {
    if (!inited) {
      await ensureBase();
    }
    const find = songs.value.find(
      (s) => s.song_id === song.id && s.source_id === song.sourceId,
    );
    if (find) {
      const cover_id = songIdToCoverId(find.cache_song_id);
      if (
        await fsApi.exists(`${dirName}/${cover_id}`, {
          baseDir,
        })
      ) {
        try {
          if (displayStore.isAndroid) {
            return `file://${dirName}/${cover_id}`;
          }

          const buffer = await fsApi.readFile(`${dirName}/${cover_id}`, {
            baseDir,
          });
          if (buffer.byteLength === 0) {
            await removeCover(song);
            return undefined;
          }
          const blobUrl = URL.createObjectURL(
            new Blob([buffer], { type: 'image/png' }),
          );
          return blobUrl;
        } catch (error) {
          console.warn('getCover:', error);
        }
      }
    }
  };
  const removeSong = async (song: SongInfo) => {
    if (!inited) {
      await ensureBase();
    }
    const find = songs.value.find(
      (s) => s.song_id === song.id && s.source_id === song.sourceId,
    );
    if (find) {
      if (
        await fsApi.exists(`${dirName}/${find.cache_song_id}`, {
          baseDir,
        })
      ) {
        try {
          await fsApi.remove(`${dirName}/${find.cache_song_id}`, {
            baseDir,
            recursive: true,
          });
          songs.value = songs.value.filter(
            (s) => s.cache_song_id !== find.cache_song_id,
          );
        } catch (error) {
          console.warn('removeSong:', error);
        }
      }
    }
    removeCover(song);
  };

  const removeCover = async (song: SongInfo) => {
    if (!inited) {
      await ensureBase();
    }
    const find = songs.value.find(
      (s) => s.song_id === song.id && s.source_id === song.sourceId,
    );
    if (find) {
      const cover_id = songIdToCoverId(find.cache_song_id);
      if (
        await fsApi.exists(`${dirName}/${cover_id}`, {
          baseDir,
        })
      ) {
        try {
          await fsApi.remove(`${dirName}/${cover_id}`, {
            baseDir,
            recursive: true,
          });
        } catch (error) {
          console.warn('removeCover:', error);
        }
      }
    }
  };

  const clear = async () => {
    if (!inited) {
      await ensureBase();
    }
    try {
      await fsApi.remove(`${dirName}`, {
        baseDir,
        recursive: true,
      });
    } catch (error) {
      console.warn('clear song cache:', error);
    }

    songs.value = [];
    inited = false;
    // [...songs.value.map((song) => song.cache_song_id)].forEach(
    //   async (cache_song_id) => {
    //     if (
    //       await fsApi.exists(`${dirName}/${cache_song_id}`, {
    //         baseDir: baseDir,
    //       })
    //     ) {
    //       try {
    //         await fsApi.remove(`${dirName}/${cache_song_id}`, {
    //           baseDir: baseDir,
    //           recursive: true,
    //         });
    //       } catch (error) {}
    //     }
    //     const cover_id = songIdToCoverId(cache_song_id);
    //     if (
    //       await fsApi.exists(`${dirName}/${cover_id}`, {
    //         baseDir: baseDir,
    //       })
    //     ) {
    //       try {
    //         await fsApi.remove(`${dirName}/${cover_id}`, {
    //           baseDir: baseDir,
    //           recursive: true,
    //         });
    //       } catch (error) {}
    //     }
    //   }
    // );
  };
  return {
    songs,
    saveSong,
    saveSongv2,
    saveCover,
    getSong,
    getCover,
    removeSong,
    removeCover,
    clear,
    replaceSongSrc,
  };
});
