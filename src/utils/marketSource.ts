import {
  MarketSource,
  MarketSourcePermission,
} from '@wuji-tauri/source-extension';
import _ from 'lodash';
import { TagProps } from 'vant';

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
    name: '超级会员',
    permissions: [MarketSourcePermission.SuperVip],
    style: {
      type: 'primary',
      plain: false,
    },
  },
  {
    name: '会员和超级会员',
    permissions: [MarketSourcePermission.Vip, MarketSourcePermission.SuperVip],
    style: {
      type: 'primary',
      plain: false,
    },
  },
];

export const permissionText = (source: MarketSource) => {
  return permissionRules.find((rule) =>
    _.isEqual(rule.permissions, source.permissions),
  )?.name;
};
export const permissionStyle = (source: MarketSource) => {
  return permissionRules.find((rule) =>
    _.isEqual(rule.permissions, source.permissions),
  )?.style;
};

export default { permissionRules, permissionText, permissionStyle };
