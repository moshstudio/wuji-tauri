import { fetch } from '@wuji-tauri/fetch';
import CryptoJS from 'crypto-js';
import _ from 'lodash';
import encrypt from './crypto';
import deviceIds from './deviceid.txt?raw';

export enum CryptoType {
  weapi = 'weapi',
  linuxapi = 'linuxapi',
  eapi = 'eapi',
  api = 'api',
}
export enum OSType {
  pc = 'pc',
  linux = 'linux',
  android = 'android',
  iphone = 'iphone',
}
function toBoolean(val: any) {
  if (typeof val === 'boolean') return val;
  if (val === '') return val;
  return val === 'true' || val == '1';
}
function cookieObjToString(cookie: Record<string, string>) {
  return Object.keys(cookie)
    .map(
      (key) => `${encodeURIComponent(key)}=${encodeURIComponent(cookie[key])}`,
    )
    .join('; ');
}
function cookieToJson(cookie: string) {
  if (!cookie) return {};
  const cookieArr = cookie.split(';');
  const obj: Record<string, string> = {};
  cookieArr.forEach((i) => {
    const arr = i.split('=');
    if (arr.length == 2) obj[arr[0].trim()] = arr[1].trim();
  });
  return obj;
}
const APP_CONF = {
  apiDomain: 'https://interface.music.163.com',
  domain: 'https://music.163.com',
  encrypt: true,
  encryptResponse: false,
};

const WNMCID = (function () {
  const characters = 'abcdefghijklmnopqrstuvwxyz';
  let randomString = '';
  for (let i = 0; i < 6; i++) {
    randomString += characters.charAt(
      Math.floor(Math.random() * characters.length),
    );
  }
  return `${randomString}.${Date.now().toString()}.01.0`;
})();

const osMap: Record<OSType, Record<string, string>> = {
  pc: {
    os: 'pc',
    appver: '3.0.18.203152',
    osver: 'Microsoft-Windows-10-Professional-build-22631-64bit',
    channel: 'netease',
  },
  linux: {
    os: 'linux',
    appver: '1.2.1.0428',
    osver: 'Deepin 20.9',
    channel: 'netease',
  },
  android: {
    os: 'android',
    appver: '8.20.20.231215173437',
    osver: '14',
    channel: 'xiaomi',
  },
  iphone: {
    os: 'iPhone OS',
    appver: '9.0.90',
    osver: '16.2',
    channel: 'distribution',
  },
};

