import assert from 'node:assert/strict';
import { describe, it } from 'node:test'; // eslint-disable-line test/no-import-node-test -- 仓库测试用 node:test，未安装 vitest
import { applyPendingOpsToData } from './pendingReplay';
import { SyncTypes } from './types';

describe('applyPendingOpsToData', () => {
  it('re-adds a locally added book that remote snapshot dropped', () => {
    const snapshot = [
      {
        id: 's1',
        books: [{ book: { id: 'b1' }, lastReadTime: 1 }],
      },
    ];
    const { data } = applyPendingOpsToData(SyncTypes.BookShelf, snapshot, [
      {
        type: SyncTypes.BookShelf,
        op: 'upsertItem',
        entityId: 'b2',
        parentId: 's1',
        payload: { book: { id: 'b2' }, lastReadTime: 2 },
        clientUpdatedAt: 2,
      },
    ]);
    assert.deepEqual(
      data[0].books.map((b: any) => b.book.id).sort(),
      ['b1', 'b2'],
    );
  });

  it('keeps a local delete against a remote resurrect', () => {
    const snapshot = [
      {
        id: 's1',
        books: [
          { book: { id: 'b1' }, lastReadTime: 9 },
          { book: { id: 'b2' }, lastReadTime: 1 },
        ],
      },
    ];
    const { data } = applyPendingOpsToData(SyncTypes.BookShelf, snapshot, [
      {
        type: SyncTypes.BookShelf,
        op: 'removeItem',
        entityId: 'b1',
        parentId: 's1',
        clientUpdatedAt: 10,
      },
    ]);
    assert.deepEqual(
      data[0].books.map((b: any) => b.book.id),
      ['b2'],
    );
  });

  it('keeps newer local progress over older snapshot', () => {
    const snapshot = [
      {
        id: 's1',
        books: [
          {
            book: { id: 'b1' },
            lastReadTime: 5,
            lastReadChapter: { id: 'old' },
          },
        ],
      },
    ];
    const { data } = applyPendingOpsToData(SyncTypes.BookShelf, snapshot, [
      {
        type: SyncTypes.BookShelf,
        op: 'updateProgress',
        entityId: 'b1',
        parentId: 's1',
        payload: {
          book: { id: 'b1' },
          lastReadTime: 20,
          lastReadChapter: { id: 'new' },
        },
        clientUpdatedAt: 20,
      },
    ]);
    assert.equal(data[0].books[0].lastReadChapter.id, 'new');
  });

  it('applies pending subscribe enable onto a disabled snapshot', () => {
    const snapshot = [
      {
        disable: true,
        flagsUpdatedAt: 1,
        detail: {
          id: 'src1',
          version: 2,
          urls: [{ id: 'a', disable: true }],
        },
      },
    ];
    const { data } = applyPendingOpsToData(SyncTypes.SubscribeSource, snapshot, [
      {
        type: SyncTypes.SubscribeSource,
        op: 'upsertSubscribe',
        entityId: 'src1',
        payload: {
          disable: false,
          flagsUpdatedAt: 10,
          detail: {
            id: 'src1',
            version: 2,
            urls: [{ id: 'a', disable: false }],
          },
          _sync: {
            intent: 'flags',
            flagItems: [{ id: 'a', disable: false }],
            packDisable: false,
            flagsUpdatedAt: 10,
          },
        },
        clientUpdatedAt: 10,
      },
    ]);
    assert.equal(data[0].disable, false);
    assert.equal(data[0].detail.urls[0].disable, false);
  });
});
