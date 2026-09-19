/**
 * 订阅源增量同步合并。
 *
 * 三条独立时钟，互不拿整包互盖：
 * - 内容：detail.version
 * - 开关：每个源项 id 的时间（flagItemTimes）+ 包级 packDisableUpdatedAt
 * - 删除：tomb.version，flags / 旧内容不得复活
 */

export type SubscribeSyncIntent = 'content' | 'flags';

export interface SubscribeSyncFlagItem {
  id: string;
  disable?: boolean;
  updatedAt?: number;
}

export interface SubscribeSyncMeta {
  intent?: SubscribeSyncIntent;
  flagItems?: SubscribeSyncFlagItem[];
  packDisable?: boolean;
  packDisableUpdatedAt?: number;
  contentUpdatedAt?: number;
  flagsUpdatedAt?: number;
}

export interface SubscribeTomb {
  sourceId: string;
  version: number;
  deletedAt: number;
}

interface SubscribeLike {
  url?: string;
  disable?: boolean;
  permissions?: string[];
  contentUpdatedAt?: number;
  flagsUpdatedAt?: number;
  packDisableUpdatedAt?: number;
  flagItemTimes?: Record<string, number>;
  _sync?: SubscribeSyncMeta;
  detail?: {
    id?: string;
    name?: string;
    version?: number;
    requireVersion?: number;
    urls?: Array<{
      id?: string;
      name?: string;
      type?: string;
      url?: string;
      disable?: boolean;
      code?: string;
    }>;
  };
}

export function subscribeVersion(source: SubscribeLike | undefined): number {
  return Number(source?.detail?.version || 0);
}

export function getSubscribeSyncMeta(
  payload: SubscribeLike | undefined,
): SubscribeSyncMeta {
  return payload?._sync || {};
}

export function stripSubscribeSyncWire<T extends SubscribeLike>(
  source: T | undefined,
): T | undefined {
  if (!source)
    return source;
  const { _sync, ...rest } = source;
  void _sync;
  return rest as T;
}

function inferIntent(
  local: SubscribeLike | undefined,
  incoming: SubscribeLike,
): SubscribeSyncIntent {
  const meta = getSubscribeSyncMeta(incoming);
  if (meta.intent === 'content' || meta.intent === 'flags')
    return meta.intent;
  if (!local)
    return 'content';
  if (subscribeVersion(incoming) > subscribeVersion(local))
    return 'content';
  return 'flags';
}

function cloneSource<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function flagsTimestamp(
  source: SubscribeLike | undefined,
  meta?: SubscribeSyncMeta,
): number {
  return Number(
    meta?.flagsUpdatedAt
    || source?.flagsUpdatedAt
    || 0,
  ) || 0;
}

function hasExplicitFlags(meta: SubscribeSyncMeta): boolean {
  return !!(meta.flagItems?.length || typeof meta.packDisable === 'boolean');
}

function flagItemTimesOf(source: SubscribeLike | undefined): Record<string, number> {
  return { ...(source?.flagItemTimes || {}) };
}

function packDisableAt(source: SubscribeLike | undefined): number {
  return Number(source?.packDisableUpdatedAt || 0) || 0;
}

function incomingFlagItemTime(item: SubscribeSyncFlagItem, fallback: number): number {
  return Number(item.updatedAt || 0) || fallback;
}

/** 把本地开关抄到新内容上；新增的源项跟随包开关。 */
function copyLocalFlags(target: SubscribeLike, local: SubscribeLike) {
  target.disable = local.disable;
  const map = new Map(
    (local.detail?.urls || [])
      .filter(url => url.id)
      .map(url => [url.id as string, url.disable]),
  );
  target.detail?.urls?.forEach((url) => {
    if (!url.id)
      return;
    if (map.has(url.id))
      url.disable = map.get(url.id);
    else
      url.disable = !!local.disable;
  });
  target.flagsUpdatedAt = local.flagsUpdatedAt;
  target.packDisableUpdatedAt = local.packDisableUpdatedAt;
  target.flagItemTimes = flagItemTimesOf(local);
}

