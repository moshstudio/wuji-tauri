import { showNotify } from 'vant';
import { SongExtension } from '.';

class TestSongExtension extends SongExtension {
  id = 'testSong';
  name = 'testSong';
  version = '0.0.1';
  baseUrl = 'https://music.163.com';
  iv = '0102030405060708';
  presetKey = '0CoJUm6Qyw8W8jud';
  linuxapiKey = 'rFgB&h#%2?^eDg:Q';
  base62 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  publicKey = `-----BEGIN PUBLIC KEY-----
  MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDgtQn2JZ34ZC28NWYpAUd98iZ37BUrX/aKzmFbt7clFSs6sXqHauqKWqdtLkF2KexO40H1YTX8z2lSgBBOAxLsvaklV8k4cBFK9snQXE9/DDaFt6Rr7iVZMldczhC0JNgTz+SHXT6CBHuX3e9SdB1Ua44oncaTWz7OBGLbCiK45wIDAQAB
  -----END PUBLIC KEY-----`;
  eapiKey = 'e82ckenh8dichen8';
  deviceIds = [
    'AA9955F5FE37BA7EAF48F8EF0C9966B28293CC8D6415CCD93549',
    'C4BE5BA8E337E26A1ECA938DAF7DDC6D99AA353D9E2E69F5DE2A',
    '2A6626990ED0B095ADBF14D63D91C6F8AE4CF352FF9BD1FE724E',
    '184117F946D9CF013300B74BAAFF42C04B74CE59EDA3A7B31C8E',
    '7051B0BEB96D5DC0DA8C17A034008DE086A21AB833EA41D321FF',
    '90D08AFA4FD3368D3ADD9C7BEB9D40B38066E55B4B2E9C123A26',
    '562D59EA36DB06BACE1D74A3735A7EC9753DED5BA380C2630439',
    '313CD3C6D39148E94A6CD885B40E7C489AC9504078A7513928CE',
    '75A3F0910D5A5A70B0E8BB9A084FBC672CBE8383CEDFC3C84AD2',
    '1AA1EEF80388FDD6FDB1696B84E8AE793DA9CAF444BF2277751F',
    '8DD5CA9A732199E7A3ADC4B5A3F43F00175273F8D18769CED397',
    'A998DD126BFDE300C1C6D2339BA9BA7936E5E31D38FE53E738C8',
    'F3E759572453849BB7705F232EBC44F6D40958F20DA9E33A27C7',
    '23667E54F134DA78658E73673931BCC5B1B66D64EB531633FB5E',
    '689C97934EB38AD53A7055A7E069BB8FA03064E05444E1F4416D',
    '904657F23CE1452C190DDDB7505B124874F7B7A7E5650170ACCA',
    '3581F6565B3CDCDD40984D3E5E884BCE7E309B182071935D7D04',
    'FCBC3C437D2CF27C7DECEFA34F2A081D21C18837A976BFB10F58',
    'ECB395C0DE1F358AF789F8936CF42612B2A72B8041F5F6149031',
    '5ADAF8FA977C3B8496562A3C522A2FD4787870970C6220B9CD61',
    'BEE363EB62204E4C173D901790707FF094D6572F73FE15F449C7',
    '8604AB14E3B3238673FFA6CB078D9D520FAF8AB7B4BFB1BB39AE',
    '41B9DA877DB946F178B57322A82E19B0EF72C5D6F2FAD0FD843D',
    '795E0B15D75407B176F9EEEE934089B917B784E749D089B8D731',
    '15776911CB9E07EAFBB41F0DCF850CF90D5A50CD5CA97AFFB567',
    '11030A9ADDF84AA5D85A7D7841F18CF238EC76AB6C92AFCBEE0E',
    '4CE18C27295A6114268D2E8A32EF772A51ED4E0EF2F9741894BE',
    '94BAF41168FF3F00F37BEC8A893BE286E3B6A571794844490942',
    'E6F236538C3BE31B510EE6356C62E3E0F56D176CF76D85B243CB',
    '737E014997C02D7FC946A9C5982803129CA6A77F53C8E48420F4',
  ];

