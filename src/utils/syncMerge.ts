import type { SyncTombstone } from '@/types/cloudSync';
import { SyncTypes } from '@/types/sync';

export type ShelfItemKey = 'books' | 'comics' | 'videos';

function getShelfItemId(item: any, itemKey: ShelfItemKey): string | undefined {
  if (itemKey === 'books')
    return item.book?.id;
  if (itemKey === 'comics')
    return item.comic?.id;
  if (itemKey === 'videos')
    return item.video?.id;
  return undefined;
}

function getItemTime(item: any): number {
  return Number(item?.lastReadTime || item?.createTime || 0);
}

/** 手动增量下载：本地打底，服务器同 ID 覆盖并合并子项 */
export function mergeSubscribeSourceData(localData: any[], serverData: any[]) {
  const mergedMap = new Map();

  localData.forEach((source: any) => {
    mergedMap.set(source.detail.id, source);
  });

  serverData.forEach((serverSource: any) => {
    const localSource = mergedMap.get(serverSource.detail.id);
    if (localSource) {
      const urlsMap = new Map();
      localSource.detail.urls?.forEach((url: any) => {
        urlsMap.set(url.id, url);
      });
      serverSource.detail.urls?.forEach((url: any) => {
        urlsMap.set(url.id, url);
      });
      serverSource.detail.urls = Array.from(urlsMap.values());
    }
    mergedMap.set(serverSource.detail.id, serverSource);
  });

  return Array.from(mergedMap.values());
}

export function mergeShelfData(
  localData: any[],
  serverData: any[],
  itemKey: ShelfItemKey,
) {
  const mergedMap = new Map();

  localData.forEach((shelf: any) => {
    mergedMap.set(shelf.id, shelf);
  });

  serverData.forEach((serverShelf: any) => {
    const localShelf = mergedMap.get(serverShelf.id);
    if (localShelf) {
      const itemsMap = new Map();
      localShelf[itemKey]?.forEach((item: any) => {
        const id = getShelfItemId(item, itemKey);
        if (id)
          itemsMap.set(id, item);
      });
      serverShelf[itemKey]?.forEach((item: any) => {
        const id = getShelfItemId(item, itemKey);
        if (id)
          itemsMap.set(id, item);
      });
      serverShelf[itemKey] = Array.from(itemsMap.values());
    }
    mergedMap.set(serverShelf.id, serverShelf);
  });

  return Array.from(mergedMap.values());
}

export function mergePhotoShelfData(localData: any[], serverData: any[]) {
  const mergedMap = new Map();

  localData.forEach((shelf: any) => {
    mergedMap.set(shelf.id, shelf);
  });

  serverData.forEach((serverShelf: any) => {
    const localShelf = mergedMap.get(serverShelf.id);
    if (localShelf) {
      const photosMap = new Map();
      localShelf.photos?.forEach((photo: any) => {
        photosMap.set(photo.id, photo);
      });
      serverShelf.photos?.forEach((photo: any) => {
        photosMap.set(photo.id, photo);
      });
      serverShelf.photos = Array.from(photosMap.values());
    }
    mergedMap.set(serverShelf.id, serverShelf);
  });

  return Array.from(mergedMap.values());
}

export function mergeSongShelfData(localData: any, serverData: any) {
  const mergeSongList = (localShelf: any, serverShelf: any) => {
    if (!localShelf || !serverShelf)
      return serverShelf || localShelf;
    const songsMap = new Map();
    localShelf.playlist?.list?.list?.forEach((song: any) => {
      songsMap.set(song.id, song);
    });
    serverShelf.playlist?.list?.list?.forEach((song: any) => {
      songsMap.set(song.id, song);
    });
    if (serverShelf.playlist?.list) {
      serverShelf.playlist.list.list = Array.from(songsMap.values());
    }
    return serverShelf;
  };

  const createShelfMap = new Map();
  localData.songCreateShelf?.forEach((shelf: any) => {
    createShelfMap.set(shelf.playlist.id, shelf);
  });
  serverData.songCreateShelf?.forEach((serverShelf: any) => {
    const localShelf = createShelfMap.get(serverShelf.playlist.id);
    createShelfMap.set(
      serverShelf.playlist.id,
      mergeSongList(localShelf, serverShelf),
    );
  });

  const playlistShelfMap = new Map();
  localData.songPlaylistShelf?.forEach((shelf: any) => {
    playlistShelfMap.set(shelf.playlist.id, shelf);
  });
  serverData.songPlaylistShelf?.forEach((serverShelf: any) => {
    const localShelf = playlistShelfMap.get(serverShelf.playlist.id);
    playlistShelfMap.set(
      serverShelf.playlist.id,
      mergeSongList(localShelf, serverShelf),
    );
  });

  return {
    songCreateShelf: Array.from(createShelfMap.values()),
    songPlaylistShelf: Array.from(playlistShelfMap.values()),
    songLikeShelf: mergeSongList(
      localData.songLikeShelf,
      serverData.songLikeShelf,
    ),
  };
}

