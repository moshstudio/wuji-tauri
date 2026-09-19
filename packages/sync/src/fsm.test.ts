import assert from 'node:assert/strict';
import { describe, it } from 'node:test'; // eslint-disable-line test/no-import-node-test -- 仓库测试用 node:test，未安装 vitest
import {
  backoffMs,
  debounceDelayMs,
  mapPhaseToStatus,
  PROGRESS_DEBOUNCE_MS,
  resolvePullTypes,
  shouldSkipDirtyCycle,
  STRUCTURE_DEBOUNCE_MS,
} from './fsm';
import { SyncTypes } from './types';

describe('cloudSyncFsm', () => {
  it('lifecycle and manual pull all enabled types', () => {
    const enabled = [SyncTypes.BookShelf, SyncTypes.ComicShelf];
    const pending = [SyncTypes.BookShelf];
    assert.deepEqual(
      resolvePullTypes('lifecycle', enabled, pending),
      enabled,
    );
    assert.deepEqual(
      resolvePullTypes('manual', enabled, pending),
      enabled,
    );
  });

  it('dirty/retry pull only pending ∩ enabled', () => {
    const enabled = [SyncTypes.BookShelf, SyncTypes.ComicShelf];
    const pending = [SyncTypes.BookShelf, SyncTypes.SongShelf];
    assert.deepEqual(
      resolvePullTypes('dirty', enabled, pending),
      [SyncTypes.BookShelf],
    );
  });

  it('skips dirty cycle when nothing is pending', () => {
    assert.equal(shouldSkipDirtyCycle('dirty', false), true);
    assert.equal(shouldSkipDirtyCycle('retry', true), false);
    assert.equal(shouldSkipDirtyCycle('lifecycle', false), false);
  });

  it('maps phases to UI status', () => {
    assert.equal(mapPhaseToStatus('Pulling'), 'syncing');
    assert.equal(mapPhaseToStatus('Pushing'), 'syncing');
    assert.equal(mapPhaseToStatus('Backoff'), 'error');
    assert.equal(mapPhaseToStatus('Idle'), 'idle');
    assert.equal(mapPhaseToStatus('PausedManual'), 'idle');
  });

  it('uses 2s structure debounce and 45s progress debounce', () => {
    assert.equal(debounceDelayMs(true), STRUCTURE_DEBOUNCE_MS);
    assert.equal(debounceDelayMs(false), PROGRESS_DEBOUNCE_MS);
  });

  it('caps backoff at 120s', () => {
    assert.equal(backoffMs(0), 5000);
    assert.equal(backoffMs(2), 120000);
    assert.equal(backoffMs(9), 120000);
  });
});
