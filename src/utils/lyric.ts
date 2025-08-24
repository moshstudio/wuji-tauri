import { fetch } from '@wuji-tauri/fetch';
import { lyric as neteaseLyric, search as neteaseSearch } from './neteaseMusic';
import kuwoMusic from './kuwoMusic';
import miguMusic from './miguMusic';
import { joinSongArtists } from '@wuji-tauri/components/src/components/cards/song';

const cache = new Map<string, Lyric>();

export interface LyricItem {
  position: number;
  lyric: string;
}
export type Lyric = LyricItem[];
export async function getLyric(
  songName: string,
  singerName?: string,
): Promise<Lyric | undefined> {
  const key = `${songName}-${singerName}`;
  if (cache.has(key)) {
    return cache.get(key);
  } else {
    const lyricFromLongZhu = async (): Promise<string | null> => {
      const url = `https://www.hhlqilongzhu.cn/api/dg_geci.php?msg=${key}&n=1&type=2`;
      const response = await fetch(url);
      const text = await response.text();
      if (!text.includes(songName)) return null;
      return text;
    };
    const lyricFromNetease = async (): Promise<string | null> => {
      const res = await neteaseSearch(songName);
      const t = await res.text();
      const songs: { id: number; name: string; artists: string }[] = JSON.parse(
        t,
      ).result.songs.map((song: any) => {
        return {
          id: song.id,
          name: song.name,
          artists: song.artists.map((artist: any) => artist.name).join(','),
        };
      });
      if (!songs) return '';
      const sSong = songs.find(
        (song) =>
          song.name === songName && song.artists.includes(singerName || ''),
      );

      if (!sSong) return '';
      const l = await neteaseLyric(String(sSong.id));
      const lyricResponseText = await l.text();
      return JSON.parse(lyricResponseText).lrc.lyric;
    };

    const lyricFromKuWo = async (): Promise<string | null> => {
      const songs = await kuwoMusic.searchSongs(songName);
      for (const song of songs.list) {
        if (
          song.name === songName &&
          joinSongArtists(song.artists).includes(singerName || '')
        ) {
          return kuwoMusic.getLyric(song);
        }
      }
      return null;
    };

    const lyricFromMiGu = async (): Promise<string | null> => {
      const songs = await miguMusic.searchSongs(songName);
      for (const song of songs.list) {
        if (
          song.name === songName &&
          joinSongArtists(song.artists).includes(singerName || '')
        ) {
          return miguMusic.getLyric(song);
        }
      }
      return null;
    };
    const lyricText =
      (await lyricFromNetease()) ||
      (await lyricFromLongZhu()) ||
      (await lyricFromKuWo()) ||
      (await lyricFromMiGu());

    if (!lyricText) return;
    const lyric = parseLyric(lyricText);
    if (!lyric.length) return;
    cache.set(key, lyric);
    return lyric;
  }
}

export function parseLyric(lyric: string): Lyric {
  const parseTime = (t: string): number | null => {
    try {
      const timeParts = t.split(':');
      const minutes = Number.parseInt(timeParts[0], 10);
      const seconds = Number.parseFloat(timeParts[1]);
      return Math.floor((minutes * 60 + seconds) * 1000); // 转换为毫秒
    } catch (e) {
      return null;
    }
  };

  const mySplit1 = (_lyric: string): string[] => {
    _lyric = _lyric.replace(/\]\[/g, '@@@');
    _lyric = _lyric.replace(/\[/g, '\n[');
    _lyric = _lyric.replace(/@@@/g, '][');
    return _lyric.split('\n').map((line) => line.trim());
  };

  const remove = (x: string): string => x.replace(/[[\]]/g, '');

  let lyricList = lyric.split('\n').map((line) => line.trim());
  if (lyricList.length === 1) {
    lyricList = mySplit1(lyric);
  }
  const res: Lyric = [];
  for (const line of lyricList) {
    const timeStamps = line.match(/\[[^\]]+\]/g);
    if (timeStamps) {
      let lyricText = line;
      for (const tplus of timeStamps) {
        lyricText = lyricText.replace(tplus, '');
      }
      for (const tplus of timeStamps) {
        const t = remove(tplus);
        const tagFlag = t.split(':')[0];
        if (!/^\d+$/.test(tagFlag)) {
          continue;
        }
        const _time = parseTime(t);
        if (_time) {
          res.push({
            position: _time,
            lyric: lyricText,
          });
        }
      }
    }
  }
  return res;
}
