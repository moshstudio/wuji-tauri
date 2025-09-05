import type { ClientOptions } from '@wuji-tauri/fetch';
import type {
  MarketSource,
  MarketSourceContent,
  MarketSourcePermission,
  PagedMarketSource,
} from '@wuji-tauri/source-extension';
import type { MembershipPlan } from '@/types/user';
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
import { ref, watch } from 'vue';
import { isMembershipOrderValid, UserInfo } from '@/types/user';
import { getDeviceId } from '@/utils/device';
import { createKVStore, useDisplayStore } from '.';
import { router } from '@/router';
import { SyncTypes } from '@/types/sync';

const API_BASE_URL = 'https://wuji-server.moshangwangluo.com/v1/api/';
// const API_BASE_URL = 'http://127.0.0.1:3000/v1/api/';

export const useServerStore = defineStore('serverStore', () => {
  const kvStorage = createKVStore('serverStore');
  const storage = kvStorage.storage;

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
          if (!raw) return undefined;
          return JSON.parse(raw);
        },
        write: async (value: UserInfo | undefined) => {
          if (!value) return '';
          return JSON.stringify(value);
        },
      },
    },
  );
  const marketSource = ref<PagedMarketSource>();
  const myMarketSources = ref<MarketSource[]>([]);
  const membershipPlans = ref<MembershipPlan[]>();

  // 通用请求方法
  const request = async (
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
    } catch (error) {
      return Response.error();
    }
  };

  // 处理错误消息
  const handleError = (response: Response) => {
    if (response.status === 500) {
      showDialog({
        title: '服务器错误',
        message: '服务器发生错误，请稍后再试。',
        showCancelButton: false,
      });
    } else {
      response.text().then(async (data) => {
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
        } catch (error) {
          showDialog({
            title: '错误',
            message: data,
            showCancelButton: false,
          });
        }
      });
    }
  };

  const getDeviceInfo = async () => {
    const family = os.family();
    const osType = os.type();
    const arch = os.arch();

    const deviceId = await getDeviceId();

    const userAgent = navigator.userAgent;
    let browser = 'Unknown';

    // 简单的浏览器检测
    if (userAgent.includes('Firefox')) {
      browser = 'Firefox';
    } else if (userAgent.includes('Edg')) {
      browser = 'Edg';
    } else if (userAgent.includes('Chrome')) {
      browser = 'Chrome';
    } else if (userAgent.includes('Safari')) {
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
      !validator.matches(password, /(?=.*\d)(?=.*[a-z])(?=.*[A-Z])/) ||
      password.length < 6
    ) {
      showFailToast('密码必须包含大小写字母和数字, 且长度不小于6位');
      return false;
    }
    if (password !== passwordConfirm) {
      showFailToast('两次输入的密码不一致');
      return false;
    }
    const response = await request('auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, passwordConfirm }),
    });
    if (!response.ok) {
      handleError(response);
      return false;
    }
    const json = await response.json();
    showDialog({
      title: '注册成功',
      message: json.message,
      showCancelButton: false,
    });
    return true;
  };

  // 登录
  const login = async (email: string, password: string): Promise<boolean> => {
    if (!validator.isEmail(email)) {
      showFailToast('邮箱格式错误');
      return false;
    }
    if (
      !validator.matches(password, /(?=.*\d)(?=.*[a-z])(?=.*[A-Z])/) ||
      password.length < 6
    ) {
      showFailToast('密码必须包含大小写字母和数字, 且长度不小于6位');
      return false;
    }

    const deviceInfo = await getDeviceInfo();

    try {
      const response = await request('auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, ...deviceInfo }),
      });

      if (!response.ok) {
        handleError(response);
        return false;
      }
      const json = await response.json();
      accessToken.value = json.access_token;
      await fetchUserInfo();
      return true;
    } catch (error) {
      showFailToast('网络错误');
      return false;
    }
  };
  const forgetPasswordEmail = async (email: string): Promise<boolean> => {
    if (!validator.isEmail(email)) {
      showFailToast('邮箱格式错误');
      return false;
    }
    const toast = showLoadingToast({
      message: '正在发送邮件...',
    });
    const response = await request('auth/forget-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    toast.close();
    if (!response.ok) {
      handleError(response);
      return false;
    }
    const json = await response.json();
    showDialog({
      title: '重置密码',
      message: json.message,
      showCancelButton: false,
    });
    return true;
  };

  const resendVerifyEmail = async (email: string): Promise<boolean> => {
    if (!validator.isEmail(email)) {
      showFailToast('邮箱格式错误');
      return false;
    }
    const response = await request('auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    if (!response.ok) {
      handleError(response);
      return false;
    }
    const json = await response.json();
    showDialog({
      title: '验证邮件',
      message: json.message,
      showCancelButton: false,
    });
    return true;
  };

  // 获取用户信息
  const fetchUserInfo = async (): Promise<void> => {
    if (!accessToken.value) return;

    try {
      const response = await request('user/info');

      if (response.ok) {
        const data = await response.json();
        userInfo.value = plainToClass(UserInfo, data);
        console.log('用户信息:', userInfo.value);
      } else {
        handleError(response);
      }
    } catch (error) {
      showFailToast('获取用户信息失败');
    }
  };

  // 更新
  const updateUserInfo = async (info: {
    name?: string;
    photo?: string;
    phone?: string;
  }): Promise<void> => {
    if (!accessToken.value) return;
    try {
      const response = await request('user/update', {
        method: 'POST',
        body: JSON.stringify(info),
      });

      if (response.ok) {
        userInfo.value = await response.json();
      } else {
        handleError(response);
      }
    } catch (error) {
      showFailToast('更新用户信息失败');
    }
  };

  const getMarketSource = async (
    pageNo: number,
    sort: string,
  ): Promise<PagedMarketSource | undefined> => {
    try {
      const query = new URLSearchParams();
      query.set('page', pageNo.toString());
      query.set('sortBy', sort);

      const response = await request(`source/list` + `?${query.toString()}`);

      if (response.ok) {
        const data = await response.json();
        marketSource.value = data;
        return data;
      } else {
        handleError(response);
      }
    } catch (error) {
      showFailToast('获取源失败');
    }
  };

  const getMarketSourceById = async (
    id: string,
  ): Promise<MarketSource | undefined> => {
    try {
      const response = await request(`source/${id}`);
      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        handleError(response);
      }
    } catch (error) {}
  };

  const getDefaultMarketSource = async (): Promise<
    MarketSource | undefined
  > => {
    const t = showLoadingToast('获取中');
    try {
      const response = await request('source/default');
      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        handleError(response);
      }
    } catch (error) {
      showFailToast('获取默认源失败');
      return;
    } finally {
      t.close();
    }
  };

  const getMyMarketSources = async (): Promise<MarketSource[] | undefined> => {
    const t = showLoadingToast('获取中');
    try {
      const response = await request('source/my');
      if (response.ok) {
        const data = await response.json();
        myMarketSources.value = data;
        return data;
      } else {
        handleError(response);
      }
    } catch (error) {
      showFailToast('获取我的源失败');
      return;
    } finally {
      t.close();
    }
  };

  const createMarketSource = async (data: {
    name: string;
    permissions: MarketSourcePermission[];
    isPublic: boolean;
  }): Promise<void> => {
    try {
      const response = await request('source', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (response.ok) {
        const data = await response.json();
        await getMyMarketSources();
        return data;
      } else {
        handleError(response);
      }
    } catch (error) {
      showFailToast('获取我的源失败');
    }
  };

  const likeMarketSource = async (source: MarketSource): Promise<void> => {
    try {
      const response = await request(`source/like/${source._id}`, {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        handleError(response);
      }
    } catch (error) {
      console.error('likeMarketSource failed');
    }
  };

  const updateMarketSource = async (data: MarketSource): Promise<void> => {
    try {
      const response = await request(`source` + `/${data._id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      if (response.ok) {
        const data = await response.json();
        await getMyMarketSources();
        showSuccessToast('更新成功');
        return data;
      } else {
        handleError(response);
      }
    } catch (error) {
      showFailToast('更新源失败');
    }
  };

  const deleteMarketSource = async (data: MarketSource) => {
    try {
      const response = await request(`source` + `/${data._id}`, {
        method: 'DELETE',
        body: JSON.stringify(data),
      });
      if (response.ok) {
        const data = await response.text();
        await getMyMarketSources();
        showSuccessToast('删除成功');
      } else {
        handleError(response);
      }
    } catch (error) {

      showFailToast('删除源失败');
    }
  };

  const addMarketSourceContent = async (content: MarketSourceContent) => {
    try {
      const response = await request('source-content', {
        method: 'POST',
        body: JSON.stringify(content),
      });
      if (response.ok) {
        const data = await response.json();
        await getMyMarketSources();
        showSuccessToast('更新成功');
        return data;
      } else {
        handleError(response);
      }
    } catch (error) {
      showFailToast('获取我的源失败');
    }
  };

  const getMarketSourceContent = async (
    sourceContent: MarketSourceContent,
  ): Promise<MarketSourceContent | undefined> => {
    try {
      const response = await request(
        `source-content` + `/${sourceContent._id}`,
      );
      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        handleError(response);
      }
    } catch (error) {
      showFailToast('获取源内容失败');
    }
  };

  const updateMarketSourceContent = async (
    source: MarketSource,
    content: MarketSourceContent,
  ): Promise<MarketSourceContent | null | undefined> => {
    try {
      const response = await request(`source-content` + `/${content._id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: content.name,
          code: content.code,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        getMyMarketSources();
        return data;
      } else {
        handleError(response);
      }
    } catch (error) {
      showFailToast('修改源内容失败');
    }
  };
  const deleteMarketSourceContent = async (
    source: MarketSource,
    content: MarketSourceContent,
  ) => {
    try {
      const response = await request(`source-content` + `/${content._id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        const data = await response.json();
        await getMyMarketSources();
        showSuccessToast('删除成功');
        return data;
      } else {
        handleError(response);
      }
    } catch (error) {
      showFailToast('获取源内容失败');
    }
  };

  const getMembershipPlans = async () => {
    try {
      const response = await request('membership');
      if (response.ok) {
        const data = await response.json();
        membershipPlans.value = data;
        return data;
      } else {
        handleError(response);
      }
    } catch (error) {
      showFailToast('获取源内容失败');
    }
  };

  const getAliPayUrl = async (plan: MembershipPlan) => {
    if (!userInfo.value?.email) {
      showFailToast('请先登录');
      return;
    }
    const displayStore = useDisplayStore();
    try {
      const response = await request('pay/alipay', {
        method: 'POST',
        body: JSON.stringify({
          level: plan.level,
          price: plan.price,
          billingCycle: plan.billingCycle,
          email: userInfo.value.email,
          isMobile: displayStore.isAndroid,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.paymentUrl;
      } else {
        handleError(response);
      }
    } catch (error) {
      showFailToast('获取源内容失败');
    }
  };

  const syncToServer = async (data: { type: string; data: any }[]) => {
    if (!userInfo.value?.email) {
      showFailToast('请先登录');
      return;
    }
    if (
      !isMembershipOrderValid(userInfo.value.superVipMembershipPlan) &&
      !isMembershipOrderValid(userInfo.value.vipMembershipPlan)
    ) {
      showDialog({
        message: '数据同步为会员功能\n请先开通会员',
      }).then(() => {
        router.push({ name: 'VipDetail' });
      });

      return;
    }
    showDialog({
      title: '同步中...',
      message: '请勿关闭此窗口',
      showCancelButton: false,
      showConfirmButton: false,
    });
    try {
      const response = await request('sync/upload', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (response.ok) {
        showSuccessToast('同步成功');
        return true;
      } else {
        handleError(response);
        showFailToast('同步失败');
        return false;
      }
    } catch (error) {
      showFailToast('同步内容失败');
    } finally {
      closeDialog();
    }
  };
  const syncFromServer = async (data: SyncTypes[]) => {
    if (!userInfo.value?.email) {
      showFailToast('请先登录');
      return;
    }
    if (
      !isMembershipOrderValid(userInfo.value.superVipMembershipPlan) &&
      !isMembershipOrderValid(userInfo.value.vipMembershipPlan)
    ) {
      showDialog({
        title: '提示',
        message: '数据同步为会员功能\n请先开通会员',
      }).then(() => {
        router.push({ name: 'VipDetail' });
      });
      return;
    }
    showDialog({
      title: '下载同步中...',
      message: '请勿关闭此窗口',
      showCancelButton: false,
      showConfirmButton: false,
    });
    try {
      const response = await request('sync/download?types=' + data.join(','));
      if (response.ok) {
        const records = await response.json();
        return records;
      } else {
        handleError(response);
        showFailToast('下载同步失败');
        return false;
      }
    } catch (error) {
      showFailToast('下载同步内容失败');
    } finally {
      closeDialog();
    }
  };

  // 登出
  const logout = (): void => {
    accessToken.value = undefined;
    userInfo.value = null;
  };

  const clear = async () => {
    accessToken.value = undefined;
    userInfo.value = null;
    marketSource.value = undefined;
    myMarketSources.value = [];
    membershipPlans.value = [];
    await storage.clear();
  };

  watch(
    userInfo,
    async () => {
      if (userInfo.value) {
        await fetchUserInfo();
      }
    },
    { once: true },
  );

  return {
    accessToken,
    userInfo,
    marketSource,
    myMarketSources,
    membershipPlans,
    request,
    getDeviceInfo,
    updateUserInfo,
    registerEmail,
    login,
    forgetPasswordEmail,
    resendVerifyEmail,
    logout,
    fetchUserInfo,
    getMarketSource,
    likeMarketSource,
    getMarketSourceById,
    getDefaultMarketSource,
    getMyMarketSources,
    createMarketSource,
    deleteMarketSource,
    updateMarketSource,
    addMarketSourceContent,
    getMarketSourceContent,
    updateMarketSourceContent,
    deleteMarketSourceContent,
    getMembershipPlans,
    getAliPayUrl,
    syncToServer,
    syncFromServer,
    clear,
  };
});
