import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { SyncTypes } from '../types/sync';
import {
  clearPendingOps,
  enqueueOp,
  hasPendingOps,
  isAutoSyncSuppressed,
  peekPendingOps,
  pendingHasStructure,
  resetAutoSyncSuppressForTests,
  suppressAutoSync,
  takePendingOps,
} from './cloudSyncOps';

describe('cloudSyncOps', () => {
  beforeEach(() => {
    clearPendingOps();
    resetAutoSyncSuppressForTests();
  });

  it('enqueues and merges same-key ops', () => {
    enqueueOp({
      type: SyncTypes.BookShelf,
      op: 'updateProgress',
      entityId: 'b1',
      parentId: 's1',
      payload: { lastReadTime: 1 },
      clientUpdatedAt: 1,
    });
    enqueueOp({
      type: SyncTypes.BookShelf,
      op: 'updateProgress',
      entityId: 'b1',
      parentId: 's1',
      payload: { lastReadTime: 2 },
      clientUpdatedAt: 2,
    });
    const ops = peekPendingOps();
    assert.equal(ops.length, 1);
    assert.equal(ops[0].payload?.lastReadTime, 2);
  });

  it('removeItem drops upsert/progress for same item', () => {
    enqueueOp({
      type: SyncTypes.BookShelf,
      op: 'upsertItem',
      entityId: 'b1',
      parentId: 's1',
      payload: {},
      clientUpdatedAt: 1,
    });
    enqueueOp({
      type: SyncTypes.BookShelf,
      op: 'removeItem',
      entityId: 'b1',
      parentId: 's1',
      clientUpdatedAt: 2,
    });
    const ops = peekPendingOps();
    assert.equal(ops.length, 1);
    assert.equal(ops[0].op, 'removeItem');
  });

  it('pendingHasStructure detects non-progress ops', () => {
    enqueueOp({
      type: SyncTypes.BookShelf,
      op: 'updateProgress',
      entityId: 'b1',
      parentId: 's1',
      clientUpdatedAt: 1,
    });
    assert.equal(pendingHasStructure(), false);
    enqueueOp({
      type: SyncTypes.BookShelf,
      op: 'upsertItem',
      entityId: 'b2',
      parentId: 's1',
      clientUpdatedAt: 2,
    });
    assert.equal(pendingHasStructure(), true);
  });

  it('suppress blocks enqueue', () => {
    suppressAutoSync(5000);
    assert.equal(isAutoSyncSuppressed(), true);
    enqueueOp({
      type: SyncTypes.BookShelf,
      op: 'upsertShelf',
      entityId: 's1',
      clientUpdatedAt: 1,
    });
    assert.equal(hasPendingOps(), false);
  });

  it('takePendingOps clears queue', () => {
    enqueueOp({
      type: SyncTypes.BookShelf,
      op: 'upsertShelf',
      entityId: 's1',
      clientUpdatedAt: 1,
    });
    const taken = takePendingOps();
    assert.equal(taken.length, 1);
    assert.equal(hasPendingOps(), false);
  });

  it('assigns clientMutationId on enqueue', () => {
    enqueueOp({
      type: SyncTypes.BookShelf,
      op: 'upsertShelf',
      entityId: 's1',
      clientUpdatedAt: 1,
    });
    const ops = peekPendingOps();
    assert.ok(ops[0].clientMutationId);
    assert.notEqual(ops[0].clientMutationId, '');
  });
});