  aesEncrypt = (text, mode, key, iv, format = 'base64') => {
    let encrypted = this.cryptoJs.AES.encrypt(
      this.cryptoJs.enc.Utf8.parse(text),
      this.cryptoJs.enc.Utf8.parse(key),
      {
        iv: this.cryptoJs.enc.Utf8.parse(iv),
        mode: this.cryptoJs.mode[mode],
        padding: this.cryptoJs.pad.Pkcs7,
      }
    );
    if (format === 'base64') {
      return encrypted.toString();
    }

    return encrypted.ciphertext.toString().toUpperCase();
  };
  aesDecrypt = (ciphertext, key, iv, format = 'base64') => {
    let bytes;
    if (format === 'base64') {
      bytes = this.cryptoJs.AES.decrypt(
        ciphertext,
        this.cryptoJs.enc.Utf8.parse(key),
        {
          iv: this.cryptoJs.enc.Utf8.parse(iv),
          mode: this.cryptoJs.mode.ECB,
          padding: this.cryptoJs.pad.Pkcs7,
        }
      );
    } else {
      bytes = this.cryptoJs.AES.decrypt(
        ciphertext,
        this.cryptoJs.enc.Utf8.parse(key),
        {
          iv: this.cryptoJs.enc.Utf8.parse(iv),
          mode: this.cryptoJs.mode.ECB,
          padding: this.cryptoJs.pad.Pkcs7,
        }
      );
    }
    return bytes.toString(this.cryptoJs.enc.Utf8);
  };
  rsaEncrypt = (str, key) => {
    const forgePublicKey = this.forge.pki.publicKeyFromPem(key);
    const encrypted = forgePublicKey.encrypt(str, 'NONE');
    return this.forge.util.bytesToHex(encrypted);
  };

  weapi = (object) => {
    const text = JSON.stringify(object);
    let secretKey = '';
    for (let i = 0; i < 16; i++) {
      secretKey += this.base62.charAt(Math.round(Math.random() * 61));
    }
    return {
      params: this.aesEncrypt(
        this.aesEncrypt(text, 'CBC', this.presetKey, this.iv),
        'CBC',
        secretKey,
        this.iv
      ),
      encSecKey: this.rsaEncrypt(
        secretKey.split('').reverse().join(''),
        this.publicKey
      ),
    };
  };

  linuxapi = (object) => {
    const text = JSON.stringify(object);
    return {
      eparams: this.aesEncrypt(text, 'ECB', linuxapiKey, '', 'hex'),
    };
  };

  eapi = (url, object) => {
    const text = typeof object === 'object' ? JSON.stringify(object) : object;
    const message = `nobody${url}use${text}md5forencrypt`;
    const digest = this.cryptoJs.MD5(message).toString();
    const data = `${url}-36cd479b6b5-${text}-36cd479b6b5-${digest}`;
    return {
      params: this.aesEncrypt(data, 'ECB', this.eapiKey, '', 'hex'),
    };
  };
  eapiResDecrypt = (encryptedParams) => {
    // 使用aesDecrypt解密参数
    const decryptedData = this.aesDecrypt(
      encryptedParams,
      this.eapiKey,
      '',
      'hex'
    );
    return JSON.parse(decryptedData);
  };
  eapiReqDecrypt = (encryptedParams) => {
    // 使用aesDecrypt解密参数
    const decryptedData = this.aesDecrypt(
      encryptedParams,
      this.eapiKey,
      '',
      'hex'
    );
    // 使用正则表达式解析出URL和数据
    const match = decryptedData.match(
      /(.*?)-36cd479b6b5-(.*?)-36cd479b6b5-(.*)/
    );
    if (match) {
      const url = match[1];
      const data = JSON.parse(match[2]);
      return { url, data };
    }

    // 如果没有匹配到，返回null
    return null;
  };
  decrypt = (cipher) => {
    const decipher = this.cryptoJs.AES.decrypt(cipher, this.eapiKey, {
      mode: this.cryptoJs.mode.ECB,
    });
    const decryptedBytes = this.cryptoJs.enc.Utf8.stringify(decipher);
    return decryptedBytes;
  };

  cookieObjToString(cookie) {
    return Object.keys(cookie)
      .map(
        (key) => `${encodeURIComponent(key)}=${encodeURIComponent(cookie[key])}`
      )
      .join('; ');
  }
  cookieToJson(cookie) {
    if (!cookie) return {};
    let cookieArr = cookie.split(';');
    let obj = {};
    cookieArr.forEach((i) => {
      let arr = i.split('=');
      if (arr.length == 2) obj[arr[0].trim()] = arr[1].trim();
    });
    return obj;
  }
  APP_CONF = {
    apiDomain: 'https://interface.music.163.com',
    domain: 'https://music.163.com',
    encrypt: true,
    encryptResponse: false,
  };

  WNMCID = (function () {
    const characters = 'abcdefghijklmnopqrstuvwxyz';
    let randomString = '';
    for (let i = 0; i < 6; i++)
      randomString += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    return `${randomString}.${Date.now().toString()}.01.0`;
  })();

