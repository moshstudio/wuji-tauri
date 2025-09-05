import type { ArtistInfo } from '@wuji-tauri/source-extension';

export function joinSongArtists(
  artists: ArtistInfo[] | string[] | undefined | null,
): string {
  if (!artists) return '';
  const res: string[] = [];
  artists.forEach((artist) => {
    if (!artist) return;
    if (typeof artist === 'string') {
      res.push(artist);
    } else {
      res.push(artist.name);
    }
  });
  return res.join(',');
}
