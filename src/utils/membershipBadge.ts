import { useServerStore } from '@/store';

/** 与 serverStore.hasFeature / isMembershipGatedFeature 对应的功能 key */
export const MembershipFeature = {
  BookFont: 'book_font',
  TtsVoice: 'tts_voice',
  VideoCast: 'video_cast',
} as const;

export type MembershipFeatureKey
  = (typeof MembershipFeature)[keyof typeof MembershipFeature];

/** 是否在 UI 上展示会员角标（功能标注为 VIP/Pro 专属且当前用户尚无使用权限） */
export function showMembershipBadge(feature?: string): boolean {
  if (!feature)
    return false;
  const serverStore = useServerStore();
  if (serverStore.featureList.length === 0)
    return true;
  if (serverStore.hasFeature(feature))
    return false;
  return serverStore.isMembershipGatedFeature(feature);
}
