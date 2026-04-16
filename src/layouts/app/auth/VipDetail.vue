<script setup lang="ts">
import type { Feature, MembershipPlan, UserInfo } from '@/types/user';
import { onMountedOrActivated } from '@vant/use';
import { format } from 'date-fns';
import { storeToRefs } from 'pinia';
import { computed, onDeactivated, onUnmounted, ref, watch } from 'vue';
import MNavBar from '@/components/header/MNavBar.vue';
import HorizonList from '@/components/list/HorizonList.vue';
import { useDisplayStore } from '@/store/displayStore';
import {
  isMembershipOrderValid,
  MembershipPlanBillingCycle,
  MembershipPlanLevel,
} from '@/types/user';

const props = defineProps<{
  membershipPlans?: MembershipPlan[];
  userInfo?: UserInfo;
  featureList?: Feature[];
  isExist: (
    level: MembershipPlanLevel,
    cycle: MembershipPlanBillingCycle,
  ) => boolean;
  getPayUrl: (plan: MembershipPlan) => void;
}>();

const displayStore = useDisplayStore();
const { isAppView } = storeToRefs(displayStore);

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
    isMembershipOrderValid(props.userInfo?.vipMembershipPlan, now.value)
    || isMembershipOrderValid(props.userInfo?.proMembershipPlan, now.value)
  );
});

const vipPlans = computed(() => {
  return (
    props.membershipPlans?.filter(
      plan => plan.level === MembershipPlanLevel.Vip,
    ) || []
  );
});
const proPlans = computed(() => {
  return (
    props.membershipPlans?.filter(
      plan => plan.level === MembershipPlanLevel.Pro,
    ) || []
  );
});

const active = ref(0);
const selectedVipPlan = ref<MembershipPlan>();
const selectedProPlan = ref<MembershipPlan>();
const payMethod = ref<'alipay' | 'wechat'>('alipay');

function selectVipPlan(plan: MembershipPlan) {
  selectedVipPlan.value = plan;
}
function selectProPlan(plan: MembershipPlan) {
  selectedProPlan.value = plan;
}

const displayFeatures = computed(() => {
  if (!props.featureList)
    return [];
  return props.featureList
    .filter(f => active.value === 0 ? f.enableVip : f.enablePro)
    .sort((a, b) => a.sortOrder - b.sortOrder);
});
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
  proPlans,
  (plans) => {
    if (plans.length > 0 && !selectedProPlan.value) {
      selectedProPlan.value = plans[0];
    }
  },
  { immediate: true },
);
</script>

