import { SongExtension } from '.';

class TestSongExtension extends SongExtension {
  id = 'testSong';
  name = 'testSong';
  version = '0.0.1';
  baseUrl = 'https://www.kuwo.cn/';
  cookies = null;

  async getRecommendPlaylists(pageNo) {
    const url = `${this.baseUrl}api/www/classify/playlist/getRcmPlayList`;
    const params = new URLSearchParams();
    params.append('id', '');
    params.append('order', 'new');
    params.append('pn', pageNo);
    params.append('rn', 20);

    const response = await this.fetch(url + '?' + params.toString(), {
      headers: {
        Secret: await this.generateSecret(),
        cookie: `${this.cookies.key}=${this.cookies.value}`,
        referer: this.baseUrl,
      },
    });
    const json = await response.json();
    if (json.code !== 200) return null;
    const list = [];
    json.data.data.forEach((element) => {
      list.push({
        id: element.id,
        name: element.name,
        picUrl: element.img,
        author: element.uname,
        songCount: element.total,
      });
    });
    return {
      list,
      page: pageNo,
      totalPage: Math.ceil(json.data.total / 20),
    };
  }
  async getRecommendSongs(pageNo) {
    const url = `${this.baseUrl}api/www/bang/bang/musicList`;
    const params = new URLSearchParams();
    params.append('bangId', '93');
    params.append('pn', pageNo);
    params.append('rn', 20);

    const response = await this.fetch(url + '?' + params.toString(), {
      headers: {
        Secret: await this.generateSecret(),
        cookie: `${this.cookies.key}=${this.cookies.value}`,
        referer: this.baseUrl,
      },
    });
    const json = await response.json();

    if (json.code !== 200) return null;
    const list = [];
    json.data.musicList.forEach((element) => {
      list.push({
        id: element.rid,
        cid: element.musicrid,
        name: element.name,
        picUrl: element.pic,
        artists: [element.artist],
        duration: element.duration,
        extra: {
          pay: element.pay,
        },
      });
    });
    return {
      list,
      page: pageNo,
      totalPage: Math.ceil(Number(json.data.num) / 20),
    };
  }
  async searchPlaylists(keyword, pageNo) {
    const url = `${this.baseUrl}api/www/search/searchPlayListBykeyWord`;
    const params = new URLSearchParams();
    params.append('key', keyword);
    params.append('pn', pageNo);
    params.append('rn', 20);
    const response = await this.fetch(url + '?' + params.toString(), {
      headers: {
        Secret: await this.generateSecret(),
        cookie: `${this.cookies.key}=${this.cookies.value}`,
        referer: this.baseUrl,
      },
    });
    const json = await response.json();
    if (json.code !== 200) return null;
    const list = [];
    json.data.list.forEach((element) => {
      list.push({
        id: element.id,
        name: element.name,
        picUrl: element.img,
        author: element.uname,
        songCount: element.total,
      });
    });
    return {
      list,
      page: pageNo,
      totalPage: Math.ceil(Number(json.data.total) / 20),
    };
  }
  async searchSongs(keyword, pageNo) {
    const url = `${this.baseUrl}search/searchMusicBykeyWord`;
    const params = new URLSearchParams();
    params.append('encoding', 'utf8');
    params.append('rformat', 'json');
    params.append('ft', 'music');
    params.append('pn', pageNo);
    params.append('rn', 20);
    params.append('vipver', 1);
    params.append('client', 'kt');
    params.append('cluster', 0);
    params.append('mobi', 1);
    params.append('issubtitle', 1);
    params.append('show_copyright_off', 1);
    params.append('all', keyword);
    const response = await this.fetch(url + '?' + params.toString(), {
      headers: {
        Secret: await this.generateSecret(),
        cookie: `${this.cookies.key}=${this.cookies.value}`,
        referer: this.baseUrl,
      },
    });
    const json = await response.json();
    const list = [];
    json.abslist?.forEach((element) => {
      list.push({
        id: element.DC_TARGETID,
        cid: element.MUSICRID,
        name: element.SONGNAME,
        picUrl: element.hts_MVPIC,
        artists: [element.ARTIST],
        duration: element.DURATION,
        extra: {
          pay: element.PAY,
        },
      });
    });
    return {
      list,
      page: pageNo,
      totalPage: Math.ceil(Number(json.TOTAL) / 20),
    };
  }
  async getPlaylistDetail(item, pageNo) {
    const url = `${this.baseUrl}api/www/playlist/playListInfo`;
    const params = new URLSearchParams();
    params.append('pid', item.id);
    params.append('pn', pageNo);
    params.append('rn', 20);
    const response = await this.fetch(url + '?' + params.toString(), {
      headers: {
        Secret: await this.generateSecret(),
        cookie: `${this.cookies.key}=${this.cookies.value}`,
        referer: this.baseUrl,
      },
    });
    const json = await response.json();
    if (json.code !== 200) return item;
    const list = [];
    item.desc = json.data.info;
    json.data.musicList?.forEach((element) => {
      list.push({
        id: element.rid,
        cid: element.musicrid,
        name: element.name,
        picUrl: element.pic,
        artists: [element.artist],
        duration: element.duration,
        extra: {
          pay: element.pay,
        },
      });
    });
    item.list = {
      list,
      page: pageNo,
      totalPage: Math.ceil(json.data.total / 20),
    };

    return item;
  }
  async getSongUrl(item, size) {
    const QualityMap = {
      standard: { br: '', format: 'mp3', bitrate: 128 }, // 经测试br写128kmp3有返回aac的可能，所以空着吧QAQ
      exhigh: { br: '320kmp3', format: 'mp3', bitrate: 320 },
      lossless: { br: '2000kflac', format: 'flac', bitrate: 2000 },
      hires: { br: '4000kflac', format: 'flac', bitrate: 4000 },
    };
    const url = `https://nmobi.kuwo.cn/mobi.s`;
    const params = new URLSearchParams();
    params.append('br', '');
    params.append('format', 'mp3');
    params.append('rid', item.id);
    params.append('type', 'convert_url_with_sign');
    params.append('source', 'kwplayer_ar_5.1.0.0_B_jiakong_vh.apk');
    params.append('f', 'web');
    const response = await this.fetch(url + '?' + params.toString(), {
      headers: {
        Secret: await this.generateSecret(),
        cookie: `${this.cookies.key}=${this.cookies.value}`,
        referer: this.baseUrl,
      },
    });
    const json = await response.json();
    if (json.code === 200) {
      return {
        '128k': json.data.url,
      };
    } else {
      const url = `${this.baseUrl}api/v1/www/music/playUrl`;
      const params = new URLSearchParams();
      params.append('mid', item.id);
      params.append('type', 'music');
      const response = await this.fetch(url + '?' + params.toString(), {
        headers: {
          Secret: await this.generateSecret(),
          cookie: `${this.cookies.key}=${this.cookies.value}`,
          referer: this.baseUrl,
        },
      });
      const json = await response.json();
      if (json.code === 200) {
        return {
          '128k': json.data.url,
        };
      }
    }
  }
  async getLyric(item) {
    const url = `${this.baseUrl}openapi/v1/www/`;
    const params = new URLSearchParams();
    params.append('musicId', item.id);
    const response = await this.fetch(url + '?' + params.toString(), {
      headers: {
        Secret: await this.generateSecret(),
        cookie: `${this.cookies.key}=${this.cookies.value}`,
        referer: this.baseUrl,
      },
    });
    const json = await response.json();
    if (json.code === 200) {
      return json.data.lrclist
        .map((l) => `${l.time} ${l.lineLyric}`)
        .join('\n');
    }

    return null;
  }

