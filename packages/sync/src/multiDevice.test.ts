import type { LwwClock } from './clock';
import type { CloudSyncOp } from './types';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test'; // eslint-disable-line test/no-import-node-test -- 仓库测试用 node:test，未安装 vitest
import { incomingWinsPatch } from './clock';
import { applyPendingOpsToData } from './pendingReplay';
import { SyncTypes } from './types';

interface MiniEntity {
  kind: string;
  entityId: string;
  parentId: string;
  payload: Record<string, any>;
  clientUpdatedAt: number;
  deviceId: string;
  mutationId: string;
  deleted: boolean;
  version: number;
}

class MiniServer {
  entities = new Map<string, MiniEntity>();
  mutations = new Set<string>();
  seq = 0;

  key(kind: string, entityId: string, parentId = '') {
    return `${kind}|${entityId}|${parentId}`;
  }

  clock(entity: MiniEntity): LwwClock {
    return {
      clientUpdatedAt: entity.clientUpdatedAt,
      deviceId: entity.deviceId,
      mutationId: entity.mutationId,
    };
  }

  patch(ops: CloudSyncOp[]) {
    const appliedMutationIds: string[] = [];
    const conflicts: CloudSyncOp[] = [];
    for (const op of ops) {
      if (op.clientMutationId && this.mutations.has(op.clientMutationId)) {
        appliedMutationIds.push(op.clientMutationId);
        continue;
      }
      const kind = op.op.includes('Shelf')
        ? 'shelf'
        : op.op.includes('Subscribe')
          ? 'subscribe'
          : 'item';
      const parentId = op.parentId || '';
      const key = this.key(kind, op.entityId, parentId);
      const existing = this.entities.get(key);
      const incoming: LwwClock = {
        clientUpdatedAt: op.clientUpdatedAt,
        deviceId: op.deviceId,
        mutationId: op.clientMutationId,
      };
      const isRemove = op.op.startsWith('remove');
      if (existing && !incomingWinsPatch(incoming, this.clock(existing))) {
        conflicts.push(op);
        continue;
      }
      this.seq += 1;
      this.entities.set(key, {
        kind,
        entityId: op.entityId,
        parentId,
        payload: isRemove ? {} : { ...(op.payload || {}) },
        clientUpdatedAt: op.clientUpdatedAt,
        deviceId: op.deviceId || '',
        mutationId: op.clientMutationId || '',
        deleted: isRemove,
        version: this.seq,
      });
      if (op.clientMutationId) {
        this.mutations.add(op.clientMutationId);
        appliedMutationIds.push(op.clientMutationId);
      }
    }
    return { appliedMutationIds, conflicts };
  }

  changes(since = 0) {
    const list = [...this.entities.values()].filter(e => e.version > since);
    const cursor = list.reduce((m, e) => Math.max(m, e.version), since);
    return {
      cursor: String(cursor),
      changes: list.map(e => ({
        kind: e.kind,
        entityId: e.entityId,
        parentId: e.parentId || undefined,
        payload: e.deleted ? undefined : e.payload,
        clientUpdatedAt: e.clientUpdatedAt,
        deleted: e.deleted,
      })),
    };
  }
}

interface MiniClient {
  committed: any[];
  pending: CloudSyncOp[];
  cursor: number;
}

function overlay(client: MiniClient) {
  return applyPendingOpsToData(
    SyncTypes.BookShelf,
    JSON.parse(JSON.stringify(client.committed)),
    client.pending,
  ).data;
}

function pull(server: MiniServer, client: MiniClient) {
  const { cursor, changes } = server.changes(client.cursor);
  const shelves = JSON.parse(JSON.stringify(client.committed));
  for (const change of changes) {
    if (change.kind !== 'item')
      continue;
    const parentId = change.parentId || 's1';
    let shelf = shelves.find((s: any) => s.id === parentId);
    if (!shelf) {
      shelf = { id: parentId, books: [] };
      shelves.push(shelf);
    }
    if (change.deleted) {
      shelf.books = (shelf.books || []).filter(
        (b: any) => b.book?.id !== change.entityId,
      );
      continue;
    }
    const idx = (shelf.books || []).findIndex(
      (b: any) => b.book?.id === change.entityId,
    );
    if (idx >= 0)
      shelf.books[idx] = { ...shelf.books[idx], ...change.payload };
    else
      shelf.books.push(change.payload);
  }
  client.committed = shelves;
  client.cursor = Number(cursor) || client.cursor;
  client.committed = overlay(client);
}

function push(server: MiniServer, client: MiniClient) {
  const snapshot = client.pending.map(op => ({ ...op }));
  const result = server.patch(snapshot);
  const acked = new Set(result.appliedMutationIds);
  client.pending = client.pending.filter(
    op => !op.clientMutationId || !acked.has(op.clientMutationId),
  );
}

