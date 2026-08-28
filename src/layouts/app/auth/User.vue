<script lang="ts" setup>
import type { UserInfo } from '@/types/user';
import { onMountedOrActivated } from '@vant/use';
import { storeToRefs } from 'pinia';
import { onDeactivated, onUnmounted, reactive, ref, watch } from 'vue';
import ProButton from '@/components/button/ProButton.vue';
import VipButton from '@/components/button/VipButton.vue';
import MNavBar from '@/components/header/MNavBar.vue';
import { router } from '@/router';
import { useCloudSyncScheduler, useCloudSyncSettings } from '@/store';
import { isMembershipOrderValid } from '@/types/user';
import { showPromptDialog } from '@/utils/usePromptDialog';

const props = defineProps<{
  userInfo?: UserInfo;
  showTaichiTrailNotice: boolean;
  getUserInfo: () => Promise<void>;
  updateUserInfo: (
    userInfo: Partial<Omit<UserInfo, 'uuid' | 'email' | 'isVerified'>>,
  ) => Promise<void>;
  resetPassword: () => void;
  logout: () => void;
  clickEmail: () => void;
}>();

const cloudSyncSettings = useCloudSyncSettings();
const cloudSyncScheduler = useCloudSyncScheduler();
const { enableCloudSync, lastSyncAt, lastSyncError } = storeToRefs(cloudSyncSettings);
const { status, statusDetail } = storeToRefs(cloudSyncScheduler);

const tmpUserInfo = reactive<Partial<UserInfo>>({});
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

const isRefreshing = ref(false);

async function onRefresh() {
  isRefreshing.value = true;
  await props.getUserInfo();
  isRefreshing.value = false;
}

watch(
  () => props.userInfo,
  () => {
    if (props.userInfo) {
      Object.assign(tmpUserInfo, props.userInfo);
    }
  },
  { immediate: true },
);

function updateName() {
  showPromptDialog({
    title: '修改用户名',
    message: '请输入新的用户名',
    defaultValue: tmpUserInfo.name,
    confirmText: '修改昵称',
  }).then(async (name) => {
    if (name) {
      await props.updateUserInfo({ name });
    }
  });
}

function formatSyncTime(ts: number | null | undefined) {
  if (!ts)
    return '尚未同步';
  try {
    return new Date(ts).toLocaleString();
  }
  catch {
    return '尚未同步';
  }
}

async function onSyncNow() {
  await cloudSyncScheduler.syncNow();
}
</script>

<template>
  <div class="relative flex h-full w-full flex-col overflow-hidden">
    <MNavBar title="个人中心" />
    <div
      class="flex w-full grow select-none flex-col gap-2 overflow-y-auto bg-[--van-background] p-2"
    >
      <template v-if="!userInfo">
        <h2 class="flex items-center justify-center p-2">
          请先登录
        </h2>
        <van-button
          @click="
            () => {
              router.push({ name: 'Login' });
            }
          "
        >
          登录
        </van-button>
      </template>
      <template v-else>
        <van-notice-bar
          v-if="showTaichiTrailNotice"
          mode="link"
          @click="
            () => {
              router.push({ name: 'TaiChiFreeTrail' });
            }
          "
        >
          太极用户免费领会员!
        </van-notice-bar>
        <van-pull-refresh
          v-model="isRefreshing"
          v-remember-scroll
          :head-height="100"
          class="main flex-grow overflow-y-auto overflow-x-hidden"
          @refresh="onRefresh"
        >
          <van-cell-group inset class="user-info-section">
            <van-cell center class="avatar">
              <template #title>
                <div class="flex items-center gap-2">
                  <div class="h-[42px] w-[42px]">
                    <van-image
                      round
                      width="42px"
                      height="42px"
                      :src="tmpUserInfo.photo || ''"
                    />
                  </div>
                </div>
              </template>
              <template #value>
                <div class="flex-grow">
                  <p class="text-sm" @click="updateName">
                    {{ userInfo.name || '设置昵称' }}
                  </p>
                </div>
              </template>
              <template v-if="!tmpUserInfo.isVerified" #label>
                <span class="text-red-500">账号未验证</span>
              </template>
            </van-cell>
            <van-cell
              title="邮箱"
              :value="tmpUserInfo.email"
              clickable
              class="email"
              @click="clickEmail"
            />
            <van-cell
              is-link
              clickable
              @click="
                () => {
                  router.push({ name: 'VipDetail' });
                }
              "
            >
              <template #title>
                <div class="flex items-center gap-2">
                  <VipButton
                    :is-vip="
                      isMembershipOrderValid(userInfo.vipMembershipPlan, now)
                    "
                    :on-click="() => {}"
                  />
                  <ProButton
                    :is-pro="
                      isMembershipOrderValid(
                        userInfo.proMembershipPlan,
                        now,
                      )
                    "
                    :on-click="() => {}"
                  />
                </div>
              </template>
            </van-cell>
          </van-cell-group>

          <van-cell-group inset class="mt-4">
            <van-cell
              title="自动同步"
            >
              <template #right-icon>
                <van-switch
                  v-model="enableCloudSync"
                  size="20px"
                />
              </template>
            </van-cell>
            <van-cell
              class="sync-status-cell"
              title="同步状态"
              :is-link="status !== 'syncing'"
              :value="status === 'syncing' ? '同步中' : '立即同步'"
              @click="status !== 'syncing' && onSyncNow()"
            >
              <template #label>
                <span class="sync-status-label">
                  {{
                    status === 'syncing'
                      ? statusDetail || '同步中…'
                      : status === 'error'
                        ? (lastSyncError || statusDetail || '同步失败')
                        : `上次同步：${formatSyncTime(lastSyncAt)}`
                  }}
                </span>
              </template>
            </van-cell>
            <van-cell
              title="管理同步数据"
              label="选择要同步的数据类型"
              is-link
              @click="
                () => {
                  router.push({ name: 'ManageSync' });
                }
              "
            />
            <van-cell
              title="手动上传"
              is-link
              @click="
                () => {
                  router.push({ name: 'SyncToServer' });
                }
              "
            />
            <van-cell
              title="手动下载"
              is-link
              @click="
                () => {
                  router.push({ name: 'SyncFromServer' });
                }
              "
            />
          </van-cell-group>

          <!-- 操作按钮 -->
          <van-cell-group inset class="action-section mt-4">
            <van-cell title="重置密码" is-link @click="resetPassword" />
            <van-cell title="退出登录" is-link @click="logout" />
          </van-cell-group>
        </van-pull-refresh>
      </template>
    </div>
  </div>
</template>

<style scoped lang="less">
:deep(.email .van-cell__value) {
  flex: 2;
}
:deep(.avatar .van-cell__value) {
  flex: 2;
}
:deep(.sync-status-cell .van-cell__label) {
  overflow: hidden;
}
.sync-status-label {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
