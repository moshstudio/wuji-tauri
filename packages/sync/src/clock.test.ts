import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test'; // eslint-disable-line test/no-import-node-test -- 仓库测试用 node:test，未安装 vitest
import {
  compareLww,
  incomingWinsPatch,
  incomingWinsPull,
  nextLogicalTime,
  peekEntityTs,
  rememberEntityTs,
  resetEntityTsForTests,
} from './clock';

describe('syncClock', () => {
  beforeEach(() => {
    resetEntityTsForTests();
  });

  it('bumps logical time past last known even if wall clock is behind', () => {
    rememberEntityTs('BookShelf|b1|s1', 500);
    const next = nextLogicalTime('BookShelf|b1|s1', 100);
    assert.equal(next, 501);
    assert.equal(peekEntityTs('BookShelf|b1|s1'), 501);
  });

  it('uses wall clock when it is ahead of last known', () => {
    rememberEntityTs('BookShelf|b1|s1', 10);
    const next = nextLogicalTime('BookShelf|b1|s1', 1000);
    assert.equal(next, 1000);
  });

  it('compares LWW by timestamp then deviceId then mutationId', () => {
    assert.ok(compareLww({ clientUpdatedAt: 2 }, { clientUpdatedAt: 1 }) > 0);
    assert.ok(
      compareLww(
        { clientUpdatedAt: 1, deviceId: 'b' },
        { clientUpdatedAt: 1, deviceId: 'a' },
      ) > 0,
    );
    assert.ok(
      compareLww(
        { clientUpdatedAt: 1, deviceId: 'a', mutationId: 'm2' },
        { clientUpdatedAt: 1, deviceId: 'a', mutationId: 'm1' },
      ) > 0,
    );
  });

  it('patch requires strictly newer clock; pull accepts ties', () => {
    const a = { clientUpdatedAt: 1, deviceId: 'x', mutationId: 'm' };
    const b = { ...a };
    assert.equal(incomingWinsPatch(a, b), false);
    assert.equal(incomingWinsPull(a, b), true);
  });
});
