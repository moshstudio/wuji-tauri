import { ArtistInfo } from '@wuji-tauri/source-extension';

export function joinSongArtists(
  artists: ArtistInfo[] | string[] | undefined | null,
): string {
  if (!artists) return '';
  return artists
    .map((artist) => {
      if (typeof artist === 'string') {
        return artist;
      }
      return artist.name;
    })
    .join(',');
}