  osMap = {
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

  chooseUserAgent = (crypto, uaType = 'pc') => {
    const userAgentMap = {
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
  };
  createRequest = async (uri, data, options) => {
    let headers = new Headers(options?.headers || {});
    let cookie = options?.cookie || {};
    if (typeof cookie === 'string') {
      cookie = this.cookieToJson(cookie);
    }
    if (typeof cookie === 'object') {
      let _ntes_nuid = this.cryptoJs.lib.WordArray.random(32).toString();
      let os = this.osMap[cookie.os] || this.osMap['iphone'];
      cookie = {
        ...cookie,
        __remember_me: 'true',
        // NMTID: CryptoJS.lib.WordArray.random(16).toString(),
        ntes_kaola_ad: '1',
        _ntes_nuid: cookie._ntes_nuid || _ntes_nuid,
        _ntes_nnid:
          cookie._ntes_nnid || `${_ntes_nuid},${Date.now().toString()}`,
        WNMCID: cookie.WNMCID || this.WNMCID,
        WEVNSM: cookie.WEVNSM || '1.0.0',

        osver: cookie.osver || os.osver,
        deviceId: cookie.deviceId || this._.sample(this.deviceIds),
        os: cookie.os || os.os,
        channel: cookie.channel || os.channel,
        appver: cookie.appver || os.appver,
      };
      if (uri.indexOf('login') === -1) {
        cookie['NMTID'] = this.cryptoJs.lib.WordArray.random(16).toString();
      }
      if (!cookie.MUSIC_U) {
        // 游客
        cookie.MUSIC_A = cookie.MUSIC_A;
      }
      headers.set('Cookie', this.cookieObjToString(cookie));
    }
    let url = '';
    let encryptData = {};
    const crypto = !options?.crypto
      ? this.APP_CONF.encrypt
        ? 'eapi'
        : 'api'
      : options.crypto;
    const csrfToken = cookie['__csrf'] || '';

    switch (crypto) {
      case 'weapi':
        headers.set('Referer', this.APP_CONF.domain);
        headers.set('User-Agent', options?.ua || this.chooseUserAgent('weapi'));
        data.csrf_token = csrfToken;
        encryptData = this.weapi(data);
        url = this.APP_CONF.domain + '/weapi/' + uri.substring(5);
        break;
      case 'linuxapi':
        headers.set(
          'User-Agent',
          options?.ua || this.chooseUserAgent('linuxapi', 'linux')
        );
        encryptData = this.linuxapi({
          method: 'POST',
          url: this.APP_CONF.domain + uri,
          params: data,
        });
        url = this.APP_CONF.domain + '/api/linux/forward';
        break;
      case 'eapi':
      case 'api':
        // 两种加密方式，都应生成客户端的cookie
        const header = new Headers({
          osver: cookie.osver, //系统版本
          deviceId: cookie.deviceId,
          os: cookie.os, //系统类型
          appver: cookie.appver, // app版本
          versioncode: cookie.versioncode || '140', //版本号
          mobilename: cookie.mobilename || '', //设备model
          buildver: cookie.buildver || Date.now().toString().substr(0, 10),
          resolution: cookie.resolution || '1920x1080', //设备分辨率
          __csrf: csrfToken,
          channel: cookie.channel, //下载渠道
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
                encodeURIComponent(key) +
                '=' +
                encodeURIComponent(header.get(key))
            )
            .join('; ')
        );
        headers.set(
          'User-Agent',
          options?.ua || this.chooseUserAgent('api', 'iphone')
        );

        if (crypto === 'eapi') {
          // 使用eapi加密
          data.header = Object.fromEntries(header.entries());
          data.e_r =
            options?.e_r != undefined
              ? options.e_r
              : data.e_r != undefined
                ? data.e_r
                : this.APP_CONF.encryptResponse.toString(); // 用于加密接口返回值
          // data.e_r = toBoolean(data.e_r);
          encryptData = this.eapi(uri, data);
          url = this.APP_CONF.apiDomain + '/eapi/' + uri.substring(5);
        } else if (crypto === 'api') {
          // 不使用任何加密
          url = this.APP_CONF.apiDomain + uri;
          encryptData = Object.fromEntries(
            Object.entries(data).map(([key, value]) => [key, String(value)])
          );
        }
        break;
      default:
        // 未知的加密方式
        console.log('[ERR]', 'Unknown Crypto:', crypto);
        break;
    }

    return await this.fetch(
      url + '?' + new URLSearchParams(encryptData).toString(),
      {
        method: 'POST',
        headers: headers,
      }
    );
  };

  async getRecommendPlaylists(pageNo) {
    pageNo ||= 1;
    const response = await this.createRequest(
      '/api/personalized/playlist',
      {
        limit: 60,
        total: true,
        n: 1000,
      },
      {
        crypto: 'weapi',
      }
    );
    const json = await response.json();
    if (json.code !== 200) return null;
    const list = json.result.map((item) => {
      return {
        name: item.name,
        id: item.id,
        picUrl: item.picUrl,
        songCount: item.trackCount,
        playCount: item.playCount,
        updateTime: item.trackNumberUpdateTime,
        sourceId: '',
      };
    });
    return {
      list,
      page: 1,
      totalPage: 1,
    };
  }
  async getRecommendSongs(pageNo) {
    pageNo ||= 1;
    const response = await this.createRequest(
      '/api/personalized/newsong',
      {
        type: 'recommend',
        limit: 20,
        areaId: 0,
      },
      {
        crypto: 'weapi',
      }
    );
    const json = await response.json();
    if (json.code !== 200) return null;
    const list = json.result.map((item) => {
      return {
        name: item.name,
        artists: item.song.artists.map((a) => ({ name: a.name, id: a.id })),
        id: item.id,
        cid: item.song.copyrightId,
        album: item.song.album?.name,
        mvId: item.mvid,
        picUrl: item.picUrl,
        duration: item.song.duration,
        sourceId: '',
      };
    });
    return {
      list,
      page: 1,
      totalPage: 1,
    };
  }
  async searchPlaylists(keyword, pageNo) {
    pageNo ||= 1;
    const response = await this.createRequest('/api/cloudsearch/pc', {
      s: keyword,
      type: 1000, // 1: 单曲, 10: 专辑, 100: 歌手, 1000: 歌单, 1002: 用户, 1004: MV, 1006: 歌词, 1009: 电台, 1014: 视频
      limit: 30,
      offset: (pageNo - 1) * 30,
      total: true,
    });
    const json = await response.json();

    if (json.code !== 200) return null;
    const list = json.result.playlists.map((item) => {
      return {
        name: item.name,
        id: item.id,
        picUrl: item.coverImgUrl,
        desc: item.description,
        songCount: item.trackCount,
        playCount: item.playCount,
        updateTime: item.trackNumberUpdateTime,
        sourceId: '',
      };
    });
    return {
      list,
      page: pageNo,
      totalPage: Math.ceil(json.result.playlistCount / 30),
    };
  }
  async searchSongs(keyword, pageNo) {
    pageNo ||= 1;
    const response = await this.createRequest('/api/cloudsearch/pc', {
      s: keyword,
      type: 1, // 1: 单曲, 10: 专辑, 100: 歌手, 1000: 歌单, 1002: 用户, 1004: MV, 1006: 歌词, 1009: 电台, 1014: 视频
      limit: 30,
      offset: (pageNo - 1) * 30,
      total: true,
    });
    const json = await response.json();

    if (json.code !== 200) return null;
    const list = json.result.songs.map((item) => {
      return {
        name: item.name,
        artists: item.ar.map((a) => ({ name: a.name, id: a.id })),
        id: item.id,
        album: item.al?.name,
        picUrl: item.al?.picUrl,
        sourceId: '',
      };
    });
    return {
      list,
      page: pageNo,
      totalPage: Math.ceil(json.result.songCount / 30),
    };
  }
  async getPlaylistDetail(item, pageNo) {
    pageNo ||= 1;
    const response1 = await this.createRequest('/api/v6/playlist/detail', {
      id: item.id,
      n: 100000,
      s: 8,
    });
    const json1 = await response1.json();
    if (json1.code !== 200) return null;
    const limit = 30;
    const offset = (pageNo - 1) * limit;
    const trackIds = json1.playlist.trackIds;
    const response2 = await this.createRequest(
      '/api/v3/song/detail',
      {
        c:
          '[' +
          trackIds
            .slice(offset, offset + limit)
            .map((item) => '{"id":' + item.id + '}')
            .join(',') +
          ']',
      },
      {
        crypto: 'weapi',
      }
    );
    const json2 = await response2.json();

    if (json2.code !== 200) return null;
    const list = json2.songs.map((item) => {
      return {
        name: item.name,
        artists: item.ar.map((a) => ({ name: a.name, id: a.id })),
        id: item.id,
        album: item.al?.name,
        picUrl: item.al?.picUrl,
        sourceId: '',
        extra: { fee: item.fee },
      };
    });

    item.list = {
      list,
      page: pageNo,
      totalPage: Math.ceil(trackIds.length / limit),
    };
    return item;
  }
  async getSongUrl(item, size) {
    //standard, exhigh, lossless, hires, jyeffect(高清环绕声), sky(沉浸环绕声), jymaster(超清母带) 进行音质判断
    let level = 'lossless';
    switch (size) {
      case '128k':
        level = 'standard';
        break;
      case '320k':
        level = 'jyeffect';
        break;
      case 'flac':
        level = 'jymaster';
        break;
      default:
        break;
    }
    const response = await this.createRequest(
      '/api/song/enhance/player/url/v1',
      {
        ids: '[' + item.id + ']',
        level: level,
        encodeType: 'flac',
      }
    );
    const json = await response.json();
    if (json.code !== 200 || !json.data.length) return null;

    return json.data[0].url;
  }
  async getLyric(item) {
    return null;
  }
}

export default TestSongExtension;
