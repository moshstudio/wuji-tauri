import type { MarketSource } from '@wuji-tauri/source-extension';
import type { TagProps } from 'vant';
import { MarketSourcePermission } from '@wuji-tauri/source-extension';

/** 后端历史枚举，兼容旧数据 */
const LEGACY_PERMISSION: Record<string, MarketSourcePermission> = {
  superVip: MarketSourcePermission.Pro,
};

/** 将接口返回的权限规范化为当前枚举（含 superVip → pro），供展示与权限判断共用 */
export function normalizeMarketSourcePermissions(
  permissions: MarketSourcePermission[] | string[] | undefined,
): MarketSourcePermission[] {
  if (!permissions?.length)
    return [];
  return permissions.map((p) => {
    const s = String(p);
    return LEGACY_PERMISSION[s] ?? (s as MarketSourcePermission);
  });
}

function permissionsMatch(
  a: MarketSourcePermission[],
  b: MarketSourcePermission[],
): boolean {
  if (a.length !== b.length)
    return false;
  const sa = [...a].map(String).sort();
  const sb = [...b].map(String).sort();
  for (let i = 0; i < sa.length; i++) {
    if (sa[i] !== sb[i])
      return false;
  }
  return true;
}

export const permissionRules: {
  name: string;
  permissions: MarketSourcePermission[];
  style: Partial<TagProps>;
}[] = [
  {
    name: '无需登录',
    permissions: [MarketSourcePermission.NoLogin],
    style: {
      type: 'warning',
      plain: true,
    },
  },
  {
    name: '需要登录',
    permissions: [MarketSourcePermission.Login],
    style: {
      type: 'success',
      plain: true,
    },
  },
  {
    name: '会员',
    permissions: [MarketSourcePermission.Vip],
    style: {
      type: 'success',
      plain: false,
    },
  },
  {
    name: 'PRO',
    permissions: [MarketSourcePermission.Pro],
    style: {
      type: 'primary',
      plain: false,
    },
  },
  {
    name: '会员和PRO',
    permissions: [MarketSourcePermission.Vip, MarketSourcePermission.Pro],
    style: {
      type: 'primary',
      plain: false,
    },
  },
];

export function findPermissionRule(
  permissions: MarketSourcePermission[] | string[] | undefined,
) {
  const normalized = normalizeMarketSourcePermissions(permissions);
  return permissionRules.find(rule =>
    permissionsMatch(rule.permissions, normalized),
  );
}

export function permissionText(source: MarketSource) {
  return findPermissionRule(source.permissions)?.name;
}
export function permissionStyle(source: MarketSource) {
  return findPermissionRule(source.permissions)?.style;
}

export function isExclusiveMarketSource(
  permissions: MarketSourcePermission[] | string[] | undefined,
): boolean {
  const normalized = normalizeMarketSourcePermissions(permissions);
  return (
    normalized.includes(MarketSourcePermission.Vip)
    || normalized.includes(MarketSourcePermission.Pro)
  );
}

export function isProOnlyMarketSource(
  permissions: MarketSourcePermission[] | string[] | undefined,
): boolean {
  const normalized = normalizeMarketSourcePermissions(permissions);
  return (
    normalized.includes(MarketSourcePermission.Pro)
    && !normalized.includes(MarketSourcePermission.Vip)
  );
}

/** VIP/PRO 专属源在会员有效期内可用；权限未知时放行（兼容旧数据） */
export function canAccessExclusiveSource(
  permissions: MarketSourcePermission[] | string[] | undefined,
  ctx: { isVip: boolean; isPro: boolean },
): boolean {
  if (!isExclusiveMarketSource(permissions))
    return true;
  if (isProOnlyMarketSource(permissions))
    return ctx.isPro;
  return ctx.isVip || ctx.isPro;
}

export default { permissionRules, permissionText, permissionStyle };
