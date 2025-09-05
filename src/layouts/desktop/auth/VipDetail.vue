<script setup lang="ts">
import type {
  MembershipPlan,
  MembershipPlanBillingCycle,
  MembershipPlanLevel,
  UserInfo,
} from '@/types/user';
import AppVipDetail from '@/layouts/app/auth/VipDetail.vue';

defineProps<{
  membershipPlans?: MembershipPlan[];
  userInfo?: UserInfo;
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
    :is-exist="isExist"
    :get-pay-url="getPayUrl"
  />
</template>

<style scoped lang="less"></style>