function chooseUserAgent(crypto: CryptoType, uaType = 'pc') {
  const userAgentMap: Record<CryptoType, Record<string, string>> = {
    weapi: {
      pc: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
    },
    eapi: {
      pc: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
    },
    linuxapi: {
      linux:
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
    },
    api: {
      pc: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36 Chrome/91.0.4472.164 NeteaseMusicDesktop/3.0.18.203152',
      android:
        'NeteaseMusic/9.1.65.240927161425(9001065);Dalvik/2.1.0 (Linux; U; Android 14; 23013RK75C Build/UKQ1.230804.001)',
      iphone: 'NeteaseMusic 9.0.90/5038 (iPhone; iOS 16.2; zh_CN)',
    },
  };
  return userAgentMap[crypto][uaType] || '';
}
async function createRequest(
  uri: string,
  data: Record<string, string | number | Record<string, string>>,
  options?: {
    headers?: HeadersInit;
    crypto?: CryptoType;
    cookie?: string | Record<string, string>;
    ua?: string;
    proxy?: string;
    realIP?: string;
    e_r?: string;
  },
) {
  const headers = new Headers(options?.headers || {});
  let cookie = options?.cookie || {};
  if (typeof cookie === 'string') {
    cookie = cookieToJson(cookie);
  }
  if (typeof cookie === 'object') {
    const _ntes_nuid = CryptoJS.lib.WordArray.random(32).toString();
    const os = osMap[cookie.os as OSType] || osMap.iphone;
    cookie = {
      ...cookie,
      __remember_me: 'true',
      // NMTID: CryptoJS.lib.WordArray.random(16).toString(),
      ntes_kaola_ad: '1',
      _ntes_nuid: cookie._ntes_nuid || _ntes_nuid,
      _ntes_nnid: cookie._ntes_nnid || `${_ntes_nuid},${Date.now().toString()}`,
      WNMCID: cookie.WNMCID || WNMCID,
      WEVNSM: cookie.WEVNSM || '1.0.0',

      osver: cookie.osver || os.osver,
      deviceId: cookie.deviceId || `${_.sample(deviceIds.split('\n'))}\r` || '',
      os: cookie.os || os.os,
      channel: cookie.channel || os.channel,
      appver: cookie.appver || os.appver,
    };
    if (!uri.includes('login')) {
      cookie.NMTID = CryptoJS.lib.WordArray.random(16).toString();
    }
    if (!cookie.MUSIC_U) {
      // 游客
      cookie.MUSIC_A = cookie.MUSIC_A;
    }
    headers.set('Cookie', cookieObjToString(cookie));
  }
  let url = '';
  let encryptData: Record<string, string> = {};
  const crypto = !options?.crypto
    ? APP_CONF.encrypt
      ? 'eapi'
      : 'api'
    : options.crypto;
  const csrfToken = cookie.__csrf || '';
  switch (crypto) {
    case 'weapi':
      headers.set('Referer', APP_CONF.domain);
      headers.set(
        'User-Agent',
        options?.ua || chooseUserAgent(CryptoType.weapi),
      );
      data.csrf_token = csrfToken;
      encryptData = encrypt.weapi(data);
      url = `${APP_CONF.domain}/weapi/${uri.substring(5)}`;
      break;
    case 'linuxapi':
      headers.set(
        'User-Agent',
        options?.ua || chooseUserAgent(CryptoType.linuxapi, 'linux'),
      );
      encryptData = encrypt.linuxapi({
        method: 'POST',
        url: APP_CONF.domain + uri,
        params: data,
      });
      url = `${APP_CONF.domain}/api/linux/forward`;
      break;
    case 'eapi':
    case 'api':
      // 两种加密方式，都应生成客户端的cookie
      const header = new Headers({
        osver: cookie.osver, // 系统版本
        deviceId: cookie.deviceId,
        os: cookie.os, // 系统类型
        appver: cookie.appver, // app版本
        versioncode: cookie.versioncode || '140', // 版本号
        mobilename: cookie.mobilename || '', // 设备model
        buildver: cookie.buildver || Date.now().toString().substr(0, 10),
        resolution: cookie.resolution || '1920x1080', // 设备分辨率
        __csrf: csrfToken,
        channel: cookie.channel, // 下载渠道
        requestId: `${Date.now()}_${Math.floor(Math.random() * 1000)
          .toString()
          .padStart(4, '0')}`,
      });
      if (cookie.MUSIC_U) header.set('MUSIC_U', cookie.MUSIC_U);
      if (cookie.MUSIC_A) header.set('MUSIC_A', cookie.MUSIC_A);
      headers.set(
        'Cookie',
        Array.from(header.keys())
          .map(
            (key) =>
              `${encodeURIComponent(key)}=${encodeURIComponent(
                header.get(key)!,
              )}`,
          )
          .join('; '),
      );
      headers.set(
        'User-Agent',
        options?.ua || chooseUserAgent(CryptoType.api, 'iphone'),
      );

      if (crypto === 'eapi') {
        // 使用eapi加密
        data.header = Object.fromEntries(header.entries());
        data.e_r =
          options?.e_r != undefined
            ? options.e_r
            : data.e_r != undefined
              ? data.e_r
              : APP_CONF.encryptResponse.toString(); // 用于加密接口返回值
        // data.e_r = toBoolean(data.e_r);
        encryptData = encrypt.eapi(uri, data);
        url = `${APP_CONF.apiDomain}/eapi/${uri.substring(5)}`;
      } else if (crypto === 'api') {
        // 不使用任何加密
        url = APP_CONF.apiDomain + uri;
        encryptData = Object.fromEntries(
          Object.entries(data).map(([key, value]) => [key, String(value)]),
        );
      }
      break;
    default:
      // 未知的加密方式
      console.log('[ERR]', 'Unknown Crypto:', crypto);
      break;
  }

  return await fetch(`${url}?${new URLSearchParams(encryptData).toString()}`, {
    method: 'POST',
    headers,
  });
}

export { createRequest };
export default createRequest;
