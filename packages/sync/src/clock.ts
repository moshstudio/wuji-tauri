export interface LwwClock {
  clientUpdatedAt: number;
  deviceId?: string;
  mutationId?: string;
}

const entityTs = new Map<string, number>();

export function entityTsKey(
  type: string,
  entityId: string,
  parentId?: string,
): string {
  return `${type}|${entityId}|${parentId || ''}`;
}

export function rememberEntityTs(key: string, ts: number) {
  const prev = entityTs.get(key) || 0;
  const n = Number(ts) || 0;
  if (n > prev)
    entityTs.set(key, n);
}

export function peekEntityTs(key: string): number {
  return entityTs.get(key) || 0;
}

export function nextLogicalTime(key: string, now = Date.now()): number {
  const prev = entityTs.get(key) || 0;
  const next = Math.max(Number(now) || 0, prev + 1);
  entityTs.set(key, next);
  return next;
}

export function resetEntityTs(keyPrefix?: string) {
  if (!keyPrefix) {
    entityTs.clear();
    return;
  }
  for (const key of entityTs.keys()) {
    if (key.startsWith(keyPrefix))
      entityTs.delete(key);
  }
}

export function resetEntityTsForTests() {
  entityTs.clear();
}

export function compareLww(a: LwwClock, b: LwwClock): number {
  const at = Number(a.clientUpdatedAt || 0);
  const bt = Number(b.clientUpdatedAt || 0);
  if (at !== bt)
    return at - bt;
  const ad = a.deviceId || '';
  const bd = b.deviceId || '';
  if (ad !== bd)
    return ad < bd ? -1 : 1;
  const am = a.mutationId || '';
  const bm = b.mutationId || '';
  if (am !== bm)
    return am < bm ? -1 : 1;
  return 0;
}

export function incomingWinsPatch(
  incoming: LwwClock,
  existing?: LwwClock | null,
): boolean {
  if (!existing)
    return true;
  return compareLww(incoming, existing) > 0;
}

export function incomingWinsPull(
  incoming: LwwClock,
  existing?: LwwClock | null,
): boolean {
  if (!existing)
    return true;
  return compareLww(incoming, existing) >= 0;
}

export function clockFromItem(item: any): LwwClock {
  return {
    clientUpdatedAt: Number(item?.lastReadTime || item?.createTime || 0),
    deviceId: item?._sync?.deviceId || item?.deviceId,
    mutationId: item?._sync?.mutationId || item?.clientMutationId,
  };
}

export function clockFromOp(op: {
  clientUpdatedAt: number;
  deviceId?: string;
  clientMutationId?: string;
  mutationId?: string;
}): LwwClock {
  return {
    clientUpdatedAt: Number(op.clientUpdatedAt || 0),
    deviceId: op.deviceId,
    mutationId: op.clientMutationId || op.mutationId,
  };
}
