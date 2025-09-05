<script setup lang="ts">
import type {
  MembershipPlan,
  MembershipPlanBillingCycle,
  MembershipPlanLevel,
} from '@/types/user';
import { openUrl } from '@tauri-apps/plugin-opener';
import { storeToRefs } from 'pinia';
import { showDialog } from 'vant';
import { onActivated, onMounted } from 'vue';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import AppVipDetail from '@/layouts/app/auth/VipDetail.vue';
import DesktopVipDetail from '@/layouts/desktop/auth/VipDetail.vue';
import { useServerStore } from '@/store';

const serverStore = useServerStore();
const { membershipPlans, userInfo } = storeToRefs(serverStore);

function isExist(
  level: MembershipPlanLevel,
  cycle: MembershipPlanBillingCycle,
) {
  return (
    membershipPlans.value?.some(
      (plan) => plan.level === level && plan.billingCycle === cycle,
    ) || false
  );
}

async function genPayUrl(plan: MembershipPlan) {
  const url = await serverStore.getAliPayUrl(plan);
  if (!url) {
    showDialog({
      title: '提示',
      message: '支付失败，请稍后再试',
    });
  } else {
    openUrl(url);
    showDialog({
      title: '提示',
      message:
        '将跳转至浏览器支付\n如未跳转, 请尝试重置默认浏览器。\n支付成功后, 请重启软件。',
    });
  }
}

onMounted(() => {
  serverStore.getMembershipPlans();
});
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppVipDetail
        :membership-plans="membershipPlans"
        :user-info="userInfo"
        :is-exist="isExist"
        :get-pay-url="genPayUrl"
      />
    </template>
    <template #desktop>
      <DesktopVipDetail
        :membership-plans="membershipPlans"
        :user-info="userInfo"
        :is-exist="isExist"
        :get-pay-url="genPayUrl"
      />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
