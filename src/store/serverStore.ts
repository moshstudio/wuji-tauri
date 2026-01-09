import type { ClientOptions } from '@wuji-tauri/fetch';
import type {
  MarketSource,
  MarketSourceContent,
  MarketSourcePermission,
  PagedMarketSource,
} from '@wuji-tauri/source-extension';
import type { MembershipPlan } from '@/types/user';
import * as os from '@tauri-apps/plugin-os';
import { useNow, useStorageAsync } from '@vueuse/core';
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
import { getDeviceId } from '@/utils/device';
import { createKVStore, useDisplayStore } from '.';
import { router } from '@/router';
import { SyncTypes } from '@/types/sync';
import { sleep } from '@/utils';

let API_BASE_URL = 'https://wuji-server.moshangwangluo.com/v1/api/';
// let API_BASE_URL = 'http://127.0.0.1:3000/v1/api/';

if (process.env.NODE_ENV !== 'development') {
  // 防止忘了改
  API_BASE_URL = 'https://wuji-server.moshangwangluo.com/v1/api/';
}

export const useServerStore = defineStore('serverStore', () => {
  const kvStorage = createKVStore('serverStore');
  const storage = kvStorage.storage;

  const now = ref(Date.now());

  // 每秒更新时间戳
  onMounted(() => {
    const timer = setInterval(() => {
      now.value = Date.now();
      // 每5分钟执行一次
      if (now.value % 300 === 0) {
        fetchUserInfo();
      }
    }, 1000);
  });

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
  const isVip = computed(() => {
    return isMembershipOrderValid(userInfo.value?.vipMembershipPlan, now.value);
  });
  const isSuperVip = computed(() => {
    return isMembershipOrderValid(
      userInfo.value?.superVipMembershipPlan,
      now.value,
    );
  });
  const isVipOrSuperVip = computed(() => {
    return isVip.value || isSuperVip.value;
  });

  // 请求方法
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
    } catch (error) {
      return Response.error();
    }
  };

  // 函数重载签名
  async function sendRequest<T>(
    endpoint: string,
    options: RequestInit & ClientOptions,
    successHandler: (response: Response) => Promise<T>,
  ): Promise<T | undefined>;

  async function sendRequest<T>(
    endpoint: string,
    options: RequestInit & ClientOptions,
    successHandler: (response: Response) => Promise<T>,
    errorHandler: (response?: Response, error?: Error) => Promise<T>,
  ): Promise<T>;

  // 函数实现
  async function sendRequest<T>(
    endpoint: string,
    options: RequestInit & ClientOptions = {},
    successHandler: (response: Response) => Promise<T>,
    errorHandler?: (
      response?: Response,
      error?: Error,
    ) => Promise<T | undefined>,
  ): Promise<T | undefined> {
    const response = await _request(endpoint, options);
    if (response.ok) {
      return await successHandler(response);
    } else {
      handleError(response);
      if (errorHandler) {
        return await errorHandler(response);
      } else {
        return undefined;
      }
    }
  }

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
      async () => {
        return false;
      },
    );
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
      async () => {
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
      async () => {
        toast.close();
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
      async () => {
        return false;
      },
    );
  };

  // 获取用户信息
  const fetchUserInfo = async (): Promise<void> => {
    if (!accessToken.value) return;
    return await sendRequest<void>(
      'user/info',
      {},
      async (response) => {
        const json = await response.json();
        userInfo.value = plainToClass(UserInfo, json);
        console.log('用户信息:', userInfo.value);
      },
      async () => {
        showFailToast('获取用户信息失败');
      },
    );
  };

  // 更新
  const updateUserInfo = async (info: {
    name?: string;
    photo?: string;
    phone?: string;
  }): Promise<void> => {
    if (!accessToken.value) return;
    return await sendRequest<void>(
      'user/update',
      {
        method: 'POST',
        body: JSON.stringify(info),
      },
      async (response) => {
        await sleep(200);
        fetchUserInfo();
        // const json = await response.json();
        // userInfo.value = plainToClass(UserInfo, json);
        // console.log('用户信息:', userInfo.value);
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
    return await sendRequest<PagedMarketSource | undefined>(
      `source/list` + `?${query.toString()}`,
      {},
      async (response) => {
        const json = await response.json();
        marketSource.value = json;
        return json;
      },
      async () => {
        showFailToast('获取源失败');
        return undefined;
      },
    );
  };

  const getMarketSourceById = async (
    id: string,
  ): Promise<MarketSource | undefined> => {
    return await sendRequest<MarketSource>(
      `source/${id}`,
      {},
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
      async () => {
        showFailToast('获取默认源失败');
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
      async () => {
        t.close();
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
    source: MarketSource,
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
  const deleteMarketSourceContent = async (
    source: MarketSource,
    content: MarketSourceContent,
  ) => {
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
      return;
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
    data: { type: string; data: any }[],
    isIncremental: boolean = false,
  ) => {
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
    return await sendRequest<boolean>(
      'sync/upload?incremental=' + isIncremental,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      async () => {
        closeDialog();
        showSuccessToast('同步成功');
        return true;
      },
      async () => {
        closeDialog();
        showFailToast('同步失败');
        return false;
      },
    );
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
    return await sendRequest(
      'sync/download?types=' + data.join(','),
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

  const checkTaichiFreeTrail = async () => {
    return await sendRequest<boolean>(
      'promotion/taichi-trail-status',
      {},
      async (response) => {
        const json = await response.json();
        return json.status;
      },
      async () => {
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
      async () => {
        toast.close();
        return '领取失败';
      },
    );
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
    isVip,
    isSuperVip,
    isVipOrSuperVip,

    sendRequest,
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
    checkTaichiFreeTrail,
    taichiFreeTrail,
    clear,
  };
});
