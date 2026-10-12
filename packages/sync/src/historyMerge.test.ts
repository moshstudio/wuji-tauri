import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyHistoryChanges } from './historyMerge';
import { SyncTypes } from './types';

function book(id: string, lastReadTime: number, chapters?: unknown[]) {
  return {
    book: { id, title: id, sourceId: 'src', chapters },
    lastReadTime,
  };
}

describe('applyHistoryChanges', () => {
  it('newer lastReadTime wins and moves the item first', () => {
    const { list } = applyHistoryChanges(
      SyncTypes.BookHistory,
      [
        book('old', 50, [{ id: 'c-old' }]),
        book('keep', 10, [{ id: 'c-keep' }]),
      ],
      [{
        kind: 'item',
        entityId: 'keep',
        clientUpdatedAt: 80,
        deleted: false,
        payload: {
          book: { id: 'keep', title: 'kept', sourceId: 'src' },
          lastReadChapter: { id: 'c2', title: '二' },
          lastReadTime: 80,
        },
      }],
    );
    assert.equal(list[0].book.id, 'keep');
    assert.equal(list[0].lastReadTime, 80);
    assert.equal(list[0].lastReadChapter.id, 'c2');
    assert.deepEqual(list[0].book.chapters, [{ id: 'c-keep' }]);
    assert.equal(list[1].book.id, 'old');
  });

  it('older pull does not overwrite a newer local read', () => {
    const local = [book('b1', 100, [{ id: 'local' }])];
    const { list } = applyHistoryChanges(
      SyncTypes.BookHistory,
      local,
      [{
        kind: 'item',
        entityId: 'b1',
        clientUpdatedAt: 40,
        deleted: false,
        payload: {
          book: { id: 'b1', title: 'remote', sourceId: 'src' },
          lastReadTime: 40,
        },
      }],
    );
    assert.equal(list[0].lastReadTime, 100);
    assert.equal(list[0].book.title, 'b1');
    assert.deepEqual(list[0].book.chapters, [{ id: 'local' }]);
  });

  it('soft delete removes the history item', () => {
    const { list } = applyHistoryChanges(
      SyncTypes.BookHistory,
      [book('b1', 10), book('b2', 20)],
      [{
        kind: 'item',
        entityId: 'b1',
        clientUpdatedAt: 30,
        deleted: true,
      }],
    );
    assert.deepEqual(list.map(item => item.book.id), ['b2']);
  });

  it('an older delete does not remove a newer local read', () => {
    const { list } = applyHistoryChanges(
      SyncTypes.BookHistory,
      [book('b1', 50)],
      [{
        kind: 'item',
        entityId: 'b1',
        clientUpdatedAt: 20,
        deleted: true,
      }],
    );
    assert.equal(list.length, 1);
    assert.equal(list[0].book.id, 'b1');
  });

  it('drops items beyond the history cap and reports their ids', () => {
    const existing = Array.from({ length: 10 }, (_, index) => ({
      comic: { id: `c${index}`, title: `c${index}`, sourceId: 'src' },
      lastReadTime: index + 1,
    }));
    const { list, removedIds } = applyHistoryChanges(
      SyncTypes.ComicHistory,
      existing,
      [{
        kind: 'item',
        entityId: 'fresh',
        clientUpdatedAt: 100,
        deleted: false,
        payload: {
          comic: { id: 'fresh', title: 'fresh', sourceId: 'src' },
          lastReadTime: 100,
        },
      }],
    );
    assert.equal(list.length, 10);
    assert.equal(list[0].comic.id, 'fresh');
    assert.deepEqual(removedIds, ['c0']);
  });
});
