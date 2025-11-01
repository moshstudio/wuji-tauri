import type { SongInfo } from '@wuji-tauri/source-extension';
import { fetch } from '@wuji-tauri/fetch';

async function getData(url: string, options: Record<string, any> = {}) {
  options ||= {};
  const headers = new Headers(options.headers || {});
  if (!headers.has('Referer') && !headers.has('referer')) {
    headers.set('Referer', 'http://m.music.migu.cn/v3');
  }
  if (!headers.has('user-agent') && !headers.has('User-Agent')) {
    headers.set(
      'User-Agent',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    );
  }
  options.headers = headers;
  const response = await fetch(url, options);
  if (response.status !== 200) {
    return null;
  }
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (error) {
    return text;
  }
}

export async function searchSongs(keyword: string, pageNo = 1) {
  pageNo ||= 1;
  const url =
    `https://m.music.migu.cn/migu/remoting/scr_search_tag` +
    `?keyword=${keyword}&pgc=${pageNo}&rows=10&type=2`;
  const response = await getData(url);

  const songs: SongInfo[] = [];
  response.musics?.forEach((ele: any) => {
    songs.push({
      name: ele.songName,
      artists: [ele.singerName],
      id: ele.id,
      cid: ele.copyrightId,
      lyric: ele.lyric,
      album: ele.albumId,
      mvId: ele.mvId,
      mvCid: ele.mvCopyrightId,
      picUrl: '',
      sourceId: 'migu',
    });
  });
  return {
    list: songs,
    page: pageNo,
    pageSize: 10,
    totalPage: response.pgt,
  };
}
export async function getLyric(item: SongInfo) {
  const cid = item.cid;
  if (!cid) {
    return null;
  }
  const url =
    `http://music.migu.cn/v3/api/music/audioPlayer/getLyric` +
    `?copyrightId=${cid}`;
  const response = await getData(url);
  return response.lyric;
}

export default { searchSongs, getLyric };