  async initCookie() {
    const response = await this.fetch(this.baseUrl);
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      this.cookies = {
        key: setCookie.split('=')[0],
        value: setCookie.split('=')[1].split(';')[0],
      };
    }
  }
  async generateSecret() {
    if (!this.cookies) {
      await this.initCookie();
    }
    const t = this.cookies.value;
    const e = this.cookies.key;

    if (null == e || e.length <= 0) return null;
    for (var n = '', i = 0; i < e.length; i++) n += e.charCodeAt(i).toString();
    var r = Math.floor(n.length / 5),
      o = parseInt(
        n.charAt(r) +
          n.charAt(2 * r) +
          n.charAt(3 * r) +
          n.charAt(4 * r) +
          n.charAt(5 * r),
      ),
      l = Math.ceil(e.length / 2),
      c = Math.pow(2, 31) - 1;
    if (o < 2) return null;
    var d = Math.round(1e9 * Math.random()) % 1e8;
    for (n += d; n.length > 10; )
      n = (
        parseInt(n.substring(0, 10)) + parseInt(n.substring(10, n.length))
      ).toString();
    n = (o * n + l) % c;
    var h = '',
      f = '';
    for (i = 0; i < t.length; i++)
      (f +=
        (h = parseInt(t.charCodeAt(i) ^ Math.floor((n / c) * 255))) < 16
          ? '0' + h.toString(16)
          : h.toString(16)),
        (n = (o * n + l) % c);
    for (d = d.toString(16); d.length < 8; ) d = '0' + d;
    return (f += d);
  }
}

export default TestSongExtension;
