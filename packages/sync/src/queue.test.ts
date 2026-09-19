import type { PendingQueue } from './queue';
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test'; // eslint-disable-line test/no-import-node-test -- 仓库测试用 node:test，未安装 vitest
import { resetEntityTsForTests } from './clock';
import { createPendingQueue } from './queue';
import { createMemoryStorage, LEGACY_PENDING_KEY, syncSessionKeys } from './session';
import { SyncTypes } from './types';

function makeQueue(opts?: {
  userId?: string;
  canEnqueue?: () => boolean;
  isTypeEnabled?: (type: SyncTypes) => boolean;
  storage?: ReturnType<typeof createMemoryStorage>;
}) {
  const storage = opts?.storage || createMemoryStorage();
  const userId = opts?.userId ?? 'user-a';
  const queue = createPendingQueue({
    storage,
    randomId: () => `id_${Math.random().toString(36).slice(2, 8)}`,
    getDeviceId: () => 'dev-test',
    userId: () => userId,
    canEnqueue: opts?.canEnqueue ?? (() => true),
    isTypeEnabled: opts?.isTypeEnabled,
  });
  queue.bindUser(userId);
  return { queue, storage, userId };
}

describe('pending queue', () => {
  let queue: PendingQueue;

  beforeEach(() => {
    resetEntityTsForTests();
    queue = makeQueue().queue;
  });

  it('enqueues and merges same-key ops', () => {
    queue.enqueueOp({
      type: SyncTypes.BookShelf,
      op: 'updateProgress',
      entityId: 'b1',
      parentId: 's1',
      payload: { lastReadTime: 1 },
      clientUpdatedAt: 1,
    });
    queue.enqueueOp({
      type: SyncTypes.BookShelf,
      op: 'updateProgress',
      entityId: 'b1',
      parentId: 's1',
      payload: { lastReadTime: 2 },
      clientUpdatedAt: 2,
    });
    const ops = queue.peekPendingOps();
    assert.equal(ops.length, 1);
    assert.equal(ops[0].payload?.lastReadTime, 2);
  });

  it('removeItem drops upsert/progress for same item', () => {
    queue.enqueueOp({
      type: SyncTypes.BookShelf,
      op: 'upsertItem',
      entityId: 'b1',
      parentId: 's1',
      payload: {},
      clientUpdatedAt: 1,
    });
    queue.enqueueOp({
      type: SyncTypes.BookShelf,
      op: 'removeItem',
      entityId: 'b1',
      parentId: 's1',
      clientUpdatedAt: 2,
    });
    const ops = queue.peekPendingOps();
    assert.equal(ops.length, 1);
    assert.equal(ops[0].op, 'removeItem');
  });

  it('pendingHasStructure detects non-progress ops', () => {
    queue.enqueueOp({
      type: SyncTypes.BookShelf,
      op: 'updateProgress',
      entityId: 'b1',
      parentId: 's1',
      clientUpdatedAt: 1,
    });
    assert.equal(queue.pendingHasStructure(), false);
    queue.enqueueOp({
      type: SyncTypes.BookShelf,
      op: 'upsertItem',
      entityId: 'b2',
      parentId: 's1',
      clientUpdatedAt: 2,
    });
    assert.equal(queue.pendingHasStructure(), true);
  });

  it('snapshot does not clear the queue', () => {
    queue.enqueueOp({
      type: SyncTypes.BookShelf,
      op: 'upsertShelf',
      entityId: 's1',
      clientUpdatedAt: 1,
    });
    const snap = queue.snapshotPendingOps();
    assert.equal(snap.length, 1);
    assert.equal(queue.hasPendingOps(), true);
  });

  it('acks only matching mutationIds', () => {
    queue.enqueueOp({
      type: SyncTypes.BookShelf,
      op: 'upsertShelf',
      entityId: 's1',
      clientUpdatedAt: 1,
      clientMutationId: 'keep-me',
    });
    queue.enqueueOp({
      type: SyncTypes.BookShelf,
      op: 'upsertShelf',
      entityId: 's2',
      clientUpdatedAt: 1,
      clientMutationId: 'drop-me',
    });
    queue.ackMutationIds(['drop-me']);
    const left = queue.peekPendingOps();
    assert.equal(left.length, 1);
    assert.equal(left[0].entityId, 's1');
  });

  it('assigns clientMutationId and deviceId on enqueue', () => {
    queue.enqueueOp({
      type: SyncTypes.BookShelf,
      op: 'upsertShelf',
      entityId: 's1',
      clientUpdatedAt: 1,
    });
    const ops = queue.peekPendingOps();
    assert.ok(ops[0].clientMutationId);
    assert.notEqual(ops[0].clientMutationId, '');
    assert.equal(ops[0].deviceId, 'dev-test');
  });

  it('merges subscribe flags into prior content upsert without dropping content intent', () => {
    queue.enqueueOp({
      type: SyncTypes.SubscribeSource,
      op: 'upsertSubscribe',
      entityId: 's1',
      payload: {
        detail: { id: 's1', version: 2, urls: [{ id: 'a', code: 'v2' }] },
        _sync: { intent: 'content', contentUpdatedAt: 1 },
      },
      clientUpdatedAt: 1,
    });
    queue.enqueueOp({
      type: SyncTypes.SubscribeSource,
      op: 'upsertSubscribe',
      entityId: 's1',
      payload: {
        detail: { id: 's1', version: 2, urls: [{ id: 'a', code: 'v2' }] },
        disable: true,
        _sync: {
          intent: 'flags',
          flagItems: [{ id: 'a', disable: true }],
          flagsUpdatedAt: 2,
        },
      },
      clientUpdatedAt: 2,
    });
    const ops = queue.peekPendingOps();
    assert.equal(ops.length, 1);
    assert.equal((ops[0].payload as any)._sync.intent, 'content');
    assert.equal((ops[0].payload as any)._sync.flagItems[0].id, 'a');
  });

  it('restorePendingOps keeps the newer clientUpdatedAt', () => {
    queue.enqueueOp({
      type: SyncTypes.BookShelf,
      op: 'updateProgress',
      entityId: 'b1',
      parentId: 's1',
      payload: { lastReadTime: 2 },
      clientUpdatedAt: 2,
    });
    queue.restorePendingOps([
      {
        type: SyncTypes.BookShelf,
        op: 'updateProgress',
        entityId: 'b1',
        parentId: 's1',
        payload: { lastReadTime: 1 },
        clientUpdatedAt: 1,
      },
    ]);
    assert.equal(queue.peekPendingOps()[0].payload?.lastReadTime, 2);
  });

  it('rehydrates pending ops from storage after a restart', () => {
    const storage = createMemoryStorage();
    const first = makeQueue({ storage, userId: 'user-a' }).queue;
    first.enqueueOp({
      type: SyncTypes.BookShelf,
      op: 'upsertItem',
      entityId: 'b1',
      parentId: 's1',
      payload: { lastReadTime: 3 },
      clientUpdatedAt: 3,
    });
    const second = makeQueue({ storage, userId: 'user-a' }).queue;
    assert.equal(second.hasPendingOps(), true);
    assert.equal(second.peekPendingOps()[0].entityId, 'b1');
  });

  it('does not enqueue when type is disabled', () => {
    const { queue: q } = makeQueue({
      isTypeEnabled: type => type !== SyncTypes.BookShelf,
    });
    q.enqueueOp({
      type: SyncTypes.BookShelf,
      op: 'upsertShelf',
      entityId: 's1',
      clientUpdatedAt: 1,
    });
    assert.equal(q.hasPendingOps(), false);
  });

  it('does not enqueue when canEnqueue is false', () => {
    const { queue: q } = makeQueue({ canEnqueue: () => false });
    q.enqueueOp({
      type: SyncTypes.BookShelf,
      op: 'upsertShelf',
      entityId: 's1',
      clientUpdatedAt: 1,
    });
    assert.equal(q.peekPendingOps().length, 0);
  });

  it('migrates legacy global pending into the first user key', () => {
    const storage = createMemoryStorage({
      [LEGACY_PENDING_KEY]: JSON.stringify([
        {
          type: SyncTypes.BookShelf,
          op: 'upsertShelf',
          entityId: 'legacy',
          clientUpdatedAt: 1,
        },
      ]),
    });
    const { queue: q } = makeQueue({ storage, userId: 'user-a' });
    assert.equal(q.peekPendingOps()[0].entityId, 'legacy');
    assert.equal(storage.getItem(LEGACY_PENDING_KEY), null);
    assert.ok(storage.getItem(syncSessionKeys('user-a').pending));
  });
});
