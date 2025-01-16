import { createRequest, CryptoType } from "./request";
export async function search(keyword: string) {
  return await createRequest("/api/search/get", {
    s: keyword,
    type: 1, // 1: 单曲, 10: 专辑, 100: 歌手, 1000: 歌单, 1002: 用户, 1004: MV, 1006: 歌词, 1009: 电台, 1014: 视频
    limit: 30,
    offset: 0,
  });
}

export async function lyric(id: string) {
  return await createRequest("/api/song/lyric", {
    id: id,
    tv: -1,
    lv: -1,
    rv: -1,
    kv: -1,
    _nmclfl: 1,
  });
}
