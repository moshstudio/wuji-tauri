import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  forgetHomeRecommend,
  invalidateHomeRecommend,
  shouldLoadHomeRecommend,
} from './homeRecommend';

describe('shouldLoadHomeRecommend', () => {
  it('does not retry empty results until the source is invalidated', () => {
    const id = `empty-${Date.now()}-a`;
    assert.equal(shouldLoadHomeRecommend(id, undefined), true);
    assert.equal(shouldLoadHomeRecommend(id, undefined), false);
    assert.equal(shouldLoadHomeRecommend(id, []), false);

    invalidateHomeRecommend(id);
    assert.equal(shouldLoadHomeRecommend(id, []), true);
    assert.equal(shouldLoadHomeRecommend(id, []), false);
  });

  it('reloads after re-enable (forget then invalidate) even with old content', () => {
    const id = `enable-${Date.now()}-b`;
    assert.equal(shouldLoadHomeRecommend(id, undefined), true);
    forgetHomeRecommend(id);
    invalidateHomeRecommend(id);
    assert.equal(shouldLoadHomeRecommend(id, { list: [] }), true);
  });

  it('reloads each song channel after update', () => {
    const id = `song-${Date.now()}-c`;
    assert.equal(shouldLoadHomeRecommend(id, undefined, false, 'playlist'), true);
    assert.equal(shouldLoadHomeRecommend(id, undefined, false, 'songList'), true);
    assert.equal(shouldLoadHomeRecommend(id, undefined, false, 'playlist'), false);
    assert.equal(shouldLoadHomeRecommend(id, undefined, false, 'songList'), false);

    invalidateHomeRecommend(id);
    assert.equal(shouldLoadHomeRecommend(id, { list: [1] }, false, 'playlist'), true);
    assert.equal(shouldLoadHomeRecommend(id, { list: [1] }, false, 'songList'), true);
    assert.equal(shouldLoadHomeRecommend(id, { list: [1] }, false, 'playlist'), false);
  });

  it('force always reloads', () => {
    const id = `force-${Date.now()}-d`;
    assert.equal(shouldLoadHomeRecommend(id, undefined), true);
    assert.equal(shouldLoadHomeRecommend(id, undefined, true), true);
    assert.equal(shouldLoadHomeRecommend(id, { list: [1] }, true), true);
  });
});
