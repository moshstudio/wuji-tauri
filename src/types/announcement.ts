/** 公告受众，与后端 SourcePermission 用户层级一致 */
export enum AnnouncementAudience {
  NoLogin = 'noLogin',
  Login = 'login',
  Vip = 'vip',
  Pro = 'pro',
}

/** 公告条配色 */
export enum AnnouncementVariant {
  Default = 'default',
  Primary = 'primary',
  Success = 'success',
  Warning = 'warning',
  Promo = 'promo',
}

export interface Announcement {
  _id: string;
  audience: AnnouncementAudience;
  title?: string;
  content: string;
  link?: string;
  emoji?: string;
  variant?: AnnouncementVariant;
  enabled: boolean;
  sortOrder: number;
  startAt?: string;
  endAt?: string;
}