function applyShelfTombstones(
  shelves: any[],
  itemKey: ShelfItemKey | 'photos',
  tombstones: SyncTombstone[],
) {
  const deletedShelves = new Set(
    tombstones.filter(t => t.kind === 'shelf').map(t => t.shelfId),
  );
  const deletedItems = new Set(
    tombstones
      .filter(t => t.kind === 'item')
      .map(t => `${t.shelfId}:${t.itemId}`),
  );

  return shelves
    .filter(shelf => !deletedShelves.has(shelf.id))
    .map((shelf) => {
      const items = shelf[itemKey];
      if (!Array.isArray(items))
        return shelf;
      return {
        ...shelf,
        [itemKey]: items.filter((item: any) => {
          const id
            = itemKey === 'photos'
              ? item.id
              : getShelfItemId(item, itemKey as ShelfItemKey);
          if (!id)
            return true;
          return !deletedItems.has(`${shelf.id}:${id}`);
        }),
      };
    });
}

function mergeShelfItemsLww(
  serverItems: any[],
  localItems: any[],
  itemKey: ShelfItemKey | 'photos',
  preferLocalWithoutTime: boolean,
) {
  const map = new Map<string, any>();
  const getId = (item: any) =>
    itemKey === 'photos' ? item.id : getShelfItemId(item, itemKey as ShelfItemKey);

  serverItems.forEach((item) => {
    const id = getId(item);
    if (id)
      map.set(id, item);
  });

  localItems.forEach((localItem) => {
    const id = getId(localItem);
    if (!id)
      return;
    const serverItem = map.get(id);
    if (!serverItem) {
      map.set(id, localItem);
      return;
    }
    const localTime = getItemTime(localItem);
    const serverTime = getItemTime(serverItem);
    if (localTime || serverTime) {
      map.set(id, localTime >= serverTime ? localItem : serverItem);
    }
    else if (preferLocalWithoutTime) {
      map.set(id, localItem);
    }
  });

  return Array.from(map.values());
}

/**
 * 自动上传前合并：服务器 ∪ 本地 − tombstone；
 * 有 lastReadTime/createTime 的条目 LWW；无时间戳时本地脏数据优先。
 */