<template>
  <div
    class="relative flex h-full w-full flex-col bg-[var(--van-background-color)]"
  >
    <MNavBar title="会员计划" />
    <div
      class="flex flex-grow flex-col overflow-hidden"
      :class="{ 'p-4': !isAppView }"
    >
      <!-- 会员状态显示 -->
      <div v-if="isVip" class="px-4 py-3 shadow-sm">
        <div class="mb-1 text-sm text-gray-600 dark:text-gray-300">
          您的会员
        </div>
        <div
          v-if="isMembershipOrderValid(userInfo?.vipMembershipPlan, now)"
          class="flex items-center gap-2"
        >
          <p class="w-8 font-bold text-orange-500">
            VIP
          </p>
          <p
            v-if="userInfo?.vipMembershipPlan?.endDate"
            class="text-xs text-gray-500 dark:text-gray-400"
          >
            {{ format(userInfo.vipMembershipPlan.endDate, 'yyyy年MM月dd日') }}到期
          </p>
        </div>
        <div
          v-if="isMembershipOrderValid(userInfo?.proMembershipPlan, now)"
          class="mt-1 flex items-center gap-2"
        >
          <p class="w-8 font-bold text-pink-500">
            PRO
          </p>
          <p
            v-if="userInfo?.proMembershipPlan?.endDate"
            class="text-xs text-gray-500 dark:text-gray-400"
          >
            {{
              format(userInfo.proMembershipPlan.endDate, 'yyyy年MM月dd日')
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
        class="flex-grow overflow-auto"
      >
        <van-tab title="VIP会员">
          <div v-if="vipPlans.length > 0" class="p-4">
            <HorizonList class="mb-6 gap-3">
              <div
                v-for="plan in vipPlans"
                :key="plan._id"
                class="flex h-36 w-28 shrink-0 flex-col items-center justify-start rounded-xl border-2 p-4 transition-all duration-200"
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
                        : plan.billingCycle === MembershipPlanBillingCycle.Quarterly
                          ? '季费'
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
                        : plan.billingCycle === MembershipPlanBillingCycle.Quarterly
                          ? `平均每月¥${(plan.price / 3).toFixed(2)}`
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
                :title="active === 0 ? 'VIP专属特权' : 'PRO专属特权'"
              >
                <van-cell
                  v-for="f in displayFeatures"
                  :key="f.key"
                  :title="f.label"
                  :label="f.description"
                />
                <van-cell v-if="!displayFeatures.length" title="专属功能开发中..." />
              </van-cell-group>
              <div
                class="mt-4 text-center text-xs text-gray-500 dark:text-gray-400"
              >
                客服支持qq: 3976424284
              </div>
            </div>
          </div>
          <div v-else class="flex flex-col items-center justify-center pt-20">
            <van-empty description="暂未开放该会员方案" />
          </div>
        </van-tab>

        <van-tab title="PRO会员">
          <div v-if="proPlans.length > 0" class="p-4">
            <HorizonList class="mb-6 gap-3">
              <div
                v-for="plan in proPlans"
                :key="plan._id"
                class="flex h-36 w-28 shrink-0 flex-col items-center justify-start rounded-xl border-2 p-4 transition-all duration-200"
                :class="{
                  'border-purple-400 bg-gradient-to-br from-purple-50 to-pink-50 shadow-md dark:from-purple-900/30 dark:to-pink-900/30':
                    selectedProPlan?._id === plan._id,
                  'border-gray-200 !bg-white dark:border-gray-700 dark:!bg-gray-800':
                    selectedProPlan?._id !== plan._id,
                }"
                @click="selectProPlan(plan)"
              >
                <p
                  class="mb-2 line-clamp-2 text-center font-bold text-gray-800 dark:text-gray-200"
                >
                  {{
                    plan.billingCycle === MembershipPlanBillingCycle.Lifetime
                      ? '永久'
                      : plan.billingCycle === MembershipPlanBillingCycle.Yearly
                        ? '年费'
                        : plan.billingCycle === MembershipPlanBillingCycle.Quarterly
                          ? '季费'
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
                  class="mt-2 line-clamp-2 text-center text-xs text-gray-500 dark:text-gray-400"
                >
                  {{
                    plan.billingCycle === MembershipPlanBillingCycle.Lifetime
                      ? '一次购买永久有效'
                      : plan.billingCycle === MembershipPlanBillingCycle.Yearly
                        ? `平均每月¥${(plan.price / 12).toFixed(2)}`
                        : plan.billingCycle === MembershipPlanBillingCycle.Quarterly
                          ? `平均每月¥${(plan.price / 3).toFixed(2)}`
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
                @click="selectedProPlan && getPayUrl(selectedProPlan)"
              >
                <span class="pr-1">¥{{ selectedProPlan?.price }}</span>
                <span>立即开通</span>
              </van-button>
            </div>
            <!-- 会员特权说明 -->
            <div class="pb-6 pt-2">
              <van-cell-group
                inset
                :title="active === 0 ? 'VIP专属特权' : 'PRO专属特权'"
              >
                <van-cell
                  v-for="f in displayFeatures"
                  :key="f.key"
                  :title="f.label"
                  :label="f.description"
                />
                <van-cell v-if="!displayFeatures.length" title="更多功能实现中..." />
              </van-cell-group>
              <div
                class="mt-4 text-center text-xs text-gray-500 dark:text-gray-400"
              >
                客服支持qq: 3976424284
              </div>
            </div>
          </div>
          <div v-else class="flex flex-col items-center justify-center pt-20">
            <van-empty description="暂未开放该会员方案" />
          </div>
        </van-tab>
      </van-tabs>
    </div>
  </div>
</template>

<style scoped lang="less">
:deep(.van-tabs__nav) {
  background-color: transparent;
}

/* 暗色模式适配 */
</style>
