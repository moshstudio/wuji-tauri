import type { ClientOptions } from '@wuji-tauri/fetch';
import type {
  MarketSource,
  MarketSourceContent,
  MarketSourcePermission,
  PagedMarketSource,
} from '@wuji-tauri/source-extension';
import type { Announcement } from '@/types/announcement';
import type { SyncDownloadRecord, SyncUploadItem } from '@/types/cloudSync';
import type { SyncChangesResponse } from '@/types/cloudSyncChanges';
import type { CloudSyncOp } from '@/types/cloudSyncOp';
import type { SyncTypes } from '@/types/sync';
import type { Feature, MembershipPlan } from '@/types/user';
import * as os from '@tauri-apps/plugin-os';
import { useStorageAsync } from '@vueuse/core';
import { fetch } from '@wuji-tauri/fetch';
import { plainToClass } from 'class-transformer';
import { defineStore } from 'pinia';
import validator from 'validator';
import {
  closeDialog,
  closeNotify,
  showDialog,
  showFailToast,
  showLoadingToast,
  showNotify,
  showSuccessToast,
} from 'vant';
import { computed, onMounted, ref, triggerRef, watch } from 'vue';
import { isMembershipOrderValid, UserInfo } from '@/types/user';
import { sleep } from '@/utils';
import { getDeviceId } from '@/utils/device';
import { showVipDialog } from '@/utils/vip';
import { createKVStore, useDisplayStore } from '.';

/** 传给 sendRequest 的 errorHandler：表示未带 token 却收到 401 */
export interface SendRequestErrorContext {
  guestUnauthorized?: boolean;
}

type SendRequestOptions = RequestInit
  & ClientOptions & {
    /** 未登录收到 401 时不提示（仅用于后台拉取等场景） */
    silentGuest401?: boolean;
    /** 失败时不弹错误（后台补全权限等） */
    silent?: boolean;
  };
let API_BASE_URL: string;
// 开发可在 .env.development 设置 VITE_API_BASE_URL=http://localhost:3000/v1/api/
API_BASE_URL
  = import.meta.env.VITE_API_BASE_URL
    || 'https://wuji-server.moshangwangluo.com/v1/api/';

if (import.meta.env.MODE !== 'development') {
  API_BASE_URL
    = import.meta.env.VITE_API_BASE_URL
      || 'https://wuji-server.moshangwangluo.com/v1/api/';
}

if (!API_BASE_URL.endsWith('/'))
  API_BASE_URL += '/';

