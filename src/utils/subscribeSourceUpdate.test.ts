import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatSubscribeSourcesUpdateNotify,
  isMarketSourceUnavailableMessage,
  parseServerErrorMessage,
} from './subscribeSourceUpdate';

describe('subscribeSourceUpdate messages', () => {
  it('detects banned and private source errors', () => {
    assert.equal(
      parseServerErrorMessage({ message: '该源已被封禁' }),
      '该源已被封禁',
    );
    assert.equal(isMarketSourceUnavailableMessage('该源已被封禁'), true);
    assert.equal(isMarketSourceUnavailableMessage('该源未公开'), true);
    assert.equal(isMarketSourceUnavailableMessage('服务器发生错误'), false);
  });

  it('formats single banned source as 该源无法更新', () => {
    assert.deepEqual(
      formatSubscribeSourcesUpdateNotify({
        updatingOne: true,
        failed: [],
        unavailable: ['被封禁的源'],
        skippedExclusive: [],
      }),
      { type: 'warning', message: '该源无法更新' },
    );
  });

  it('keeps batch update result when some sources cannot update', () => {
    assert.deepEqual(
      formatSubscribeSourcesUpdateNotify({
        updatingOne: false,
        failed: [],
        unavailable: ['被封禁的源'],
        skippedExclusive: [],
      }),
      { type: 'warning', message: '被封禁的源 无法更新' },
    );
    assert.deepEqual(
      formatSubscribeSourcesUpdateNotify({
        updatingOne: false,
        failed: [],
        unavailable: ['A', 'B'],
        skippedExclusive: [],
      }),
      { type: 'warning', message: '更新完成，2 个订阅源无法更新' },
    );
  });
});
