export function parseServerErrorMessage(payload: unknown): string {
  if (!payload || typeof payload !== 'object')
    return '';
  const message = (payload as { message?: unknown }).message;
  if (Array.isArray(message))
    return message.filter(Boolean).map(String).join('，');
  return typeof message === 'string' ? message : '';
}

export function isMarketSourceUnavailableMessage(message: string): boolean {
  return /已被封禁|未公开|无法更新/.test(message);
}

export function formatSubscribeSourcesUpdateNotify(input: {
  updatingOne: boolean;
  failed: string[];
  unavailable: string[];
  skippedExclusive: string[];
}): { type: 'warning' | 'success'; message: string } {
  const { updatingOne, failed, unavailable, skippedExclusive } = input;
  if (unavailable.length && !failed.length) {
    if (updatingOne)
      return { type: 'warning', message: '该源无法更新' };
    if (unavailable.length === 1)
      return { type: 'warning', message: `${unavailable[0]} 无法更新` };
    return {
      type: 'warning',
      message: `更新完成，${unavailable.length} 个订阅源无法更新`,
    };
  }
  if (failed.length && unavailable.length) {
    return {
      type: 'warning',
      message: `${unavailable.length} 个订阅源无法更新，${failed.length} 个更新失败`,
    };
  }
  if (failed.length) {
    return {
      type: 'warning',
      message: `${failed.length} 个订阅源更新失败`,
    };
  }
  if (skippedExclusive.length) {
    return {
      type: 'success',
      message: `更新完成，已跳过 ${skippedExclusive.length} 个会员专属源`,
    };
  }
  return { type: 'success', message: '更新订阅源成功' };
}
