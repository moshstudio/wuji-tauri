/**
 * 首页推荐自动加载守卫。
 *
 * 本次会话内已请求过（含失败/空结果）的源，返回列表时不再自动重试。
 * 源被移除会清掉记录；重新启用或更新会抬世代，回到列表时再拉一次。
 * 下拉刷新 / 清空搜索（force）仍会重新请求。
 */
const attemptedGen = new Map<string, number>();
const genBySource = new Map<string, number>();

function attemptKey(sourceId: string, channel = 'default') {
  return `${sourceId}::${channel}`;
}

function currentGen(sourceId: string) {
  return genBySource.get(sourceId) ?? 0;
}

export function shouldLoadHomeRecommend(
  sourceId: string,
  hasContent: unknown,
  force = false,
  channel = 'default',
): boolean {
  const key = attemptKey(sourceId, channel);
  const gen = currentGen(sourceId);
  if (force) {
    attemptedGen.set(key, gen);
    return true;
  }
  if (attemptedGen.get(key) === gen)
    return false;
  // 从未尝试且从未失效过：已有内容就不必自动再拉
  if (hasContent && attemptedGen.get(key) === undefined && gen === 0)
    return false;
  attemptedGen.set(key, gen);
  return true;
}

export function forgetHomeRecommend(sourceId: string) {
  const prefix = `${sourceId}::`;
  for (const key of [...attemptedGen.keys()]) {
    if (key.startsWith(prefix))
      attemptedGen.delete(key);
  }
  genBySource.delete(sourceId);
}

/** 源被重新启用或更新后调用：下次进入首页会重新拉取（含已有内容）。 */
export function invalidateHomeRecommend(sourceId: string) {
  if (!sourceId)
    return;
  genBySource.set(sourceId, currentGen(sourceId) + 1);
}
