import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test'; // eslint-disable-line test/no-import-node-test -- 仓库测试用 node:test，未安装 vitest
import { resetEntityTsForTests } from './clock';
import { canUseCloudSync } from './fsm';
import { createPendingQueue } from './queue';
import {
  createMemoryStorage,
  migrateLegacySyncKeys,
  syncSessionKeys,
  syncUserIdOf,
} from './session';
import { SyncTypes } from './types';

describe('canUseCloudSync', () => {
  it('is false when logged out', () => {
    assert.equal(canUseCloudSync({ loggedIn: false, hasCloudSyncFeature: true }), false);
  });

  it('is false without cloud_sync feature', () => {
    assert.equal(canUseCloudSync({ loggedIn: true, hasCloudSyncFeature: false }), false);
  });

  it('is true only when logged in and feature enabled', () => {
    assert.equal(canUseCloudSync({ loggedIn: true, hasCloudSyncFeature: true }), true);
  });
});

describe('sync session identity', () => {
  it('prefers _id then uuid then email', () => {
    assert.equal(syncUserIdOf({ _id: 'id1', uuid: 'u', email: 'a@b.c' }), 'id1');
    assert.equal(syncUserIdOf({ uuid: 'u', email: 'a@b.c' }), 'u');
    assert.equal(syncUserIdOf({ email: 'a@b.c' }), 'a@b.c');
    assert.equal(syncUserIdOf(null), undefined);
  });
});

describe('account isolation', () => {
  beforeEach(() => {
    resetEntityTsForTests();
  });

  it('does not hydrate A pending into B', () => {
    const storage = createMemoryStorage();
    const queue = createPendingQueue({
      storage,
      randomId: () => 'mid',
      getDeviceId: () => 'dev',
      canEnqueue: () => true,
    });

    queue.bindUser('user-a');
    queue.enqueueOp({
      type: SyncTypes.BookShelf,
      op: 'upsertItem',
      entityId: 'a-book',
      parentId: 's1',
      payload: { book: { id: 'a-book' } },
      clientUpdatedAt: 1,
      clientMutationId: 'a-m1',
    });
    assert.equal(queue.peekPendingOps()[0].entityId, 'a-book');

    queue.bindUser('user-b');
    assert.equal(queue.hasPendingOps(), false);
    assert.equal(queue.getBoundUserId(), 'user-b');

    queue.enqueueOp({
      type: SyncTypes.BookShelf,
      op: 'upsertItem',
      entityId: 'b-book',
      parentId: 's1',
      payload: { book: { id: 'b-book' } },
      clientUpdatedAt: 2,
      clientMutationId: 'b-m1',
    });
    assert.equal(queue.peekPendingOps()[0].clientMutationId, 'b-m1');
    assert.ok(storage.getItem(syncSessionKeys('user-a').pending));
    assert.ok(storage.getItem(syncSessionKeys('user-b').pending));

    queue.bindUser('user-a');
    assert.equal(queue.peekPendingOps()[0].entityId, 'a-book');
    assert.equal(queue.peekPendingOps()[0].clientMutationId, 'a-m1');
  });

  it('logout unbinds session and blocks enqueue', () => {
    const storage = createMemoryStorage();
    const queue = createPendingQueue({
      storage,
      randomId: () => 'mid',
      getDeviceId: () => 'dev',
      canEnqueue: () => true,
    });
    queue.bindUser('user-a');
    queue.enqueueOp({
      type: SyncTypes.BookShelf,
      op: 'upsertShelf',
      entityId: 's1',
      clientUpdatedAt: 1,
    });
    queue.bindUser(undefined);
    assert.equal(queue.hasPendingOps(), false);
    queue.enqueueOp({
      type: SyncTypes.BookShelf,
      op: 'upsertShelf',
      entityId: 's2',
      clientUpdatedAt: 2,
    });
    assert.equal(queue.hasPendingOps(), false);
    assert.ok(storage.getItem(syncSessionKeys('user-a').pending));
  });

  it('keeps cursors in per-user keys', () => {
    const storage = createMemoryStorage();
    migrateLegacySyncKeys(storage, 'user-a');
    storage.setItem(
      syncSessionKeys('user-a').cursors,
      JSON.stringify({ BookShelf: '12' }),
    );
    storage.setItem(
      syncSessionKeys('user-b').cursors,
      JSON.stringify({ BookShelf: '99' }),
    );
    assert.equal(
      JSON.parse(storage.getItem(syncSessionKeys('user-a').cursors)!).BookShelf,
      '12',
    );
    assert.equal(
      JSON.parse(storage.getItem(syncSessionKeys('user-b').cursors)!).BookShelf,
      '99',
    );
  });
});
