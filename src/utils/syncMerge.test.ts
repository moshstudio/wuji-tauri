import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SyncTypes } from '../types/sync';
import {
  mergeForAutoUpload,
  mergeShelfData,
  mergeSubscribeSourceData,
} from './syncMerge';

describe('mergeSubscribeSourceData (manual download)', () => {
  it('unions urls and prefers server source meta', () => {
    const local = [
      {
        detail: {
          id: 's1',
          name: 'local',
          urls: [{ id: 'u1', name: 'a' }],
        },
      },
    ];
    const server = [
      {
        detail: {
          id: 's1',
          name: 'server',
          urls: [{ id: 'u2', name: 'b' }],
        },
      },
    ];
    const merged = mergeSubscribeSourceData(local as any, server as any);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].detail.name, 'server');
    assert.equal(merged[0].detail.urls.length, 2);
  });
});

describe('mergeShelfData (manual download)', () => {
  it('merges books by id with server winning conflict', () => {
    const local = [
      {
        id: 'shelf1',
        books: [{ book: { id: 'b1', title: 'L' }, lastReadTime: 10 }],
      },
    ];
    const server = [
      {
        id: 'shelf1',
        books: [{ book: { id: 'b1', title: 'S' }, lastReadTime: 5 }],
      },
    ];
    const merged = mergeShelfData(local as any, server as any, 'books');
    assert.equal(merged[0].books[0].book.title, 'S');
  });
});

describe('mergeForAutoUpload', () => {
  it('keeps server-only and local-only books', () => {
    const server = [
      {
        id: 'shelf1',
        books: [{ book: { id: 'b1' }, lastReadTime: 1 }],
      },
    ];
    const local = [
      {
        id: 'shelf1',
        books: [{ book: { id: 'b2' }, lastReadTime: 2 }],
      },
    ];
    const merged = mergeForAutoUpload(
      SyncTypes.BookShelf,
      local,
      server,
      [],
    );
    const ids = merged[0].books.map((b: any) => b.book.id).sort();
    assert.deepEqual(ids, ['b1', 'b2']);
  });

  it('uses lastReadTime LWW for same book', () => {
    const server = [
      {
        id: 'shelf1',
        books: [
          {
            book: { id: 'b1', title: 'old' },
            lastReadTime: 100,
            lastReadChapter: { id: 'c1' },
          },
        ],
      },
    ];
    const local = [
      {
        id: 'shelf1',
        books: [
          {
            book: { id: 'b1', title: 'new' },
            lastReadTime: 200,
            lastReadChapter: { id: 'c2' },
          },
        ],
      },
    ];
    const merged = mergeForAutoUpload(
      SyncTypes.BookShelf,
      local,
      server,
      [],
    );
    assert.equal(merged[0].books[0].lastReadChapter.id, 'c2');
    assert.equal(merged[0].books[0].book.title, 'new');
  });

  it('applies item tombstones', () => {
    const server = [
      {
        id: 'shelf1',
        books: [
          { book: { id: 'b1' }, lastReadTime: 1 },
          { book: { id: 'b2' }, lastReadTime: 1 },
        ],
      },
    ];
    const local = [
      {
        id: 'shelf1',
        books: [{ book: { id: 'b1' }, lastReadTime: 2 }],
      },
    ];
    const merged = mergeForAutoUpload(SyncTypes.BookShelf, local, server, [
      {
        type: SyncTypes.BookShelf,
        kind: 'item',
        shelfId: 'shelf1',
        itemId: 'b2',
      },
    ]);
    assert.deepEqual(
      merged[0].books.map((b: any) => b.book.id),
      ['b1'],
    );
  });

  it('applies shelf tombstones', () => {
    const server = [
      { id: 'shelf1', books: [] },
      { id: 'shelf2', books: [] },
    ];
    const local = [{ id: 'shelf1', books: [] }];
    const merged = mergeForAutoUpload(SyncTypes.BookShelf, local, server, [
      {
        type: SyncTypes.BookShelf,
        kind: 'shelf',
        shelfId: 'shelf2',
      },
    ]);
    assert.deepEqual(
      merged.map((s: any) => s.id),
      ['shelf1'],
    );
  });

  it('applies subscribe tombstones', () => {
    const server = [
      { detail: { id: 's1', urls: [] } },
      { detail: { id: 's2', urls: [] } },
    ];
    const local = [{ detail: { id: 's1', urls: [{ id: 'u1' }] } }];
    const merged = mergeForAutoUpload(
      SyncTypes.SubscribeSource,
      local,
      server,
      [
        {
          type: SyncTypes.SubscribeSource,
          kind: 'subscribe',
          sourceId: 's2',
        },
      ],
    );
    assert.equal(merged.length, 1);
    assert.equal(merged[0].detail.id, 's1');
  });
});
