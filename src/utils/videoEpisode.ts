import type { VideoEpisode } from '@wuji-tauri/source-extension';

export function formatEpisodeTitle(
  item?: { title?: string },
  episode?: { title?: string },
): string {
  if (item && episode) {
    return `${item.title || ''} - ${episode.title || ''}`;
  }
  return item?.title || '';
}

export function getAdjacentEpisode(
  episodes: VideoEpisode[] | undefined,
  currentEpisodeId: string | undefined,
  delta: -1 | 1,
): VideoEpisode | null {
  if (!episodes?.length || !currentEpisodeId) {
    return null;
  }
  const index = episodes.findIndex(item => item.id === currentEpisodeId);
  if (index === -1) {
    return null;
  }
  const nextIndex = index + delta;
  if (nextIndex < 0 || nextIndex >= episodes.length) {
    return null;
  }
  return episodes[nextIndex];
}

export function getEpisodeIndex(
  episodes: VideoEpisode[] | undefined,
  currentEpisodeId: string | undefined,
): number {
  if (!episodes?.length || !currentEpisodeId) {
    return -1;
  }
  return episodes.findIndex(item => item.id === currentEpisodeId);
}