function watermark(source: SubscribeLike): number {
  const times = Object.values(flagItemTimesOf(source)).map(n => Number(n) || 0);
  return Math.max(
    flagsTimestamp(source),
    packDisableAt(source),
    ...times,
  ) || Date.now();
}

/**
 * 按源项合并开关。整包 flagsUpdatedAt 只作缺省时间与水位，不单独裁决。
 */
function applyFlagPatch(
  local: SubscribeLike,
  incoming: SubscribeLike,
  incomingTs: number,
): { applied: boolean; source: SubscribeLike } {
  const meta = getSubscribeSyncMeta(incoming);
  const flagItems = meta.flagItems || [];
  const explicitPack = typeof meta.packDisable === 'boolean';
  if (!flagItems.length && !explicitPack)
    return { applied: false, source: local };

  const localFlagsAt = flagsTimestamp(local);
  let incomingFlagsAt = flagsTimestamp(incoming, meta);
  if (incomingFlagsAt === 0 && localFlagsAt === 0)
    incomingFlagsAt = incomingTs;

  const next = cloneSource(stripSubscribeSyncWire(local) || local);
  const times = flagItemTimesOf(next);
  let applied = false;

  for (const item of flagItems) {
    if (!item?.id)
      continue;
    const t = incomingFlagItemTime(item, incomingFlagsAt);
    if (!t || t < (times[item.id] || 0))
      continue;
    const url = next.detail?.urls?.find(u => u.id === item.id);
    if (url)
      url.disable = item.disable;
    times[item.id] = t;
    applied = true;
  }

  const incomingPackAt
    = Number(meta.packDisableUpdatedAt || incoming.packDisableUpdatedAt || 0)
      || (explicitPack ? incomingFlagsAt : 0);
  if (explicitPack && incomingPackAt && incomingPackAt >= packDisableAt(next)) {
    next.disable = meta.packDisable;
    next.packDisableUpdatedAt = incomingPackAt;
    applied = true;
  }

  if (!applied)
    return { applied: false, source: local };

  next.flagItemTimes = times;
  next.flagsUpdatedAt = Math.max(watermark(next), incomingFlagsAt, localFlagsAt);
  return { applied: true, source: next };
}

export function mergeSubscribeSyncPayload(
  prev: Record<string, unknown> | undefined,
  next: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...(prev || {}), ...(next || {}) };
  const a = (prev as SubscribeLike | undefined)?._sync;
  const b = (next as SubscribeLike | undefined)?._sync;
  if (!a && !b)
    return merged;

  const flagMap = new Map<string, SubscribeSyncFlagItem>();
  for (const item of [...(a?.flagItems || []), ...(b?.flagItems || [])]) {
    if (!item?.id)
      continue;
    const existing = flagMap.get(item.id);
    if (!existing || incomingFlagItemTime(item, 0) >= incomingFlagItemTime(existing, 0))
      flagMap.set(item.id, item);
  }
  const intent: SubscribeSyncIntent
    = a?.intent === 'content' || b?.intent === 'content'
      ? 'content'
      : (b?.intent || a?.intent || 'flags');

  merged._sync = {
    ...a,
    ...b,
    intent,
    flagItems: flagMap.size ? Array.from(flagMap.values()) : b?.flagItems || a?.flagItems,
    packDisableUpdatedAt: Math.max(
      Number(a?.packDisableUpdatedAt || 0),
      Number(b?.packDisableUpdatedAt || 0),
    ) || b?.packDisableUpdatedAt || a?.packDisableUpdatedAt,
    contentUpdatedAt:
      Math.max(Number(a?.contentUpdatedAt || 0), Number(b?.contentUpdatedAt || 0))
      || b?.contentUpdatedAt
      || a?.contentUpdatedAt,
    flagsUpdatedAt:
      Math.max(Number(a?.flagsUpdatedAt || 0), Number(b?.flagsUpdatedAt || 0))
      || b?.flagsUpdatedAt
      || a?.flagsUpdatedAt,
  };
  return merged;
}

