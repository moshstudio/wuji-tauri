import { defineStore } from 'pinia';
import { useStorageAsync } from '@vueuse/core';
import { ClientOptions, fetch } from '@wuji-tauri/fetch';
import validator from 'validator';
import { showDialog, showFailToast, showLoadingToast, showNotify } from 'vant';
import * as os from '@tauri-apps/plugin-os';
import { getDeviceId } from '@/utils/device';
import { onMounted } from 'vue';
import { sleep } from '@/utils';

export interface UserInfo {
  uuid: string;
  email: string;
  name?: string;
  photo?: string;
  phone?: string;
  isVerified?: boolean;
}

const API_BASE_URL = 'http://localhost:3000/v1/api/';

export const useServerStore = defineStore('serverStore', () => {
  const accessToken = useStorageAsync<string | undefined>(
    'accessToken',
    undefined,
  );
  const userInfo = useStorageAsync<UserInfo | undefined>(
    'userInfo',
    undefined,
    undefined,
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
          showDialog({
            title: '连接服务器失败',
            message: '连接服务器失败，请稍后再试。',
            showCancelButton: false,
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
    getDeviceInfo,
    registerEmail,
    login,
    forgetPasswordEmail,
    resendVerifyEmail,
    logout,
    fetchUserInfo,
  };
});