export function mergeForAutoUpload(
  type: SyncTypes,
  localData: any,
  serverData: any,
  tombstones: SyncTombstone[],
): any {
  const typeTombs = tombstones.filter(t => t.type === type);

  switch (type) {
    case SyncTypes.SubscribeSource: {
      const deletedSources = new Set(
        typeTombs.filter(t => t.kind === 'subscribe').map(t => t.sourceId),
      );
      const deletedUrls = new Set(
        typeTombs
          .filter(t => t.kind === 'subscribeItem')
          .map(t => `${t.sourceId}:${t.itemId}`),
      );
      const map = new Map<string, any>();
      (serverData || []).forEach((s: any) => {
        if (s?.detail?.id)
          map.set(s.detail.id, s);
      });
      (localData || []).forEach((local: any) => {
        const id = local?.detail?.id;
        if (!id)
          return;
        const server = map.get(id);
        if (!server) {
          map.set(id, local);
          return;
        }
        const urlsMap = new Map();
        server.detail?.urls?.forEach((u: any) => urlsMap.set(u.id, u));
        local.detail?.urls?.forEach((u: any) => urlsMap.set(u.id, u));
        map.set(id, {
          ...server,
          ...local,
          detail: {
            ...server.detail,
            ...local.detail,
            urls: Array.from(urlsMap.values()).filter(
              u => !deletedUrls.has(`${id}:${u.id}`),
            ),
          },
        });
      });
      return Array.from(map.values()).filter(
        s => !deletedSources.has(s.detail?.id),
      );
    }
    case SyncTypes.BookShelf:
    case SyncTypes.ComicShelf:
    case SyncTypes.VideoShelf: {
      const itemKey: ShelfItemKey
        = type === SyncTypes.BookShelf
          ? 'books'
          : type === SyncTypes.ComicShelf
            ? 'comics'
            : 'videos';
      const map = new Map<string, any>();
      (serverData || []).forEach((s: any) => map.set(s.id, s));
      (localData || []).forEach((localShelf: any) => {
        const serverShelf = map.get(localShelf.id);
        if (!serverShelf) {
          map.set(localShelf.id, localShelf);
          return;
        }
        map.set(localShelf.id, {
          ...serverShelf,
          ...localShelf,
          [itemKey]: mergeShelfItemsLww(
            serverShelf[itemKey] || [],
            localShelf[itemKey] || [],
            itemKey,
            true,
          ),
        });
      });
      return applyShelfTombstones(Array.from(map.values()), itemKey, typeTombs);
    }
    case SyncTypes.PhotoShelf: {
      const map = new Map<string, any>();
      (serverData || []).forEach((s: any) => map.set(s.id, s));
      (localData || []).forEach((localShelf: any) => {
        const serverShelf = map.get(localShelf.id);
        if (!serverShelf) {
          map.set(localShelf.id, localShelf);
          return;
        }
        map.set(localShelf.id, {
          ...serverShelf,
          ...localShelf,
          photos: mergeShelfItemsLww(
            serverShelf.photos || [],
            localShelf.photos || [],
            'photos',
            true,
          ),
        });
      });
      return applyShelfTombstones(Array.from(map.values()), 'photos', typeTombs);
    }
    case SyncTypes.SongShelf: {
      const deletedPlaylists = new Set(
        typeTombs
          .filter(t => t.kind === 'songPlaylist')
          .map(t => t.playlistId),
      );
      const deletedSongs = new Set(
        typeTombs
          .filter(t => t.kind === 'song')
          .map(t => `${t.shelfPlaylistId}:${t.songId}`),
      );

      const mergePlaylists = (serverList: any[] = [], localList: any[] = []) => {
        const map = new Map<string, any>();
        serverList.forEach(s => map.set(s.playlist?.id, s));
        localList.forEach((local) => {
          const id = local.playlist?.id;
          if (!id)
            return;
          const server = map.get(id);
          if (!server) {
            map.set(id, local);
            return;
          }
          const songsMap = new Map();
          server.playlist?.list?.list?.forEach((song: any) =>
            songsMap.set(song.id, song),
          );
          local.playlist?.list?.list?.forEach((song: any) =>
            songsMap.set(song.id, song),
          );
          const list = Array.from(songsMap.values()).filter(
            song => !deletedSongs.has(`${id}:${song.id}`),
          );
          map.set(id, {
            ...server,
            ...local,
            playlist: {
              ...server.playlist,
              ...local.playlist,
              list: {
                ...(local.playlist?.list || server.playlist?.list || {}),
                list,
              },
            },
          });
        });
        return Array.from(map.values()).filter(
          s => !deletedPlaylists.has(s.playlist?.id),
        );
      };

      const mergeLike = (serverLike: any, localLike: any) => {
        if (!serverLike)
          return localLike;
        if (!localLike)
          return serverLike;
        const id = localLike.playlist?.id || serverLike.playlist?.id;
        const songsMap = new Map();
        serverLike.playlist?.list?.list?.forEach((song: any) =>
          songsMap.set(song.id, song),
        );
        localLike.playlist?.list?.list?.forEach((song: any) =>
          songsMap.set(song.id, song),
        );
        const list = Array.from(songsMap.values()).filter(
          song => !id || !deletedSongs.has(`${id}:${song.id}`),
        );
        return {
          ...serverLike,
          ...localLike,
          playlist: {
            ...serverLike.playlist,
            ...localLike.playlist,
            list: {
              ...(localLike.playlist?.list || serverLike.playlist?.list || {}),
              list,
            },
          },
        };
      };

      return {
        songCreateShelf: mergePlaylists(
          serverData?.songCreateShelf,
          localData?.songCreateShelf,
        ),
        songPlaylistShelf: mergePlaylists(
          serverData?.songPlaylistShelf,
          localData?.songPlaylistShelf,
        ),
        songLikeShelf: mergeLike(
          serverData?.songLikeShelf,
          localData?.songLikeShelf,
        ),
      };
    }
    default:
      return localData;
  }
}
