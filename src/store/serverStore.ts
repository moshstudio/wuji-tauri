import { defineStore } from 'pinia';
import { useStorageAsync } from '@vueuse/core';
import { ClientOptions, fetch } from '@wuji-tauri/fetch';
import validator from 'validator';
import {
  closeNotify,
  showDialog,
  showFailToast,
  showLoadingToast,
  showNotify,
  showSuccessToast,
} from 'vant';
import * as os from '@tauri-apps/plugin-os';
import {
  MarketSource,
  MarketSourceContent,
  MarketSourcePermission,
  PagedMarketSource,
} from '@wuji-tauri/source-extension';
import { getDeviceId } from '@/utils/device';
import { onMounted, ref } from 'vue';
import { sleep } from '@/utils';
import { createKVStore } from '.';

export interface UserInfo {
  _id: string;
  email: string;
  name?: string;
  photo?: string;
  phone?: string;
  isVerified?: boolean;
}

const API_BASE_URL = 'https://wuji-server.moshangwangluo.com/v1/api/';
// const API_BASE_URL = 'http://127.0.0.1:3000/v1/api/';

export const useServerStore = defineStore('serverStore', () => {
  const kvStorage = createKVStore('serverStore');

  const accessToken = useStorageAsync<string | undefined>(
    'accessToken',
    undefined,
  );
  const userInfo = useStorageAsync<UserInfo | undefined>(
    'userInfo',
    undefined,
    kvStorage.storage,
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
  // const marketSource = ref<PagedMarketSource>();
  const marketSource = useStorageAsync<PagedMarketSource | undefined>(
    'marketSource',
    undefined,
    kvStorage.storage,
    {
      serializer: {
        read: async (raw: string) => {
          if (!raw) return undefined;
          return JSON.parse(raw);
        },
        write: async (value: PagedMarketSource | undefined) => {
          if (!value) return '';
          return JSON.stringify(value);
        },
      },
    },
  );
  const myMarketSources = ref<MarketSource[]>([]);
  // const myMarketSources = useStorageAsync<MarketSource[]>(
  //   'myMarketSource',
  //   [],
  //   kvStorage.storage,
  // );

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
            title: '服务器错误',
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
        userInfo.value = await response.json();
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

      const response = await request('source/list' + '?' + query.toString());

      if (response.ok) {
        const data = await response.json();
        console.log('market source:', data);

        marketSource.value = data;
        return data;
      } else {
        handleError(response);
        return;
      }
    } catch (error) {
      showFailToast('获取源失败');
      return;
    }
  };

  const getMarketSourceById = async (
    id: string,
  ): Promise<MarketSource | undefined> => {
    try {
      const response = await request('source/' + id);
      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        handleError(response);
        return;
      }
    } catch (error) {
      return;
    }
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
        return;
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
        return;
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
        return;
      }
    } catch (error) {
      showFailToast('获取我的源失败');
      return;
    }
  };

  const likeMarketSource = async (source: MarketSource): Promise<void> => {
    try {
      const response = await request('source/like/' + source._id, {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        handleError(response);
        return;
      }
    } catch (error) {
      console.error('likeMarketSource failed');
      return;
    }
  };

  const updateMarketSource = async (data: MarketSource): Promise<void> => {
    try {
      const response = await request('source' + '/' + data._id, {
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
        return;
      }
    } catch (error) {
      console.log(error);
      showFailToast('更新源失败');
      return;
    }
  };

  const deleteMarketSource = async (data: MarketSource) => {
    try {
      const response = await request('source' + '/' + data._id, {
        method: 'DELETE',
        body: JSON.stringify(data),
      });
      if (response.ok) {
        const data = await response.text();
        await getMyMarketSources();
        showSuccessToast('更新成功');
      } else {
        handleError(response);
        return;
      }
    } catch (error) {
      console.log(error);

      showFailToast('更新源失败');
      return;
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
        return;
      }
    } catch (error) {
      showFailToast('获取我的源失败');
      return;
    }
  };

  const getMarketSourceContent = async (
    sourceContent: MarketSourceContent,
  ): Promise<MarketSourceContent | undefined> => {
    try {
      const response = await request(
        'source-content' + '/' + sourceContent._id,
      );
      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        handleError(response);
        return;
      }
    } catch (error) {
      showFailToast('获取源内容失败');
      return;
    }
  };

  const updateMarketSourceContent = async (
    source: MarketSource,
    content: MarketSourceContent,
  ): Promise<MarketSourceContent | null | undefined> => {
    try {
      const response = await request('source-content' + '/' + content._id, {
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
        return;
      }
    } catch (error) {
      showFailToast('修改源内容失败');
      return;
    }
  };
  const deleteMarketSourceContent = async (
    source: MarketSource,
    content: MarketSourceContent,
  ) => {
    try {
      const response = await request('source-content' + '/' + content._id, {
        method: 'DELETE',
      });
      if (response.ok) {
        const data = await response.json();
        await getMyMarketSources();
        showSuccessToast('删除成功');
        return data;
      } else {
        handleError(response);
        return;
      }
    } catch (error) {
      showFailToast('获取源内容失败');
      return;
    }
  };

  // 登出
  const logout = (): void => {
    accessToken.value = undefined;
    userInfo.value = null;
  };

  onMounted(async () => {
    await sleep(1000);
    if (userInfo.value) {
      await fetchUserInfo();
    }
  });

  return {
    accessToken,
    userInfo,
    marketSource,
    myMarketSources,
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
  };
});
