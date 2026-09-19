import assert from 'node:assert/strict';
import { describe, it } from 'node:test'; // eslint-disable-line test/no-import-node-test -- 仓库测试用 node:test，未安装 vitest
import { mergeForAutoUpload } from './mergeManual';
import { serverDeletedToTombstones } from './tombstone';
import { SyncTypes } from './types';

describe('serverDeletedToTombstones', () => {
  it('maps shelf/item deletes', () => {
    const tombs = serverDeletedToTombstones(SyncTypes.BookShelf, [
      { kind: 'shelf', entityId: 's1' },
      { kind: 'item', entityId: 'b1', parentId: 's1' },
    ]);
    assert.equal(tombs.length, 2);
    assert.equal(tombs[0].kind, 'shelf');
    assert.equal(tombs[1].kind, 'item');
  });
});

describe('pull merge with server tombstones', () => {
  it('removes locally kept books that server deleted', () => {
    const server = [
      {
        id: 'shelf1',
        books: [{ book: { id: 'b2' }, lastReadTime: 2 }],
      },
    ];
    const local = [
      {
        id: 'shelf1',
        books: [
          { book: { id: 'b1' }, lastReadTime: 1 },
          { book: { id: 'b2' }, lastReadTime: 1 },
        ],
      },
    ];
    const tombs = serverDeletedToTombstones(SyncTypes.BookShelf, [
      { kind: 'item', entityId: 'b1', parentId: 'shelf1' },
    ]);
    const merged = mergeForAutoUpload(
      SyncTypes.BookShelf,
      local,
      server,
      tombs,
    );
    const ids = merged[0].books.map((b: any) => b.book.id);
    assert.deepEqual(ids, ['b2']);
  });
});