export function applySubscribeUpsert(params: {
  local: SubscribeLike | undefined;
  incoming: SubscribeLike;
  incomingTs: number;
  tomb: SubscribeTomb | undefined;
  /** snapshot=/changes 权威实体；patch=本地 op / 冲突回写 */
  mode?: 'snapshot' | 'patch';
}): { source: SubscribeLike | null; tomb: SubscribeTomb | undefined } {
  const { local, incoming, incomingTs, tomb } = params;
  const mode = params.mode || 'patch';
  const meta = getSubscribeSyncMeta(incoming);
  const incomingClean = stripSubscribeSyncWire(cloneSource(incoming))!;
  const inVer = subscribeVersion(incomingClean);

  if (!local) {
    if (tomb && (meta.intent === 'flags' || inVer <= tomb.version))
      return { source: null, tomb };
    incomingClean.contentUpdatedAt
      = Number(meta.contentUpdatedAt || incomingClean.contentUpdatedAt || incomingTs);
    return { source: incomingClean, tomb: undefined };
  }

  // 增量拉取是整条实体快照：直接采用服务端内容+开关，未上传的本地 op 由 pending 回放覆盖
  if (mode === 'snapshot') {
    const localVer = subscribeVersion(local);
    if (inVer < localVer) {
      const patched = applyFlagPatch(local, {
        ...incoming,
        _sync: {
          intent: 'flags',
          flagItems: (incomingClean.detail?.urls || [])
            .filter(url => url.id)
            .map(url => ({
              id: url.id as string,
              disable: url.disable,
              updatedAt: flagItemTimesOf(incomingClean)[url.id as string]
                || flagsTimestamp(incomingClean),
            })),
          packDisable: incomingClean.disable,
          packDisableUpdatedAt:
            packDisableAt(incomingClean) || flagsTimestamp(incomingClean),
          flagsUpdatedAt: flagsTimestamp(incomingClean),
        },
      }, incomingTs);
      return { source: patched.source, tomb };
    }
    return { source: incomingClean, tomb: undefined };
  }

  const intent = inferIntent(local, incoming);
  const localVer = subscribeVersion(local);
  const explicitFlags = hasExplicitFlags(meta);

  if (intent === 'content' && inVer >= localVer) {
    incomingClean.contentUpdatedAt
      = Number(meta.contentUpdatedAt || incomingClean.contentUpdatedAt || incomingTs);
    copyLocalFlags(incomingClean, local);
    if (!incomingClean.permissions?.length && local.permissions?.length)
      incomingClean.permissions = local.permissions;
    const patched = applyFlagPatch(incomingClean, incoming, incomingTs);
    return { source: patched.source, tomb: undefined };
  }

  if (intent === 'content' && inVer < localVer) {
    if (!explicitFlags)
      return { source: local, tomb };
    const patched = applyFlagPatch(local, incoming, incomingTs);
    return { source: patched.source, tomb };
  }

  if (intent === 'flags') {
    const patched = applyFlagPatch(local, incoming, incomingTs);
    return { source: patched.source, tomb };
  }

  return { source: local, tomb };
}

export function applySubscribeDelete(params: {
  local: SubscribeLike | undefined;
  sourceId: string;
  incomingTs: number;
  tomb: SubscribeTomb | undefined;
}): SubscribeTomb {
  const { local, sourceId, incomingTs, tomb } = params;
  return {
    sourceId,
    version: Math.max(subscribeVersion(local), tomb?.version || 0),
    deletedAt: Math.max(incomingTs, tomb?.deletedAt || 0),
  };
}

export function upsertSubscribeTomb(
  tombs: SubscribeTomb[],
  tomb: SubscribeTomb,
): SubscribeTomb[] {
  const next = tombs.filter(t => t.sourceId !== tomb.sourceId);
  next.push(tomb);
  return next;
}

export function dropSubscribeTomb(
  tombs: SubscribeTomb[],
  sourceId: string,
): SubscribeTomb[] {
  return tombs.filter(t => t.sourceId !== sourceId);
}
