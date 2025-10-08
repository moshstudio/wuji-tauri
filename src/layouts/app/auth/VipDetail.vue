<script setup lang="ts">
import type { MembershipPlan, UserInfo } from '@/types/user';
import { onMountedOrActivated } from '@vant/use';
import { format } from 'date-fns';
import { computed, onDeactivated, onUnmounted, ref, watch } from 'vue';
import MNavBar from '@/components/header/MNavBar.vue';
import HorizonList from '@/components/list/HorizonList.vue';
import {
  isMembershipOrderValid,
  MembershipPlanBillingCycle,
  MembershipPlanLevel,
} from '@/types/user';

const props = defineProps<{
  membershipPlans?: MembershipPlan[];
  userInfo?: UserInfo;
  isExist: (
    level: MembershipPlanLevel,
    cycle: MembershipPlanBillingCycle,
  ) => boolean;
  getPayUrl: (plan: MembershipPlan) => void;
}>();

const now = ref(Date.now());

onMountedOrActivated(() => {
  const timer = setInterval(() => {
    now.value = Date.now();
  }, 1000);
  onDeactivated(() => {
    clearInterval(timer);
  });
  onUnmounted(() => {
    clearInterval(timer);
  });
});

const isVip = computed(() => {
  return (
    isMembershipOrderValid(props.userInfo?.vipMembershipPlan, now.value) ||
    isMembershipOrderValid(props.userInfo?.superVipMembershipPlan, now.value)
  );
});

const vipPlans = computed(() => {
  return (
    props.membershipPlans?.filter(
      (plan) => plan.level === MembershipPlanLevel.Vip,
    ) || []
  );
});
const sVipPlans = computed(() => {
  return (
    props.membershipPlans?.filter(
      (plan) => plan.level === MembershipPlanLevel.SuperVip,
    ) || []
  );
});

const active = ref(0);
const selectedVipPlan = ref<MembershipPlan>();
const selectedSvipPlan = ref<MembershipPlan>();
const payMethod = ref<'alipay' | 'wechat'>('alipay');

const currentPlans = computed(() => {
  return active.value === 0 ? vipPlans.value : sVipPlans.value;
});

function selectVipPlan(plan: MembershipPlan) {
  selectedVipPlan.value = plan;
}
function selectSvipPlan(plan: MembershipPlan) {
  selectedSvipPlan.value = plan;
}

// 初始化选择第一个计划
watch(
  vipPlans,
  (plans) => {
    if (plans.length > 0 && !selectedVipPlan.value) {
      selectedVipPlan.value = plans[0];
    }
  },
  { immediate: true },
);
watch(
  sVipPlans,
  (plans) => {
    if (plans.length > 0 && !selectedSvipPlan.value) {
      selectedSvipPlan.value = plans[0];
    }
  },
  { immediate: true },
);
</script>

