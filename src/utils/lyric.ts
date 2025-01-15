import { fetch } from "@/utils/fetch";

const cache = new Map<string, Lyric>();

export interface LyricItem {
  position: number;
  lyric: string;
}
export type Lyric = LyricItem[];
export async function getLyric(
  songName: string,
  singerName?: string
): Promise<Lyric | undefined> {
  const key = `${songName}-${singerName}`;
  if (cache.has(key)) {
    return cache.get(key);
  } else {
    let key = `${songName}`;
    // if (singerName) {
    //   key += `-${singerName}`;
    // }
    const url = `https://www.hhlqilongzhu.cn/api/dg_geci.php?msg=${key}&n=1&type=2`;
    const response = await fetch(url);
    const text = await response.text();

    if (!text) return;
    const lyric = parseLyric(text);
    cache.set(key, lyric);
    return lyric;
  }
}

export function parseLyric(lyric: string): Lyric {
  const parseTime = (t: string): number | null => {
    try {
      const timeParts = t.split(":");
      const minutes = parseInt(timeParts[0], 10);
      const seconds = parseFloat(timeParts[1]);
      return Math.floor((minutes * 60 + seconds) * 1000); // 转换为毫秒
    } catch (e) {
      return null;
    }
  };

  const mySplit1 = (_lyric: string): string[] => {
    _lyric = _lyric.replace(/\]\[/g, "@@@");
    _lyric = _lyric.replace(/\[/g, "\n[");
    _lyric = _lyric.replace(/@@@/g, "][");
    return _lyric.split("\n").map((line) => line.trim());
  };

  const remove = (x: string): string => x.replace(/[\[\]]/g, "");

  let lyricList = lyric.split("\n").map((line) => line.trim());
  if (lyricList.length === 1) {
    lyricList = mySplit1(lyric);
  }
  const res: Lyric = [];
  for (const line of lyricList) {
    const timeStamps = line.match(/\[[^\]]+\]/g);
    if (timeStamps) {
      let lyricText = line;
      for (const tplus of timeStamps) {
        lyricText = lyricText.replace(tplus, "");
      }
      for (const tplus of timeStamps) {
        const t = remove(tplus);
        const tagFlag = t.split(":")[0];
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
