import type { SongInfo } from '@wuji-tauri/source-extension';
import { joinSongArtists } from '@wuji-tauri/components/src/components/cards/song';
import {
  search as neteaseSearch,
  songDetail as neteaseSongDetail,
} from './neteaseMusic';

export async function getSongCover(song: SongInfo): Promise<SongInfo> {
  if (!song.name) return song;
  const songName = song.name;
  const singerName = joinSongArtists(song.artists);

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
  if (!songs) return song;
  const sSong =
    songs.find(
      (song) => song.name === songName && song.artists.includes(singerName),
    ) || songs.find((song) => song.name === songName);

  if (!sSong) return song;

  const detail = await neteaseSongDetail([String(sSong.id)]);
  const json = await detail.json();
  if (json.code === 200 && json.songs.length > 0) {
    if (json.songs[0].al.picUrl) {
      song.picUrl = json.songs[0].al.picUrl;
    }
  }
  return song;
}
