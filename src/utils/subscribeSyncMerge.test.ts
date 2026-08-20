import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import {
  applySubscribeDelete,
  applySubscribeUpsert,
  mergeSubscribeSyncPayload,
} from './subscribeSyncMerge';

function source(opts: {
  id: string;
  version: number;
  urls: Array<{ id: string; code?: string; disable?: boolean }>;
  disable?: boolean;
}) {
  return {
    url: 'marketSource',
    disable: !!opts.disable,
    detail: {
      id: opts.id,
      name: opts.id,
      version: opts.version,
      urls: opts.urls.map(u => ({
        id: u.id,
        name: u.id,
        code: u.code,
        disable: u.disable,
      })),
    },
  };
}

describe('applySubscribeUpsert', () => {
  it('keeps newer local content when stale device upserts full old snapshot', () => {
    const local = source({
      id: 's1',
      version: 3,
      urls: [
        { id: 'keep', code: 'new' },
        { id: 'added', code: 'w' },
      ],
    });
    const incoming = source({
      id: 's1',
      version: 1,
      urls: [
        { id: 'keep', code: 'old' },
        { id: 'stale', code: 'gone' },
      ],
    });
    const { source: merged } = applySubscribeUpsert({
      local,
      incoming,
      incomingTs: Date.now(),
      tomb: undefined,
    });
    assert.equal(merged?.detail?.version, 3);
    assert.deepEqual(
      merged?.detail?.urls?.map(u => u.id),
      ['keep', 'added'],
    );
    assert.equal(merged?.detail?.urls?.[0].code, 'new');
  });

  it('applies only listed flag items onto current urls', () => {
    const local = source({
      id: 's1',
      version: 3,
      urls: [
        { id: 'a', code: 'new', disable: false },
        { id: 'b', code: 'new', disable: false },
      ],
    });
    const incoming = {
      ...source({
        id: 's1',
        version: 1,
        urls: [{ id: 'a', code: 'old', disable: true }],
        disable: true,
      }),
      _sync: {
        intent: 'flags' as const,
        flagItems: [{ id: 'a', disable: true }],
        packDisable: false,
      },
    };
    const { source: merged } = applySubscribeUpsert({
      local,
      incoming,
      incomingTs: Date.now(),
      tomb: undefined,
    });
    assert.equal(merged?.detail?.urls?.find(u => u.id === 'a')?.disable, true);
    assert.equal(merged?.detail?.urls?.find(u => u.id === 'b')?.disable, false);
    assert.equal(merged?.detail?.urls?.find(u => u.id === 'a')?.code, 'new');
    assert.equal(merged?.disable, false);
  });

  it('installs a flags snapshot when the device never had that source', () => {
    const incoming = {
      ...source({ id: 's1', version: 2, urls: [{ id: 'a', code: 'ok' }] }),
      _sync: {
        intent: 'flags' as const,
        flagItems: [{ id: 'a', disable: true }],
      },
    };
    const { source: merged } = applySubscribeUpsert({
      local: undefined,
      incoming,
      incomingTs: Date.now(),
      tomb: undefined,
    });
    assert.equal(merged?.detail?.urls?.[0].code, 'ok');
  });

  it('does not resurrect a deleted source from a flags patch', () => {
    const incoming = {
      ...source({ id: 's1', version: 1, urls: [{ id: 'a' }] }),
      _sync: {
        intent: 'flags' as const,
        flagItems: [{ id: 'a', disable: true }],
      },
    };
    const { source: merged } = applySubscribeUpsert({
      local: undefined,
      incoming,
      incomingTs: Date.now(),
      tomb: { sourceId: 's1', version: 3, deletedAt: 1 },
    });
    assert.equal(merged, null);
  });

  it('does not resurrect a deleted source from an older content snapshot', () => {
    const { source: merged } = applySubscribeUpsert({
      local: undefined,
      incoming: {
        ...source({ id: 's1', version: 1, urls: [{ id: 'stale' }] }),
        _sync: { intent: 'content' },
      },
      incomingTs: Date.now(),
      tomb: { sourceId: 's1', version: 3, deletedAt: 1 },
    });
    assert.equal(merged, null);
  });

  it('resurrects when a newer content version is imported after delete', () => {
    const incoming = {
      ...source({ id: 's1', version: 4, urls: [{ id: 'fresh', code: 'v4' }] }),
      _sync: { intent: 'content' as const },
    };
    const { source: merged, tomb } = applySubscribeUpsert({
      local: undefined,
      incoming,
      incomingTs: Date.now(),
      tomb: { sourceId: 's1', version: 3, deletedAt: 1 },
    });
    assert.equal(merged?.detail?.version, 4);
    assert.equal(merged?.detail?.urls?.[0].code, 'v4');
    assert.equal(tomb, undefined);
  });

  it('takes newer content upsert over older local', () => {
    const { source: merged } = applySubscribeUpsert({
      local: source({ id: 's1', version: 1, urls: [{ id: 'old' }] }),
      incoming: {
        ...source({ id: 's1', version: 2, urls: [{ id: 'new', code: 'v2' }] }),
        _sync: { intent: 'content' as const },
      },
      incomingTs: 20,
      tomb: undefined,
    });
    assert.equal(merged?.detail?.version, 2);
    assert.equal(merged?.detail?.urls?.[0].id, 'new');
  });

  it('does not let older content intent replace a newer local version', () => {
    const { source: merged } = applySubscribeUpsert({
      local: source({ id: 's1', version: 5, urls: [{ id: 'new', code: 'v5' }] }),
      incoming: {
        ...source({ id: 's1', version: 2, urls: [{ id: 'old', code: 'v2' }] }),
        _sync: { intent: 'content' as const },
      },
      incomingTs: Date.now(),
      tomb: undefined,
    });
    assert.equal(merged?.detail?.version, 5);
    assert.equal(merged?.detail?.urls?.[0].code, 'v5');
  });
});

describe('applySubscribeDelete', () => {
  it('records version of removed source', () => {
    const tomb = applySubscribeDelete({
      local: source({ id: 's1', version: 5, urls: [] }),
      sourceId: 's1',
      incomingTs: 9,
      tomb: undefined,
    });
    assert.equal(tomb.version, 5);
    assert.equal(tomb.deletedAt, 9);
  });
});

describe('mergeSubscribeSyncPayload', () => {
  it('upgrades flags+content pending merge to content intent', () => {
    const merged = mergeSubscribeSyncPayload(
      {
        detail: { id: 's1', version: 2 },
        _sync: { intent: 'content', contentUpdatedAt: 1 },
      },
      {
        detail: { id: 's1', version: 2 },
        disable: true,
        _sync: {
          intent: 'flags',
          flagItems: [{ id: 'a', disable: true }],
          flagsUpdatedAt: 2,
        },
      },
    );
    assert.equal((merged._sync as any).intent, 'content');
    assert.equal((merged._sync as any).flagItems[0].id, 'a');
  });
});
