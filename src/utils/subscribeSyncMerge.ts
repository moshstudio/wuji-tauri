/**
 * 订阅源增量同步合并。
 * 旧设备整包 upsert 不得覆盖较新内容；开关只作用于仍存在的源项。
 */

export type SubscribeSyncIntent = 'content' | 'flags';

export interface SubscribeSyncFlagItem {
  id: string;
  disable?: boolean;
}

export interface SubscribeSyncMeta {
  intent?: SubscribeSyncIntent;
  flagItems?: SubscribeSyncFlagItem[];
  packDisable?: boolean;
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
  const inVer = subscribeVersion(incoming);
  const localVer = subscribeVersion(local);
  if (inVer > localVer)
    return 'content';
  return 'flags';
}

function cloneSource<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function applyFlagPatch(
  local: SubscribeLike,
  incoming: SubscribeLike,
  meta: SubscribeSyncMeta,
): SubscribeLike {
  const next = cloneSource(stripSubscribeSyncWire(local) || local);
  const flagItems = meta.flagItems;
  if (flagItems?.length) {
    const flagMap = new Map(flagItems.map(item => [item.id, item.disable]));
    next.detail?.urls?.forEach((url) => {
      if (url.id && flagMap.has(url.id))
        url.disable = flagMap.get(url.id);
    });
  }
  if (typeof meta.packDisable === 'boolean')
    next.disable = meta.packDisable;
  else if (!flagItems?.length && typeof incoming.disable === 'boolean')
    next.disable = incoming.disable;
  next.flagsUpdatedAt = Math.max(
    Number(local.flagsUpdatedAt || 0),
    Number(meta.flagsUpdatedAt || 0),
  ) || Date.now();
  return next;
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
    if (item?.id)
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
}): { source: SubscribeLike | null; tomb: SubscribeTomb | undefined } {
  const { local, incoming, incomingTs, tomb } = params;
  const meta = getSubscribeSyncMeta(incoming);
  const intent = inferIntent(local, incoming);
  const incomingClean = stripSubscribeSyncWire(cloneSource(incoming))!;
  const inVer = subscribeVersion(incomingClean);

  if (!local) {
    if (tomb && (intent === 'flags' || inVer <= tomb.version))
      return { source: null, tomb };
    incomingClean.contentUpdatedAt
      = Number(meta.contentUpdatedAt || incomingClean.contentUpdatedAt || incomingTs);
    return { source: incomingClean, tomb: undefined };
  }

  const localVer = subscribeVersion(local);

  if (intent === 'content' && inVer >= localVer) {
    incomingClean.contentUpdatedAt
      = Number(meta.contentUpdatedAt || incomingClean.contentUpdatedAt || incomingTs);
    incomingClean.flagsUpdatedAt
      = Number(meta.flagsUpdatedAt || incomingClean.flagsUpdatedAt || local.flagsUpdatedAt);
    if (!incomingClean.permissions?.length && local.permissions?.length)
      incomingClean.permissions = local.permissions;
    return { source: incomingClean, tomb: undefined };
  }

  if (intent === 'flags') {
    if (meta.flagItems?.length || typeof meta.packDisable === 'boolean')
      return { source: applyFlagPatch(local, incomingClean, meta), tomb };
    // 旧客户端整包、且版本不更高：丢掉过时内容，也不用整包开关污染本地
    return { source: local, tomb };
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