export const useServerStore = defineStore('serverStore', () => {
  const kvStorage = createKVStore('serverStore');
  const storage = kvStorage.storage;

  const now = ref(Date.now());

  const accessToken = useStorageAsync<string | undefined>(
    'accessToken',
    undefined,
  );
  const userInfo = useStorageAsync<UserInfo | undefined>(
    'userInfo',
    undefined,
    storage,
    {
      serializer: {
        read: async (raw: string) => {
          if (!raw)
            return undefined;
          return JSON.parse(raw);
        },
        write: async (value: UserInfo | undefined) => {
          if (!value)
            return '';
          return JSON.stringify(value);
        },
      },
    },
  );

  const _request = async (
    endpoint: string,
    options: RequestInit & ClientOptions = {},
  ) => {
    const headers = new Headers(options.headers);
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    if (accessToken.value && accessToken.value !== 'undefined') {
      headers.set('Authorization', `Bearer ${accessToken.value}`);
    }
    try {
      console.log('request', `${API_BASE_URL}${endpoint}`, options);

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        accessToken.value = undefined;
        userInfo.value = null;
      }
      if (response.ok) {
        if (response.headers.has('new-access-token')) {
          accessToken.value = response.headers.get('new-access-token');
        }
      }

      return response;
    }
    catch (error) {
      return Response.error();
    }
  };

  const handleError = (response: Response) => {
    if (response.status === 500) {
      showDialog({
        title: '服务器错误',
        message: '服务器发生错误，请稍后再试。',
        showCancelButton: false,
      });
    }
    else {
      response.text().then(async (data) => {
        console.warn('server handle error', data);

        if (data.trim() === '') {
          showNotify({
            message: '连接服务器失败，请稍后再试。',
            onClick: () => {
              closeNotify();
            },
          });
          return;
        }
        try {
          const json = JSON.parse(data);
          showDialog({
            title: '提示',
            message: String(json.message),
            showCancelButton: false,
          });
        }
        catch (error) {
          showDialog({
            title: '错误',
            message: data,
            showCancelButton: false,
          });
        }
      });
    }
  };

  const showRequestFailure = (
    response?: Response,
    fallback = '操作失败，请稍后再试',
  ) => {
    if (response && response.status !== 0) {
      handleError(response);
    }
    else {
      showFailToast(fallback);
    }
  };

  async function sendRequest<T>(
    endpoint: string,
    options: SendRequestOptions,
    successHandler: (response: Response) => Promise<T>,
  ): Promise<T | undefined>;

  async function sendRequest<T>(
    endpoint: string,
    options: SendRequestOptions,
    successHandler: (response: Response) => Promise<T>,
    errorHandler: (
      response?: Response,
      context?: SendRequestErrorContext,
    ) => Promise<T>,
  ): Promise<T>;

  async function sendRequest<T>(
    endpoint: string,
    options: SendRequestOptions = {},
    successHandler: (response: Response) => Promise<T>,
    errorHandler?: (
      response?: Response,
      context?: SendRequestErrorContext,
    ) => Promise<T | undefined>,
  ): Promise<T | undefined> {
    const { silentGuest401 = false, silent = false, ...fetchOptions } = options;
    const sentWithAuth = !!(
      accessToken.value && accessToken.value !== 'undefined'
    );
    const response = await _request(endpoint, fetchOptions);
    if (response.ok) {
      return await successHandler(response);
    }
    else {
      const guestUnauthorized = response.status === 401 && !sentWithAuth;
      // 401：曾带 token（含过期）仍走 handleError；未带 token 的访客由 errorHandler 或默认「请先登录」处理
      if (!silent && (response.status !== 401 || sentWithAuth)) {
        handleError(response);
      }
      if (errorHandler) {
        return await errorHandler(response, { guestUnauthorized });
      }
      if (guestUnauthorized && !silentGuest401 && !silent) {
        showFailToast('请先登录');
      }
      return undefined;
    }
  }

  const fetchUserInfo = async (): Promise<void> => {
    if (!accessToken.value)
      return;
    return await sendRequest<void>(
      'user/info',
      {},
      async (response) => {
        const json = await response.json();
        userInfo.value = plainToClass(UserInfo, json);
        console.log('用户信息:', userInfo.value);
      },
      async (_response, context) => {
        if (context?.guestUnauthorized)
          return;
        showFailToast('获取用户信息失败');
      },
    );
  };

  const getPersistedUserInfo = async (): Promise<UserInfo | undefined> => {
    if (userInfo.value)
      return userInfo.value;
    // logout 会写成 null，避免再读到磁盘上的过期缓存
    if (userInfo.value === null)
      return undefined;
    try {
      await storage.load();
      const raw = await storage.getItem('userInfo');
      if (!raw || raw === 'undefined')
        return undefined;
      const parsed = JSON.parse(raw);
      if (!parsed || parsed === 'undefined')
        return undefined;
      return parsed as UserInfo;
    }
    catch {
      return undefined;
    }
  };

  const featureList = ref<Feature[]>([]);

  const fetchFeatures = async (): Promise<void> => {
    return await sendRequest<void>(
      'feature',
      { silentGuest401: true },
      async (response) => {
        featureList.value = await response.json();
      },
    );
  };

  const announcements = ref<Announcement[]>([]);
  const dismissedAnnouncementIds = useStorageAsync<string[]>(
    'dismissedAnnouncementIds',
    [],
    storage,
  );

  const currentAnnouncement = computed(() => {
    return announcements.value.find(
      item => !dismissedAnnouncementIds.value.includes(item._id),
    );
  });

  const fetchAnnouncements = async (): Promise<void> => {
    return await sendRequest<void>(
      'announcement/current',
      { silentGuest401: true },
      async (response) => {
        announcements.value = await response.json();
      },
    );
  };

  const dismissAnnouncement = (id: string) => {
    if (!dismissedAnnouncementIds.value.includes(id)) {
      dismissedAnnouncementIds.value = [
        ...dismissedAnnouncementIds.value,
        id,
      ];
    }
  };

  onMounted(() => {
    fetchFeatures();
    fetchAnnouncements();
    setTimeout(() => {
      fetchUserInfo();
    }, 2000);
    setInterval(() => {
      fetchUserInfo();
    }, 5 * 60 * 1000);
    setInterval(() => {
      now.value = Date.now();
    }, 1000);
  });

  watch(
    [
      accessToken,
      () => userInfo.value?.vipMembershipPlan?._id,
      () => userInfo.value?.proMembershipPlan?._id,
    ],
    () => {
      fetchAnnouncements();
    },
  );

  const marketSource = ref<PagedMarketSource>();
  const myMarketSources = ref<MarketSource[]>([]);
  const membershipPlans = ref<MembershipPlan[]>();
  const isVip = computed(() => {
    return isMembershipOrderValid(userInfo.value?.vipMembershipPlan, now.value);
  });
  const isPro = computed(() => {
    return isMembershipOrderValid(
      userInfo.value?.proMembershipPlan,
      now.value,
    );
  });
  const isVipOrPro = computed(() => {
    return isVip.value || isPro.value;
  });

  const hasFeature = computed(() => {
    return (featureKey: string): boolean => {
      const feature = featureList.value.find(f => f.key === featureKey);
      if (!feature)
        return false;

      // 1. Pro 会员权限：仅当功能明确为 PRO 开启时可用 (平级逻辑)
      if (isPro.value && feature.enablePro)
        return true;

      // 2. 普通会员权限：仅当功能明确为普通会员开启时可用 (平级逻辑)
      if (isVip.value && feature.enableVip)
        return true;

      // 3. 公众功能：若未设置任何会员限制，则所有人可用
      if (!feature.enableVip && !feature.enablePro)
        return true;

      return false;
    };
  });

  /** 功能是否标注为 VIP 或 Pro 会员专属（用于展示角标等） */
  const isMembershipGatedFeature = computed(() => {
    return (featureKey: string): boolean => {
      const feature = featureList.value.find(f => f.key === featureKey);
      if (!feature)
        return false;
      return feature.enableVip || feature.enablePro;
    };
  });

  const getDeviceInfo = async () => {
    const family = os.family();
    const osType = os.type();
    const arch = os.arch();
    const deviceId = await getDeviceId();
    const userAgent = navigator.userAgent;
    let browser = 'Unknown';
    if (userAgent.includes('Firefox')) {
      browser = 'Firefox';
    }
    else if (userAgent.includes('Edg')) {
      browser = 'Edg';
    }
    else if (userAgent.includes('Chrome')) {
      browser = 'Chrome';
    }
    else if (userAgent.includes('Safari')) {
      browser = 'Safari';
    }
    return {
      deviceId,
      deviceType: osType,
      deviceName: arch,
      os: family,
      browser,
    };
  };

  const registerEmail = async (
    email: string,
    password: string,
    passwordConfirm: string,
  ): Promise<boolean> => {
    if (!validator.isEmail(email)) {
      showFailToast('邮箱格式错误');
      return false;
    }
    if (
      !validator.matches(password, /(?=.*\d)(?=.*[a-z])(?=.*[A-Z])/)
      || password.length < 6
    ) {
      showFailToast('密码必须包含大小写字母和数字, 且长度不小于6位');
      return false;
    }
    if (password !== passwordConfirm) {
      showFailToast('两次输入的密码不一致');
      return false;
    }
    return await sendRequest<boolean>(
      'auth/register',
      {
        method: 'POST',
        body: JSON.stringify({ email, password, passwordConfirm }),
      },
      async (response) => {
        const json = await response.json();
        showDialog({
          title: '注册成功',
          message: json.message,
          showCancelButton: false,
        });
        return true;
      },
      async (response, context) => {
        if (context?.guestUnauthorized) {
          showRequestFailure(response, '注册失败，请稍后再试');
        }
        return false;
      },
    );
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    if (!validator.isEmail(email)) {
      showFailToast('邮箱格式错误');
      return false;
    }
    if (
      !validator.matches(password, /(?=.*\d)(?=.*[a-z])(?=.*[A-Z])/)
      || password.length < 6
    ) {
      showFailToast('密码必须包含大小写字母和数字, 且长度不小于6位');
      return false;
    }
    const deviceInfo = await getDeviceInfo();
    return await sendRequest<boolean>(
      'auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password, ...deviceInfo }),
      },
      async (response) => {
        const json = await response.json();
        accessToken.value = json.access_token;
        await fetchUserInfo();
        return true;
      },
      async (response, context) => {
        if (context?.guestUnauthorized) {
          showRequestFailure(response, '登录失败，请检查邮箱和密码');
        }
        return false;
      },
    );
  };

  const forgetPasswordEmail = async (email: string): Promise<boolean> => {
    if (!validator.isEmail(email)) {
      showFailToast('邮箱格式错误');
      return false;
    }
    const toast = showLoadingToast({
      message: '正在发送邮件...',
    });
    return await sendRequest<boolean>(
      'auth/forget-password',
      {
        method: 'POST',
        body: JSON.stringify({ email }),
      },
      async (response) => {
        toast.close();
        const json = await response.json();
        showDialog({
          title: '重置密码',
          message: json.message,
          showCancelButton: false,
        });
        return true;
      },
      async (response, context) => {
        toast.close();
        if (context?.guestUnauthorized) {
          showRequestFailure(response, '发送重置邮件失败，请稍后再试');
        }
        return false;
      },
    );
  };

  const resendVerifyEmail = async (email: string): Promise<boolean> => {
    if (!validator.isEmail(email)) {
      showFailToast('邮箱格式错误');
      return false;
    }
    return await sendRequest<boolean>(
      'auth/resend-verification',
      {
        method: 'POST',
        body: JSON.stringify({ email }),
      },
      async (response) => {
        const json = await response.json();
        showDialog({
          title: '验证邮件',
          message: json.message,
          showCancelButton: false,
        });
        return true;
      },
      async (response, context) => {
        if (context?.guestUnauthorized) {
          showRequestFailure(response, '发送验证邮件失败，请稍后再试');
        }
        return false;
      },
    );
  };

  const updateUserInfo = async (info: {
    name?: string;
    photo?: string;
    phone?: string;
  }): Promise<void> => {
    if (!accessToken.value)
      return;
    return await sendRequest<void>(
      'user/update',
      {
        method: 'POST',
        body: JSON.stringify(info),
      },
      async () => {
        await sleep(200);
        fetchUserInfo();
      },
      async () => {
        showFailToast('更新用户信息失败');
      },
    );
  };

  const getMarketSource = async (
    pageNo: number,
    sort: string,
  ): Promise<PagedMarketSource | undefined> => {
    const query = new URLSearchParams();
    query.set('page', pageNo.toString());
    query.set('sortBy', sort);
    query.set('includeEmpty', 'false');
    return await sendRequest<PagedMarketSource | undefined>(
      `source/list` + `?${query.toString()}`,
      {},
      async (response) => {
        const json = await response.json();
        marketSource.value = json;
        return json;
      },
      async (_response, context) => {
        if (context?.guestUnauthorized) {
          showFailToast('请先登录');
        }
        return undefined;
      },
    );
  };

  const getMarketSourceById = async (
    id: string,
    options?: { silent?: boolean },
  ): Promise<MarketSource | undefined> => {
    return await sendRequest<MarketSource>(
      `source/${id}`,
      {
        silent: options?.silent,
        silentGuest401: !!options?.silent,
      },
      async (response) => {
        const json = await response.json();
        return json;
      },
    );
  };

  const getDefaultMarketSource = async (): Promise<
    MarketSource | undefined
  > => {
    const t = showLoadingToast('获取中');
    return await sendRequest<MarketSource | undefined>(
      'source/default',
      {},
      async (response) => {
        t.close();
        const json = await response.json();
        return json;
      },
      async (_response, context) => {
        t.close();
        if (context?.guestUnauthorized) {
          showFailToast('请先登录');
        }
        return undefined;
      },
    );
  };

  const getMyMarketSources = async (): Promise<MarketSource[] | undefined> => {
    const t = showLoadingToast('获取中');
    return await sendRequest<MarketSource[] | undefined>(
      'source/my',
      {},
      async (response) => {
        t.close();
        const json = await response.json();
        myMarketSources.value = json;
        triggerRef(myMarketSources);
        return json;
      },
      async (_response, context) => {
        t.close();
        if (context?.guestUnauthorized) {
          showFailToast('请先登录');
        }
        return undefined;
      },
    );
  };

  const createMarketSource = async (data: {
    name: string;
    permissions: MarketSourcePermission[];
    isPublic: boolean;
  }): Promise<void> => {
    return await sendRequest<void>(
      'source',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      async (response) => {
        const json = await response.json();
        await getMyMarketSources();
        return json;
      },
    );
  };

  const likeMarketSource = async (source: MarketSource): Promise<void> => {
    return await sendRequest<void>(
      `source/like/${source._id}`,
      {
        method: 'POST',
      },
      async (response) => {
        const json = await response.json();
        return json;
      },
    );
  };

  const updateMarketSource = async (data: MarketSource): Promise<void> => {
    return await sendRequest<void>(
      `source` + `/${data._id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      },
      async () => {
        showSuccessToast('更新成功');
        await sleep(200);
        await getMyMarketSources();
      },
    );
  };

  const deleteMarketSource = async (data: MarketSource) => {
    return await sendRequest<void>(
      `source` + `/${data._id}`,
      {
        method: 'DELETE',
        body: JSON.stringify(data),
      },
      async () => {
        showSuccessToast('删除成功');
        await sleep(200);
        await getMyMarketSources();
      },
    );
  };

  const addMarketSourceContent = async (content: MarketSourceContent) => {
    return await sendRequest<void>(
      'source-content',
      {
        method: 'POST',
        body: JSON.stringify(content),
      },
      async () => {
        showSuccessToast('添加成功');
        await sleep(200);
        await getMyMarketSources();
      },
    );
  };

  const getMarketSourceContent = async (
    sourceContent: MarketSourceContent,
  ): Promise<MarketSourceContent | undefined> => {
    return await sendRequest<MarketSourceContent>(
      `source-content` + `/${sourceContent._id}`,
      {},
      async (response) => {
        const json = await response.json();
        return json;
      },
    );
  };

  const updateMarketSourceContent = async (
    content: MarketSourceContent,
  ): Promise<MarketSourceContent | undefined> => {
    return await sendRequest<MarketSourceContent>(
      `source-content` + `/${content._id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          name: content.name,
          code: content.code,
        }),
      },
      async (response) => {
        const json = await response.json();
        getMyMarketSources();
        return json;
      },
    );
  };

  const deleteMarketSourceContent = async (content: MarketSourceContent) => {
    return await sendRequest(
      `source-content` + `/${content._id}`,
      {
        method: 'DELETE',
      },
      async () => {
        showSuccessToast('删除成功');
        await sleep(200);
        await getMyMarketSources();
      },
    );
  };

  const getMembershipPlans = async () => {
    return await sendRequest<MembershipPlan[]>(
      'membership',
      {},
      async (response) => {
        const json = await response.json();
        membershipPlans.value = json;
        return json;
      },
    );
  };

  const getAliPayUrl = async (plan: MembershipPlan) => {
    if (!userInfo.value?.email) {
      showFailToast('请先登录');
      return null;
    }
    const displayStore = useDisplayStore();
    return await sendRequest<string>(
      'pay/alipay',
      {
        method: 'POST',
        body: JSON.stringify({
          level: plan.level,
          price: plan.price,
          billingCycle: plan.billingCycle,
          email: userInfo.value.email,
          isMobile: displayStore.isAndroid,
        }),
      },
      async (response) => {
        const json = await response.json();
        return json.paymentUrl;
      },
    );
  };

  const syncToServer = async (
    data: SyncUploadItem[],
    options: boolean | { incremental?: boolean; silent?: boolean } = false,
  ) => {
    const opts
      = typeof options === 'boolean'
        ? { incremental: options, silent: false }
        : { incremental: false, silent: false, ...options };
    if (!userInfo.value?.email) {
      if (!opts.silent)
        showFailToast('请先登录');
      return false;
    }
    if (!hasFeature.value('cloud_sync')) {
      if (!opts.silent)
        showVipDialog('数据同步为会员功能\n请先开通会员');
      return false;
    }
    if (!opts.silent) {
      showDialog({
        title: '同步中...',
        message: '请勿关闭此窗口',
        showCancelButton: false,
        showConfirmButton: false,
      });
    }
    return await sendRequest<boolean>(
      `sync/upload?incremental=${!!opts.incremental}`,
      {
        method: 'POST',
        body: JSON.stringify(data),
        silentGuest401: !!opts.silent,
      },
      async () => {
        if (!opts.silent) {
          closeDialog();
          showSuccessToast('同步成功');
        }
        return true;
      },
      async () => {
        if (!opts.silent) {
          closeDialog();
          showFailToast('同步失败');
        }
        return false;
      },
    );
  };

  /** 静默上传：不弹窗；409 时返回冲突数据供客户端再 merge */
  const syncToServerSilent = async (
    data: SyncUploadItem[],
    options: { incremental?: boolean } = {},
  ): Promise<{
    ok: boolean;
    conflict?: boolean;
    conflicts?: SyncDownloadRecord[];
  }> => {
    if (!userInfo.value?.email || !hasFeature.value('cloud_sync')) {
      return { ok: false };
    }
    const response = await _request(
      `sync/upload?incremental=${!!options.incremental}`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    );
    if (response.ok) {
      if (response.headers.has('new-access-token')) {
        accessToken.value = response.headers.get('new-access-token') || undefined;
      }
      return { ok: true };
    }
    if (response.status === 409) {
      try {
        const json = await response.json();
        return {
          ok: false,
          conflict: true,
          conflicts: json.conflicts || json.message?.conflicts || [],
        };
      }
      catch {
        return { ok: false, conflict: true, conflicts: [] };
      }
    }
    return { ok: false };
  };

  /** 条目级精确同步 */
  const syncPatchSilent = async (
    ops: CloudSyncOp[],
  ): Promise<{
    ok: boolean;
    applied?: number;
    skipped?: number;
    conflicts?: any[];
  }> => {
    if (!userInfo.value?.email || !hasFeature.value('cloud_sync')) {
      return { ok: false };
    }
    if (!ops.length)
      return { ok: true, applied: 0, skipped: 0 };
    const response = await _request('sync/patch', {
      method: 'POST',
      body: JSON.stringify(ops),
    });
    if (response.ok) {
      if (response.headers.has('new-access-token')) {
        accessToken.value = response.headers.get('new-access-token') || undefined;
      }
      try {
        const json = await response.json();
        return {
          ok: true,
          applied: json.applied,
          skipped: json.skipped,
          conflicts: json.conflicts,
        };
      }
      catch {
        return { ok: true };
      }
    }
    return { ok: false };
  };

  const syncFromServer = async (data: SyncTypes[]) => {
    if (!userInfo.value?.email) {
      showFailToast('请先登录');
      return;
    }
    if (!hasFeature.value('cloud_sync')) {
      showVipDialog('数据同步为会员功能\n请先开通会员');
      return;
    }
    showDialog({
      title: '下载同步中...',
      message: '请勿关闭此窗口',
      showCancelButton: false,
      showConfirmButton: false,
    });
    return await sendRequest(
      `sync/download?types=${data.join(',')}`,
      {},
      async (response) => {
        closeDialog();
        const json = await response.json();
        return json;
      },
      async () => {
        closeDialog();
        showFailToast('下载同步失败');
        return false;
      },
    );
  };

  const syncFromServerSilent = async (
    data: SyncTypes[],
    since?: string,
  ): Promise<SyncDownloadRecord[] | false> => {
    if (!userInfo.value?.email || !hasFeature.value('cloud_sync')) {
      return false;
    }
    const qs = new URLSearchParams({ types: data.join(',') });
    if (since)
      qs.set('since', since);
    const response = await _request(`sync/download?${qs.toString()}`, {});
    if (response.ok) {
      if (response.headers.has('new-access-token')) {
        accessToken.value = response.headers.get('new-access-token') || undefined;
      }
      try {
        return (await response.json()) as SyncDownloadRecord[];
      }
      catch {
        return [];
      }
    }
    return false;
  };

  /** 条目级增量变更拉取 */
  const syncChangesSilent = async (
    requests: Array<{ type: SyncTypes; since?: string }>,
  ): Promise<SyncChangesResponse | false> => {
    if (!userInfo.value?.email || !hasFeature.value('cloud_sync')) {
      return false;
    }
    if (!requests.length)
      return { results: [] };
    const response = await _request('sync/changes', {
      method: 'POST',
      body: JSON.stringify({ requests }),
    });
    if (response.ok) {
      if (response.headers.has('new-access-token')) {
        accessToken.value = response.headers.get('new-access-token') || undefined;
      }
      try {
        return (await response.json()) as SyncChangesResponse;
      }
      catch {
        return { results: [] };
      }
    }
    return false;
  };

  const checkTaichiFreeTrail = async () => {
    return await sendRequest<boolean>(
      'promotion/taichi-trail-status',
      {},
      async (response) => {
        const json = await response.json();
        return json.status;
      },
      async (response, context) => {
        if (context?.guestUnauthorized) {
          showRequestFailure(response);
        }
        return false;
      },
    );
  };

  const taichiFreeTrail = async (username: string, password: string) => {
    const toast = showLoadingToast({
      message: '会员领取中...',
    });
    return await sendRequest<string>(
      'promotion/taichi-trail',
      {
        method: 'POST',
        body: JSON.stringify({
          username,
          password,
        }),
      },
      async (response) => {
        toast.close();
        const ret = await response.text();
        showSuccessToast(ret);
        fetchUserInfo();
        return ret;
      },
      async (response, context) => {
        toast.close();
        if (context?.guestUnauthorized) {
          showRequestFailure(response, '领取失败');
        }
        return '领取失败';
      },
    );
  };

  const logout = (): void => {
    accessToken.value = undefined;
    userInfo.value = null;
  };

  const clear = async () => {
    accessToken.value = undefined;
    userInfo.value = null;
    marketSource.value = undefined;
    myMarketSources.value = [];
  };

  return {
    now,
    accessToken,
    userInfo,
    marketSource,
    isVip,
    isPro,
    isVipOrPro,
    hasFeature,
    isMembershipGatedFeature,
    myMarketSources,
    membershipPlans,
    featureList,
    fetchFeatures,
    announcements,
    currentAnnouncement,
    fetchAnnouncements,
    dismissAnnouncement,
    fetchUserInfo,
    getPersistedUserInfo,
    updateUserInfo,
    getDeviceInfo,
    registerEmail,
    login,
    forgetPasswordEmail,
    resendVerifyEmail,
    getMarketSource,
    getMarketSourceById,
    getDefaultMarketSource,
    getMyMarketSources,
    createMarketSource,
    likeMarketSource,
    updateMarketSource,
    deleteMarketSource,
    addMarketSourceContent,
    getMarketSourceContent,
    updateMarketSourceContent,
    deleteMarketSourceContent,
    getMembershipPlans,
    getAliPayUrl,
    syncToServer,
    syncToServerSilent,
    syncPatchSilent,
    syncFromServer,
    syncFromServerSilent,
    syncChangesSilent,
    checkTaichiFreeTrail,
    taichiFreeTrail,
    logout,
    clear,
    sendRequest,
  };
});
