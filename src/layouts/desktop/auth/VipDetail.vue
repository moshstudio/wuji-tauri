<script setup lang="ts">
import type {
  Feature,
  MembershipPlan,
  MembershipPlanBillingCycle,
  MembershipPlanLevel,
  UserInfo,
} from '@/types/user';
import AppVipDetail from '@/layouts/app/auth/VipDetail.vue';

defineProps<{
  membershipPlans?: MembershipPlan[];
  userInfo?: UserInfo;
  featureList?: Feature[];
  isExist: (
    level: MembershipPlanLevel,
    cycle: MembershipPlanBillingCycle,
  ) => boolean;
  getPayUrl: (plan: MembershipPlan) => void;
}>();
</script>

<template>
  <AppVipDetail
    :membership-plans="membershipPlans"
    :user-info="userInfo"
    :feature-list="featureList"
    :is-exist="isExist"
    :get-pay-url="getPayUrl"
  />
</template>

<style scoped lang="less"></style>
