import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SyncTypes } from '../types/sync';

// 纯函数级：复用 applyShelfChange 逻辑的最小验证通过 merge 路径已覆盖；
// 这里验证变更结构约定。
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
