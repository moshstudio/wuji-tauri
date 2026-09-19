import assert from 'node:assert/strict';
import { describe, it } from 'node:test'; // eslint-disable-line test/no-import-node-test -- 仓库测试用 node:test，未安装 vitest
import {
  applyEntityChangesToData,
  applyPatchConflictsToData,
} from './applyChanges';
import { SyncTypes } from './types';

describe('sync entity change contract', () => {
  it('change payload carries LWW timestamp', () => {
    const change = {
      kind: 'item',
      entityId: 'b1',
      parentId: 's1',
      payload: { book: { id: 'b1' }, lastReadTime: 10 },
      clientUpdatedAt: 10,
      deleted: false,
    };
    assert.equal(change.clientUpdatedAt, 10);
    assert.equal(change.deleted, false);
    void SyncTypes.BookShelf;
  });
});

describe('applyEntityChangesToData', () => {
  it('tombstones a shelf and its items', () => {
    const { data } = applyEntityChangesToData(
      SyncTypes.BookShelf,
      [
        {
          id: 's1',
          createTime: 1,
          books: [{ book: { id: 'b1' }, lastReadTime: 1 }],
        },
        { id: 's2', createTime: 1, books: [] },
      ],
      [
        {
          kind: 'item',
          entityId: 'b1',
          parentId: 's1',
          clientUpdatedAt: 2,
          deleted: true,
        },
        {
          kind: 'shelf',
          entityId: 's2',
          clientUpdatedAt: 3,
          deleted: true,
        },
      ],
    );
    assert.equal(data.length, 1);
    assert.equal(data[0].id, 's1');
    assert.equal(data[0].books.length, 0);
  });

  it('upserts song playlist and like shelf', () => {
    const { data } = applyEntityChangesToData(
      SyncTypes.SongShelf,
      { songCreateShelf: [], songPlaylistShelf: [], songLikeShelf: {} },
      [
        {
          kind: 'songPlaylist',
          entityId: 'p1',
          clientUpdatedAt: 1,
          deleted: false,
          payload: {
            _bucket: 'create',
            playlist: { id: 'p1', name: 'mine' },
          },
        },
        {
          kind: 'songLike',
          entityId: 'like',
          clientUpdatedAt: 2,
          deleted: false,
          payload: { playlist: { id: 'like', list: { list: [{ id: 's1' }] } } },
        },
      ],
    );
    assert.equal(data.songCreateShelf[0].playlist.id, 'p1');
    assert.equal(data.songLikeShelf.playlist.list.list[0].id, 's1');
  });

  it('uses snapshot mode for subscribe pull so newer local version is kept', () => {
    const local = [
      {
        disable: false,
        detail: {
          id: 'src1',
          version: 3,
          urls: [{ id: 'a', disable: false, code: 'local' }],
        },
      },
    ];
    const { data } = applyEntityChangesToData(
      SyncTypes.SubscribeSource,
      local,
      [
        {
          kind: 'subscribe',
          entityId: 'src1',
          clientUpdatedAt: 1,
          deleted: false,
          payload: {
            disable: true,
            detail: {
              id: 'src1',
              version: 2,
              urls: [{ id: 'a', disable: true, code: 'server' }],
            },
          },
        },
      ],
    );
    assert.equal(data[0].detail.version, 3);
    assert.equal(data[0].detail.urls[0].code, 'local');
  });
});

describe('applyPatchConflictsToData', () => {
  it('writes server payload over skipped local op', () => {
    const { data } = applyPatchConflictsToData(
      SyncTypes.BookShelf,
      [
        {
          id: 's1',
          books: [
            {
              book: { id: 'b1' },
              lastReadTime: 99,
              lastReadChapter: { id: 'local' },
            },
          ],
        },
      ],
      {
        type: SyncTypes.BookShelf,
        op: 'updateProgress',
        entityId: 'b1',
        parentId: 's1',
        serverUpdatedAt: 50,
        payload: {
          book: { id: 'b1' },
          lastReadTime: 50,
          lastReadChapter: { id: 'server' },
        },
      },
    );
    assert.equal(data[0].books[0].lastReadChapter.id, 'server');
  });
});
