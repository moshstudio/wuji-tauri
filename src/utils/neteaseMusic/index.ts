import type { PlaylistInfo } from '@wuji-tauri/source-extension';
import _ from 'lodash';
import { createRequest, CryptoType } from './request';

export { createRequest, CryptoType };
export async function search(keyword: string) {
  return await createRequest('/api/search/get', {
    s: keyword,
    type: 1, // 1: 单曲, 10: 专辑, 100: 歌手, 1000: 歌单, 1002: 用户, 1004: MV, 1006: 歌词, 1009: 电台, 1014: 视频
    limit: 30,
    offset: 0,
  });
}

export async function lyric(id: string) {
  return await createRequest('/api/song/lyric', {
    id,
    tv: -1,
    lv: -1,
    rv: -1,
    kv: -1,
    _nmclfl: 1,
  });
}

export async function songDetail(ids: string[]) {
  return await createRequest(
    '/api/v3/song/detail',
    {
      c: `[${ids.map((id) => `{"id":${id}}`).join(',')}]`,
    },
    {
      crypto: CryptoType.weapi,
    },
  );
}

export async function playlistDetail(id: string): Promise<PlaylistInfo | null> {
  const response1 = await createRequest('/api/v6/playlist/detail', {
    id,
    n: 100000,
    s: 8,
  });
  const json1 = await response1.json();
  if (json1.code !== 200) return null;

  const trackIds: { id: string }[] = json1.playlist.trackIds;
  const list = [];
  const chunks = _.chunk(trackIds, 30);
  for (const chunk of chunks) {
    const response = await createRequest(
      '/api/v3/song/detail',
      {
        c: `[${chunk.map((item) => `{"id":${item.id}}`).join(',')}]`,
      },
      {
        crypto: CryptoType.weapi,
      },
    );
    const json = await response.json();
    if (json.code !== 200) continue;
    list.push(
      ...json.songs.map((item: any) => {
        return {
          name: item.name,
          artists: item.ar.map((a: any) => ({ name: a.name, id: a.id })),
          id: String(item.id),
          album: item.al?.name,
          picUrl: item.al?.picUrl,
          sourceId: '',
          extra: { fee: item.fee },
        };
      }),
    );
  }
  return {
    name: json1.playlist.name,
    id: String(json1.playlist.id),
    picUrl: json1.playlist.coverImgUrl,
    desc: json1.playlist.description,
    sourceId: '',
    list: {
      list,
      page: 1,
      totalPage: 1,
    },
  };
}
