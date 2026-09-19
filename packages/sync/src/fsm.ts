import type { SyncTypes } from './types';

export type CloudSyncPhase
  = | 'Disabled'
    | 'Idle'
    | 'DebounceStruct'
    | 'DebounceProgress'
    | 'Pulling'
    | 'Merging'
    | 'Pushing'
    | 'Backoff'
    | 'PausedManual';

export type CloudSyncReason = 'lifecycle' | 'dirty' | 'manual' | 'retry';
export type CloudSyncStatus = 'idle' | 'syncing' | 'error';

export const STRUCTURE_DEBOUNCE_MS = 2000;
export const PROGRESS_DEBOUNCE_MS = 45000;
export const BACKOFF_STEPS_MS = [5000, 30000, 120000];

export function canUseCloudSync(params: {
  loggedIn: boolean;
  hasCloudSyncFeature: boolean;
}): boolean {
  return !!params.loggedIn && !!params.hasCloudSyncFeature;
}

export function resolvePullTypes(
  reason: CloudSyncReason,
  enabled: SyncTypes[],
  pendingTypes: SyncTypes[],
): SyncTypes[] {
  if (reason === 'lifecycle' || reason === 'manual')
    return enabled;
  const enabledSet = new Set(enabled);
  return pendingTypes.filter(t => enabledSet.has(t));
}

export function mapPhaseToStatus(phase: CloudSyncPhase): CloudSyncStatus {
  if (phase === 'Pulling' || phase === 'Merging' || phase === 'Pushing')
    return 'syncing';
  if (phase === 'Backoff')
    return 'error';
  return 'idle';
}

export function statusDetailForPhase(
  phase: CloudSyncPhase,
  reason?: CloudSyncReason,
): string {
  if (phase === 'Pushing' || reason === 'dirty' || reason === 'retry')
    return '正在上传…';
  if (phase === 'Pulling' || phase === 'Merging')
    return '正在同步…';
  if (phase === 'Backoff')
    return '同步失败，将自动重试';
  if (phase === 'Idle')
    return '已同步';
  if (phase === 'Disabled')
    return '同步已关闭或未登录';
  return '';
}

export function debounceDelayMs(hasStructure: boolean): number {
  return hasStructure ? STRUCTURE_DEBOUNCE_MS : PROGRESS_DEBOUNCE_MS;
}

export function backoffMs(index: number): number {
  return BACKOFF_STEPS_MS[Math.min(Math.max(index, 0), BACKOFF_STEPS_MS.length - 1)];
}

export function shouldSkipDirtyCycle(reason: CloudSyncReason, hasPending: boolean): boolean {
  return (reason === 'dirty' || reason === 'retry') && !hasPending;
}