<template>
  <div
    class="relative flex h-full w-full flex-col overflow-auto bg-[var(--van-background-color)]"
  >
    <MNavBar title="会员计划" />

    <!-- 会员状态显示 -->
    <div v-if="isVip" class="px-4 py-3 shadow-sm">
      <div class="mb-1 text-sm text-gray-600 dark:text-gray-300">您的会员</div>
      <div
        v-if="isMembershipOrderValid(userInfo?.vipMembershipPlan, now)"
        class="flex items-center gap-2"
      >
        <p class="w-8 font-bold text-orange-500">VIP</p>
        <p
          v-if="userInfo?.vipMembershipPlan?.endDate"
          class="text-xs text-gray-500 dark:text-gray-400"
        >
          {{ format(userInfo.vipMembershipPlan.endDate, 'yyyy年MM月dd日') }}到期
        </p>
      </div>
      <div
        v-if="isMembershipOrderValid(userInfo?.superVipMembershipPlan, now)"
        class="mt-1 flex items-center gap-2"
      >
        <p class="w-8 font-bold text-pink-500">SVIP</p>
        <p
          v-if="userInfo?.superVipMembershipPlan?.endDate"
          class="text-xs text-gray-500 dark:text-gray-400"
        >
          {{
            format(userInfo.superVipMembershipPlan.endDate, 'yyyy年MM月dd日')
          }}到期
        </p>
      </div>
    </div>
    <div v-else class="flex h-12 items-center px-4 py-3 shadow-sm">
      <span class="text-sm text-gray-600 dark:text-gray-300">
        您未开通任何会员
      </span>
    </div>

    <van-tabs
      v-model:active="active"
      shrink
      animated
      swipeable
      class="flex-grow"
    >
      <van-tab title="VIP会员">
        <div class="p-4">
          <HorizonList class="mb-6 gap-3">
            <div
              v-for="plan in vipPlans"
              :key="plan._id"
              class="flex w-28 flex-col items-center justify-start rounded-xl border-2 p-4 transition-all duration-200"
              :class="{
                'border-orange-400 bg-gradient-to-br from-orange-50 to-amber-50 shadow-md dark:from-orange-900/30 dark:to-amber-900/30':
                  selectedVipPlan?._id === plan._id,
                '!dark:bg-gray-800 border-gray-200 !bg-white dark:border-gray-700 dark:!bg-gray-800':
                  selectedVipPlan?._id !== plan._id,
              }"
              @click="selectVipPlan(plan)"
            >
              <p
                class="mb-2 text-center font-bold text-gray-800 dark:text-gray-200"
              >
                {{
                  plan.billingCycle === MembershipPlanBillingCycle.Lifetime
                    ? '永久'
                    : plan.billingCycle === MembershipPlanBillingCycle.Yearly
                      ? '年费'
                      : '月费'
                }}
              </p>
              <div
                class="flex items-baseline gap-1 text-orange-600 dark:text-orange-400"
              >
                <span class="text-sm">¥</span>
                <span class="text-2xl font-bold">{{ plan.price }}</span>
              </div>
              <p
                class="mt-2 line-clamp-2 text-center text-xs text-gray-500 dark:text-gray-400"
              >
                {{
                  plan.billingCycle === MembershipPlanBillingCycle.Lifetime
                    ? '一次购买永久有效'
                    : plan.billingCycle === MembershipPlanBillingCycle.Yearly
                      ? `平均每月¥${(plan.price / 12).toFixed(2)}`
                      : '灵活选择'
                }}
              </p>
            </div>
          </HorizonList>

          <van-radio-group v-model="payMethod" class="mb-6">
            <van-cell-group inset>
              <van-cell title="支付宝" clickable @click="payMethod = 'alipay'">
                <template #right-icon>
                  <van-radio name="alipay" />
                </template>
              </van-cell>
            </van-cell-group>
          </van-radio-group>

          <div class="flex justify-center">
            <van-button
              type="primary"
              size="large"
              class="w-4/5 rounded-full border-0 bg-gradient-to-r from-orange-500 to-amber-500 shadow-lg"
              @click="selectedVipPlan && getPayUrl(selectedVipPlan)"
            >
              <span class="pr-1">¥{{ selectedVipPlan?.price }}</span>
              <span>立即开通</span>
            </van-button>
          </div>
          <!-- 会员特权说明 -->
          <div class="pb-6 pt-2">
            <van-cell-group
              inset
              :title="active === 0 ? 'VIP专属特权' : 'SVIP专属特权'"
            >
              <van-cell title="专属订阅源" />
              <van-cell title="服务器数据同步" />
              <van-cell title="更多功能实现中..." />
            </van-cell-group>
            <div
              class="mt-4 text-center text-xs text-gray-500 dark:text-gray-400"
            >
              客服支持qq: 3976424284
            </div>
          </div>
        </div>
      </van-tab>

      <van-tab title="SVIP会员">
        <div class="p-4">
          <HorizonList class="mb-6 gap-3">
            <div
              v-for="plan in sVipPlans"
              :key="plan._id"
              class="flex w-28 flex-col items-center justify-start rounded-xl border-2 p-4 transition-all duration-200"
              :class="{
                'border-purple-400 bg-gradient-to-br from-purple-50 to-pink-50 shadow-md dark:from-purple-900/30 dark:to-pink-900/30':
                  selectedSvipPlan?._id === plan._id,
                'border-gray-200 !bg-white dark:border-gray-700 dark:!bg-gray-800':
                  selectedSvipPlan?._id !== plan._id,
              }"
              @click="selectSvipPlan(plan)"
            >
              <p
                class="mb-2 line-clamp-2 text-center font-bold text-gray-800 dark:text-gray-200"
              >
                {{
                  plan.billingCycle === MembershipPlanBillingCycle.Lifetime
                    ? '永久'
                    : plan.billingCycle === MembershipPlanBillingCycle.Yearly
                      ? '年费'
                      : '月费'
                }}
              </p>
              <div
                class="flex items-baseline gap-1 text-purple-600 dark:text-purple-400"
              >
                <span class="text-sm">¥</span>
                <span class="text-2xl font-bold">{{ plan.price }}</span>
              </div>
              <p
                class="mt-2 text-center text-xs text-gray-500 dark:text-gray-400"
              >
                {{
                  plan.billingCycle === MembershipPlanBillingCycle.Lifetime
                    ? '一次购买永久有效'
                    : plan.billingCycle === MembershipPlanBillingCycle.Yearly
                      ? `平均每月¥${(plan.price / 12).toFixed(2)}`
                      : '尊享体验'
                }}
              </p>
            </div>
          </HorizonList>

          <van-radio-group v-model="payMethod" class="mb-6">
            <van-cell-group inset>
              <van-cell title="支付宝" clickable @click="payMethod = 'alipay'">
                <template #right-icon>
                  <van-radio name="alipay" />
                </template>
              </van-cell>
            </van-cell-group>
          </van-radio-group>

          <div class="flex justify-center">
            <van-button
              type="primary"
              size="large"
              class="w-4/5 rounded-full border-0 bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg"
              @click="selectedSvipPlan && getPayUrl(selectedSvipPlan)"
            >
              <span class="pr-1">¥{{ selectedSvipPlan?.price }}</span>
              <span>立即开通</span>
            </van-button>
          </div>
          <!-- 会员特权说明 -->
          <div class="pb-6 pt-2">
            <van-cell-group
              inset
              :title="active === 0 ? 'VIP专属特权' : 'SVIP专属特权'"
            >
              <van-cell title="专属订阅源" />
              <van-cell title="服务器数据同步" />
              <van-cell title="更多功能实现中..." />
            </van-cell-group>
            <div
              class="mt-4 text-center text-xs text-gray-500 dark:text-gray-400"
            >
              客服支持qq: 3976424284
            </div>
          </div>
        </div>
      </van-tab>
    </van-tabs>
  </div>
</template>

<style scoped lang="less">
:deep(.van-tabs__nav) {
  background-color: transparent;
}

/* 暗色模式适配 */
</style>