describe('multi-device protocol', () => {
  it('keeps unacked pending across pull overlay', () => {
    const server = new MiniServer();
    const a: MiniClient = { committed: [{ id: 's1', books: [] }], pending: [], cursor: 0 };
    a.pending.push({
      type: SyncTypes.BookShelf,
      op: 'upsertItem',
      entityId: 'b1',
      parentId: 's1',
      payload: { book: { id: 'b1' }, lastReadTime: 10 },
      clientUpdatedAt: 10,
      clientMutationId: 'm-local',
      deviceId: 'A',
    });
    pull(server, a);
    assert.equal(a.pending.length, 1);
    assert.equal(overlay(a)[0].books[0].book.id, 'b1');
  });

  it('acks only by mutationId so inflight coalesced ops survive', () => {
    const server = new MiniServer();
    const a: MiniClient = { committed: [{ id: 's1', books: [] }], pending: [], cursor: 0 };
    a.pending.push({
      type: SyncTypes.BookShelf,
      op: 'upsertItem',
      entityId: 'b1',
      parentId: 's1',
      payload: { book: { id: 'b1' }, lastReadTime: 1 },
      clientUpdatedAt: 1,
      clientMutationId: 'm1',
      deviceId: 'A',
    });
    const snapshot = a.pending.map(op => ({ ...op }));
    a.pending[0] = {
      ...a.pending[0],
      clientMutationId: 'm2',
      clientUpdatedAt: 2,
      payload: { book: { id: 'b1' }, lastReadTime: 2 },
    };
    const result = server.patch(snapshot);
    const acked = new Set(result.appliedMutationIds);
    a.pending = a.pending.filter(
      op => !op.clientMutationId || !acked.has(op.clientMutationId),
    );
    assert.equal(a.pending.length, 1);
    assert.equal(a.pending[0].clientMutationId, 'm2');
  });

  it('replicates a book from A to B', () => {
    const server = new MiniServer();
    const a: MiniClient = { committed: [{ id: 's1', books: [] }], pending: [], cursor: 0 };
    const b: MiniClient = { committed: [{ id: 's1', books: [] }], pending: [], cursor: 0 };
    a.pending.push({
      type: SyncTypes.BookShelf,
      op: 'upsertItem',
      entityId: 'b1',
      parentId: 's1',
      payload: { book: { id: 'b1' }, lastReadTime: 5 },
      clientUpdatedAt: 5,
      clientMutationId: 'a1',
      deviceId: 'A',
    });
    a.committed = overlay(a);
    push(server, a);
    pull(server, b);
    assert.equal(b.committed[0].books[0].book.id, 'b1');
  });

  it('newer progress wins across devices', () => {
    const server = new MiniServer();
    const a: MiniClient = { committed: [{ id: 's1', books: [] }], pending: [], cursor: 0 };
    const b: MiniClient = { committed: [{ id: 's1', books: [] }], pending: [], cursor: 0 };
    a.pending.push({
      type: SyncTypes.BookShelf,
      op: 'updateProgress',
      entityId: 'b1',
      parentId: 's1',
      payload: { book: { id: 'b1' }, lastReadTime: 10, lastReadChapter: { id: 'ch-10' } },
      clientUpdatedAt: 10,
      clientMutationId: 'a-p',
      deviceId: 'A',
    });
    a.committed = overlay(a);
    push(server, a);
    pull(server, b);
    b.pending.push({
      type: SyncTypes.BookShelf,
      op: 'updateProgress',
      entityId: 'b1',
      parentId: 's1',
      payload: { book: { id: 'b1' }, lastReadTime: 20, lastReadChapter: { id: 'ch-20' } },
      clientUpdatedAt: 20,
      clientMutationId: 'b-p',
      deviceId: 'B',
    });
    b.committed = overlay(b);
    push(server, b);
    pull(server, a);
    assert.equal(a.committed[0].books[0].lastReadChapter.id, 'ch-20');
  });

  it('does not resurrect a tombstone with an older upsert', () => {
    const server = new MiniServer();
    server.patch([{
      type: SyncTypes.BookShelf,
      op: 'removeItem',
      entityId: 'b1',
      parentId: 's1',
      clientUpdatedAt: 50,
      clientMutationId: 'del',
      deviceId: 'A',
    }]);
    const result = server.patch([{
      type: SyncTypes.BookShelf,
      op: 'upsertItem',
      entityId: 'b1',
      parentId: 's1',
      payload: { book: { id: 'b1' }, lastReadTime: 10 },
      clientUpdatedAt: 10,
      clientMutationId: 'old',
      deviceId: 'B',
    }]);
    assert.equal(result.conflicts.length, 1);
    const entity = [...server.entities.values()][0];
    assert.equal(entity.deleted, true);
  });

  it('same mutationId retry is idempotent', () => {
    const server = new MiniServer();
    const op: CloudSyncOp = {
      type: SyncTypes.BookShelf,
      op: 'upsertItem',
      entityId: 'b1',
      parentId: 's1',
      payload: { book: { id: 'b1' } },
      clientUpdatedAt: 1,
      clientMutationId: 'same',
      deviceId: 'A',
    };
    const first = server.patch([op]);
    const second = server.patch([op]);
    assert.deepEqual(first.appliedMutationIds, ['same']);
    assert.deepEqual(second.appliedMutationIds, ['same']);
    assert.equal(server.entities.size, 1);
  });
});
