import { SongExtension } from '.';

class TestSongExtension extends SongExtension {
  id = 'testSong';
  name = 'testSong';
  version = '0.0.1';
  baseUrl = 'https://www.bilibili.com/';
  _userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36';
  _referer = 'https://www.bilibili.com/';
  _cacheCreatedAtKey = 'bili_catch_created_at';
  _signImgKey = 'bili_sign_img_key';
  _signSubKey = 'bili_sign_sub_key';
  _spiB3 = 'bili_spi_b3';
  _spiB4 = 'bili_spi_b4';
  spiData = null;
  signData = null;
  async getRecommendPlaylists(pageNo) {
    return {
      list: this.musicOrderUrls().map((item) => {
        return {
          id: item.id,
          name: item.name,
          desc: item.desc,
          creator: {
            name: item.name,
          },
          songCount: item.musicList.length,
          picUrl: item.musicList[0].cover,
          picHeaders: {},
        };
      }),
      page: 1,
      totalPage: 1,
    };
  }
  async getRecommendSongs(pageNo) {
    pageNo ||= 1;
    const order = this.musicOrderUrls()[0];
    const songs = order.musicList;
    return {
      list: songs.map((item) => {
        const s = item.name.split('-').map((s) => s.trim());
        let songName;
        let artist;
        if (s.length == 1) {
          songName = s[0];
          artist = order.name;
        } else {
          if (s[0].includes(order.name)) {
            artist = s[0];
            songName = s[1];
          } else {
            songName = s[0];
            artist = s[1];
          }
        }
        return {
          id: item.id,
          name: songName,
          artists: [order.name],
          picUrl: item.cover,
          picHeaders: {},
          sourceId: '',
        };
      }),
      page: 1,
      totalPage: 1,
    };
  }
  async searchPlaylists(keyword, pageNo) {
    return {
      list: this.musicOrderUrls()
        .map((item) => {
          return {
            id: item.id,
            name: item.name,
            desc: item.desc,
            creator: {
              name: item.name,
            },
            songCount: item.musicList.length,
            picUrl: item.musicList[0].cover,
            picHeaders: {},
          };
        })
        .filter((item) => item.name.includes(keyword)),
      page: 1,
      totalPage: 1,
    };
  }
  async searchSongs(keyword, pageNo) {
    pageNo ||= 1;
    await this.getSigns();

    if (!this.signData || !this.spiData) return null;
    const url = 'https://api.bilibili.com/x/web-interface/wbi/search/type';
    const params = {
      search_type: 'video',
      keyword: keyword,
      page: `${pageNo}`,
      pagesize: '20',
    };

    const response = await this.fetch(
      `${url}?${new URLSearchParams(params).toString()}`,
      {
        headers: this.headers(),
        verify: false,
      }
    );
    const json = await response.json();
    if (json.code === 0) {
      const songs = json.data.result.map((item) => {
        return {
          id: `${item.aid}_${item.bvid}`,
          name: item.title.replace(/<[^>]*>/g, ''),
          artists: [item.author],
          picUrl: 'https:' + item.pic,
          picHeaders: {},
          sourceId: '',
        };
      });
      return {
        list: songs,
        page: pageNo,
        totalPage: json.data.numPages,
      };
    } else {
      return null;
    }
  }
  async getPlaylistDetail(item, pageNo) {
    const i = this.musicOrderUrls().find((i) => i.id === item.id);
    item.list = {
      list: i.musicList.map((item) => {
        const s = item.name.split('-').map((s) => s.trim());
        let songName;
        let artist;
        if (s.length == 1) {
          songName = s[0];
          artist = i.name;
        } else {
          if (s[0].includes(i.name)) {
            artist = s[0];
            songName = s[1];
          } else {
            songName = s[0];
            artist = s[1];
          }
        }
        return {
          id: item.id,
          name: songName,
          artists: [artist],
          picUrl: item.cover,
          picHeaders: {},
          sourceId: '',
        };
      }),
      page: 1,
      totalPage: 1,
    };
    return item;
  }
  async getSongUrl(item, size) {
    await this.getSigns();
    const splits = item.id.split('_');
    const aid = splits[0];
    const bvid = splits[1];
    let cid = splits[2];

    if (!cid) {
      const getCid = async (aid, bvid) => {
        const url = 'https://api.bilibili.com/x/web-interface/view';
        const params = this.encWbi({
          aid: aid,
          bvid: bvid,
        });
        const response = await this.fetch(
          `${url}?${new URLSearchParams(params).toString()}`,
          {
            headers: this.headers(),
            verify: false,
          }
        );
        const json = await response.json();
        return json.data.cid;
      };
      cid = await getCid(aid, bvid);
      item.id = `${aid}_${bvid}_${cid}`;
    }
    const url = 'https://api.bilibili.com/x/player/wbi/playurl';
    const params = this.encWbi({
      aid: aid,
      bvid: bvid,
      cid: cid,
      fnval: '4048',
    });

    const response = await this.fetch(
      `${url}?${new URLSearchParams(params).toString()}`,
      {
        headers: this.headers(),
        verify: false,
      }
    );
    const json = await response.json();
    const data = json.data;
    let audioList = data['dash']['audio'].slice(); // 使用 slice() 创建数组的副本
    // 排序，取带宽最大的音质最高
    audioList.sort((a, b) => b['bandwidth'] - a['bandwidth']);

    return {
      '128k': audioList[0]['baseUrl'],
      lyric: json.data.lrc,
      headers: { referer: this.baseUrl },
    };
  }
  async getLyric(item) {
    return null;
  }

  async getSigns() {
    const getSignData = async () => {
      const url = 'https://api.bilibili.com/x/web-interface/nav';
      const response = await this.fetch(url, {
        headers: this.headers(),
        verify: false,
      });
      if (response.status === 200) {
        const json = await response.json();
        const imgUrl = json.data.wbi_img.img_url;
        const subUrl = json.data.wbi_img.sub_url;
        const imgKey = imgUrl.substring(
          imgUrl.lastIndexOf('/') + 1,
          imgUrl.lastIndexOf('.')
        );
        const subKey = subUrl.substring(
          subUrl.lastIndexOf('/') + 1,
          subUrl.lastIndexOf('.')
        );
        this.signData = {
          imgKey,
          subKey,
        };
      }
    };

    const getSpiData = async () => {
      const url = 'https://api.bilibili.com/x/frontend/finger/spi';
      const response = await this.fetch(url, {
        headers: this.headers(),
        verify: false,
      });
      const json = await response.json();

      if (json.code === 0) {
        this.spiData = json.data;
      }
    };

    const key = this.id + '_signs';

    let cache = localStorage.getItem(key);
    if (cache) cache = JSON.parse(cache);

    if (Date.now() - (cache?.ts || 0) > 86400) {
      // 缓存已失效
      cache = null;
    }
    if (!cache?.ts) {
      cache = { ts: Date.now() };
    }
    if (!cache?.signData) {
      await getSignData();
      cache.signData = this.signData;
    }
    if (!cache?.spiData) {
      await getSpiData();
      cache.spiData = this.spiData;
    }
    localStorage.setItem(key, JSON.stringify(cache));
    this.signData = cache.signData;
    this.spiData = cache.spiData;
  }
  encWbi(params) {
    const orig = `${this.signData.imgKey}${this.signData.subKey}`;
    const mixinKey = this.mixinKeyEncTab
      .map((n) => orig[n])
      .join('')
      .substring(0, 32);
    const currentTime = Math.floor(Date.now() / 1000);
    const chrFilter = /[!'()*]/g;

    params['wts'] = currentTime.toString();

    const newParams = Object.keys(params).sort();
    const query = newParams
      .map((key) => {
        const value = params[key].toString().replace(chrFilter, '');
        return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
      })
      .join('&');
    const wbiSign = this.cryptoJs.MD5(query + mixinKey).toString();
    params['w_rid'] = wbiSign;
    return params;
  }

  headers() {
    const h = {
      UserAgent: this._userAgent,
      Referer: this._referer,
      Origin: 'https://www.bilibili.com',
    };

    if (this.spiData?.b_3 && this.spiData?.b_4) {
      h['cookie'] = `buvid4=${this.spiData.b_4}; buvid3=${this.spiData.b_3};`;
    }
    return h;
  }
  musicOrderUrls() {
    return [
      {
        id: 'Rg3SbSqZPOusCUbQDTF-8',
        name: '周杰伦',
        desc: '',
        author: '',
        musicList: [
          {
            id: '612255353_BV1e84y1T7jp_1088807591',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n23040904nu7fllezyaq110os4n2glrq_firsti.jpg',
            name: '夜曲-周杰伦',
            duration: 227,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088807872',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230409033tx4e7mtyku5m15hj8miw1u_firsti.jpg',
            name: '星晴-周杰伦',
            duration: 260,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088808194',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n2304090138p07w7wic29s1v7kbxwvil_firsti.jpg',
            name: '稻香-周杰伦',
            duration: 224,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088809644',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n2304090124x41tjm9cyvb31rp49l9jy_firsti.jpg',
            name: '东风破-周杰伦',
            duration: 316,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088808663',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230409026e7ypsfwtnmx2liacaxgq4n_firsti.jpg',
            name: '断了的弦-周杰伦',
            duration: 298,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088809104',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230409053tvze3bafth60f5dxg60a1o_firsti.jpg',
            name: '发如雪-周杰伦',
            duration: 300,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088808767',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230409021agf12klwe1t9x4fjsenj35_firsti.jpg',
            name: '枫-周杰伦',
            duration: 278,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088809246',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230409043telfjr4act8637jq2h4l7e_firsti.jpg',
            name: '告白气球-周杰伦',
            duration: 216,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088809096',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n2304090164hipvadxadp23vs8ygivrj_firsti.jpg',
            name: '搁浅-周杰伦',
            duration: 239,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088809743',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230409061dnu282i3e6xkv7m0m8hliv_firsti.jpg',
            name: '给我一首歌的时间-周杰伦',
            duration: 254,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088809595',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n23040903269z0b8c4t0lz17u7bjde6b_firsti.jpg',
            name: '轨迹-周杰伦',
            duration: 328,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088810259',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230409062uos0tr2fquqo44e2467tgh_firsti.jpg',
            name: '黑色毛衣-周杰伦',
            duration: 252,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088811233',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230409031s8fq4man1kd9ytgp19lclu_firsti.jpg',
            name: '红尘客栈-周杰伦',
            duration: 276,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088810927',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230409063spzfac6ansfw1wcgq06lxo_firsti.jpg',
            name: '花海-周杰伦',
            duration: 265,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088810899',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230409063v97sqjmv19dt3lj3uyn50k_firsti.jpg',
            name: '简单爱-周杰伦',
            duration: 272,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088810920',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230409027izk231uua4t1nmkj1n94hi_firsti.jpg',
            name: '菊花台-周杰伦',
            duration: 295,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088811174',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230409061er91ds2pm0rm10ewg1y07m_firsti.jpg',
            name: '开不了口-周杰伦',
            duration: 286,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088811699',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230409041ykavro6b96ph2h74u6yzgc_firsti.jpg',
            name: '可爱女人-周杰伦',
            duration: 240,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088812257',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n2304090421ydoznqk8isk235tzuf96v_firsti.jpg',
            name: '兰亭序-周杰伦',
            duration: 255,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088812115',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230409031as7c7i76haow36r2w17q3b_firsti.jpg',
            name: '龙卷风-周杰伦',
            duration: 251,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088811895',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230409013r2v37xfk73pr3uc50u9o0m_firsti.jpg',
            name: '美人鱼-周杰伦',
            duration: 220,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088812350',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230409063w0ztd8ktayem1bjlkatke9_firsti.jpg',
            name: '迷魂曲-周杰伦',
            duration: 230,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088814402',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n2304090339uqb3euvviqf24xd5z4w5u_firsti.jpg',
            name: '明明就-周杰伦',
            duration: 259,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088813518',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n23040906wx0mkz1p0dqb2m0bmqybo72_firsti.jpg',
            name: '哪里都是你-周杰伦',
            duration: 280,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088812708',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230409053kpiqwjyt9sg48rej7zxfj2_firsti.jpg',
            name: '蒲公英的约定-周杰伦',
            duration: 246,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088813314',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230409022myx7o9x317ty1msh95hhjw_firsti.jpg',
            name: '七里香-周杰伦',
            duration: 297,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088813004',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230409023bqp4zza6vt7w29gut9dcan_firsti.jpg',
            name: '千里之外-周杰伦&费玉清',
            duration: 255,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088813925',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230409042vapoccn4wj5d8jf5d7cos9_firsti.jpg',
            name: '青花瓷-周杰伦',
            duration: 238,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088813678',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230409051nmmw97ruk16b8n5c46k17u_firsti.jpg',
            name: '晴天-周杰伦',
            duration: 270,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088815076',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n23040904zugq63oxuvy61ypahapwh72_firsti.jpg',
            name: '手写的从前-周杰伦',
            duration: 298,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088814480',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230409053qe8j9fed9uuf2xro1us00h_firsti.jpg',
            name: '说好的幸福呢-周杰伦',
            duration: 257,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088815319',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230409013dvtmfznyu481n6nef1kw4o_firsti.jpg',
            name: '说了再见-周杰伦',
            duration: 283,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088814288',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230409021me2ilriqst6v375tu00gvp_firsti.jpg',
            name: '算什么男人-周杰伦',
            duration: 289,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088816003',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n2304090512zuv8hfuqa5h1nblpafi6g_firsti.jpg',
            name: '听妈妈的话-周杰伦',
            duration: 264,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088815679',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n23040904351dwcccb8sv13sip7detbj_firsti.jpg',
            name: '我不配-周杰伦',
            duration: 289,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088815835',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n23040906317np27n9q3ks3uexu8wf6g_firsti.jpg',
            name: '我是如此相信-周杰伦',
            duration: 267,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088815926',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230409062420b7b1ck4p42reaqil0x2_firsti.jpg',
            name: '我落泪情绪零碎-周杰伦',
            duration: 259,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088816615',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230409012zqlfqcl5phko3vscpkm0yd_firsti.jpg',
            name: '屋顶-周杰伦&温岚',
            duration: 320,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088816800',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230409062omls18qcyail2r09z6njm9_firsti.jpg',
            name: '心雨-周杰伦',
            duration: 268,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088816672',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230409022dbuqx0dts7532io2vziv8x_firsti.jpg',
            name: '爷爷泡的茶-周杰伦',
            duration: 241,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088816847',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230409052qiwm29wnoaw83ge1l6tzrp_firsti.jpg',
            name: '夜的第七章-周杰伦&潘儿',
            duration: 229,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088817258',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n2304090615keys03ygta18lld41medj_firsti.jpg',
            name: '一路向北-周杰伦',
            duration: 295,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088817275',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n23040906dbm08qs2cu453f8lbfs2tli_firsti.jpg',
            name: '以父之名-周杰伦',
            duration: 343,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088818250',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230409022g29ggxfn2cs831y5yb9x4x_firsti.jpg',
            name: '印第安老斑鸠-周杰伦',
            duration: 305,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088817449',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230409033p7uj8hogpo5u28hr8dpha9_firsti.jpg',
            name: '雨下一整晚-周杰伦',
            duration: 257,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088817939',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n23040901ob6l2hen0iys145hmcc88o3_firsti.jpg',
            name: '最后的战役-周杰伦',
            duration: 252,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088818466',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230409029bmhfdbtjemi1zwqrb1cyzy_firsti.jpg',
            name: '最伟大的作品-周杰伦',
            duration: 245,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088818463',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230409051b3yo2p5uoz3neg9ru95d42_firsti.jpg',
            name: '最长的电影-周杰伦',
            duration: 237,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088818411',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n2304090520wtsa538xdem2h3gzx2tiq_firsti.jpg',
            name: '自导自演-周杰伦',
            duration: 256,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088818931',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n2304090434k9gv2cuf7sm2hzsnc4qsm_firsti.jpg',
            name: '完美主义-周杰伦',
            duration: 245,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088818916',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230409023gq1k49dw8nxvfpu3aa7o1w_firsti.jpg',
            name: 'Mojito-周杰伦',
            duration: 186,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088818400',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n23040904veug93t9jzl8q3o88xnrzvk_firsti.jpg',
            name: '半岛铁盒(Live)-周杰伦',
            duration: 267,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088819719',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n23040905147y3oz3p3ffm3bft36dzwv_firsti.jpg',
            name: '暗号-周杰伦',
            duration: 272,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088819844',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n23040901tqmisxzb6ybe8aoq9266ynw_firsti.jpg',
            name: '安静-周杰伦',
            duration: 335,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088819685',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230409063e2kh5ilx3aak2tucjkugiq_firsti.jpg',
            name: '爱在西元前-周杰伦',
            duration: 235,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088819605',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230409032ddv6bhc4hmdtrg3xormr2j_firsti.jpg',
            name: '爱情废柴-周杰伦',
            duration: 286,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088820381',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n23040904143h0jitoqddp1eyjay0ge3_firsti.jpg',
            name: '不能说的秘密-周杰伦',
            duration: 297,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088820900',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230409031899h9a5sy8vh2zt6uytfb6_firsti.jpg',
            name: '不该-周杰伦',
            duration: 294,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088820211',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230409021x3yk70l26z143r12bm0on0_firsti.jpg',
            name: '反方向的钟-周杰伦',
            duration: 259,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088820536',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n23040905yds328irw7kp37qd2uq6r9x_firsti.jpg',
            name: '对不起-周杰伦',
            duration: 226,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088821621',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230409023o3c6dc7m8u5ua6a224el3o_firsti.jpg',
            name: '斗牛-周杰伦',
            duration: 280,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088820470',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230409062yi2lfcpbo41s3alohaqmdy_firsti.jpg',
            name: '公公偏头痛-周杰伦',
            duration: 184,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088821447',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230409063cd6dh9pqk98p34b6vbu8vt_firsti.jpg',
            name: '公主病-周杰伦',
            duration: 219,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088821542',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230409041hmlng4jei12y199x4ns3yy_firsti.jpg',
            name: '还在流浪-周杰伦',
            duration: 266,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088821741',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n23040904fe225j11th7v2e5h7c38al7_firsti.jpg',
            name: '黄金甲-周杰伦',
            duration: 215,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088821416',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230409013q01wx22ee4lj172r17yg7f_firsti.jpg',
            name: '黑色幽默-周杰伦',
            duration: 284,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088822103',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230409053i2fa8vdu75pc13sizprnqd_firsti.jpg',
            name: '白色风车-周杰伦',
            duration: 271,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088822837',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n2304090616ac4ax0714lt2xbcswnjft_firsti.jpg',
            name: '半兽人-周杰伦',
            duration: 248,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088822274',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230409053loinbfdchjq51k8qlbtbmo_firsti.jpg',
            name: '本草纲目-周杰伦',
            duration: 207,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088822964',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n2304090531rae9517h1tb1vp6v49ynq_firsti.jpg',
            name: '彩虹-周杰伦',
            duration: 263,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088822664',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230409061sjerdokq5emh2z757ocgqe_firsti.jpg',
            name: '超人不会飞-周杰伦',
            duration: 300,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088823306',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n2304090629xltefm6wcrj3bini428vl_firsti.jpg',
            name: '床边故事-周杰伦',
            duration: 227,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088823393',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230409013dtr2m26lhdwf1tzk72qe80_firsti.jpg',
            name: '大笨钟-周杰伦',
            duration: 244,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088823271',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230409022r8bj7pi66vmvz9awg0za1q_firsti.jpg',
            name: '倒影-周杰伦',
            duration: 235,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088824523',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n23040901ibiv2zj06hxv3e8ty7t0a3p_firsti.jpg',
            name: '好久不见-周杰伦',
            duration: 253,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088824004',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230409052sg521agpu0q73gil03cuw1_firsti.jpg',
            name: '将军-周杰伦',
            duration: 203,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088824474',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230409053rqni2awh74d01rwc1e3vn4_firsti.jpg',
            name: '跨时代-周杰伦',
            duration: 195,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088824669',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n2304090334k08aam1znafg8x4tht1zo_firsti.jpg',
            name: '龙拳-周杰伦',
            duration: 275,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088823968',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230409043vpemet7uari81gvbcyjzks_firsti.jpg',
            name: '浪漫手机-周杰伦',
            duration: 241,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088825019',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230409013mpm11g9e28wu3b7ua8tv93_firsti.jpg',
            name: '麦芽糖-周杰伦',
            duration: 261,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088824610',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n2304090223m17vdnh6py83o9scar1op_firsti.jpg',
            name: '迷迭香-周杰伦',
            duration: 250,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088825144',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n23040902owjfe0pcyjdi29l8i2dpeor_firsti.jpg',
            name: '窃爱-周杰伦',
            duration: 205,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088827515',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230409013hh8qy795sli2p2ju3qn3zy_firsti.jpg',
            name: '乔克叔叔-周杰伦',
            duration: 257,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088824999',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n23040903sd1b8v3z2b8n3mqyjom3tr1_firsti.jpg',
            name: '前世情人-周杰伦',
            duration: 201,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088825269',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n23040905cnrmvexhg21r3ijxz6rwydc_firsti.jpg',
            name: '忍者-周杰伦',
            duration: 159,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088825335',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230409011shqxla90tzzd1muet0ikuv_firsti.jpg',
            name: '三年二班-周杰伦',
            duration: 281,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088825525',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230409035afoylikcmgd1dzfcti4dpx_firsti.jpg',
            name: '上海一九四三-周杰伦',
            duration: 196,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088826591',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230409011xqqpc905n2cf1ausjm8l9e_firsti.jpg',
            name: '时光机-周杰伦',
            duration: 313,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088826114',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230409062q8zhv3w783kn2o3xa9nwql_firsti.jpg',
            name: '手语-周杰伦',
            duration: 289,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088826058',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n23040902cat6jjvkn5k73fld070vft3_firsti.jpg',
            name: '她的睫毛-周杰伦',
            duration: 234,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088825933',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n2304090327zfhyancdffm185ohhdhye_firsti.jpg',
            name: '四面楚歌-周杰伦',
            duration: 249,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088826547',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n2304090217qudrmghr1b2taxjuf46bg_firsti.jpg',
            name: '双截棍-周杰伦',
            duration: 202,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088826901',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n23040904ih90fm679dru3vs3b4ksp05_firsti.jpg',
            name: '伊斯坦堡-周杰伦',
            duration: 210,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088826531',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n2304090337a2fluu90sw319b9usmbbd_firsti.jpg',
            name: '鞋子特大号-周杰伦',
            duration: 222,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088827027',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230409012hf5c9mgg8ovsfsfd474q9z_firsti.jpg',
            name: '止战之殇-周杰伦',
            duration: 276,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088827080',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230409032clzoa62b7cyh29ihnx94b1_firsti.jpg',
            name: '园游会-周杰伦',
            duration: 254,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088827321',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230409042c18xhpge1o0922mgel6c8l_firsti.jpg',
            name: '英雄-周杰伦',
            duration: 201,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088827804',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n23040903260bp9vewtuxd2h07fndf2b_firsti.jpg',
            name: '一点点-周杰伦',
            duration: 222,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088832356',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230409023jmaxq2omsosx122ddxgiwx_firsti.jpg',
            name: '回到过去-周杰伦',
            duration: 234,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '612255353_BV1e84y1T7jp_1088924927',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n23040903uwo7b52wdfgl2lcou70cihk_firsti.jpg',
            name: '四季列车-周杰伦',
            duration: 160,
            author: '无损音乐合集',
            origin: 'bili',
          },
        ],
        cover:
          'https://image.baidu.com/search/down?url=http://i0.hdslb.com/bfs/archive/b1c79744dcf00a7d40dbbf7a6d27ec4c2d2fbb01.png',
        createdAt: null,
        updatedAt: null,
      },
      {
        id: '7BE3J6_KdrUSmKHgnExQ2',
        name: '林俊杰',
        desc: '',
        author: '',
        musicList: [
          {
            id: '775492462_BV1A14y1n7Sk_901932733',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n221125082a3fci1ro44uj2g4ru99rhr_firsti.jpg',
            name: '交换余生-林俊杰',
            duration: 277,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199022226',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230717a227zvou1xyel0z11zsloqzl7_firsti.jpg',
            name: '愿与愁-林俊杰',
            duration: 232,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_901938459',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n221125063bn0v9knivnqn20c3pohugm_firsti.jpg',
            name: '裹着心的光-林俊杰',
            duration: 274,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_901941923',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n221125143l2tup4yx0eb13mmci9wfwv_firsti.jpg',
            name: '江南-林俊杰',
            duration: 269,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199065181',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230717a2tfwa9tzjmrgx24phy8u4i48_firsti.jpg',
            name: '起风了-林俊杰',
            duration: 298,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199089178',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230717a2psiae5lq2a621ixqiur9ih1_firsti.jpg',
            name: '不能说的秘密-林俊杰',
            duration: 342,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199106980',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230717a2258nt5yzghej33fjl3fb8ax_firsti.jpg',
            name: '想见你想见你想见你-林俊杰',
            duration: 139,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199043846',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230717a22rje20326mb0o1ekqph00ba_firsti.jpg',
            name: '达尔文-林俊杰',
            duration: 247,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199051848',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230717a22qv5m0lfv2xxh2cvqhyt858_firsti.jpg',
            name: '慢慢喜欢你-林俊杰',
            duration: 202,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199028866',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230717a21gcawcrka2z6e23fcnreio6_firsti.jpg',
            name: '那女孩对我说-林俊杰',
            duration: 248,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_901946399',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n22112508zwbm2tnos7kmyw9lvcxm6s5_firsti.jpg',
            name: '她说-林俊杰',
            duration: 321,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_901954771',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n22112515rq8pie8z21py2omsk6shsd2_firsti.jpg',
            name: '可惜没如果-林俊杰',
            duration: 299,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_901961845',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n221125152znx05pgrj0rd355el6pv08_firsti.jpg',
            name: '将故事写成我们-林俊杰',
            duration: 336,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_901950243',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n221125061kt096am0jl7zmy7r19adge_firsti.jpg',
            name: '美人鱼-林俊杰',
            duration: 255,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_901957776',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n221125062iatzjs24u79uji6g436htx_firsti.jpg',
            name: '裂缝中的阳光-林俊杰',
            duration: 229,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_901964615',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n221125143jmje9tkqurq626r909qwno_firsti.jpg',
            name: '浪漫血液-林俊杰',
            duration: 273,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_901968477',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n221125013ip58aqr1gfd63qqhm5r3w5_firsti.jpg',
            name: '修炼爱情-林俊杰',
            duration: 288,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_901970478',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n221125063zr1zwoqxpx2v82azlkkbhz_firsti.jpg',
            name: '曹操-林俊杰',
            duration: 242,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_901973406',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n221125013usq8g2xr6qpt20us5qr26r_firsti.jpg',
            name: '醉赤壁-林俊杰',
            duration: 282,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_901975944',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n22112507e4wezpzahb9mw7clrdo6ad3_firsti.jpg',
            name: '那些你很冒险的梦-林俊杰',
            duration: 246,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_901979249',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n2211251516cfjhqgd1t3e2wi6vknx8h_firsti.jpg',
            name: '新地球-林俊杰',
            duration: 278,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_901981241',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n22112514aitostrpmolr3baxxzid4ur_firsti.jpg',
            name: '不潮不用花钱-林俊杰',
            duration: 234,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_901983546',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n221125071h6yiwzoxxqbl3idkgs7jqf_firsti.jpg',
            name: '手心的蔷薇-林俊杰/G.E.M. 邓紫棋',
            duration: 281,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_901985347',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n22112515ykndmwanm7sg34zr4uh9e16_firsti.jpg',
            name: '背对背拥抱-林俊杰',
            duration: 236,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_901988953',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n221125082mkey604qmr2q1u6ddhmaky_firsti.jpg',
            name: 'Always Online-林俊杰',
            duration: 226,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_901991023',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n2211250611yk83ri2ybi2k9qr6uefly_firsti.jpg',
            name: '一千年以后-林俊杰',
            duration: 228,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_901993049',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n221125062jx2zpvclkuj41ngte9zir4_firsti.jpg',
            name: '飞云之下-林俊杰/韩红',
            duration: 268,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199057287',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230717a2310rf0ld6ho86gfuv5s3i3e_firsti.jpg',
            name: '因你而在-林俊杰',
            duration: 266,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_901995934',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n2211250819qoyil0dxi2mmx7bry4sh7_firsti.jpg',
            name: '当你-林俊杰',
            duration: 252,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_901995315',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n22112508nxg9xd9pqphk2f3txvdwwox_firsti.jpg',
            name: '小酒窝-林俊杰/蔡卓妍',
            duration: 219,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_902018858',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n221125143so6ukr913vapthn11rye7a_firsti.jpg',
            name: '黑夜问白天-林俊杰',
            duration: 293,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_901997568',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n221125082782ay9i2bwjtinrdevrgfh_firsti.jpg',
            name: '爱笑的眼睛-林俊杰',
            duration: 254,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_902000392',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n22112508d9ugipbqgh3clc4bsxxqycr_firsti.jpg',
            name: '关键词-林俊杰',
            duration: 213,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_902001704',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n221125012n88sy1hcf3171l6mcpw4zd_firsti.jpg',
            name: '无拘-林俊杰',
            duration: 266,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_902002427',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n22112514ism10zhyd9xv3sliwjaytd7_firsti.jpg',
            name: '被风吹过的夏天-林俊杰/金莎',
            duration: 258,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_902003592',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n221125072l310846zwgrk2nqyzo4rs0_firsti.jpg',
            name: '爱不会绝迹-林俊杰',
            duration: 241,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_902005691',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n221125083p7u0n0gextsixnzpewql1b_firsti.jpg',
            name: '我还想她-林俊杰',
            duration: 248,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_902009684',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n221125081xjj0hcta3uvc1yh5lkbhsw_firsti.jpg',
            name: '不为谁而作的歌-林俊杰',
            duration: 266,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_902009059',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n221125061e5mychmiuhxd2svo7yscmd_firsti.jpg',
            name: '豆浆油条-林俊杰',
            duration: 257,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_902010398',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n2211251524bprewi9bs04cc7jx8ou0c_firsti.jpg',
            name: '期待爱-林俊杰/金莎',
            duration: 235,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_902011565',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n221125011i2a3wf0f85hxzlzc57bp85_firsti.jpg',
            name: '记得-林俊杰',
            duration: 289,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_902012816',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n221125142pj0dqu6hcuvu2uik6jobot_firsti.jpg',
            name: '心墙-林俊杰',
            duration: 226,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_902013991',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n22112507m2lc4mf04cpy2ddc5j4e71v_firsti.jpg',
            name: '学不会-林俊杰',
            duration: 230,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_902014886',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n221125062ec5035x7m5sefzffekqn8m_firsti.jpg',
            name: '生生-林俊杰',
            duration: 259,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_902016967',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n221125081f8qxmtogsjamz1luhi5jps_firsti.jpg',
            name: '输了你赢了世界又如何-林俊杰',
            duration: 284,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199047483',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230717a2s174n3zeax9x776r39eqe56_firsti.jpg',
            name: '不死之身-林俊杰',
            duration: 224,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_902017965',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n221125082res665i74eej2azoa9s1n5_firsti.jpg',
            name: '一眼万年-林俊杰',
            duration: 259,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_902020174',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n221125063h7huo1h9kyg93do374dra8_firsti.jpg',
            name: '我很想爱他-林俊杰',
            duration: 262,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_902020864',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n221125153w01b58bn8b1m3sjgi7t9y0_firsti.jpg',
            name: '翅膀-林俊杰',
            duration: 223,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199039883',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230717a2k4ymrfi2amyntkjznef9jbi_firsti.jpg',
            name: '我还年轻 我还年轻-林俊杰',
            duration: 198,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_902021995',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n22112506xvdwy1apjvtz26tl8bqsq7p_firsti.jpg',
            name: '会有那么一天-林俊杰',
            duration: 249,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_902023513',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n2211251540voc0sw5bzqtiady9asgk8_firsti.jpg',
            name: '一定会-林俊杰',
            duration: 208,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_902024970',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n22112501v4g3pbtsiuvdcnaptxluanr_firsti.jpg',
            name: '只对你有感觉-林俊杰',
            duration: 268,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_902027018',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n22112508u7iypiahi2l1mirz0fbqv6q_firsti.jpg',
            name: '第几个100天-林俊杰',
            duration: 282,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_902026771',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n2211251426a1t5679w7nn3507hlxmi7_firsti.jpg',
            name: '幸存者-林俊杰',
            duration: 283,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_902027599',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n2211251526dbddyz3tn535we6ity344_firsti.jpg',
            name: '伟大的渺小-林俊杰',
            duration: 278,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_902029058',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n221125073qk22p3lbj2dw2zrcq1om45_firsti.jpg',
            name: '只对你说-林俊杰',
            duration: 229,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_902033118',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n22112508xu28snnptxgj2bwam9tgfdo_firsti.jpg',
            name: '离开的那一些-林俊杰',
            duration: 278,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199073352',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230717a231g1tmg8m0bd82gydffciq0_firsti.jpg',
            name: '黑暗骑士-林俊杰/五月天',
            duration: 305,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199053544',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230717a21hhva3tn2ybhrqjjxfh5rol_firsti.jpg',
            name: '西界-林俊杰',
            duration: 296,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199055078',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230717a2imilrtxvq3j12zz3bea9361_firsti.jpg',
            name: '茉莉雨-林俊杰',
            duration: 257,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199067117',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230717a23eycdmvryd1twl8xtqavaxn_firsti.jpg',
            name: '孤独娱乐-林俊杰',
            duration: 241,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199068369',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230717a215pl2eogrrgrt3ltvzgw42n_firsti.jpg',
            name: '是你-林俊杰',
            duration: 219,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199069661',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230717a23gmlct3f0x7fk2pevt4cv5p_firsti.jpg',
            name: '原来-林俊杰',
            duration: 222,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199070768',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230717a22osbhv7zyclfqn9ervw2gei_firsti.jpg',
            name: '就是我-林俊杰',
            duration: 195,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199072255',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230717a22j3snkn7ajurnjri4cj344i_firsti.jpg',
            name: '杀手-林俊杰',
            duration: 295,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199075053',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230717a216jm1g2j7lr34coh5nw85dm_firsti.jpg',
            name: '冻结-林俊杰',
            duration: 290,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199076309',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230717a23j7336uu96kr42ajlff8lbl_firsti.jpg',
            name: '编号89757-林俊杰',
            duration: 248,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199077151',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230717a216ox04s40xf313avtl4bicj_firsti.jpg',
            name: '一时的选择–林俊杰',
            duration: 238,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199078675',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230717a23n63fkjc5rg041z09dsteon_firsti.jpg',
            name: '你啊你啊-林俊杰',
            duration: 254,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199079910',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230717a22id5fmsvj5xpt3trzpenbud_firsti.jpg',
            name: '逆光白-林俊杰',
            duration: 206,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199080969',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230717a22rme15opevjtk1zlwidpra0_firsti.jpg',
            name: '进阶-林俊杰',
            duration: 219,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199081903',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230717a234wg8343h5uid1dc2dgrsz4_firsti.jpg',
            name: '落在生命里的光-林俊杰',
            duration: 210,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199083127',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230717a23imgx99kopoas6jr3wzktir_firsti.jpg',
            name: '你要的不是我-林俊杰',
            duration: 252,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199084024',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230717a22unop13ahtvtm1sja0wh87e_firsti.jpg',
            name: '黑武士-林俊杰',
            duration: 220,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199085183',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230717a22cwpuo6jg060116jo541knq_firsti.jpg',
            name: '如果我还剩一件事情可以做-林俊杰',
            duration: 250,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199086101',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230717a21f0ma7tj0azucp3yzjbesov_firsti.jpg',
            name: '梦不凌乱-林俊杰',
            duration: 231,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199086984',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230717a22f3l1b5o781xe2fd39m1fhe_firsti.jpg',
            name: '自画像-林俊杰',
            duration: 227,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199090471',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230717a22yon55fkp20lx338a1znkda_firsti.jpg',
            name: '谢幕-林俊杰',
            duration: 245,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199091547',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230717a2fnrsghn91dka39iio9il82v_firsti.jpg',
            name: '黑色泡沫-林俊杰',
            duration: 234,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199092556',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230717a23k50fct0qjp5u2pae0r7jvq_firsti.jpg',
            name: '7千3百多天-林俊杰',
            duration: 225,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199093435',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230717a2ufi8fo9mlhdob9s7fiklj5l_firsti.jpg',
            name: '简简单单-林俊杰',
            duration: 213,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199094719',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230717a2hwv6d4zarim82gbexwkp58i_firsti.jpg',
            name: '你都在-林俊杰',
            duration: 198,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199095962',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230717a228e8rjsuhiv6n1fm88ii4j1_firsti.jpg',
            name: '第二天堂-林俊杰',
            duration: 267,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199097038',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230717a21ndtc5xfs4o761m32ys5uep_firsti.jpg',
            name: '故事细腻-林俊杰',
            duration: 218,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199098204',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230717a23vkdxbmighd0k3fxc0ueidx_firsti.jpg',
            name: '木乃伊-林俊杰',
            duration: 257,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199099150',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230717a2295g2489m1tb01b6g1jdxxn_firsti.jpg',
            name: '会读书-林俊杰',
            duration: 210,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199100333',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230717a2zcaufl292spjsljbmuud6tl_firsti.jpg',
            name: '突然累了-林俊杰',
            duration: 252,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199101348',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230717a22r9sfvljlyotk2nhxml6c6n_firsti.jpg',
            name: '第几个100天-林俊杰',
            duration: 282,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199102635',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230717a227ba6x80e26zz2moz0f9uys_firsti.jpg',
            name: '不流泪的机场-林俊杰',
            duration: 289,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199104094',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230717a21ch81xn34jgh6knithj90kd_firsti.jpg',
            name: '我们很好-林俊杰',
            duration: 270,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199105164',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230717a22qi1jr4glwg2wf9ny9uce4j_firsti.jpg',
            name: '熟能生巧-林俊杰',
            duration: 248,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199106346',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230717a213s4vby7e2n9x19xzhd70di_firsti.jpg',
            name: '恨幸福来过-林俊杰',
            duration: 178,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199108168',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230717a23pu6wi6nre0lh3skb8cvb3t_firsti.jpg',
            name: '握不住的他-林俊杰',
            duration: 212,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199109171',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230717a2o1m97cbkpff91iphinxllv7_firsti.jpg',
            name: '无尽的思念-林俊杰',
            duration: 227,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199110070',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230717a21phzrz9768hi73cgpsnff70_firsti.jpg',
            name: '不懂-林俊杰',
            duration: 272,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199111064',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230717a22tjtbhmdjo8wh33tlic27g2_firsti.jpg',
            name: '零度的亲吻-林俊杰',
            duration: 230,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_1199112022',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230717a22tdq2kya3xazj2stnu2sz2d_firsti.jpg',
            name: '害怕-林俊杰',
            duration: 283,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_902030784',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n221125062s75c7p50cmk73325xmf6a2_firsti.jpg',
            name: 'X-林俊杰',
            duration: 247,
            author: '敏皓音乐',
            origin: 'bili',
          },
          {
            id: '775492462_BV1A14y1n7Sk_902032653',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n221125083cvlxj1rwl1uj2mw1ixgra2_firsti.jpg',
            name: '我们的爱-林俊杰',
            duration: 360,
            author: '敏皓音乐',
            origin: 'bili',
          },
        ],
        cover:
          'https://image.baidu.com/search/down?url=http://i1.hdslb.com/bfs/archive/aa87a27d83bfa316270304a1b9cbade5c6254be5.png',
        createdAt: null,
        updatedAt: null,
      },
      {
        id: 'n1TC8Ft8ktFLNZ2uAFXOr',
        name: '陈奕迅',
        desc: '',
        author: '',
        musicList: [
          {
            id: '530151915_BV1Yu41187Xg_1174773021',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n2306250224vs2xy4i11ku1clld9i5r9_firsti.jpg',
            name: '001. 陈奕迅-爱情转移',
            duration: 261,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174773629',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230625062725cwky2ttt02fxhz2c213_firsti.jpg',
            name: '002. 陈奕迅-富士山下',
            duration: 260,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174773266',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230625023bzt210jlesax36q0j95bse_firsti.jpg',
            name: '003. 陈奕迅-最佳损友',
            duration: 237,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174773430',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230625031jm9cxmq4gua5l7zbwxzr1k_firsti.jpg',
            name: '004. 陈奕迅-红玫瑰',
            duration: 241,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174773470',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230625021l07pg1szlnak10etxyk84x_firsti.jpg',
            name: '005. 陈奕迅-不要说话',
            duration: 286,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174773386',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230625031icgsvsakkvr17441hnn4q2_firsti.jpg',
            name: '006. 陈奕迅 - 孤独患者',
            duration: 274,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174773821',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230625052jmskqmslu8f61rwafg6mqt_firsti.jpg',
            name: '007. 陈奕迅-单车',
            duration: 209,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174773922',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230625042adncehz20m9n3efmw4pjtq_firsti.jpg',
            name: '008. 陈奕迅-十年',
            duration: 206,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174774019',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n23062503290nba6ldysmn2mljt0c3hi_firsti.jpg',
            name: '009. 陈奕迅-阴天快乐',
            duration: 261,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174774302',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230625035rp04pjhl5m71s70xzpibgn_firsti.jpg',
            name: '010. 陈奕迅-好久不见',
            duration: 251,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174774067',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230625011lb4suohld35r2jvgf603r9_firsti.jpg',
            name: '011. 陈奕迅-浮夸',
            duration: 287,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174774323',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n23062504g9owedudlc6p2k0zlnnlp2f_firsti.jpg',
            name: '012. 陈奕迅-淘汰',
            duration: 286,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174774088',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230625043glspclq2ss3p2g7deao3im_firsti.jpg',
            name: '013. 陈奕迅-K歌之王',
            duration: 223,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174774541',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n23062503250snnljrd82n3bvuizyg16_firsti.jpg',
            name: '014. 陈奕迅-阿牛',
            duration: 203,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174774832',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230625023eeu9hh0ihp1d12pnbavxdu_firsti.jpg',
            name: '015. 陈奕迅-阿猫阿狗',
            duration: 230,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174774789',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230625046lzzr57s4cqp7kra5e2s5kw_firsti.jpg',
            name: '016. 陈奕迅-你的背包',
            duration: 238,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174774842',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n23062501643rumdr8ilmg2u20xpxs1o_firsti.jpg',
            name: '017. 陈奕迅-一丝不挂',
            duration: 243,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174774646',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n23062505316ws2732l9wd3701vyt9ry_firsti.jpg',
            name: '018. 陈奕迅-谢谢侬',
            duration: 263,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174775247',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230625031xoj1yr17dtlo2eb6g6pqzk_firsti.jpg',
            name: '019. 陈奕迅-粤语残片',
            duration: 273,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174775396',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230625022bdr2n3jfhyic31fa3r5t7l_firsti.jpg',
            name: '020. 陈奕迅-任我行',
            duration: 279,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174775085',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230625041n1y1eweknehf3jotnrxuor_firsti.jpg',
            name: '021. 陈奕迅-孤勇者',
            duration: 257,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174775432',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230625032fm8zk6xxe69rbhfmf5qudt_firsti.jpg',
            name: '022. 陈奕迅-盲婚哑嫁',
            duration: 224,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174775348',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230625062dqkvvmk8nqa45626i1olu7_firsti.jpg',
            name: '023. 陈奕迅-落花流水',
            duration: 238,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174775692',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230625023fruvnbdjltgv3c1tokqlve_firsti.jpg',
            name: '024. 陈奕迅-零下几分钟',
            duration: 258,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174775932',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230625052mblhn39tx0enfx3b0xzsjl_firsti.jpg',
            name: '025. 陈奕迅-苦瓜',
            duration: 279,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174776019',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230625051nk3fqfto55ij3ckom8gs0w_firsti.jpg',
            name: '026. 陈奕迅-可以了',
            duration: 293,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174775772',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n23062502hjy8j3sy5j7l3497d3zukx5_firsti.jpg',
            name: '027. 陈奕迅-今天只做一件事',
            duration: 231,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174776288',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230625052nzj9y20pbtzdxmdgimq3pf_firsti.jpg',
            name: '028. 陈奕迅-今日',
            duration: 272,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174776149',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230625032xuyew35vl0mj3odur9yd64_firsti.jpg',
            name: '029. 陈奕迅-结束开始',
            duration: 228,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174776246',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n2306250631abd1gar5dq6yi5jkv1ejs_firsti.jpg',
            name: '030. 陈奕迅-积木',
            duration: 258,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174776251',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n2306250455fxi6l8vrcg2kujly2bt1k_firsti.jpg',
            name: '031. 陈奕迅-黄金时代',
            duration: 250,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174776612',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n23062504125xdx4debaha1b5zw2eo00_firsti.jpg',
            name: '032. 陈奕迅-黑洞',
            duration: 223,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174776628',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230625041f29hym2qhm672rl0aauaag_firsti.jpg',
            name: '033. 陈奕迅-还有什么可以送给你',
            duration: 270,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174777308',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230625062moexmxtduncs395iasnqlj_firsti.jpg',
            name: '034. 陈奕迅-告别娑婆',
            duration: 261,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174776792',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n23062502g0nb5x1alhrs3gbnknhtfls_firsti.jpg',
            name: '035. 陈奕迅-防不胜防',
            duration: 266,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174777256',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n2306250436uma1vt5h3g51kzz5l65jg_firsti.jpg',
            name: '036. 陈奕迅-反高潮',
            duration: 225,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174777033',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n23062502rdzz7qwhzo4d3km9biqygse_firsti.jpg',
            name: '037. 陈奕迅-对不起 谢谢',
            duration: 263,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174777108',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230625063f4itzys5q7ej188axmgvcu_firsti.jpg',
            name: '038. 陈奕迅-白玫瑰',
            duration: 241,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174777075',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230625063gisjny5itm6t39nv3nwu4l_firsti.jpg',
            name: '039. 陈奕迅-大个女',
            duration: 237,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174777291',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n23062502k4plz46gfmpl3qz0j9kvc7k_firsti.jpg',
            name: '040. 陈奕迅-床头床尾',
            duration: 246,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174777601',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230625011vnozcvmq6lvn2nqwpo1nyr_firsti.jpg',
            name: '041. 陈奕迅-床上的黑洞',
            duration: 188,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174777829',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n2306250139kzsgmnifv8g13l5gel7i8_firsti.jpg',
            name: '042. 陈奕迅-白色球鞋',
            duration: 279,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174777661',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230625041utnltt6b2hpo2ju9p3elvi_firsti.jpg',
            name: '043. 陈奕迅-尘大师',
            duration: 268,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174777859',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n2306250426j8w1vi38hp234pzw2aeuq_firsti.jpg',
            name: '044. 陈奕迅-超人的主题曲',
            duration: 202,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174777927',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230625051qack3jket2rz1knhiemlu2_firsti.jpg',
            name: '045. 陈奕迅-猜情寻',
            duration: 246,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174778234',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230625032tshvc5gxsr361evwcgehtd_firsti.jpg',
            name: '046. 陈奕迅-不如这样',
            duration: 283,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174778383',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230625051ap1rugpmj1iw4waowthjfz_firsti.jpg',
            name: '047. 陈奕迅-不如不见',
            duration: 250,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174778318',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n23062506gqxgwzcc4g0j3a8ngj8v4ic_firsti.jpg',
            name: '048. 陈奕迅-不期而遇的夏天',
            duration: 211,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174778233',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230625052n3gqw5t2rsvb1ka34twxsd_firsti.jpg',
            name: '049. 陈奕迅-不良嗜好',
            duration: 217,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174778601',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230625022t64vl0f3oy60293fry64vq_firsti.jpg',
            name: '050. 陈奕迅-不来也不去',
            duration: 270,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174778895',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230625031p6fh981gshg3eiuyx3rtia_firsti.jpg',
            name: '051. 陈奕迅-贝多芬与我',
            duration: 264,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174778856',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230625023gzfirwsgmeb93uy7n32uk3_firsti.jpg',
            name: '052. 陈奕迅-爱是一本书',
            duration: 265,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174778899',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230625011dnk2vskxgza9y35hborkl0_firsti.jpg',
            name: '053. 陈奕迅-爱是怀疑',
            duration: 272,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174779032',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230625062ij7npr8plg383u8sa58dtt_firsti.jpg',
            name: '054. 陈奕迅-阿怪',
            duration: 313,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174778867',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230625027bba4og6tx5j12ps26ipbzx_firsti.jpg',
            name: '055. 陈奕迅-Sleep Alone',
            duration: 146,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174779355',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n23062503169ask2j47bsa3bk6k3ldqv_firsti.jpg',
            name: '056. 陈奕迅-Shall We Talk',
            duration: 229,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174779679',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230625023tlvznrl4yqor3a9gc66ryq_firsti.jpg',
            name: '057. 陈奕迅-Lonely Christmas',
            duration: 281,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174779480',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230625012xj5qspbr9cyc1vd5wsnn7x_firsti.jpg',
            name: "058. 陈奕迅-Because You're Good To",
            duration: 220,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174779948',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230625053aoww3ucszoii1k32jv6rtb_firsti.jpg',
            name: '059. 陈奕迅-1874',
            duration: 231,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174779473',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n23062503foobx0ib7zm92crvdyh6djn_firsti.jpg',
            name: '060. 陈奕迅&eason and the duo band-',
            duration: 237,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174780129',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230625022hv0epuzungtx1eyw0k8za0_firsti.jpg',
            name: '061. 陈奕迅-16月6日 晴',
            duration: 227,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174779842',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230625022z93zc7htglz1k7moyc42ww_firsti.jpg',
            name: '062. 陈奕迅&王菲-因为爱情',
            duration: 218,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174779828',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230625032cp0byb9baqye239glku4wi_firsti.jpg',
            name: '063. 陈奕迅&苦荣-孤儿仔',
            duration: 224,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174781520',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n23062506dzfyd1p3tyub276e9rkczrs_firsti.jpg',
            name: '064. 陈奕迅-最后派对',
            duration: 312,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174780819',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230625041v879dygkb3a6x0fbilv78e_firsti.jpg',
            name: '065. 陈奕迅-主旋律',
            duration: 294,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174780301',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230625052trmrlyhtyecp2cludei9ad_firsti.jpg',
            name: '066. 陈奕迅-重口味',
            duration: 239,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174779991',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n2306250333jghwy3fib0wwb5w28m96d_firsti.jpg',
            name: '067. 陈奕迅-致明日的舞',
            duration: 211,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174781006',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n23062503bikmgcib4tk9219hwh4goka_firsti.jpg',
            name: '068. 陈奕迅-只是近黄昏',
            duration: 247,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174780629',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230625023sm3fki0qgsfl3tlfh4yggi_firsti.jpg',
            name: '069. 陈奕迅-之外',
            duration: 240,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174781109',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n2306250112w3plvbkrz6j1v3jl350dd_firsti.jpg',
            name: '070. 陈奕迅-在这个世界相遇',
            duration: 310,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174780664',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n2306250639rj4f1ke4lyp1teo9ojvoq_firsti.jpg',
            name: '071. 陈奕迅-月球上的人',
            duration: 223,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174781442',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230625043pzk4d6yg9ttc2804g655zx_firsti.jpg',
            name: '072. 陈奕迅-远在咫尺',
            duration: 259,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174781548',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230625042mnejelsgizky1r3ds6u2wl_firsti.jpg',
            name: '073. 陈奕迅-预感',
            duration: 308,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174781769',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230625053hbpjaye7kz0c12bq181wi0_firsti.jpg',
            name: '074. 陈奕迅-娱乐天空',
            duration: 364,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174781481',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230625033pzhjk3owmqh23rz769sqhf_firsti.jpg',
            name: '075. 陈奕迅-于心有愧',
            duration: 239,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174781798',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n23062505meu0ufcxrfl01abxch80jdf_firsti.jpg',
            name: '076. 陈奕迅-右上角',
            duration: 210,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174782113',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n23062506113lzty8yhi6e35s7qkd4a1_firsti.jpg',
            name: '077. 陈奕迅-一个旅人',
            duration: 258,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174781934',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230625052cyionmct33ql1d91f27t13_firsti.jpg',
            name: '078. 陈奕迅&eason and the duo band-',
            duration: 299,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174782324',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n2306250523mn5hsfdv0s03e608ymaow_firsti.jpg',
            name: '079. 陈奕迅&eason and the duo band-',
            duration: 288,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174782526',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n23062504nfuvha184k513gt6h1woaj3_firsti.jpg',
            name: '080. 陈奕迅&eason and the duo band-',
            duration: 286,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174782840',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230625051qs5uzbsk1gt33deymlq5q1_firsti.jpg',
            name: '081. 陈奕迅&eason and the duo band-',
            duration: 279,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174782495',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230625041kdgcmtarhmp63vlmbwl3rv_firsti.jpg',
            name: '082. 陈奕迅&eason and the duo band-',
            duration: 258,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174782640',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230625013572v8f2iis2b30esqc4e9s_firsti.jpg',
            name: '083. 陈奕迅-遥远的她',
            duration: 272,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174782819',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230625042zw5rp5xt5ev93pyj5v7rnp_firsti.jpg',
            name: '084. 陈奕迅-烟味',
            duration: 264,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174783224',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n23062504g33iwbj5dsiuijjtw10qxk9_firsti.jpg',
            name: '085. 陈奕迅-兄妹',
            duration: 211,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174783121',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230625043u2wkzb3kczlk3rwh1hpugi_firsti.jpg',
            name: '086. 陈奕迅-幸福摩天轮',
            duration: 258,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174782977',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230625061pii7gj9cvu7h2fvfwrwcqx_firsti.jpg',
            name: '087. 陈奕迅-信心花舍',
            duration: 203,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174783078',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230625021urs2873zo9j63vez7kkj6t_firsti.jpg',
            name: '088. 陈奕迅-信任',
            duration: 210,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174783390',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n23062502zap81nu2d0j4clsveewc73i_firsti.jpg',
            name: '089. 陈奕迅-心的距离(国)',
            duration: 322,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174783362',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n2306250393m3mn75wlzi2w2m7b4gf2k_firsti.jpg',
            name: '090. 陈奕迅-想听',
            duration: 208,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174783488',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n2306250111gruj3ah38a5pd8ewfnz6c_firsti.jpg',
            name: '091. 陈奕迅-相信自己无限极',
            duration: 183,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174783739',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230625028tg1bulsk4vt3juxvmzasot_firsti.jpg',
            name: '092. 陈奕迅-相信你的人',
            duration: 275,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174784015',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230625032619ift40cbfk1um8nm2ovi_firsti.jpg',
            name: '093. 陈奕迅-夕阳无限好',
            duration: 247,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174783957',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230625052899q20l4bo6t2km51m29sa_firsti.jpg',
            name: '094. 陈奕迅-无条件',
            duration: 230,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174784058',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n23062502yn9pcj83t1yw28ktei7l08h_firsti.jpg',
            name: '095. 陈奕迅-无人之境',
            duration: 222,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174784030',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230625061m9wcw7rcredy3bp5ba4xat_firsti.jpg',
            name: '096. 陈奕迅-我也不会那么做',
            duration: 269,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174783799',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n23062501z8zwaxxsgmun3vutwaebp37_firsti.jpg',
            name: '097. 陈奕迅-我的快乐时代',
            duration: 219,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174784164',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n23062502yiyqt6tjsb82304kqn9nsdz_firsti.jpg',
            name: '098. 陈奕迅-稳稳的幸福',
            duration: 224,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174784261',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230625041w2haopvxngkhryoc9c50ds_firsti.jpg',
            name: '099. 陈奕迅-完',
            duration: 205,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174784534',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n2306250123843o8uhzpz03lyri1dp5i_firsti.jpg',
            name: '100. 陈奕迅-陀飞轮',
            duration: 279,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174817898',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230625061jhnfvyc3wnyy2aoe6x7irk_firsti.jpg',
            name: '101. 陈奕迅-天下无双',
            duration: 261,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174817894',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n2306250319mlw62rkz9wr2m4giops3x_firsti.jpg',
            name: '102. 陈奕迅-掏空',
            duration: 247,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174818352',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230625033uk3zvc81tx2919n1e4m8sj_firsti.jpg',
            name: '103. 陈奕迅-太阳照常升起',
            duration: 231,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174818235',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n23062503xnc4wtjzt4h637gx11hm9yl_firsti.jpg',
            name: '104. 陈奕迅-岁月如歌',
            duration: 212,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174818269',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230625023lu5vga9gmydw3lmuw7grbq_firsti.jpg',
            name: '105. 陈奕迅-斯德哥尔摩情人',
            duration: 254,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174818821',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230625021eids4e2yuoq2woj6rttt2i_firsti.jpg',
            name: '106. 陈奕迅-谁来剪月光',
            duration: 213,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174818633',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230625022dgysk4qncv6l1bwuboy33a_firsti.jpg',
            name: '107. 陈奕迅-收心操',
            duration: 174,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174819112',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230625013qhqs0w8dzpci184mibu5pb_firsti.jpg',
            name: '108. 陈奕迅-是但求其爱',
            duration: 270,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174819282',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n23062505wfjhc69gy55w1ioldpci8ga_firsti.jpg',
            name: '109. 陈奕迅-时光隧道',
            duration: 261,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174818887',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230625061ler0jem4r3pl1y32dsfyyc_firsti.jpg',
            name: '110. 陈奕迅-时光倒流二十年',
            duration: 207,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174819241',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230625013sv44m5j0wovt30ivnjoykl_firsti.jpg',
            name: '111. 陈奕迅-十面埋伏',
            duration: 230,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174820020',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n2306250233smpjfobuyci235zinzna2_firsti.jpg',
            name: '112. 陈奕迅-失忆蝴蝶',
            duration: 238,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174819865',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n2306250131178c56djjr712dnvo62c3_firsti.jpg',
            name: '113. 陈奕迅-圣诞结',
            duration: 283,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174819912',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n2306250528nfpujkg8ovxdakuhl2ny0_firsti.jpg',
            name: '114. 陈奕迅-伤信',
            duration: 280,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174819948',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230625013qhczogw4h7qp2uz60azuju_firsti.jpg',
            name: '115. 陈奕迅-沙龙',
            duration: 277,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174819598',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n23062502fecm10w8xmis2ghi9eaizyc_firsti.jpg',
            name: '116. 陈奕迅-人来人往',
            duration: 235,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174820572',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n23062505ssscr6y4rr4o15hdrffs7mi_firsti.jpg',
            name: '117. 陈奕迅-人啊人',
            duration: 299,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174820550',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230625052lnx834ezx9pvabzxrmn6wt_firsti.jpg',
            name: '118. 陈奕迅-热带雨林',
            duration: 259,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174820388',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230625015w9otmtw5a2n1uprz24uau9_firsti.jpg',
            name: '119. 陈奕迅-让我留在你身边',
            duration: 190,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174820838',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230625042hk18341cjula3vhrf2vkub_firsti.jpg',
            name: '120. 陈奕迅-裙下之臣',
            duration: 263,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174820607',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230625051bnpj0w8ueylvb3f9aavczf_firsti.jpg',
            name: '121. 陈奕迅-全世界失眠',
            duration: 251,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174821058',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n2306250210oj4c7oxvy662r04qxkyq6_firsti.jpg',
            name: '122. 陈奕迅-倾城(单曲版)',
            duration: 250,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174820970',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230625062rtbxnga5pqod1jbmk5w499_firsti.jpg',
            name: '123. 陈奕迅-七百年后',
            duration: 263,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174821717',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230625053a3rvidkqmeg6m5swx0718o_firsti.jpg',
            name: '124. 陈奕迅-葡萄成熟时',
            duration: 281,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174821178',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230625042a8qk5o8o78af35lvmq3at6_firsti.jpg',
            name: '125. 陈奕迅-披风',
            duration: 237,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174821483',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n2306250238cciuvgk2k3j1dcrddjqf1_firsti.jpg',
            name: '126. 陈奕迅-陪你度过漫长岁月',
            duration: 243,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174821546',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230625013rmmun9k3iazt3et1gibqqx_firsti.jpg',
            name: '127. 陈奕迅-怕死',
            duration: 256,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174821453',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n23062503ubi68vzlze772xkz5ddnt29_firsti.jpg',
            name: '128. 陈奕迅-你给我听好',
            duration: 289,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174821703',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n23062505jw1szhp13lg83iuksbpmo9j_firsti.jpg',
            name: '129. 陈奕迅-内疚',
            duration: 241,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174821694',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230625021q9d5kgev0cf321a76eontg_firsti.jpg',
            name: '130. 陈奕迅-明年今日',
            duration: 207,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174821945',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230625022012varvpneig3k71e5mpbq_firsti.jpg',
            name: '131. 陈奕迅-绵绵',
            duration: 245,
            author: '无损音乐合集',
            origin: 'bili',
          },
          {
            id: '530151915_BV1Yu41187Xg_1174822225',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n2306250616bgyt9mztoa1dfhws7yd3i_firsti.jpg',
            name: '132. 陈奕迅-每一个明天',
            duration: 267,
            author: '无损音乐合集',
            origin: 'bili',
          },
        ],
        cover:
          'https://image.baidu.com/search/down?url=http://i1.hdslb.com/bfs/archive/496a04ddcf30d4beaaaff7515932e4e11f3966f9.png',
        createdAt: null,
        updatedAt: null,
      },
      {
        id: '72fafecd-4b56-47fd-a1f9-547a58e9b811',
        name: '邓紫棋',
        desc: '',
        author: '',
        musicList: [
          {
            id: '492467474_BV1xN411x76o_1306220994',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231021sa115tv6qtyr0a51erce2wz7p_firsti.jpg',
            name: '句号-G.E.M.邓紫棋',
            duration: 236,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306229281',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231021sayisyz3bqlg4u1lo9z3whazs_firsti.jpg',
            name: '光年之外-G.E.M.邓紫棋',
            duration: 236,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306255203',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231021sa3cihv9dthi9m5bfe38mdbxh_firsti.jpg',
            name: '泡沫-G.E.M.邓紫棋',
            duration: 260,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1506730576',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240415sa3be8s7d3h884v1xhgyqzjny_firsti.jpg',
            name: '11-G.E.M.邓紫棋',
            duration: 230,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1639644507',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240806sa2m2zwh24ks3fd39t5jvny06_firsti.jpg',
            name: '夜空中最亮的星-G.E.M.邓紫棋',
            duration: 232,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475130212',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240319sa2tiip0rgraxux3dj5itezu0_firsti.jpg',
            name: '海阔天空-G.E.M.邓紫棋',
            duration: 267,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306238840',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231021sajtj44zyi76vh3ofgny6bngc_firsti.jpg',
            name: '桃花诺-G.E.M.邓紫棋',
            duration: 220,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306249218',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231021sa3o03v5y2vcyf03tnvslxjr9_firsti.jpg',
            name: '多远都要在一起-G.E.M.邓紫棋',
            duration: 218,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306311941',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231021sa3rujcfrsvoynv1jgk7ac38d_firsti.jpg',
            name: '唯一-G.E.M.邓紫棋',
            duration: 254,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475252712',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240319sa1wwac8iuepudp17w0wun6ye_firsti.jpg',
            name: '雨蝶(Live)-G.E.M.邓紫棋/张靓颖',
            duration: 256,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306265855',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231021saev5ufoodrd0v21x8dtr4npn_firsti.jpg',
            name: '喜欢你-G.E.M.邓紫棋',
            duration: 240,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306277468',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231021sa26uosowvqicna28n7j3j7m3_firsti.jpg',
            name: '倒数-G.E.M.邓紫棋',
            duration: 230,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306286167',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231021qnk8z3nq8qjs83rssijrzf53m_firsti.jpg',
            name: '再见-G.E.M.邓紫棋',
            duration: 207,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306291835',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231021sa3mr4xzdnbp15irod8nuspwf_firsti.jpg',
            name: '来自天堂的魔鬼-G.E.M.邓紫棋',
            duration: 246,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306300098',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231021sa36b57vy7vsvqs34cp99yseu_firsti.jpg',
            name: '手心的蔷薇-G.E.M.邓紫棋/林俊杰',
            duration: 281,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306319434',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231021savk0ni240u8lj2wcv9azh59a_firsti.jpg',
            name: '情人-G.E.M.邓紫棋',
            duration: 294,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306330369',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231021sa2j6i4dquvfc5717l7e5741l_firsti.jpg',
            name: '我的秘密-G.E.M.邓紫棋',
            duration: 251,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306344652',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231021sa1yed41y2wvb8tuaqaw0iyr8_firsti.jpg',
            name: 'Where Did U Go-G.E.M.邓紫棋',
            duration: 235,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306354440',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231021sa29vqd9oardd9ldsspfp723q_firsti.jpg',
            name: '李香兰-G.E.M.邓紫棋',
            duration: 269,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306362846',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231021sa1h7n1ynnjvooz29ots346e2_firsti.jpg',
            name: 'A.I.N.Y.(爱你)-G.E.M.邓紫棋',
            duration: 225,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306376022',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231021saxg1iuibbq08cv0915yb1fg2_firsti.jpg',
            name: '画-G.E.M.邓紫棋',
            duration: 169,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306386284',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231021sa358124jtz6j27k1uo6kzf44_firsti.jpg',
            name: '后会无期-G.E.M.邓紫棋',
            duration: 224,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306417345',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231021sa371yeih0khuu21d21ay697h_firsti.jpg',
            name: '你不是真正的快乐-G.E.M.邓紫棋',
            duration: 313,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306448690',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231021qn26yeoobf1l96h2nyuxl6s3z_firsti.jpg',
            name: '你把我灌醉-G.E.M.邓紫棋',
            duration: 286,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475170569',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240319sa2vy0nd62ee93d21qoj727nb_firsti.jpg',
            name: '北京北京-G.E.M.邓紫棋',
            duration: 282,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306462542',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231021sa3hj3qq9eneqmhgpmla5fpvz_firsti.jpg',
            name: '红蔷薇白玫瑰-G.E.M.邓紫棋',
            duration: 284,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306479723',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231021sa29zeuezslks891hv9etj7t4_firsti.jpg',
            name: '写不完的温柔-G.E.M.邓紫棋',
            duration: 240,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306495635',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231021sa34yw2vhasj1mn8zn0bj7agn_firsti.jpg',
            name: '新的心跳-G.E.M.邓紫棋',
            duration: 217,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306524705',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231021sa19sddcn78mqpi2hfk90lm7l_firsti.jpg',
            name: '一路逆风-G.E.M.邓紫棋',
            duration: 226,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306549649',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231021sa1drs91nvdnjssgbu4y9340u_firsti.jpg',
            name: '超能力-G.E.M.邓紫棋',
            duration: 204,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306561412',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231021sam6lec0aces0j2ih4tu5ndet_firsti.jpg',
            name: '孤独-G.E.M.邓紫棋',
            duration: 231,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306591836',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231021sa2hau1058fodq02ckfjrtj5z_firsti.jpg',
            name: '穿越火线-G.E.M.邓紫棋',
            duration: 197,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306606181',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231021saxhdlksj8gbnj1amvxy74a3f_firsti.jpg',
            name: '差不多姑娘-G.E.M.邓紫棋',
            duration: 231,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306635595',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231021sahf2jssc58ovb2rqod9fyg16_firsti.jpg',
            name: '摩天动物园-G.E.M.邓紫棋',
            duration: 271,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306651750',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231021saj07o7ujjxovq33xvfhepglz_firsti.jpg',
            name: '有心人-G.E.M.邓紫棋',
            duration: 241,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306664998',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231021sa3dpe0d6yogzq2shqfocz9a9_firsti.jpg',
            name: '透明-G.E.M.邓紫棋',
            duration: 218,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306671785',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231021saq8xj8ecu1d9d2caun5xysbv_firsti.jpg',
            name: '倒流时间-G.E.M.邓紫棋',
            duration: 189,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306680698',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231021sa2jsa2r0128f1p19qtg2z24g_firsti.jpg',
            name: '天空没有极限-G.E.M.邓紫棋',
            duration: 280,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306694975',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231021sa2f6rnh1pexy5s3grkpr38sc_firsti.jpg',
            name: '老人与海-G.E.M.邓紫棋',
            duration: 193,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306701147',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231021saasnmhuxh7fi1qbv36vzqe59_firsti.jpg',
            name: '你不是第一个离开的人-G.E.M.邓紫棋',
            duration: 201,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306707693',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231021sa1eaw7l25pe8gj1pb8n5nj4n_firsti.jpg',
            name: '很久以后-G.E.M.邓紫棋',
            duration: 291,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306717959',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231021sa2m2k0ualwbo233aaz5gf958_firsti.jpg',
            name: '于是-G.E.M.邓紫棋',
            duration: 231,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306725843',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231021sa12fqrw7vopdpc180e6yfzcu_firsti.jpg',
            name: '回忆的沙漏-G.E.M.邓紫棋',
            duration: 234,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306733702',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231021qn9bqss7iffyk6nwww12sbnlq_firsti.jpg',
            name: '好想好想你-G.E.M.邓紫棋',
            duration: 205,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306747850',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231021sa37h5da314disc1qjqj5fpjc_firsti.jpg',
            name: '睡公主-G.E.M.邓紫棋',
            duration: 283,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306757102',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231021saq4jkgr7jz3q91vtu0zi6wv1_firsti.jpg',
            name: '另一个童话-G.E.M.邓紫棋',
            duration: 184,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306763117',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231021sav6e05or1gg1v3vc26l4ck1f_firsti.jpg',
            name: '冰河时代-G.E.M.邓紫棋',
            duration: 211,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306772643',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231021sa2r2did97bh518t0zm90xnlq_firsti.jpg',
            name: '两个你-G.E.M.邓紫棋',
            duration: 197,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306785821',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231021qn2njl9f8xqj89336cba3frbs_firsti.jpg',
            name: '盲点-G.E.M.邓紫棋',
            duration: 227,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306793796',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231021qn2kkgw6c6f1ily3uyaf3lj76_firsti.jpg',
            name: '岩石里的花-G.E.M.邓紫棋',
            duration: 295,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306817741',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231021sa1kam1wnpznxnx2n7zfyu40y_firsti.jpg',
            name: 'GLORIA-G.E.M.邓紫棋',
            duration: 246,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306828102',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231021sa2qbci1fakelehvtj0d02lmd_firsti.jpg',
            name: '平凡天使-G.E.M.邓紫棋',
            duration: 215,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306842620',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231021sa37c75wwhu6ckl9f7aj2k82o_firsti.jpg',
            name: '是否-G.E.M.邓紫棋',
            duration: 220,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1306852939',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231021sa1gfrsbx7azuoa36yp2sf0if_firsti.jpg',
            name: '那一夜-G.E.M.邓紫棋',
            duration: 235,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475140842',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240319sa2chqpe8woowyk3mit12wrk0_firsti.jpg',
            name: '无双的王者-G.E.M.邓紫棋',
            duration: 193,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475143762',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240319sa2kmf1dy2v007n29l72gapsb_firsti.jpg',
            name: '心之焰-G.E.M.邓紫棋',
            duration: 149,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475147855',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240319sa1e8yj5cguv78k3szqfzxmco_firsti.jpg',
            name: '夜的尽头-G.E.M. 邓紫棋',
            duration: 282,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475156586',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240319sa3ez2krmc6yjjprhjxe6w07j_firsti.jpg',
            name: '平行世界-G.E.M.邓紫棋',
            duration: 248,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475158814',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240319sa26d0ig7dja24s1mjdyftpvk_firsti.jpg',
            name: '依然睡公主-G.E.M. 邓紫棋',
            duration: 161,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475161888',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240319sa1l12e531pm0341beu9ab4vt_firsti.jpg',
            name: '毒苹果-G.E.M. 邓紫棋',
            duration: 252,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475164054',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240319saapkr0u17lxt328jin3jojji_firsti.jpg',
            name: '单行的轨道-G.E.M.邓紫棋',
            duration: 249,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475166091',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240319sajd5hgtddjeup2oy3lw6aj1j_firsti.jpg',
            name: '瞬间-G.E.M.邓紫棋',
            duration: 247,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475173040',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240319sa2rp8tmuskg4m61asgsg87rz_firsti.jpg',
            name: '两个你-G.E.M.邓紫棋',
            duration: 197,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475175199',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240319sa2g2tltnuqd7p3f9psd1dfxg_firsti.jpg',
            name: '死了都要•爱-G.E.M.邓紫棋',
            duration: 208,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475177851',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240319sa13vn5mj3e7my8p24e3ox5f3_firsti.jpg',
            name: '睡皇后(Queen G)-G.E.M.邓紫棋',
            duration: 237,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475180373',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240319sa23nhfl4f51bw3ckljggrn34_firsti.jpg',
            name: '别勉强-G.E.M.邓紫棋/周兴哲',
            duration: 263,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475183393',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240319sa18fkw73tipvb049t1upiyy9_firsti.jpg',
            name: '两个自己-G.E.M.邓紫棋',
            duration: 197,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475186054',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240319sa38ga4tk69rcqa18jaojw29x_firsti.jpg',
            name: '只有我和你的地方-G.E.M.邓紫棋',
            duration: 198,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475188177',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240319sa2lftrnjh4x6xg2e8q2ekvf6_firsti.jpg',
            name: '让世界暂停一分钟-G.E.M.邓紫棋',
            duration: 234,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475190154',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240319sa1z08xp5iccgbt7l9gsgxgms_firsti.jpg',
            name: '好想好想你-G.E.M.邓紫棋',
            duration: 205,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475192853',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240319sa1revpctx3b6g935uquptt2b_firsti.jpg',
            name: '查克靠近-G.E.M.邓紫棋',
            duration: 262,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475195083',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240319sa2wwrv5kuhy9yjg3prpl9ypt_firsti.jpg',
            name: '不想回家-G.E.M.邓紫棋',
            duration: 247,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475198835',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240319sa27eqrjc0ley5pcdtqycu8ie_firsti.jpg',
            name: '离心力-G.E.M.邓紫棋',
            duration: 302,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475201163',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240319sa18u96989odxr41rb3nf22k3_firsti.jpg',
            name: '受难曲-G.E.M.邓紫棋',
            duration: 181,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475206370',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240319sar4e7u0kisrmx1gk5ajuz0q8_firsti.jpg',
            name: '热爱就一起-G.E.M.邓紫棋/王嘉尔',
            duration: 166,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475208796',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240319sa1l7021kix6h5vc35ptrfqat_firsti.jpg',
            name: '灰狼-G.E.M.邓紫棋',
            duration: 204,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475212276',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240319sa2muwkkrkt3pip1u3fupsfxf_firsti.jpg',
            name: '萤火-G.E.M.邓紫棋',
            duration: 232,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475214383',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240319sa311tgbgx6p9vk3gdjc82yqa_firsti.jpg',
            name: '多美丽-G.E.M.邓紫棋',
            duration: 223,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475216745',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240319santfc76d6jib93sfu46ti9yb_firsti.jpg',
            name: '寂寞星球的玫瑰-G.E.M.邓紫棋',
            duration: 287,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475218736',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240319sag4dr8hkb5dt32wlzdvnfdw9_firsti.jpg',
            name: '错过不错-G.E.M.邓紫棋',
            duration: 239,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475220976',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240319sa348gbdo24x5ak1bik92wbxc_firsti.jpg',
            name: '塞纳河-G.E.M.邓紫棋',
            duration: 213,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475223463',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240319sa2gg9gtm4bmvfm19ag1xmfh7_firsti.jpg',
            name: '突然之间-G.E.M.邓紫棋',
            duration: 201,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475225979',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240319sa1q3wne3x1n6cq1dlqasneav_firsti.jpg',
            name: '万国觉醒-G.E.M.邓紫棋',
            duration: 216,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475228103',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240319sa2j5owqcv4fnm21c6k8jqmsr_firsti.jpg',
            name: '等一个他-G.E.M.邓紫棋',
            duration: 185,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475230048',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240319saj76ta9zg6f6q22ciucsi9pv_firsti.jpg',
            name: '偶尔-G.E.M.邓紫棋',
            duration: 204,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475232056',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240319sa3oelyql8sceqs28uztfsqyh_firsti.jpg',
            name: '爱如意-G.E.M.邓紫棋',
            duration: 238,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475234020',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240319sa18crl9wwngyh6378nyd4tkh_firsti.jpg',
            name: '下一秒-G.E.M.邓紫棋',
            duration: 193,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475236122',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240319saunq928ujwxbf2f0se32sp20_firsti.jpg',
            name: '18-G.E.M.邓紫棋',
            duration: 216,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475238559',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240319sa9e6l43gz7q983powobbubcq_firsti.jpg',
            name: '我不懂爱-G.E.M.邓紫棋',
            duration: 214,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475240971',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240319sanyktq8ojbfs0fwafnwsi756_firsti.jpg',
            name: '想讲你知-G.E.M.邓紫棋',
            duration: 175,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475243533',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240319sa28pbssz6irdsl3kteg93ljx_firsti.jpg',
            name: '不存在的存在-G.E.M.邓紫棋',
            duration: 305,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475245632',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240319sa25ebssdlx013psgigwi7eso_firsti.jpg',
            name: '失真-G.E.M.邓紫棋',
            duration: 238,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475248029',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240319sa35vprz79q949f22epjnifd8_firsti.jpg',
            name: '末日-G.E.M.邓紫棋',
            duration: 284,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475250314',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240319sa28tfr2vhisb5qxkmrqsjlvi_firsti.jpg',
            name: '龙卷风 (Live)-G.E.M.邓紫棋',
            duration: 272,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475257144',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240319sa2egwkpcso55or2rh5qa6r9r_firsti.jpg',
            name: 'Mascara-G.E.M邓紫棋',
            duration: 246,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475263031',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240319sahet8kh2ovqp779oepf6c373_firsti.jpg',
            name: '我要我们在一起(Live版)-G.E.M.邓紫棋',
            duration: 322,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475265826',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240319sa2s9llrqg3bu6x3lrrcvsh1v_firsti.jpg',
            name: '如果没有你 (Live)-G.E.M.邓紫棋',
            duration: 260,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475267861',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240319sa23trk3wt9hwq71u8qmbf6zx_firsti.jpg',
            name: 'All About U-G.E.M.邓紫棋',
            duration: 244,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1475271740',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240319saogv4o49luy5u3kbxu85248k_firsti.jpg',
            name: '存在 (Live)-G.E.M.邓紫棋',
            duration: 249,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1639626177',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240806sa1kr70tiapctrz3unu6cohxi_firsti.jpg',
            name: 'FLY AWAY-G.E.M. 邓紫棋',
            duration: 239,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1639626823',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240806safbqltesvzpc22xjmey12ce6_firsti.jpg',
            name: '你成为了谁的幸福-G.E.M. 邓紫棋',
            duration: 258,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1639627304',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240806sa2yz1c7n98e01b14xsw2sqbt_firsti.jpg',
            name: 'Amazing Grace-G.E.M.邓紫棋',
            duration: 299,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1639627833',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240806sa2la0ibfngk2idgsatwtrzm6_firsti.jpg',
            name: 'HELL-G.E.M.邓紫棋',
            duration: 249,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1639628707',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240806sa1l27rbk32twi37fg65qskqa_firsti.jpg',
            name: 'FIND YOU-G.E.M. 邓紫棋',
            duration: 257,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1639630402',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240806sa6pn3nv8dk6d828k3p117h44_firsti.jpg',
            name: '蝶恋花-G.E.M.邓紫棋',
            duration: 264,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1639631648',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240806sa3td7hs5xr86w5pvr6y2f7zw_firsti.jpg',
            name: '不存在的存在-G.E.M. 邓紫棋',
            duration: 305,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1639632383',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240806sat8uq4eh9h8ci3634cz5xgeq_firsti.jpg',
            name: "Someday I'll Fly-G.E.M. 邓紫棋",
            duration: 235,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1639633633',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240806sa1370chq0mzppldwx7g4krx6_firsti.jpg',
            name: '奇迹-G.E.M.邓紫棋',
            duration: 232,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1639634938',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240806sa2aa9ootktofy21fui061d40_firsti.jpg',
            name: 'G.E.M.-G.E.M. 邓紫棋',
            duration: 210,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1639636089',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240806sa2jjwxyk7eyyvg2phg5ybqot_firsti.jpg',
            name: 'Get Over You-G.E.M.邓紫棋',
            duration: 239,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1639637429',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240806sa11rsw33bcl1k42tfugjxlis_firsti.jpg',
            name: '美好的旧时光-G.E.M.邓紫棋',
            duration: 299,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1639639249',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240806sa39fso1rw4xdq3b4z3jclskj_firsti.jpg',
            name: '意式恋爱-G.E.M.邓紫棋',
            duration: 210,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1639640109',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240806sa3tx73ew5qtlwe26qs8ntins_firsti.jpg',
            name: 'Mascara烟熏妆-G.E.M.邓紫棋',
            duration: 246,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1639640675',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240806sa2fx1nxh9gxcor2d3aod5bjl_firsti.jpg',
            name: '爱现在的我-G.E.M.邓紫棋',
            duration: 210,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1639641241',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240806sa12unkpn70op2l58txyskzg4_firsti.jpg',
            name: 'Game Over-G.E.M.邓紫棋',
            duration: 210,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1639642974',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240806saorr8rgtf01laj6emr7kbcfq_firsti.jpg',
            name: '潜意式的残酷-G.E.M.邓紫棋',
            duration: 239,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1639646587',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240806sa2n301kfsft8le15pq37hqvn_firsti.jpg',
            name: '面壁者-G.E.M.邓紫棋',
            duration: 259,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1639652390',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240806sa2p237lnhwxxac3vsedw9upo_firsti.jpg',
            name: 'Victoria-G.E.M. 邓紫棋',
            duration: 217,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1639651208',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240806sa2wgescduwy31x2vm6624x46_firsti.jpg',
            name: 'Oh Boy-G.E.M.邓紫棋',
            duration: 189,
            author: '',
            origin: 'bili',
          },
          {
            id: '492467474_BV1xN411x76o_1639649230',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240806sa31ctty14c33tj2ne5yeofi0_firsti.jpg',
            name: '光年之外(热爱版)-G.E.M.邓紫棋',
            duration: 218,
            author: '',
            origin: 'bili',
          },
        ],
        cover:
          'http://i1.hdslb.com/bfs/archive/ef6963bbc8edbe46bb1834f96ea1e02e0c9f1b58.png',
        createdAt: null,
        updatedAt: null,
      },
      {
        id: '92e78b36-2ff6-4e18-8818-de61a270cd76',
        name: '汪苏泷',
        desc: '',
        author: '',
        musicList: [
          {
            id: '963668004_BV1cH4y127rJ_1340642777',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n23112205av0q6lfyylhn2nn39ti6zep_firsti.jpg',
            name: '不分手的恋爱-汪苏泷',
            duration: 206,
            author: '',
            origin: 'bili',
          },
          {
            id: '963668004_BV1cH4y127rJ_1340663689',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231122041vb20wjdq1x1nzqk7ce4g20_firsti.jpg',
            name: '一笑倾城 - 汪苏泷',
            duration: 233,
            author: '',
            origin: 'bili',
          },
          {
            id: '963668004_BV1cH4y127rJ_1340664394',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231122063am5wp3ea7hta3mngmdi9f7_firsti.jpg',
            name: '有点甜 - 汪苏泷,BY2',
            duration: 236,
            author: '',
            origin: 'bili',
          },
          {
            id: '963668004_BV1cH4y127rJ_1340662072',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231122061f2kk98e40ua21t67y6sxsp_firsti.jpg',
            name: '万有引力-汪苏泷',
            duration: 246,
            author: '',
            origin: 'bili',
          },
          {
            id: '963668004_BV1cH4y127rJ_1340648752',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231122011uklaiccd7xb93h6k2rfl37_firsti.jpg',
            name: '后会无期-汪苏泷&徐良.mp3',
            duration: 212,
            author: '',
            origin: 'bili',
          },
          {
            id: '963668004_BV1cH4y127rJ_1340647209',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n2311220522e4hmmvrxlup7mews26pbk_firsti.jpg',
            name: '耿-汪苏泷',
            duration: 270,
            author: '',
            origin: 'bili',
          },
          {
            id: '963668004_BV1cH4y127rJ_1340649584',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231122051ao7wdyd5ksrh1n2znj0u99_firsti.jpg',
            name: '忽而今夏-汪苏泷',
            duration: 261,
            author: '',
            origin: 'bili',
          },
          {
            id: '963668004_BV1cH4y127rJ_1340663221',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n23112204mm8hmd0hdoy4cbvj8j4p6gm_firsti.jpg',
            name: '小星星-汪苏泷',
            duration: 191,
            author: '',
            origin: 'bili',
          },
          {
            id: '963668004_BV1cH4y127rJ_1340652954',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n23112201az3fdunl1tax1okyflb2xwi_firsti.jpg',
            name: '那个男孩- 汪苏泷',
            duration: 220,
            author: '',
            origin: 'bili',
          },
          {
            id: '963668004_BV1cH4y127rJ_1340656706',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231122043d6xxm1rt9rg3204thwc3mq_firsti.jpg',
            name: '年轮-汪苏泷',
            duration: 247,
            author: '',
            origin: 'bili',
          },
          {
            id: '963668004_BV1cH4y127rJ_1340643143',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231122014jxs4dil5uwn3qr1p9l97ba_firsti.jpg',
            name: '巴赫旧约-汪苏泷',
            duration: 228,
            author: '',
            origin: 'bili',
          },
          {
            id: '963668004_BV1cH4y127rJ_1340643309',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231122052oybp9vpbrtr3uyt8idb7b9_firsti.jpg',
            name: '不服(Live) - 汪苏泷',
            duration: 220,
            author: '',
            origin: 'bili',
          },
          {
            id: '963668004_BV1cH4y127rJ_1340641787',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n23112206300fhah0lp5lj3p7hbsb90j_firsti.jpg',
            name: '城-汪苏泷',
            duration: 144,
            author: '',
            origin: 'bili',
          },
          {
            id: '963668004_BV1cH4y127rJ_1340642931',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231122023u2xwd03wj0441wkanyfgtc_firsti.jpg',
            name: '等不到你-汪苏泷',
            duration: 208,
            author: '',
            origin: 'bili',
          },
          {
            id: '963668004_BV1cH4y127rJ_1340645842',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n23112204280zs9lg8n6vtx0gabhh3cc_firsti.jpg',
            name: '对话(Live) - 汪苏泷',
            duration: 298,
            author: '',
            origin: 'bili',
          },
          {
            id: '963668004_BV1cH4y127rJ_1340645522',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n23112204nda39t1bgbc92i0zdrx7mfn_firsti.jpg',
            name: '放不下 - 汪苏泷',
            duration: 195,
            author: '',
            origin: 'bili',
          },
          {
            id: '963668004_BV1cH4y127rJ_1340646036',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231122041so2p2sqmwdns3vy5yt4zk6_firsti.jpg',
            name: '分手季节-汪苏泷',
            duration: 215,
            author: '',
            origin: 'bili',
          },
          {
            id: '963668004_BV1cH4y127rJ_1340646182',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231122023e90t00vusnt1u4v9ox1q2b_firsti.jpg',
            name: '风度-汪苏泷',
            duration: 226,
            author: '',
            origin: 'bili',
          },
          {
            id: '963668004_BV1cH4y127rJ_1340648694',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n23112206222nba31r1px72wmkjucboy_firsti.jpg',
            name: '还给你一些孤单 - 汪苏泷',
            duration: 246,
            author: '',
            origin: 'bili',
          },
          {
            id: '963668004_BV1cH4y127rJ_1340649470',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231122053fjv3w3wxkupx26e8dd2l38_firsti.jpg',
            name: '好安静-汪苏泷',
            duration: 267,
            author: '',
            origin: 'bili',
          },
          {
            id: '963668004_BV1cH4y127rJ_1340649950',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n2311220216ztmmj59pj3w14o4n63u7t_firsti.jpg',
            name: '剑魂-汪苏泷',
            duration: 216,
            author: '',
            origin: 'bili',
          },
          {
            id: '963668004_BV1cH4y127rJ_1340652067',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231122033bszrn54rdx4t3i84btyscb_firsti.jpg',
            name: '苦笑-汪苏泷',
            duration: 247,
            author: '',
            origin: 'bili',
          },
          {
            id: '963668004_BV1cH4y127rJ_1340651469',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n23112203cccyiutfu6t032qoi7l50ns_firsti.jpg',
            name: '累不累-汪苏泷',
            duration: 223,
            author: '',
            origin: 'bili',
          },
          {
            id: '963668004_BV1cH4y127rJ_1340652657',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231122011gz65h6g09i0739m3g78y00_firsti.jpg',
            name: '埋葬冬天-汪苏泷',
            duration: 258,
            author: '',
            origin: 'bili',
          },
          {
            id: '963668004_BV1cH4y127rJ_1340653188',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n2311220524pmilf7ulg7z1ewkuzm6ol_firsti.jpg',
            name: '慢慢懂 - 汪苏泷',
            duration: 267,
            author: '',
            origin: 'bili',
          },
          {
            id: '963668004_BV1cH4y127rJ_1340655007',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231122043lsoa6urp1k5d1hja67b7zf_firsti.jpg',
            name: '那一年-汪苏泷',
            duration: 233,
            author: '',
            origin: 'bili',
          },
          {
            id: '963668004_BV1cH4y127rJ_1340655470',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n23112205r1r1jspwk6zaxygbs75efi7_firsti.jpg',
            name: '你的要求-汪苏泷',
            duration: 241,
            author: '',
            origin: 'bili',
          },
          {
            id: '963668004_BV1cH4y127rJ_1340656969',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231122022jrwma5v2br5d213sgyuj6g_firsti.jpg',
            name: '你让我懂-汪苏泷',
            duration: 278,
            author: '',
            origin: 'bili',
          },
          {
            id: '963668004_BV1cH4y127rJ_1340657059',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231122033f9nmdvdlmw6a7l5zsd2qjg_firsti.jpg',
            name: '全城热恋 - 汪苏泷',
            duration: 256,
            author: '',
            origin: 'bili',
          },
          {
            id: '963668004_BV1cH4y127rJ_1340658379',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231122052n8v7vfu9szk21cthzvvb6h_firsti.jpg',
            name: '全世界陪我失眠-汪苏泷',
            duration: 239,
            author: '',
            origin: 'bili',
          },
          {
            id: '963668004_BV1cH4y127rJ_1340658846',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n2311220425h7tsicbcbcd36mo454d2h_firsti.jpg',
            name: '三国杀-汪苏泷',
            duration: 229,
            author: '',
            origin: 'bili',
          },
          {
            id: '963668004_BV1cH4y127rJ_1340660804',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n23112203v9zyzkiysdvm16sh5d9mk7h_firsti.jpg',
            name: '他的爱-汪苏泷',
            duration: 261,
            author: '',
            origin: 'bili',
          },
          {
            id: '963668004_BV1cH4y127rJ_1340660664',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231122011dugdms9n5uvi1adin47zj8_firsti.jpg',
            name: '桃花扇-汪苏泷',
            duration: 256,
            author: '',
            origin: 'bili',
          },
          {
            id: '963668004_BV1cH4y127rJ_1340660188',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231122067bfpfb69unatgglkcndt6ol_firsti.jpg',
            name: '停止跳动-汪苏泷',
            duration: 244,
            author: '',
            origin: 'bili',
          },
          {
            id: '963668004_BV1cH4y127rJ_1340661727',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n23112204a5btleo0h7qbt00deziv1ku_firsti.jpg',
            name: '雾都孤儿-汪苏泷',
            duration: 213,
            author: '',
            origin: 'bili',
          },
          {
            id: '963668004_BV1cH4y127rJ_1340663699',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231122043a3o4kprm7b952xwokzcr18_firsti.jpg',
            name: '小段 - 汪苏泷',
            duration: 258,
            author: '',
            origin: 'bili',
          },
          {
            id: '963668004_BV1cH4y127rJ_1340664536',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231122041g24yj7ac413s12taekhm7a_firsti.jpg',
            name: '因为了解-汪苏泷',
            duration: 249,
            author: '',
            origin: 'bili',
          },
          {
            id: '963668004_BV1cH4y127rJ_1340664898',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231122031znpvs9hwluue5n79ws5glk_firsti.jpg',
            name: '专属味道-汪苏泷',
            duration: 205,
            author: '',
            origin: 'bili',
          },
        ],
        cover:
          'http://i2.hdslb.com/bfs/archive/719a0eb53cf5da44a5309ddc2b309def32903060.png',
        createdAt: null,
        updatedAt: null,
      },
      {
        id: '06f4f5ff-011b-41fd-8406-82e2c998b89a',
        name: '薛之谦',
        desc: '',
        author: '',
        musicList: [
          {
            id: '1851382871_BV1vW421w7gY_25837110362',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240912sa3mt4m5zvfvaf218ewqa0efr_firsti.jpg',
            name: '租购(live)',
            duration: 254,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461393754',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240307a23806q2h8eq3ze39th0wl8ob_firsti.jpg',
            name: '其实',
            duration: 243,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461627088',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240307a2207nhv5ebccsm2a462206to_firsti.jpg',
            name: '渡',
            duration: 214,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1618315404',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240717sa3tc0r2hb95qcm15a8jkbnxp_firsti.jpg',
            name: '守村人',
            duration: 298,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461394291',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240307a2orce133foxizgp9mnahzx0m_firsti.jpg',
            name: '天外来物',
            duration: 259,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461610912',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240307a22mgt73gfw2z9s3cdz8ft2cn_firsti.jpg',
            name: '黄色枫叶',
            duration: 253,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461578177',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240307a23f920p8svr78b230kvmkqen_firsti.jpg',
            name: '不爱我',
            duration: 265,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461562333',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240307a2cw5rzepfcteqpy48qjdlvo7_firsti.jpg',
            name: '可',
            duration: 282,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461394810',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240307a2gbvwd63zeoxc16dcfdt49kd_firsti.jpg',
            name: '小尖尖',
            duration: 236,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461358737',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240307sa3iums8tc9140875825qexu1_firsti.jpg',
            name: '这么久没见',
            duration: 296,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461393874',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240307a2bmczgk5vla883a03g6pkvbq_firsti.jpg',
            name: 'AI',
            duration: 280,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461562109',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240307a21l00c3n8uyq1c27iauhmzoi_firsti.jpg',
            name: '像风一样',
            duration: 255,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461394101',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240307a239zusfvtxtc832u49lpbz7h_firsti.jpg',
            name: '迟迟',
            duration: 256,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_500001648136217',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240813a234ql2plllbbm1p0v2q1ki6g_firsti.jpg',
            name: '解解闷',
            duration: 215,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1477403212',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240321a2dc39s5sw19aw9iyy2amfavk_firsti.jpg',
            name: '苏黎世的从前',
            duration: 296,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1462241699',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240307sa34p23p8z7l2s12xo5q0g3sd_firsti.jpg',
            name: '念',
            duration: 309,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461746767',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240307a2p14r1pdhvj5n2f64bsyucnl_firsti.jpg',
            name: '被人',
            duration: 250,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461561700',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240307a2gcmxfa6oex851if4qd5vwrw_firsti.jpg',
            name: '刚刚好',
            duration: 251,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461562443',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240307a21r0hp5kl4ws1j3j1i4qo7tc_firsti.jpg',
            name: '天份',
            duration: 249,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1577470870',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240610sabeek1ojv8bz61jxm1dtanbp_firsti.jpg',
            name: '伏笔',
            duration: 287,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461585194',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240307a23fpd9l50xhcqu3k62jtqzsq_firsti.jpg',
            name: '火星人来过',
            duration: 218,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461394399',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240307a21kivwbrrrhftnlrzi67y2q4_firsti.jpg',
            name: '那是你离开了北京的生活',
            duration: 269,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461593237',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240307a23ccoynefxcm751y5i5vyo6j_firsti.jpg',
            name: '骆驼',
            duration: 278,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461633508',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240307a236rbzp9gekm7f9ax12abfg0_firsti.jpg',
            name: '下雨了',
            duration: 306,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1462486963',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240308sa3m0osbeu72dcz29xwmn8lgb_firsti.jpg',
            name: '哑巴',
            duration: 262,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461804251',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240307a2omy3lpe1q8j71uk6t6y0r7c_firsti.jpg',
            name: '小孩',
            duration: 322,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461394381',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240307a21arzkqgwici5n37w6haalv5_firsti.jpg',
            name: '无数',
            duration: 331,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461602251',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240307a23rchngxg8atqh2c2fk0b9ja_firsti.jpg',
            name: '几个你',
            duration: 317,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461797729',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240307a235jq8e1znbo6v1wtdayiv1b_firsti.jpg',
            name: '我想起你了',
            duration: 231,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461644697',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240307a21iz7mgryn3sx51spkj6ore6_firsti.jpg',
            name: '情书',
            duration: 297,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461578563',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240307a21ij0wz389f9op3dxrxbgrz3_firsti.jpg',
            name: '我害怕',
            duration: 250,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1609571049',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240709sa15w2z74svppzao72zp2t1p4_firsti.jpg',
            name: '一半',
            duration: 287,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461391602',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240307a231ib0er04qm753npnqi203z_firsti.jpg',
            name: '陪你去流浪',
            duration: 275,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461607902',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240307a21i1mymobfqc463ayq6v34ee_firsti.jpg',
            name: '配合',
            duration: 214,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461562168',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240307a22geinmlxry9jm3bbw835gv7_firsti.jpg',
            name: '耗尽',
            duration: 260,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1477171434',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240321sa3tphwz9lwnbwt193d5qiepj_firsti.jpg',
            name: '守候',
            duration: 293,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461742986',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240307a2f0kzfazo52bv288uqxg9ygn_firsti.jpg',
            name: '认真的雪',
            duration: 260,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461623745',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240307a21lxi2bz29y97k2eyitc7nae_firsti.jpg',
            name: '把你揉碎捏成苹果',
            duration: 216,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461769856',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240307a2kyixoiqylj1o3pk67lj83wt_firsti.jpg',
            name: '银河少年',
            duration: 261,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1518746920',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240424sa25b6gafj0vsdn336udig2s6_firsti.jpg',
            name: '独角戏(Live)',
            duration: 315,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461783633',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240307a2150q65edtrnen2zky0fqox5_firsti.jpg',
            name: '深深爱过你（前世）',
            duration: 279,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461637579',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240307a21cy49468zlnd5lvua6277o5_firsti.jpg',
            name: '演员',
            duration: 262,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461578415',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240307a216rs06mvn63a83oembkdox0_firsti.jpg',
            name: '等我回家',
            duration: 299,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461614747',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240307a24l8mc6m0dtjv2nwcocj5pp7_firsti.jpg',
            name: '关于你',
            duration: 295,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461629597',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240307a2wvpicabirijgos7hrgkdqf4_firsti.jpg',
            name: 'Stay Here',
            duration: 302,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461394086',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240307a236zyn51ao14uy2i0ir43d6f_firsti.jpg',
            name: '为了遇见你',
            duration: 241,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_500001648155158',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240813a2364bd1j7hoqbbhx9r0n1xun_firsti.jpg',
            name: '未完成的歌',
            duration: 261,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461588343',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240307a21bpo4vqcbv9ltu039qtroon_firsti.jpg',
            name: '狐狸',
            duration: 235,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461562618',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240307a21wa6zeur2hm061ikwlawp2y_firsti.jpg',
            name: '笑场',
            duration: 273,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461394526',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240307a23jk2oti5rvv5cr9x51jhp5a_firsti.jpg',
            name: '暧昧',
            duration: 313,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1462236271',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240307sa315kcxgqtoheq1req9tytx8_firsti.jpg',
            name: '违背的青春',
            duration: 337,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1462227251',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240307sarsgstlxlrhkt1v0m5xju1do_firsti.jpg',
            name: '崇拜',
            duration: 296,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461795314',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240307a21nrtdxietnffx3hj8bati0g_firsti.jpg',
            name: '潮流季',
            duration: 240,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1475202001',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240319sa26owjcqnafpg23iv7iqmdw8_firsti.jpg',
            name: '爱我的人 谢谢你',
            duration: 236,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1477418714',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240321a21m4whucmf6u6q2sn5lwlpjr_firsti.jpg',
            name: '续雪',
            duration: 281,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461795338',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240307a2it6emkk44ch61imq8oyq42g_firsti.jpg',
            name: '绅士',
            duration: 292,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461740249',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240307a232koxfj1lkvjq1h13aciqxb_firsti.jpg',
            name: '背过手',
            duration: 267,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461578482',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240307a2r5e9ll61yom117zvcvom6gg_firsti.jpg',
            name: '肆无忌惮',
            duration: 261,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461562488',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240307a22prvtoctj7cp911vn9jq4l8_firsti.jpg',
            name: '木偶人',
            duration: 287,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1469910254',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240314sa2jhtsem74se8c1vmfm99obv_firsti.jpg',
            name: '钗头凤',
            duration: 301,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461602298',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240307a23np55zbp4cseo2x0mh41mmm_firsti.jpg',
            name: '摩天大楼',
            duration: 231,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461605240',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240307a2nb670s63o93r1axbpi433w5_firsti.jpg',
            name: '凤毛麟角',
            duration: 264,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461394577',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240307a218d5v4beq5p5k1z5l85l791_firsti.jpg',
            name: '意外',
            duration: 292,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461562192',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240307a23fk5pvfc0za9qi751wgvg14_firsti.jpg',
            name: '方圆几里',
            duration: 264,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461394709',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240307a23vnj235tthk7e3prpmowmh8_firsti.jpg',
            name: '我好像在哪见过你',
            duration: 280,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1475188880',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240319sa112ejrgq4ebvbje9b64bl4m_firsti.jpg',
            name: '天后(Live)',
            duration: 248,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_500001659049402',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240823sa2j38xjgapsbyv2eskqm7i3p_firsti.jpg',
            name: '潘金莲',
            duration: 297,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461394317',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240307a226hcvt3s1ygfy21gfwz2r7t_firsti.jpg',
            name: '尘',
            duration: 281,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461735863',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240307a2298k5fwr8p9wta0kijdu2c2_firsti.jpg',
            name: '有没有',
            duration: 253,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461801199',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240307a22hdlr902gobxfxam9oho4q2_firsti.jpg',
            name: '环',
            duration: 246,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461647417',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240307a2sm94ctvnanmvw2r7dvshcmm_firsti.jpg',
            name: '彩券',
            duration: 277,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461394540',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240307a2329pcdde8q6qo1ymee7d4pz_firsti.jpg',
            name: '病态',
            duration: 280,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1477429552',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240321a2xsn1pcj6jtg3v7914t7mbgb_firsti.jpg',
            name: '深深爱过你（今生）',
            duration: 257,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461716025',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240307a22kjh6shccp07g2wqyp99mut_firsti.jpg',
            name: '丑八怪',
            duration: 254,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461716045',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240307a224qcrbz28gnme3uqkct5idj_firsti.jpg',
            name: '最好',
            duration: 256,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461735943',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240307a21h3yhp0nvy5i53k60x3k1hk_firsti.jpg',
            name: '别',
            duration: 216,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461393895',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240307a21xnkbt1fcyv6d8g0v49437j_firsti.jpg',
            name: '怪咖',
            duration: 251,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1609573065',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240709saayht725w4igf3r089blwcfl_firsti.jpg',
            name: '我终于成了别人的女人',
            duration: 306,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461585043',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240307a230xdyxmqopal83ikydwzo7o_firsti.jpg',
            name: '高尚',
            duration: 319,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461394344',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240307a21h7c8ztk5qtk625o88c0l7k_firsti.jpg',
            name: '聊表心意',
            duration: 318,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461640086',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240307a2r345seufnkecxotmfokkzyu_firsti.jpg',
            name: '野心',
            duration: 221,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461602271',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240307a23dndfxwww83062j99f3ljcv_firsti.jpg',
            name: '初学者',
            duration: 281,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1477383254',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240321sa20ujwl4cybqta39eo5sv8pv_firsti.jpg',
            name: '王子归来',
            duration: 289,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461562593',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240307a21exxjcn1pilzu2fhml7ggd1_firsti.jpg',
            name: '慢半拍',
            duration: 242,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461578396',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240307a23gvi93vk0ouwsukmrb4ffaq_firsti.jpg',
            name: '男二号',
            duration: 288,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461773167',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240307a23q9upwx37p4i5eow9em3dgv_firsti.jpg',
            name: '我知道你都知道',
            duration: 275,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461561986',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240307a23bughw48cbleq3m0966k3wj_firsti.jpg',
            name: '动物世界',
            duration: 231,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461779512',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240307a21dg6fv5bhau593ec2j7rhhu_firsti.jpg',
            name: 'Nothing',
            duration: 241,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461720963',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240307a2vbojbph9341t1l3mpjmoibj_firsti.jpg',
            name: '纸船',
            duration: 248,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461562058',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240307a2m8ws763xu60s1gnktddtud6_firsti.jpg',
            name: '你还要我怎样',
            duration: 312,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461620397',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240307a226xryfz9ulo1h1cltmzf4p1_firsti.jpg',
            name: '花儿和少年',
            duration: 264,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1618310263',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240717sad0i4vcp4zgbh6qjrn2xu1d4_firsti.jpg',
            name: '醒来(live)',
            duration: 258,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461562535',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240307a2321b2ktqulqisl7svaojliz_firsti.jpg',
            name: '变废为宝',
            duration: 280,
            author: '',
            origin: 'bili',
          },
          {
            id: '1851382871_BV1vW421w7gY_1461764269',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240307a213xhu05sxpy462odpyene80_firsti.jpg',
            name: '洛城',
            duration: 300,
            author: '',
            origin: 'bili',
          },
        ],
        cover:
          'http://i0.hdslb.com/bfs/archive/1a44c7d7ff9d6af7da385694b17b896fd669715c.jpg',
        createdAt: null,
        updatedAt: null,
      },
      {
        id: '4f14f3ba-f8aa-4617-908f-8f5e5236a184',
        name: '李荣浩',
        desc: '',
        author: '',
        musicList: [
          {
            id: '279220014_BV1rc411S7zk_1351844333',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231202sa3v7di4vvetypj1kwms3hgq7_firsti.jpg',
            name: '麻雀',
            duration: 253,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351844344',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231202sa29o8f60s1jvfu3qjfk0str7_firsti.jpg',
            name: '乌梅子酱',
            duration: 258,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351844459',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231202a21jpaybavas32s12t72s05xr_firsti.jpg',
            name: '年少有为',
            duration: 280,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351844597',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231202qn2ekzxoyza64f3ifxgs7chap_firsti.jpg',
            name: '老街',
            duration: 319,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351844605',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231202a21kdk6m0r2jyoc3ge7adhpa6_firsti.jpg',
            name: '李白',
            duration: 274,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351844732',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231202sa371rhy0az3u6sfdgpkn803c_firsti.jpg',
            name: '模特',
            duration: 307,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351844805',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231202a238wje7q6efv6a3g0f5a5jr4_firsti.jpg',
            name: '不将就',
            duration: 314,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351844750',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231202a22aso0fdt2fbi61dnht1m30h_firsti.jpg',
            name: '爸爸妈妈',
            duration: 285,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351844908',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231202a22w4g3boxi5kxoq7cr2mszvy_firsti.jpg',
            name: '不遗憾',
            duration: 321,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351844867',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231202qn1bfr7lng5elp32anxk5q5mu_firsti.jpg',
            name: '戒烟',
            duration: 295,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351845068',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231202sanf6ukszkop4yxqz9vcfrwgj_firsti.jpg',
            name: '女儿国-张靓颖&李荣浩',
            duration: 304,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351845151',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231202qnlnaqoftryltbc7t50yoxcrw_firsti.jpg',
            name: '对等关系',
            duration: 328,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351845312',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231202sa3ia7yfgmjxx1f2medxca6a5_firsti.jpg',
            name: '演员和歌手',
            duration: 248,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351845169',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231202sa1uugxlontp6y238r20a5zj8_firsti.jpg',
            name: '不搭',
            duration: 288,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351845354',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231202a22ku8g2yo3kaqn2mv92ade92_firsti.jpg',
            name: '不说(路过版)',
            duration: 327,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351845430',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231202qn1xx34f9lut2wi2fqrn7d77n_firsti.jpg',
            name: '两个人',
            duration: 290,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351845395',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231202a23qbc0ifgxg1hv2rhfsh89wq_firsti.jpg',
            name: '乐团',
            duration: 206,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351845631',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231202a228emefw94tgm1pz1mmjmhwj_firsti.jpg',
            name: '也许是爱情',
            duration: 211,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351845643',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231202qn23ens7k4m4s6mo60c42agrb_firsti.jpg',
            name: '习惯晚睡',
            duration: 244,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351845545',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231202sa13fbtti0xg6en2155q19qr5_firsti.jpg',
            name: '二三十',
            duration: 265,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351845649',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231202a23t7fpozcqnsb320jy13znqq_firsti.jpg',
            name: '后羿',
            duration: 206,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351849671',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231202a2fn27jrx61u081auee9ndvfh_firsti.jpg',
            name: '两个普普通通小青年',
            duration: 193,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351849732',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231202a21t2wwa9i9655c380x68wkly_firsti.jpg',
            name: '优点',
            duration: 312,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351849767',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231202a21wkr6803ybgsy360poi5jlj_firsti.jpg',
            name: '作曲家',
            duration: 228,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351849696',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231202sa3ie4x1d5lrrvd1fj6250gmu_firsti.jpg',
            name: '同根',
            duration: 267,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351859299',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231202a2u217rjst82aw248f0do7yip_firsti.jpg',
            name: '在一起嘛好不好',
            duration: 299,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351859379',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231202a2l5kru143nq92nbpp8pkbkmq_firsti.jpg',
            name: '天生',
            duration: 276,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351859345',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231202qn6ruyird7lvw821prbvq856h_firsti.jpg',
            name: '哎呀',
            duration: 293,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351859516',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231202sa3b9z2n046e11g33os8xpuqq_firsti.jpg',
            name: '喜剧之王',
            duration: 262,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351859476',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231202qn2lvv9grxzfg4w2y3l9wrj7c_firsti.jpg',
            name: '小芳',
            duration: 251,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351859622',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231202sa1t0x893rfgq92206hzrmzsf_firsti.jpg',
            name: '嗯',
            duration: 239,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351859635',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231202sag7p9imuiqe922rn7mud7ti4_firsti.jpg',
            name: '少年',
            duration: 302,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351859740',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231202a22x2ob9ml0aia931w0gu8c1t_firsti.jpg',
            name: '大太阳',
            duration: 367,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351905902',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231202sajkdhyp09oc0coljudzxq61s_firsti.jpg',
            name: '太坦白',
            duration: 297,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351905686',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231202a231q3am1gquf9q2vfrve9j02_firsti.jpg',
            name: '女孩',
            duration: 269,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351906003',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231202say5szucrgp9o32rkfzpsbgl3_firsti.jpg',
            name: '小黄',
            duration: 281,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351906013',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231202a23m7rvrggbwpjb1xn52z1hit_firsti.jpg',
            name: '就这样',
            duration: 315,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351906033',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231202sa31cxnp3srdcrnyh4gpi7dg4_firsti.jpg',
            name: '我们好好的',
            duration: 273,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351906044',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231202a219ruqprtrd7rlyoabosif2t_firsti.jpg',
            name: '山川',
            duration: 293,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351906233',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231202a22zwdu1k2rp78g11fhugem7d_firsti.jpg',
            name: '我爱你',
            duration: 347,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351906242',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231202sa1i7e91fdjrcza2xa4xh55mt_firsti.jpg',
            name: '张家明和婉君',
            duration: 247,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351906261',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231202sa1p9dka92hi88hfw84l9kisy_firsti.jpg',
            name: '心里面',
            duration: 300,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351906264',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231202saj1lsev1rmmc749b3nkgn3mu_firsti.jpg',
            name: '快让我在雪地上撒点儿野',
            duration: 243,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351906191',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231202a2jkqqtx98z49xti1nk2j0xqb_firsti.jpg',
            name: '念念又不忘',
            duration: 343,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351906349',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231202a2zk0sybd9ex3c15r7qg1cv3m_firsti.jpg',
            name: '情人',
            duration: 415,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351906480',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231202sa1vgps1h9jrqe01us2cs3y3v_firsti.jpg',
            name: '满座',
            duration: 334,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351906739',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231202a21b6ok2glh6yyk2t7sc0f1up_firsti.jpg',
            name: '流行歌曲',
            duration: 260,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351906824',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231202a2pqrptpay47qo3e3cn0evn6q_firsti.jpg',
            name: '成长之重量',
            duration: 338,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351906783',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231202qn2qkymxomzhna4k9jrina6ik_firsti.jpg',
            name: '我知道是你',
            duration: 251,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351906911',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231202sa3py5f62cqu0h4pglhfop8qf_firsti.jpg',
            name: '拜拜',
            duration: 337,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351906906',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231202a21zs2y0laddzjs3ovsbuzcwn_firsti.jpg',
            name: '有一个姑娘',
            duration: 286,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351906834',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231202a21crhjyyq3u4vutvw3zn36to_firsti.jpg',
            name: '有理想',
            duration: 229,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351906698',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231202sa3u8raq4dr69mugbkrvdfsde_firsti.jpg',
            name: '歌谣',
            duration: 327,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351907025',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231202a23l39h90icfh2a2i1bqr1oq9_firsti.jpg',
            name: '耳朵',
            duration: 242,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351906882',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231202sa3suj5glsvjiuuzjjcao6tut_firsti.jpg',
            name: '老伴',
            duration: 208,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351907309',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231202sa30tx6sr2ar8h932u17rvtxt_firsti.jpg',
            name: '王牌冤家',
            duration: 246,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351907251',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231202savijzrz8u786f2v6ggv03tp2_firsti.jpg',
            name: '男女',
            duration: 332,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351907267',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231202sa2pwllky4dzyz8jclacl2p6k_firsti.jpg',
            name: '祝你幸福',
            duration: 279,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351907159',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231202a2rbkkfs2t8qi975dyarjreol_firsti.jpg',
            name: '笑忘书',
            duration: 264,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351907289',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231202a2q5oyzpkj5gxtpu2ed8dyqtj_firsti.jpg',
            name: '等着等着就老了',
            duration: 283,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351907199',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231202qndyl8488lekyz3j3hhvmjstl_firsti.jpg',
            name: '纵横四海',
            duration: 242,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351907757',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231202sa102hy5kc8pvkd34xp9c951p_firsti.jpg',
            name: '落俗',
            duration: 268,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351907383',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231202a233of99h9t276n5lt6x4qvlp_firsti.jpg',
            name: '老友记',
            duration: 287,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351907391',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231202a2ogg99jj23r6011p5qahp42g_firsti.jpg',
            name: '脱胎换骨',
            duration: 271,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351907709',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231202a2lfuilheea61m3421e8v8j49_firsti.jpg',
            name: '自拍',
            duration: 296,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351907734',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231202sa25vn51lkbgavu3moyughblx_firsti.jpg',
            name: '要我怎么办',
            duration: 210,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351907743',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231202saimmzjxevkitm3txl22jyomy_firsti.jpg',
            name: '花样年华',
            duration: 313,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351907945',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231202a22y6acs15jysde420206ppby_firsti.jpg',
            name: '获奖人',
            duration: 241,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351907560',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231202qn17jh6bxjfuwz42wrosvlx0t_firsti.jpg',
            name: '蓝绿',
            duration: 261,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351907901',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231202sa3dzyg33lot4ii2dt9fa9p4s_firsti.jpg',
            name: '裙姊',
            duration: 213,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351910418',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231202a23qyy1we99i134ihan2gmfhy_firsti.jpg',
            name: '贫穷或富有',
            duration: 298,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351910530',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231202qn3n73olemgpsku1ushu62uu3_firsti.jpg',
            name: '都一样',
            duration: 304,
            author: '',
            origin: 'bili',
          },
          {
            id: '279220014_BV1rc411S7zk_1351911142',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231202sadfoawj9l7mab293x9hju853_firsti.jpg',
            name: '野生动物',
            duration: 296,
            author: '',
            origin: 'bili',
          },
        ],
        cover:
          'http://i0.hdslb.com/bfs/archive/0aa57cef09f41dade8bfe9ae781e32d2f534013c.png',
        createdAt: null,
        updatedAt: null,
      },
      {
        id: '8f597787-84f8-49e6-b109-232c74d9da15',
        name: '孙燕姿',
        desc: '',
        author: '',
        musicList: [
          {
            id: '220332652_BV1J841177n3_895894725',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n22111901mmila3behney3qy2t44hupf_firsti.jpg',
            name: '我怀念的-孙燕姿',
            duration: 290,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_895895193',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n22111907iwelfvexpy5xlkjxvzvhc3k_firsti.jpg',
            name: '开始懂了-孙燕姿',
            duration: 273,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_895894654',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n221119013ekv6bcy97nuuez7lf25nsg_firsti.jpg',
            name: '遇见-孙燕姿',
            duration: 211,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_895905933',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n2211190123lglxlyggdt73c64m0ec1o_firsti.jpg',
            name: '原来你什么都不要-孙燕姿',
            duration: 223,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640806176',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240807sa25a9vg1jmbht81o3f7or3vc_firsti.jpg',
            name: '天空-孙燕姿',
            duration: 255,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_895920537',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n22111907219qv2725dp7o1gbttdw9tw_firsti.jpg',
            name: '我也很想他-孙燕姿',
            duration: 259,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640807232',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240807sa1zy9abfe7cmvo2zcyd0lhzo_firsti.jpg',
            name: '温柔-孙燕姿/五月天',
            duration: 272,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_895896541',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n221119063vtiktkxcfeve1ov0837mwg_firsti.jpg',
            name: '雨天-孙燕姿',
            duration: 243,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_895899649',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n22111908229koevalwufa2as9wivz87_firsti.jpg',
            name: '半句再见-孙燕姿',
            duration: 243,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_896097160',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n221119081ic7id46d6mbh1i2aytkwva_firsti.jpg',
            name: '不是真的爱我-孙燕姿',
            duration: 241,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_895899160',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n221119153vyejyzdpxk7c10d1dwbu0x_firsti.jpg',
            name: '逆光-孙燕姿',
            duration: 295,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_895901106',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n22111915ugig3fl70rnp3uiqzfo1v08_firsti.jpg',
            name: '克卜勒-孙燕姿',
            duration: 253,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_895902745',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n221119082ny8evy7bbpcy1tupfnpmnw_firsti.jpg',
            name: '天黑黑-孙燕姿',
            duration: 238,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_895911906',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n221119072t6o04ofxtknj1r6xfee2a9_firsti.jpg',
            name: '我不难过-孙燕姿',
            duration: 323,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897941021',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n221121153fpun0deor8mt3dgvacs3tc_firsti.jpg',
            name: '我要的幸福-孙燕姿',
            duration: 216,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_895904771',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n22111901958j5yi4jjr73o1x5yy1glb_firsti.jpg',
            name: '180度-孙燕姿',
            duration: 304,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_895908858',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n22111901qbuhtkrbif092l1bpzialtv_firsti.jpg',
            name: '当冬夜渐暖-孙燕姿',
            duration: 289,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_895913704',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n221119083vegyjl212k0710cslathvo_firsti.jpg',
            name: '第一天-孙燕姿',
            duration: 254,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_896003186',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n22111906cznysul215e121070wgxuf8_firsti.jpg',
            name: '原点-孙燕姿/蔡健雅',
            duration: 248,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_895913767',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n221119151gev8rsr0quj63tql4s8chq_firsti.jpg',
            name: '愚人的国度-孙燕姿',
            duration: 251,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_895915735',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n2211190119brx6iaaik4n5lhs4075t5_firsti.jpg',
            name: '绿光-孙燕姿',
            duration: 193,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_895917339',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n221119071vtpyeg8wkgso35jz23rdn6_firsti.jpg',
            name: '尚好的青春-孙燕姿',
            duration: 267,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_895918573',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n221119153a7g739klppak3ala8p5ay5_firsti.jpg',
            name: '渴-孙燕姿',
            duration: 285,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_895922437',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n22111914x5tifqo66hjp39ggwt7zhp9_firsti.jpg',
            name: '在,也不见-孙燕姿',
            duration: 234,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_895928443',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n221119012xkt1pxrvgn4z3ltwzepo2a_firsti.jpg',
            name: 'Honey Honey-孙燕姿',
            duration: 267,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_895929007',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n22111907au5cz90ybgwt30zb17kk09q_firsti.jpg',
            name: '安宁-孙燕姿',
            duration: 199,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_895939680',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n221119077r7fpk3etb152wngwecs35k_firsti.jpg',
            name: '眼泪成诗-孙燕姿',
            duration: 224,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_895951315',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n221119141es9vo9g4we5q3l11qjogef_firsti.jpg',
            name: '直来直往-孙燕姿',
            duration: 214,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_895953007',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n221119061s99p3ksynpml1v6o0xirj8_firsti.jpg',
            name: 'Hey Jude-孙燕姿',
            duration: 278,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_895952197',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n221119073oitcwu29jsgl3oxq1yqz6s_firsti.jpg',
            name: '风衣-孙燕姿',
            duration: 244,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_895956123',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n221119151hvfzolhx4aia2lgxl71k2g_firsti.jpg',
            name: '明天的记忆-孙燕姿',
            duration: 228,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_895952304',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n221119011fsik22vrx6f6z6dpmb10nj_firsti.jpg',
            name: '同类-孙燕姿',
            duration: 213,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_895958152',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n221119012p1o8w3ji2vss1xavviphvz_firsti.jpg',
            name: '逃亡-孙燕姿',
            duration: 286,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_895963925',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n221119142sq6r7srd4f601j6gvisdce_firsti.jpg',
            name: '跳舞的梵谷-孙燕姿',
            duration: 189,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_895968434',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n221119061drep6qpfhr1m1g2v03382c_firsti.jpg',
            name: '余额-孙燕姿',
            duration: 214,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_895974213',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n221119142jhqlksa2xuf21joh9lluv4_firsti.jpg',
            name: '咕叽咕叽-孙燕姿',
            duration: 273,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_895984731',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n221119082ttucnv6e3qjx3l34rshwhj_firsti.jpg',
            name: '漩涡-孙燕姿',
            duration: 292,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_895987555',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n2211191436b4bu0o0x6t4z5vtxbvng4_firsti.jpg',
            name: '天使的指纹-孙燕姿',
            duration: 250,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_895993670',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n221119061vfkr2xuh0kpw5tz053tdkp_firsti.jpg',
            name: '雨还是不停地落下-孙燕姿',
            duration: 292,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_896001956',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n22111907130b3w7ogwugk1elovfk8vk_firsti.jpg',
            name: '极美-孙燕姿',
            duration: 212,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_896008350',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n22111906t9y5svhqf4a22vv1ru1d72p_firsti.jpg',
            name: '我的爱-孙燕姿',
            duration: 265,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_896019019',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n22111908294yzqydutq71fw14g4hjtz_firsti.jpg',
            name: '坏天气-孙燕姿',
            duration: 273,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_896016370',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n221119152cglue0a5olerka826wtyzs_firsti.jpg',
            name: '银泰-孙燕姿',
            duration: 266,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_896032404',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n2211190836m5x29v66zbh1d4qtkm0jk_firsti.jpg',
            name: '飘着-孙燕姿',
            duration: 251,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_896025344',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n22111907t6fcsq9v3sjr2ex6al5g4kr_firsti.jpg',
            name: '神奇-孙燕姿',
            duration: 264,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_896030644',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n221119143r29ppxd707im2g717cya96_firsti.jpg',
            name: '世界终结前一天-孙燕姿',
            duration: 306,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_896047282',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n221119152cm9wm82oflza31etb7qbv1_firsti.jpg',
            name: '无限大-孙燕姿',
            duration: 255,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_896052250',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n2211190110jk2ntrcnzu9nonvplzz8z_firsti.jpg',
            name: '隐形人-孙燕姿',
            duration: 279,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_896059548',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n221119063du7e0agrs96e3a0wr07ip2_firsti.jpg',
            name: '眼神-孙燕姿',
            duration: 211,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_896063059',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n2211190730tge8ofskv6b187qbontpx_firsti.jpg',
            name: '擒光-孙燕姿',
            duration: 235,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_896068552',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n22111901o2i62r2wx5na3y88sffa1sx_firsti.jpg',
            name: '爱情证书-孙燕姿',
            duration: 257,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_896074450',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n2211191521t3uvt72dkf0oe5pp6d0az_firsti.jpg',
            name: '超快感-孙燕姿',
            duration: 221,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_896078227',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n2211190628wszdvgkwh0s2faqk28m4y_firsti.jpg',
            name: '奔-孙燕姿',
            duration: 222,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897884097',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n221121152ynm203yqff902wdhd77rqf_firsti.jpg',
            name: 'E-Lover-孙燕姿',
            duration: 302,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897883802',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n221121152oqjbnkk51o4e25rpabstl5_firsti.jpg',
            name: 'Leave Me Alone-孙燕姿',
            duration: 237,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897885908',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n221121083sjn5hnbqkqq13cfxgbssdp_firsti.jpg',
            name: '浓眉毛-孙燕姿',
            duration: 228,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897892268',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n22112108nkgdds6qlboq3mwe3kycb7t_firsti.jpg',
            name: '练习-孙燕姿',
            duration: 256,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897889392',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n22112106xw2fjfxayq5t3gffjvo3hne_firsti.jpg',
            name: '害怕-孙燕姿',
            duration: 244,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897892109',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n221121061ijpzjlvu1vjn2p0rygkayb_firsti.jpg',
            name: '任性-孙燕姿',
            duration: 228,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897895986',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n2211210816fuwbqffemmh1lrbxrauui_firsti.jpg',
            name: '真的-孙燕姿',
            duration: 283,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897897374',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n2211210720rsyl9x4761jdiacbscnd3_firsti.jpg',
            name: 'Venus-孙燕姿',
            duration: 212,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897900329',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n221121062j6w9x8agasxi2xdxig85ld_firsti.jpg',
            name: '我想-孙燕姿',
            duration: 271,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897902295',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n221121143fc4voasod1vc10kbif12sd_firsti.jpg',
            name: 'Silent All These Years-孙燕姿',
            duration: 250,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897903262',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n221121012slaormaycck2fnbv7luvpn_firsti.jpg',
            name: '作战-孙燕姿',
            duration: 219,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897905356',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n221121072tefwnolq6bvz1clevmulqg_firsti.jpg',
            name: '明天晴天-孙燕姿',
            duration: 235,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897906924',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n221121153jmz8u6b2j3s7j5tpp7b55c_firsti.jpg',
            name: '漂浮群岛-孙燕姿',
            duration: 240,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897908772',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n22112115144ek1c6dxzff2y9orosb4o_firsti.jpg',
            name: '祝你开心-孙燕姿',
            duration: 234,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897910874',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n2211210638efgktcx3mpk1bw3l7cnim_firsti.jpg',
            name: 'Stefanie-孙燕姿',
            duration: 292,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897912542',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n221121012m2s3h47kuk4t1jupij8i5c_firsti.jpg',
            name: '流浪地图-孙燕姿',
            duration: 244,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897913958',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n221121152xfzhk4ncjeyx3j6cd7zcu6_firsti.jpg',
            name: '追-孙燕姿',
            duration: 213,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897916240',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n221121083fppn2bhyywb32blao79dbc_firsti.jpg',
            name: '心愿-孙燕姿',
            duration: 272,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897917234',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n221121013caj8o39topiya86e9f1kdn_firsti.jpg',
            name: '完美的一天-孙燕姿',
            duration: 243,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897918472',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n2211211425fxianencitk12ypi5vdvc_firsti.jpg',
            name: '爱情的花样-孙燕姿',
            duration: 224,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897920557',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n221121152uor6xbyp2cpj1y9kqxddav_firsti.jpg',
            name: '懒得去管-孙燕姿',
            duration: 248,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897922451',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n22112107qy3ndgh6ujda2f63bxuethu_firsti.jpg',
            name: '未完成-孙燕姿',
            duration: 267,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897923228',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n221121073510sk3frxx5i2ixdkocu5a_firsti.jpg',
            name: '随堂测验-孙燕姿',
            duration: 217,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897924207',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n2211210114x526164mp2h3b0pi3hkqb_firsti.jpg',
            name: '天越亮, 夜越黑-孙燕姿',
            duration: 233,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897925711',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n22112107rsse2i4x1sm41arqv62b4ms_firsti.jpg',
            name: '相信-孙燕姿',
            duration: 272,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897928111',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n221121151kqb0tag7ha7lhu48eifyr1_firsti.jpg',
            name: '平日快乐-孙燕姿',
            duration: 288,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897928728',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n22112115bq113s4vywexigrpoo143lx_firsti.jpg',
            name: 'Thoight I feel close to you-孙燕姿/倉木麻衣',
            duration: 247,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897929857',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n221121142n3ul1urv0i932z8cr81dte_firsti.jpg',
            name: '一样的夏天-孙燕姿',
            duration: 239,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897931223',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n221121062gv2fin0msc01pfikgef8ru_firsti.jpg',
            name: '星期一天气晴我离开你-孙燕姿',
            duration: 260,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897931945',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n22112101s6p0u8odjwlq228n4tca185_firsti.jpg',
            name: '风筝-孙燕姿',
            duration: 277,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897932925',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n221121072khj5qb9i0b5kh36t49num4_firsti.jpg',
            name: '就是这样-孙燕姿',
            duration: 218,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897933960',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n221121072lhvpaffcweuf2lfenj5j60_firsti.jpg',
            name: '爱从零开始-孙燕姿',
            duration: 261,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897934759',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n2211210732t7kplmm8u97356xugtvwl_firsti.jpg',
            name: '不同-孙燕姿',
            duration: 221,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897935842',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n221121152a3shpu8yalhc1drit4lx1q_firsti.jpg',
            name: '懂事-孙燕姿',
            duration: 263,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897937440',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n221121083qqlte57y75jk1v0rf6dmg5_firsti.jpg',
            name: '我不爱-孙燕姿',
            duration: 268,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897938600',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n221121081os6skmchoq8iu7rq52cnum_firsti.jpg',
            name: '难得一见-孙燕姿',
            duration: 254,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897939438',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n221121082bsm5tbh1zpzf26kdbqaga0_firsti.jpg',
            name: '零缺点-孙燕姿',
            duration: 221,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897939460',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n221121071vgo59ly33txy2u8r5l7g8a_firsti.jpg',
            name: '累赘-孙燕姿',
            duration: 195,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897941656',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n22112115hug1r3a8ns0815aeeow68b3_firsti.jpg',
            name: 'My Story,Your Song-孙燕姿/倉木麻衣',
            duration: 277,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897942678',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n22112115i9ilxoyajnkb2mc29ht1n6u_firsti.jpg',
            name: '志明与春娇(Live)-孙燕姿',
            duration: 300,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897943587',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n2211210817t18ld9alebn2u51clqmti_firsti.jpg',
            name: '自然-孙燕姿',
            duration: 206,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897944007',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n2211210728g5hqmnur1m6eufhmd44zf_firsti.jpg',
            name: '一起走到-孙燕姿',
            duration: 250,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897944691',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n221121013bdarxwygxswu3fbcut95l6_firsti.jpg',
            name: '年轻无极限-孙燕姿',
            duration: 301,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897946304',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n2211210129nc9ror8xayk3aqw6v1mwu_firsti.jpg',
            name: '梦不落-孙燕姿',
            duration: 225,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897948518',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n221121082ewl7nbnfo2lq3g4w15274d_firsti.jpg',
            name: '橄榄树-孙燕姿',
            duration: 206,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897948521',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n221121061yxzz4b68fcs33mkwssj2jm_firsti.jpg',
            name: '很好-孙燕姿',
            duration: 267,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_897949065',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n221121072e2514i26qnmb3p0uyuwelm_firsti.jpg',
            name: '终于-孙燕姿',
            duration: 271,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640697532',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240807sa1m2rvlybf044u18fk1epx3v_firsti.jpg',
            name: 'Stay With You(英文版)-孙燕姿/林俊杰',
            duration: 208,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640702797',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240807saqi9us8b5qj06iyou0v58tfn_firsti.jpg',
            name: '第六感-孙燕姿',
            duration: 252,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640705547',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240807sa228bwk6n8tuyc185q4t32a8_firsti.jpg',
            name: '慢慢来-孙燕姿',
            duration: 227,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640710040',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240807sa2asybvm8yni8lgalvkd6pwp_firsti.jpg',
            name: 'Someone-孙燕姿',
            duration: 206,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640739982',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240807sa3e1ybbom89m1df33ti6xts0_firsti.jpg',
            name: '了解-孙燕姿',
            duration: 287,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640741332',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240807sa3vqvjvvog32p0204p2bztbp_firsti.jpg',
            name: 'Leave-孙燕姿',
            duration: 261,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640743202',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240807sa1dmfk3rn6fopq21u5pjmcb1_firsti.jpg',
            name: 'Our Memory-孙燕姿',
            duration: 472,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640744845',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240807sa1exjqrujtvnxs1g927phklq_firsti.jpg',
            name: '爱情字典-孙燕姿',
            duration: 229,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640746333',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240807salc6xbf2odwjzsbjxrm6w1wy_firsti.jpg',
            name: '梦想天空-孙燕姿',
            duration: 226,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640747701',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240807sa3jjz3zyc2gkey2lhnvdpogz_firsti.jpg',
            name: '和平-孙燕姿',
            duration: 248,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640748944',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240807sa3m7ck18c4xrbm2z243if8pp_firsti.jpg',
            name: '种-孙燕姿',
            duration: 252,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640750306',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240807sa2mpexeaidt0c726pvg7ern1_firsti.jpg',
            name: '没有人的方向-孙燕姿',
            duration: 248,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640760599',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240807sa298gfhrkrhbze3q7n6oc6rp_firsti.jpg',
            name: '中间地带-孙燕姿',
            duration: 272,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640761899',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240807sag2pl9xrbv9b6p2u1y53yeqh_firsti.jpg',
            name: '我是我-孙燕姿/孙靖',
            duration: 228,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640762905',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240807sa2kuo1zpwn3hbjxsgaddam0w_firsti.jpg',
            name: '没时间-孙燕姿',
            duration: 223,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640763875',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240807sa3ppdsp9g8s01p33m9wc804s_firsti.jpg',
            name: "Sometimes Love Just Ain't Enough-孙燕姿",
            duration: 274,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640764743',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240807sa30sx8hk37ije01u52dha0c1_firsti.jpg',
            name: 'That I Would Be Good-孙燕姿',
            duration: 261,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640766148',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240807sa33enoxzipxv0m3dncuoyeg6_firsti.jpg',
            name: 'We Will Get There-孙燕姿',
            duration: 250,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640766663',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240807sa1d3ih1bev205z20r5oqabxe_firsti.jpg',
            name: 'Up2U-孙燕姿',
            duration: 202,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640767682',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240807sa3ab8g7uxdhn2u2gfh03tjpp_firsti.jpg',
            name: '永远-孙燕姿',
            duration: 215,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640768389',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240807sa1jafqbz9fpqxf1kpa9atwya_firsti.jpg',
            name: '接下来-孙燕姿',
            duration: 215,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640769514',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240807sa29w4n5ulz830xwnjfwy38pi_firsti.jpg',
            name: '学会-孙燕姿',
            duration: 259,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640770070',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240807savcz1y476o8fv2hj33365jz3_firsti.jpg',
            name: '休止符-孙燕姿',
            duration: 230,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640770811',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240807sau4l9q7bpc5y02rkovpqx7vm_firsti.jpg',
            name: 'The moment-孙燕姿',
            duration: 255,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640771562',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240807sa2ti9bx48e1jm03rx0yrbmtc_firsti.jpg',
            name: '不能和你一起-孙燕姿',
            duration: 283,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640772204',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240807sa2lcefbke09km2c0kihrrdhn_firsti.jpg',
            name: '全心全意-孙燕姿',
            duration: 175,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640773427',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240807sa1zw6no0udxlwibnzrxa8jw2_firsti.jpg',
            name: '太阳底下-孙燕姿',
            duration: 206,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640773969',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240807samn77oekol6x72xgkogaql1u_firsti.jpg',
            name: '听见-孙燕姿',
            duration: 227,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640774563',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240807sa3tsje5dlnjixp1xoo9e1wl2_firsti.jpg',
            name: '反过来走走-孙燕姿',
            duration: 234,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640775199',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240807sarxdqj6zlq39w8rxk0x0ojko_firsti.jpg',
            name: "Let's Vino-孙燕姿",
            duration: 223,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640775934',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240807saqfdktig3ny361c2h4m9030b_firsti.jpg',
            name: '未知的精采-孙燕姿',
            duration: 189,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640777746',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240807saqzvzn4m0vmuy3s3cpjgca1v_firsti.jpg',
            name: '另一张脸-孙燕姿',
            duration: 221,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640779378',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240807sa30g5vwmgvndcu1exuf4ttca_firsti.jpg',
            name: '梦游-孙燕姿',
            duration: 189,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640780173',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240807sa28dbjtifrshtl3pfycz6xh5_firsti.jpg',
            name: '关于-孙燕姿',
            duration: 238,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640781069',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240807sa1ap2vub975nre1adc7bves2_firsti.jpg',
            name: '需要你-孙燕姿',
            duration: 249,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640782826',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240807saw9vq56iu5gfa3qw35ejo4cp_firsti.jpg',
            name: '她们的歌-孙燕姿/张惠妹',
            duration: 285,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640783549',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240807sac0bbg0rzxi22216nafeix2m_firsti.jpg',
            name: '木兰情-孙燕姿',
            duration: 276,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640783911',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240807sa22xlqwfckwfyjkjc7uzajnc_firsti.jpg',
            name: '世说心语-孙燕姿',
            duration: 223,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640784293',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240807sa2z6jpsq5oli192edaip1kum_firsti.jpg',
            name: '时光小偷-孙燕姿',
            duration: 293,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640784944',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240807sa24u8u934mx98i1d1kj2uzsz_firsti.jpg',
            name: '空口言-孙燕姿',
            duration: 206,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640786238',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240807sa2fzmytz5hu2sm2ixgphwfwc_firsti.jpg',
            name: '快疯了-孙燕姿',
            duration: 217,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640788482',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240807sa3fy7wnelfq3o02vxiwdifun_firsti.jpg',
            name: '是时候+Hidden Track-孙燕姿',
            duration: 493,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640788941',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240807sa1rrpl0isaamb32mps2b4d2t_firsti.jpg',
            name: '错觉-孙燕姿',
            duration: 255,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640789916',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240807sa2jzy3t6zylv51982iwe9a68_firsti.jpg',
            name: '围绕-孙燕姿',
            duration: 198,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640790082',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240807sa3l37rs8ys4cnl2d2tsfdjnu_firsti.jpg',
            name: '比较幸福-孙燕姿',
            duration: 277,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640790655',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240807sah2mo8qfl62te1ezquypyik1_firsti.jpg',
            name: 'Radio-孙燕姿',
            duration: 220,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640791576',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240807sa38cp80mwjai68qe9nu0pp6a_firsti.jpg',
            name: '简爱-孙燕姿/ShiGGa Shay 白西阁',
            duration: 337,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640792273',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240807sa2mw2oxq2re3j2j4f7s39qfd_firsti.jpg',
            name: '童谣1987-孙燕姿',
            duration: 259,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640792781',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240807sa1uvihmv7x681v29g8eqrk0c_firsti.jpg',
            name: '彩虹金刚-孙燕姿',
            duration: 241,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640793230',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240807sa3vr337rh8mwrl27xr6jsmb5_firsti.jpg',
            name: '这个世界-孙燕姿',
            duration: 210,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640794088',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240807saxjxyqxv4npj3q993enflds5_firsti.jpg',
            name: '我很愉快-孙燕姿',
            duration: 276,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640794429',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240807sa3miaodst2oba12tevkz8wt4_firsti.jpg',
            name: '天天年年-孙燕姿',
            duration: 237,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640794811',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240807sacg0v76q5v0q115h6qus0nrq_firsti.jpg',
            name: '守护永恒的爱-孙燕姿',
            duration: 183,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640811541',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240807sad3yw6d9jjeyt1vodob8jflg_firsti.jpg',
            name: '最后之后-孙燕姿',
            duration: 265,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640812819',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240807sa179o1m5pskvf73o4ciixl42_firsti.jpg',
            name: 'Sweet Child O’ Mine-孙燕姿',
            duration: 291,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640797331',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240807sa9ootsi8lj31t3fo6q8a6l5q_firsti.jpg',
            name: '充氧期-孙燕姿',
            duration: 225,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640798812',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240807sa3md7kppm99c3l29g1ioaj0c_firsti.jpg',
            name: '超人类-孙燕姿',
            duration: 225,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640799699',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n240807sa3glvukmm4uqex1q6gz29utq_firsti.jpg',
            name: '匿名万岁-孙燕姿',
            duration: 170,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640808209',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n240807sa3ljwnf55ml9ze3qsr3ngq6m_firsti.jpg',
            name: '王子面-孙燕姿/五月天',
            duration: 255,
            author: '',
            origin: 'bili',
          },
          {
            id: '220332652_BV1J841177n3_1640801308',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n240807sa336zcsxlo53t0mro51njz90_firsti.jpg',
            name: '样子-孙燕姿',
            duration: 247,
            author: '',
            origin: 'bili',
          },
        ],
        cover:
          'http://i2.hdslb.com/bfs/archive/e7a2be4028ba7c660a73ff2912545e6159ddae0e.png',
        createdAt: null,
        updatedAt: null,
      },
      {
        id: '8a1fba93-b973-4d7f-87d7-f8df27a26379',
        name: '许嵩',
        desc: '',
        author: '',
        musicList: [
          {
            id: '404329334_BV11V411G7Aa_1223501525',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230805041d3kxlhd1hpk8385olcekbj_firsti.jpg',
            name: '001. 有何不可',
            duration: 242,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223501659',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230805053eotjyxzyibop2q3zkadbqp_firsti.jpg',
            name: '002. 庐州月',
            duration: 256,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223501751',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230805016p7vc0zbbdbi3tmpnwecr6h_firsti.jpg',
            name: '003. 素颜',
            duration: 239,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223502181',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n2308050237oxjoxc6kvzp28pjs2iuqh_firsti.jpg',
            name: '004. 灰色头像',
            duration: 291,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223502048',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230805023cbd13bi7x3qp1700obzexe_firsti.jpg',
            name: '005. 玫瑰花的葬礼',
            duration: 262,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223501885',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230805021dql9lq59mbs6twfbuaoig1_firsti.jpg',
            name: '006. 城府',
            duration: 200,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223502002',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230805053nbgfh39jr46x1pg2g3czc4_firsti.jpg',
            name: '007. 你若成风',
            duration: 174,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223502313',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230805031v27j70bpdol01jxdb7ool7_firsti.jpg',
            name: '008. 断桥残雪',
            duration: 228,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223502268',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230805066kwfmgwnc6mfnalqeu0w3lo_firsti.jpg',
            name: '009. 雅俗共赏',
            duration: 250,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223502352',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230805011nh36rwjuejtt8spxn089se_firsti.jpg',
            name: '010. 多余的解释',
            duration: 278,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223502582',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230805041kfbr4mu4yt0v21snrzjlov_firsti.jpg',
            name: '011. 情侣装',
            duration: 202,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223502818',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230805013fdv1f2v3v7sz1hzhzbnqjb_firsti.jpg',
            name: '012. 幻听',
            duration: 274,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223502621',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230805043n91887jec60g3h7xs12yiz_firsti.jpg',
            name: '013. 坏孩子',
            duration: 247,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223502680',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n2308050519cobcfgyfq02wlk7iuz5w6_firsti.jpg',
            name: '014. 半城烟沙',
            duration: 293,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223503421',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n23080506ky0i4r0cc7ub2us1c1vunzc_firsti.jpg',
            name: '015. 如果当时',
            duration: 317,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223502894',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230805061isw1mlagcex252mqwmcked_firsti.jpg',
            name: '016. 清明雨上',
            duration: 221,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223502982',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n23080505mr4riq27vh687tcbfwq7lxr_firsti.jpg',
            name: '017. 千百度',
            duration: 226,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223503131',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n23080505agasnvsda94s3er9ne0406f_firsti.jpg',
            name: '018. 大千世界',
            duration: 256,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223503189',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230805013ml10s89ts9t62j8b7aob1f_firsti.jpg',
            name: '019. 单人旅途',
            duration: 289,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223503603',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n2308050122og7eytu13ly19jvmjk8nn_firsti.jpg',
            name: '020. 弹指一挥间',
            duration: 288,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223503622',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230805062iqlxnb8zzg8x2xkj7cv12t_firsti.jpg',
            name: '021. 等到烟火清凉',
            duration: 182,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223503647',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n23080506292afpwe7uml72w8x5g3s0y_firsti.jpg',
            name: '022. 对话老师',
            duration: 251,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223503756',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230805053dbhrmq0p7eh93mymsy52gz_firsti.jpg',
            name: '023. 放飞',
            duration: 229,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223503749',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n2308050416mp1hh9yfgzxptm1xu41hn_firsti.jpg',
            name: '024. 放肆',
            duration: 239,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223504330',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n23080503hr6olop1c7hi1kt0k9wjo4r_firsti.jpg',
            name: '025. 飞驰于你',
            duration: 245,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223504097',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230805031ciyupqjc8u0t3jnpq0rr9o_firsti.jpg',
            name: '026. 隔代',
            duration: 322,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223504061',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n2308050236gznqyrjzj8v10beo8gx7f_firsti.jpg',
            name: '027. 闺蜜',
            duration: 250,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223504081',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230805053k1m2rxmpfpq0rtvlprxw94_firsti.jpg',
            name: '028. 合拍',
            duration: 184,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223504186',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n23080506i8kiqqo8spa81hkfie6f9m8_firsti.jpg',
            name: '029. 河山大好',
            duration: 200,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223504386',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n23080505b42kjn5j2rejq0mhsysoj95_firsti.jpg',
            name: '030. 胡萝卜须',
            duration: 232,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223504749',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n23080505198a8x1hzgw6219lx58t2pt_firsti.jpg',
            name: '031. 蝴蝶的时间',
            duration: 321,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223504722',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n23080502u8v1b256psehshljifp2tqr_firsti.jpg',
            name: '032. 幻胖',
            duration: 243,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223504598',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230805041rqit4krs622p3fki9b56sc_firsti.jpg',
            name: '033. 毁人不倦',
            duration: 199,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223505034',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230805041hj0s9gy0vmhkewlkrprqyb_firsti.jpg',
            name: '034. 羁绊',
            duration: 249,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223504854',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230805052nxqfhbolc90p1w6o2joue8_firsti.jpg',
            name: '035. 假摔',
            duration: 259,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223504990',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230805013qkiccaq4yj6r2lovvaux0r_firsti.jpg',
            name: '036. 江湖',
            duration: 269,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223505025',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230805052n605z6tp96vc106q784ac3_firsti.jpg',
            name: '037. 降温',
            duration: 234,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223505023',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230805022tzw7tisyv7gl5ymziaigpa_firsti.jpg',
            name: '038. 今年勇',
            duration: 205,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223505519',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230805052y4eeh8eaaiw9hsoxok6cn3_firsti.jpg',
            name: '039. 敬酒不吃',
            duration: 309,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223505372',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230805019iu5dw0900ai4b6vaxkmuhp_firsti.jpg',
            name: '040. 九月清晨',
            duration: 237,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223505808',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n23080505t56tn7omq0t6gvvad6oo36v_firsti.jpg',
            name: '041. 绝代风华',
            duration: 256,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223505419',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230805012i5vb2k8e7041sertblk5e9_firsti.jpg',
            name: '042. 科幻',
            duration: 248,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223505294',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230805032vt9o9f2hp41q18t9om1k0p_firsti.jpg',
            name: '043. 浪',
            duration: 219,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223505856',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230805042x40ybxsjd0au1w931bels1_firsti.jpg',
            name: '044. 老古董',
            duration: 247,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223505757',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230805061uytz899unkzv1xy8gboahc_firsti.jpg',
            name: '045. 留香',
            duration: 249,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223506677',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230805011gdvh9otpu1hu1vbm5zrihb_firsti.jpg',
            name: '046. 柳成荫',
            duration: 483,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223506113',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230805061pla4dw2xeo2p33ermy5v9q_firsti.jpg',
            name: '047. 没想到',
            duration: 292,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223506306',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n23080501138fga9ab9sl6crozrs7o16_firsti.jpg',
            name: '048. 明智之举',
            duration: 268,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223506000',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230805053ige41vhh44dw2kxuz1ygbn_firsti.jpg',
            name: '049. 墨尔本晴',
            duration: 204,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223506408',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230805032svwjgnvf0sdp1lehbepxpr_firsti.jpg',
            name: '050. 内线',
            duration: 248,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223506395',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n2308050211dc1p2namzxwqmdzs375wz_firsti.jpg',
            name: '051. 庞贝',
            duration: 257,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223506622',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230805052f4acgaxnga3g14nq2zfrhh_firsti.jpg',
            name: '052. 平行宇宙',
            duration: 210,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223506696',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230805022qwgbgzufkdoc34tjt5nnwy_firsti.jpg',
            name: '053. 七夕',
            duration: 234,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223506915',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230805042k4bc7h81kwtw2o05wwudnz_firsti.jpg',
            name: '054. 奇谈',
            duration: 234,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223507014',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230805053jmu6rkr1n48h3p7rdj4r00_firsti.jpg',
            name: '055. 千古',
            duration: 222,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223507090',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230805041lxqwq0z1g3nm11mdbgw2v2_firsti.jpg',
            name: '056. 浅唱',
            duration: 249,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223507077',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230805061h6vftukhcfiv21p2z388nk_firsti.jpg',
            name: '057. 亲情式的爱情',
            duration: 285,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223507241',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230805011frhft75e8xrq5cba2u54uc_firsti.jpg',
            name: '058. 全球变冷',
            duration: 253,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223507084',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230805011x5njwc9ehr4t2qu1t2k8zq_firsti.jpg',
            name: '059. 全世界最好的你',
            duration: 213,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223507812',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n23080506g292yuq7tevg1o61sveqv6x_firsti.jpg',
            name: '060. 认错',
            duration: 276,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223507607',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230805012ot4s10uxu6dr3mgf5xfqw7_firsti.jpg',
            name: '061. 三尺',
            duration: 229,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223507466',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n23080505u01shnrkqfhbewvvanva90s_firsti.jpg',
            name: '062. 山水之间',
            duration: 277,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223507556',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n2308050626w1y8wevh3ig7q6a4fw381_firsti.jpg',
            name: '063. 双人旁',
            duration: 234,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223507577',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n23080502366gb7lcd3amli4rpua82y7_firsti.jpg',
            name: '064. 叹服',
            duration: 262,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223507884',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230805043oda32achcqbi2de7qj0ev3_firsti.jpg',
            name: '065. 天龙八部之宿敌',
            duration: 265,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223507885',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230805021drhbh8wusu7h1776s3y429_firsti.jpg',
            name: '066. 天知道',
            duration: 221,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223508088',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n23080501cq0ztq55x6ym9a3e9sxrsf5_firsti.jpg',
            name: '067. 通关',
            duration: 250,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223508129',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n23080502qq4x8n0w7g3v1x2tc63n282_firsti.jpg',
            name: '068. 万古',
            duration: 315,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223508228',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n23080506kxjo6ltk7ifm22xm4v0cs2t_firsti.jpg',
            name: '069. 微博控',
            duration: 223,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223508168',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230805021vqjnop6caqb3u92x59rg0a_firsti.jpg',
            name: '070. 我乐意',
            duration: 243,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223508394',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n2308050618ltfqtpl98mcnsxwmrh02k_firsti.jpg',
            name: '071. 我们的恋爱是对生命的严重浪费',
            duration: 213,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223508434',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n23080501mi8a8426yty8t7to4io7ho5_firsti.jpg',
            name: '072. 我想牵着你的手',
            duration: 168,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223508633',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230805051c12vmxdol0m41heuav2w6q_firsti.jpg',
            name: '073. 想象之中',
            duration: 250,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223508634',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230805051ffr1vkwrrsnojza8zh7gov_firsti.jpg',
            name: '074. 心疼你的过去',
            duration: 277,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223508547',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230805033p2i5b9m5pw1t3bp71ruxl9_firsti.jpg',
            name: '075. 星座书上',
            duration: 240,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223509133',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n23080504bkmxp6fwquyp1mx1zunkh9x_firsti.jpg',
            name: '076. 燕归巢',
            duration: 295,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223508956',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230805062yicldo22n91f3pm67tliio_firsti.jpg',
            name: '077. 野人',
            duration: 245,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223509019',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n23080501onnc92t1n0iq2b15yj4zxhb_firsti.jpg',
            name: '078. 医生',
            duration: 247,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223508887',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230805013bp2oj02j9uxcp4zk3lyu6t_firsti.jpg',
            name: '079. 最佳歌手',
            duration: 268,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223508987',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n23080506h0b4t586q4vuzsq67hnoymx_firsti.jpg',
            name: '080. 艺术家们',
            duration: 215,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223509160',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230805043rq38sny5faht3j3i5wj8hm_firsti.jpg',
            name: '081. 隐隐约约',
            duration: 204,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223509568',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230805012p2d6v08elbae38v5lxdmyu_firsti.jpg',
            name: '082. 有桃花',
            duration: 243,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223509437',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n2308050238ak1mt49fugu30nxyajj4i_firsti.jpg',
            name: '083. 违章动物',
            duration: 251,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223509479',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230805051hyvynr992tap1qlwqkrli9_firsti.jpg',
            name: '084. 宇宙之大',
            duration: 274,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223509487',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n23080505oobwumjiylms2ijy3jao81b_firsti.jpg',
            name: '085. 雨幕',
            duration: 241,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223509704',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230805053tqr2vunfjwzt1em7k2twmx_firsti.jpg',
            name: '086. 在那不遥远的地方',
            duration: 225,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223509868',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230805042g5gud9i881d12y7wwgl9a8_firsti.jpg',
            name: '087. 早睡身体好',
            duration: 280,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223509946',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n2308050538zn8oxf90de4medwhqz7ah_firsti.jpg',
            name: '088. 重复重复',
            duration: 357,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223509942',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n2308050434ky0277xkg4c1s49n9o427_firsti.jpg',
            name: '089. 梧桐灯',
            duration: 278,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223510043',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n23080503g6xnkdjlkg7z26e0njs0nhj_firsti.jpg',
            name: '090. 装糊涂',
            duration: 253,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223510111',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230805042dq2nmk0vw89620vg5clcfw_firsti.jpg',
            name: '091. 安徒生不后悔',
            duration: 233,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223510329',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230805063lx8pzlq7icn134oklq2frk_firsti.jpg',
            name: '092. 白马非马',
            duration: 285,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223510475',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230805023j4s4rucyu0tm1jo5psadiv_firsti.jpg',
            name: '093. 摆脱',
            duration: 220,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223510298',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n23080501d2zqizaeu4a57x64c6zb9mb_firsti.jpg',
            name: '094. 伴虎',
            duration: 272,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223510481',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230805013g66b405ho1h2bgvwe17siu_firsti.jpg',
            name: '095. 不煽情',
            duration: 317,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223510381',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230805033rr7i0lbipy2tpeyagy9vas_firsti.jpg',
            name: '096. 不语',
            duration: 255,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223510683',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230805061hvhfqi3qr4oe4o03fugy1l_firsti.jpg',
            name: '097. 拆东墙',
            duration: 260,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223510853',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230805052iy0tmfny2c6i20ry1rx5do_firsti.jpg',
            name: '098. 超市',
            duration: 260,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223510673',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230805061yueum621wbys3pp2wung7k_firsti.jpg',
            name: '099. 南山忆',
            duration: 200,
            author: '',
            origin: 'bili',
          },
          {
            id: '404329334_BV11V411G7Aa_1223510817',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230805051eukjgosn0e7y2g8w5gwjq7_firsti.jpg',
            name: '100. 如约而至',
            duration: 256,
            author: '',
            origin: 'bili',
          },
        ],
        cover:
          'http://i2.hdslb.com/bfs/archive/ae7cffd15b8f7f8376a3f330326916311129c5a3.png',
        createdAt: null,
        updatedAt: null,
      },
      {
        id: 'e99c77e4-ee80-4d20-9417-6f41108d7776',
        name: '徐良',
        desc: '',
        author: '',
        musicList: [
          {
            id: '964547384_BV1bH4y1k7y8_1363334134',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231211sasz99uvyu7qf730b4ophp39m_firsti.jpg',
            name: '徐良&小凌 - 321對不起',
            duration: 206,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363359887',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231211qntwavewzg2jqp1frr3stjuao_firsti.jpg',
            name: '徐良&小凌-坏女孩',
            duration: 247,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363360029',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231211sak3955wvaiam519dr9uqj5sa_firsti.jpg',
            name: '徐良&小凌-客官不可以',
            duration: 231,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363360116',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231211qn1251lwgwqi3lqfydxvl53na_firsti.jpg',
            name: '徐良&孙羽幽-七秒钟的记忆',
            duration: 204,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363360138',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231211a22es5b90kafrtc25wp7uwfir_firsti.jpg',
            name: '徐良&阿悄-红装',
            duration: 247,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363360167',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231211a22iv3t7toe3resu008v69rmr_firsti.jpg',
            name: '徐良&阿悄-犯贱',
            duration: 228,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363360232',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231211qn2h2jlgruwccj3fpzftni9gv_firsti.jpg',
            name: '汪苏泷&徐良-后会无期',
            duration: 212,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363361269',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231211a226vu0wqr0ja3430wh2iu9sq_firsti.jpg',
            name: '徐良-在回忆中死去',
            duration: 215,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363360269',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231211sas28uksjlxd46ho1s60baegv_firsti.jpg',
            name: '徐良-无颜女',
            duration: 215,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363361552',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231211sa30u8i6qzp49yi1by30v6h3j_firsti.jpg',
            name: '徐良-飞机场',
            duration: 223,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363361257',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231211sa2hcpneenogsytaneljv1dyy_firsti.jpg',
            name: '徐良&小凌-友情出演',
            duration: 200,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363361347',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231211sa26otwnzqucqvwtctu8qgos3_firsti.jpg',
            name: '徐良&孙羽幽-情话',
            duration: 239,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363361587',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231211sa1nk1prmucnl361mpu6gr6hc_firsti.jpg',
            name: '徐良&孙羽幽-虐心',
            duration: 258,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363361461',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231211sa5mrz0gd2dj9i2k16ov1xojn_firsti.jpg',
            name: '徐良 - 即使说抱歉',
            duration: 288,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363361484',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231211sa1e6uohygwueifdrj8cb86pg_firsti.jpg',
            name: '徐良-后会无期',
            duration: 207,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363361902',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231211sa369491gqggdeuc0ww3901b7_firsti.jpg',
            name: '徐良&吴昕-星座恋人',
            duration: 241,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363361795',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231211say8jld11sowcv1h104vpmb4r_firsti.jpg',
            name: '阿悄&徐良-想我的时候听这歌',
            duration: 215,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363361911',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231211sake5viv82rpn72m8ker0rxnf_firsti.jpg',
            name: '本兮&徐良-创作者',
            duration: 249,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363361900',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231211sad9owpxibi1cj1pqxocnk4tk_firsti.jpg',
            name: '崔子格&徐良-凡尘',
            duration: 229,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363361898',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231211sa2tw4ua6dx9h873rg09ta1r0_firsti.jpg',
            name: '郭静&徐良-烂人',
            duration: 251,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363362211',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231211sa13ocq52csasmd2kxqjp2a4e_firsti.jpg',
            name: '汪苏泷&徐良-写给妹妹的歌',
            duration: 198,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363362317',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231211sae3jvje05lfaz3plucbi2ek0_firsti.jpg',
            name: '王虹、徐良 - 热血颂',
            duration: 295,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363362402',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231211sa2gpb0pfft03u8kzn6sswvo7_firsti.jpg',
            name: '徐良 - 边境记号',
            duration: 223,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363362336',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231211sa3ktq2p1xwqcnn1g7erbmwv0_firsti.jpg',
            name: '徐良 - 表演的人',
            duration: 207,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363362409',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231211sa2w3qg4ursfob71chuvh1otk_firsti.jpg',
            name: '徐良 - 不写情歌',
            duration: 188,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363362542',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231211sa1kqo92d7wtjyr11u4dm0qag_firsti.jpg',
            name: '徐良 - 电话里的秘密',
            duration: 242,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363362554',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231211sa2e9olxwctlk2sc31aaovvu8_firsti.jpg',
            name: '徐良 - 高跟鞋',
            duration: 217,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363362498',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231211sa3f62do0ht3vw2m7lljo1lzi_firsti.jpg',
            name: '徐良 - 关灯时候',
            duration: 165,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363362496',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231211sajwbza2i67v2814q5tuko8y3_firsti.jpg',
            name: '徐良 - 还是想念',
            duration: 249,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363362608',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231211sa2ly8s9kdneare3ayf7k1390_firsti.jpg',
            name: '徐良 - 红叶狩',
            duration: 239,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363362824',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231211a21ykuwiom0um1i71r8n3cfy4_firsti.jpg',
            name: '徐良 - 华生',
            duration: 252,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363362926',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231211sa2dgkmkszdlq4s21pobbn06n_firsti.jpg',
            name: '徐良 - 话题',
            duration: 221,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363362841',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231211a21hgg9w14fuix22qdro8991g_firsti.jpg',
            name: '徐良 - 幻灭',
            duration: 284,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363362951',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231211qn1p3pmcb44xobi3bjew1or4w_firsti.jpg',
            name: '徐良 - 劫',
            duration: 220,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363362844',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231211sa2a9hooo8c54ts2a8xlcr4oc_firsti.jpg',
            name: '徐良 - 井底之囚',
            duration: 197,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363362976',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231211sa1qhlhbj58zfj12hf6it4ovb_firsti.jpg',
            name: '徐良 - 考虑到可能再也见不到你',
            duration: 250,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363363153',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231211a2161yl78fxxqje33k060f4mf_firsti.jpg',
            name: '徐良 - 靠近',
            duration: 206,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363363508',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231211sa1uhu7ni9vksks3hqyw3izk6_firsti.jpg',
            name: '徐良 - 谜语',
            duration: 219,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363363313',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231211saznubetzw20um3pi59qm29vl_firsti.jpg',
            name: '徐良 - 莫再提',
            duration: 190,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363364200',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231211saq7n2616d8tgjulo2bz4b8vx_firsti.jpg',
            name: '徐良 - 拿着烟斗的男孩',
            duration: 257,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363363457',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231211qn25taf1gfnmvbe3qrkwkuthx_firsti.jpg',
            name: '徐良 - 你不是我',
            duration: 213,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363363517',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231211sa3qj6f4pp84i24354wai1xyu_firsti.jpg',
            name: '徐良 - 捻秋花',
            duration: 219,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363363542',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231211sa3ir2s0fo9036a1vayturinp_firsti.jpg',
            name: '徐良 - 人面桃花',
            duration: 237,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363363663',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231211a23kjjy82do46em3d4jvrtbgf_firsti.jpg',
            name: '徐良 - 树屋',
            duration: 223,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363363820',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231211a21i4e6gahyr0yy3dh42ueo0x_firsti.jpg',
            name: '徐良 - 上火星球',
            duration: 136,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363364410',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231211sawrgz10im4ecs1qz7jjrn0uz_firsti.jpg',
            name: '徐良 - 天然淋浴器',
            duration: 223,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363364560',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231211a2im4ld8idbtm5w3hz94vxre2_firsti.jpg',
            name: '徐良 - 天真',
            duration: 226,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363364016',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231211qngshe2wcgi54d2jv2sm8d9ei_firsti.jpg',
            name: '徐良 - 逍遥辞',
            duration: 223,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363364294',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231211qn2teonmht75qp43pywep44r3_firsti.jpg',
            name: '徐良 - 写词的人',
            duration: 264,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363364497',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231211a23pc04zexc5cx7x2e32z0bv2_firsti.jpg',
            name: '徐良 - 写曲的人',
            duration: 237,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363364630',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231211sa22qnbkfhi1e4l2vgvolxou1_firsti.jpg',
            name: '徐良 - 学戏',
            duration: 189,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363364641',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231211sa22kzya0ji9gxdim1wxdz8bn_firsti.jpg',
            name: '徐良 - 也许',
            duration: 249,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363364859',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231211a227y5b5o6segku4vkd2nfy15_firsti.jpg',
            name: '徐良 - 一公里的幸福',
            duration: 286,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363365212',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231211sa1x8oxbd5w41te14frok61r1_firsti.jpg',
            name: '徐良 - 一三七',
            duration: 218,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363365479',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231211sazmshzirdnk78355r5y2bhk3_firsti.jpg',
            name: '徐良 - 伊人曰',
            duration: 151,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363365043',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231211a22598qxi8a8jja36kburfk3i_firsti.jpg',
            name: '徐良 - 至尊宝',
            duration: 232,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363365125',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231211a23qx262sdjh52011csm63qx1_firsti.jpg',
            name: '徐良 - 自画像',
            duration: 228,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363365145',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231211a23ju7kzxzk0zznx2aunp3miu_firsti.jpg',
            name: '徐良 - 自由',
            duration: 207,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363365315',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231211a22i7rrkxej690q32w35wzkpg_firsti.jpg',
            name: '徐良&李玉刚-花魁',
            duration: 233,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363365440',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231211sa18c1q9syq126g36b79vxwig_firsti.jpg',
            name: '徐良&小凌-再见啦同学',
            duration: 267,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363365864',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231211sa3ivnycvi96h3z148mvxg5po_firsti.jpg',
            name: '徐良&小暖-和平分手',
            duration: 235,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363365431',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231211sa1s0p3wbs97wo81uax307ltk_firsti.jpg',
            name: '徐良&杨曦-他的猫',
            duration: 221,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363365559',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231211sa2tuabk74rbcqq3vscxt5tvd_firsti.jpg',
            name: '徐良&杨洋-邂逅',
            duration: 193,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363365799',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231211sa2jztocrae6dek1ginnr6mde_firsti.jpg',
            name: '徐良&庄雨洁-两个傻瓜',
            duration: 184,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363365771',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231211sa1mmqlp6ylg95l136si7lu5u_firsti.jpg',
            name: '徐良、Britneylee小暖 - 不好听',
            duration: 231,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363365854',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231211a2owtcdhtghxqz3437ktykwuv_firsti.jpg',
            name: '徐良、阿悄 - 卜芥',
            duration: 254,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363366259',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231211sa1zp4n83bufpjo2kfpv2b4mk_firsti.jpg',
            name: '徐良、阿悄 - 月光',
            duration: 255,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363366108',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231211sa1tuwk6jbj15yt3tduox1iut_firsti.jpg',
            name: '徐良、冯提莫 - 触电',
            duration: 194,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363366053',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231211sasy55bcxp8wc32g816pb99zy_firsti.jpg',
            name: '徐良、郭静 - 烂人',
            duration: 251,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363366179',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231211sa1zyvs2nlpu3dq14hmeo64nv_firsti.jpg',
            name: '徐良、李玉刚 - 花魁',
            duration: 233,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363366262',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231211sa2au8bkyx6kz6a3dprnp08ba_firsti.jpg',
            name: '徐良、刘丹萌 - 抽离',
            duration: 259,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363366230',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231211sa2fcg7rbd0ixv8b1v90iuqqy_firsti.jpg',
            name: '徐良、刘思涵 - 那年夏天我学会了在被子中抱紧自己',
            duration: 260,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363366730',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231211sa3tqveed3ssijaknbosnn2uw_firsti.jpg',
            name: '徐良、潘卉琦 - 乳臭未干',
            duration: 186,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363366535',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231211sa2vle7xe4f82wl26narcjeyx_firsti.jpg',
            name: '徐良、孙羽幽 - 虐心',
            duration: 258,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363366606',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231211sa2tfi8pa75q7ar1vj1w7tneb_firsti.jpg',
            name: '徐良、小凌 - 天堂岛乐园',
            duration: 197,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363366735',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231211sa2pds7lvq4gty43rbwd45bdi_firsti.jpg',
            name: '徐良-悲伤的李白',
            duration: 211,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363366742',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231211sa1l5xb1f7wair467dm85cv8l_firsti.jpg',
            name: '徐良-北京巷弄',
            duration: 234,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363366889',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231211sa29lkxvjxy3mmqk6okqy404i_firsti.jpg',
            name: '徐良-不良',
            duration: 220,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363367005',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231211sa2c47u5gfpjmlo3jvgn28gzp_firsti.jpg',
            name: '徐良-盗御马',
            duration: 226,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363367118',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231211saz3hqb04vsp5l1iaquddo8kc_firsti.jpg',
            name: '徐良-风清',
            duration: 274,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363367025',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231211saez9mki70vzjw2p2uus7skxw_firsti.jpg',
            name: '徐良-风雨萧瑟',
            duration: 237,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363367212',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231211sa2mx7ohgea0ues2ed078q9we_firsti.jpg',
            name: '徐良-歌手',
            duration: 249,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363367232',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231211sa7g3ky6yiwxzx2suxljng7l5_firsti.jpg',
            name: '徐良-还是想念',
            duration: 249,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363367314',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231211a2gzrmw1d0b4a32ooyk016au4_firsti.jpg',
            name: '徐良-黑白相纸',
            duration: 215,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363367308',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231211sa2kpfsnyrqfw0d3m10lej5qe_firsti.jpg',
            name: '徐良-华生',
            duration: 252,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363367275',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231211sa2w2okbrhtefr2kgefajcroa_firsti.jpg',
            name: '徐良-简单的温热',
            duration: 231,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363367459',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231211qnzpuhqeogmcpx3b7djqlm6uc_firsti.jpg',
            name: '徐良-见字如面',
            duration: 246,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363367534',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231211sa1snfcrdjqo87a3oxm5k83q2_firsti.jpg',
            name: '徐良-美瞳',
            duration: 240,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363367719',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231211qn1f6n8v13kmnuhorxvnhxzoe_firsti.jpg',
            name: '徐良-拿着烟斗的男孩',
            duration: 257,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363367559',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231211sa22kdhn5e32agw3bpswka5md_firsti.jpg',
            name: '徐良-那时雨',
            duration: 215,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363367556',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231211sa2572q3kr9e9mp3l7nn8xi8p_firsti.jpg',
            name: '徐良-捻秋花',
            duration: 219,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363367938',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231211sa2uce87a2x80pl2hw1ikj36i_firsti.jpg',
            name: '徐良-女骑士',
            duration: 253,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363368259',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231211sa1buy8mhutmi372jjtgk691n_firsti.jpg',
            name: '徐良-如此懦弱的我',
            duration: 190,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363367886',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231211sa36dvjeh3hhdi7164u87g65j_firsti.jpg',
            name: '徐良-苏三起解',
            duration: 239,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363368690',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231211sa3pv8d2q0ddmju1xr8adebku_firsti.jpg',
            name: '徐良-小恋曲',
            duration: 196,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363368031',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231211a21l6g99aoyayewf1m9agm9u2_firsti.jpg',
            name: '徐良-写曲的人',
            duration: 237,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363368256',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n231211a22qz6e0si3ixsk2z076djj8n_firsti.jpg',
            name: '徐良-心跳时光',
            duration: 185,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363368269',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231211sa3seb95vrkva953cf4472vlm_firsti.jpg',
            name: '徐良-友情出演',
            duration: 195,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363368560',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n231211sa2d2acdtepk2ekpdupg1uoaf_firsti.jpg',
            name: '徐良-御龙无双',
            duration: 217,
            author: '',
            origin: 'bili',
          },
          {
            id: '964547384_BV1bH4y1k7y8_1363368458',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n231211qn3g768nfo8k11h2yqm7yzu3n_firsti.jpg',
            name: '徐良-在深秋',
            duration: 296,
            author: '',
            origin: 'bili',
          },
        ],
        cover:
          'http://i0.hdslb.com/bfs/archive/2b6c057133e9ffe0100197442b5aaa89da29375e.png',
        createdAt: null,
        updatedAt: null,
      },
      {
        id: 'e3485032-cedc-4a83-8759-eb69cbe78bb3',
        name: '王力宏',
        desc: '',
        author: '',
        musicList: [
          {
            id: '273564036_BV1rF411Q7SL_1200908542',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n23071804b1xrt1xo4v7m39viwtkr7os_firsti.jpg',
            name: '01. 王力宏-需要人陪',
            duration: 252,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200908810',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n2307180628p4194eblsf51khecgub5t_firsti.jpg',
            name: '02. 王力宏-大城小爱',
            duration: 226,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200908800',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230718042z8heeg5wkw6e9ux0klyb8s_firsti.jpg',
            name: '03. 王力宏-花田错',
            duration: 229,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200908799',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230718041tqyczitablfm2m454reznd_firsti.jpg',
            name: '04. 王力宏-改变自己',
            duration: 195,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200908976',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n23071804265ck2cjwxsz7m0qdml0t0f_firsti.jpg',
            name: '05. 王力宏-心跳',
            duration: 264,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200909083',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n23071806sbiof4nbdhmyxgbtdyrimbz_firsti.jpg',
            name: '06. 王力宏-唯一',
            duration: 263,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200909362',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230718017rgxgv4yobq8qmidy2c238h_firsti.jpg',
            name: '07. 王力宏&谭维维-缘分一道桥',
            duration: 247,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200909717',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230718043hskkqzqi8bbvb6xhy8mihb_firsti.jpg',
            name: '08. 卢巧音&王力宏-好心分手(合唱版)',
            duration: 184,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200909786',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230718022knpm7kb0rzmu3k14em4pqn_firsti.jpg',
            name: '09. 王力宏&张靓颖-另一个天堂',
            duration: 267,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200909436',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230718061n1z7ldqb2uzj1a2tda4tgw_firsti.jpg',
            name: '10. 王力宏-依然爱你',
            duration: 247,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200910045',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230718014s8hjlfgsco8tloh72sfufj_firsti.jpg',
            name: '11. 王力宏-你不知道的事',
            duration: 279,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200909861',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230718042al3ipvh25faa1n6eqwvp0k_firsti.jpg',
            name: '12. 王力宏-天地龙鳞',
            duration: 197,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200910327',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n23071806257115g19euia2o8o3vgzuk_firsti.jpg',
            name: '13. 林俊杰&王力宏-One Shot (feat. 王力宏)',
            duration: 270,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200910408',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230718021tyw0h8zv390c24ohyk8x92_firsti.jpg',
            name: '14. 王力宏-爱的就是你',
            duration: 290,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200910619',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230718023qmoz8f3gh5cb19qsfuyvvs_firsti.jpg',
            name: '15. 王力宏&谭维维-寸心',
            duration: 321,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200910484',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n23071805vgi7n73036ee3kbpmcumd21_firsti.jpg',
            name: '16. 方大同&王力宏-Flow',
            duration: 232,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200910887',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230718062u67jvnymwpek2n83r37dho_firsti.jpg',
            name: '17. 王力宏-Can You Feel My World',
            duration: 295,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200910891',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230718061l20fbx60t7u82dmm7v7wwg_firsti.jpg',
            name: '18. 王力宏-我们的歌',
            duration: 245,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200911154',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230718041p7inc49j6l7u3al4smiogz_firsti.jpg',
            name: '19. 王力宏-Julia',
            duration: 274,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200911267',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n23071801l87duncdbir2e1b41qzj0i2_firsti.jpg',
            name: '20. 王力宏-Everything',
            duration: 300,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200911306',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n2307180335wkqwiceq4dwrnx8ckslhi_firsti.jpg',
            name: '21. 王力宏-CrossFire',
            duration: 202,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200911679',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230718043cyyhucru44jcj4ac7lf9i7_firsti.jpg',
            name: '22. 王力宏-Kiss Goodbye',
            duration: 263,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200910939',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230718013jl52b42w85u72hq66kzdn3_firsti.jpg',
            name: '23. 林俊杰&王力宏-巴洛克先生 (feat. 王力宏)',
            duration: 46,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200911574',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230718049rizgntnfc4z2xm2tau0yg7_firsti.jpg',
            name: '24. 王力宏-爱错',
            duration: 239,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200911482',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n2307180416kqh80hf15mp17i5lim496_firsti.jpg',
            name: '25. 王力宏-爱的鼓励',
            duration: 211,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200911655',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230718012ozrkn8jlggdf3fj44o7nae_firsti.jpg',
            name: '26. 王力宏&Selina-你是我心内的一首歌',
            duration: 167,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200912426',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230718011dzi5a33ipfg32rtblcz4zh_firsti.jpg',
            name: '27. 王力宏-爱的就是你(浪漫版)',
            duration: 295,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200912064',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n2307180419mrv501wmkoa3kkosdfzgb_firsti.jpg',
            name: '28. 王力宏-爱你等于爱自己',
            duration: 235,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200912478',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n23071806uqi34mba49xq2a8b66z59xu_firsti.jpg',
            name: '29. 王力宏-安全感',
            duration: 252,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200912285',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n2307180430fbd7yx3xuo2rm6siu1iht_firsti.jpg',
            name: '30. 王力宏-公转自转',
            duration: 262,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200912280',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n2307180620p410knwdr9x1k8e5wdiuy_firsti.jpg',
            name: '31. 范晓萱&王力宏-原来的世界',
            duration: 226,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200913022',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230718061hcfs8ylpvdyu16n10b5lbb_firsti.jpg',
            name: '32. 王力宏-伯牙绝弦',
            duration: 228,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200913139',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n2307180210btyeiitpygx1io8e12v5x_firsti.jpg',
            name: '33. 王力宏&Avicii-忘我',
            duration: 300,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200913001',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n23071805ma8vn21txa4022ri5cxpulo_firsti.jpg',
            name: '34. 王力宏-让开',
            duration: 183,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200912887',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230718051wnouf1lva2oiz40l8qpn71_firsti.jpg',
            name: '35. 王力宏-风中的遗憾',
            duration: 292,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200913333',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230718043j8avtpd1v3jy1jkqgb2ibi_firsti.jpg',
            name: '36. 王力宏-裂心',
            duration: 265,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200913358',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230718034ukbawhl4be2b2bw3eutadh_firsti.jpg',
            name: '37. 王力宏-十二生肖',
            duration: 203,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200913716',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n23071801jeajtd3319zs13b3nzdp97t_firsti.jpg',
            name: '38. 王力宏-十八般武艺',
            duration: 232,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200913767',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230718043kn27wjuas3i71scbmld44z_firsti.jpg',
            name: '39. 王力宏-流泪手心',
            duration: 297,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200913672',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230718063d92uxtjyc0f72jcr17z19r_firsti.jpg',
            name: '40. 王力宏-火力全开',
            duration: 270,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200913873',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n23071803esvke15yoq532ykj52uq68n_firsti.jpg',
            name: '41. 王力宏-落叶归根',
            duration: 315,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200913941',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230718061rzx1p1rns508yy29o9d5yd_firsti.jpg',
            name: '42. 王力宏-就是现在',
            duration: 271,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200914287',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n23071806ms88um7gaxdx27lqx3bcf5i_firsti.jpg',
            name: '43. 王力宏-不可能错过你',
            duration: 296,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200914668',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n23071803nizramvas4s13hzwo02byfl_firsti.jpg',
            name: '44. 王力宏-你和我',
            duration: 280,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200914068',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n2307180614c3s69bquvi62edpxa9q4w_firsti.jpg',
            name: '45. 王力宏-过来',
            duration: 177,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200914110',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230718033lbis7b0rs0fatj3pyyxt0f_firsti.jpg',
            name: '46. 王力宏-你不知道的事(宋晓青版本)',
            duration: 67,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200914663',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230718033apjrdriptpbe256ncf1t9s_firsti.jpg',
            name: '47. 王力宏-寸心(王力宏独唱版)',
            duration: 319,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200914595',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n2307180127nhuf7o2ef9j542th2tj3l_firsti.jpg',
            name: '48. 王力宏-如果你听见我的歌',
            duration: 306,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200914716',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230718012x7i43401b6i33l89xm40fk_firsti.jpg',
            name: '49. 王力宏-华人万岁',
            duration: 189,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200915160',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230718021g4lyijjpzefv3a46fs44e7_firsti.jpg',
            name: '50. 王力宏-Forever Your Dad',
            duration: 227,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200915407',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n23071804ihfq0kqgdnnx14muoir9fgr_firsti.jpg',
            name: '51. 王力宏-不完整的旋律',
            duration: 248,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200915250',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230718022fm6o8kz05mjf11hr0v6cel_firsti.jpg',
            name: '52. 王力宏-两个人不等于我们',
            duration: 220,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200915818',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230718033nc5qb67ygif63pqq16c12x_firsti.jpg',
            name: '53. 王力宏-春雨里洗过的太阳',
            duration: 292,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200915242',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230718062fm6glef76y9j2t3xc4o5u6_firsti.jpg',
            name: '54. 王力宏-打开爱',
            duration: 276,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200915664',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n23071804zvmmanwah7rl3hi32cndg8a_firsti.jpg',
            name: '55. 王力宏-第一个清晨',
            duration: 287,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200915971',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n2307180638f90sm8q7oo72im5b5vn84_firsti.jpg',
            name: '56. 王力宏-Forever Love',
            duration: 294,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200915791',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230718043i0ur5qnx8r9s1j7djcoxz1_firsti.jpg',
            name: '57. 王力宏-爱在哪里',
            duration: 244,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200915923',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230718032bqjdt1exgba31caq0bu7p0_firsti.jpg',
            name: '58. 王力宏-杜 U ♥ Me',
            duration: 196,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200916236',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230718052ka42y7sor8kiid7cw1byc5_firsti.jpg',
            name: '59. 王力宏-放开你的心',
            duration: 226,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200916589',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230718012uli1hpptvukf2wfg84xk15_firsti.jpg',
            name: '60. 王力宏-爱因为在心中',
            duration: 261,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200916544',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230718031g6af1v2dnmwg30eqmtewc7_firsti.jpg',
            name: '61. 王力宏-盖世英雄',
            duration: 186,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200916648',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n23071802290q7zlviq5hg2vgn8ile32_firsti.jpg',
            name: '62. 王力宏-美',
            duration: 208,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200916515',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230718023ehru0r665aqn2yyalg6usf_firsti.jpg',
            name: '63. 王力宏-你不在',
            duration: 275,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200916740',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230718021f19iq0hk81jhmsczhd1wnx_firsti.jpg',
            name: '64. 王力宏-你的爱',
            duration: 232,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200916872',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230718051mpg536ahcpjg1t3uhmil68_firsti.jpg',
            name: '65. 王力宏-七十亿分之一',
            duration: 230,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200917600',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230718013bwa9912pcu4ipojqrbg61e_firsti.jpg',
            name: '66. 王力宏&欧阳靖&李岩-盖世英雄',
            duration: 219,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200917569',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230718063s675lfa000bc3peemjjeaz_firsti.jpg',
            name: '67. 王力宏&朱小磊-南京，南京',
            duration: 232,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200917250',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230718051qt7iu8unam6ax9aefgip04_firsti.jpg',
            name: '68. 王力宏-听爱',
            duration: 218,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200917165',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n23071804swtwxfibo7s31cnixzoedav_firsti.jpg',
            name: '69. 王力宏-我完全没有任何理由理你',
            duration: 189,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200917587',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n2307180619m1r8y1lnh621642iditkp_firsti.jpg',
            name: '70. 王力宏-心中的日月',
            duration: 238,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200917852',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n23071802298vxn4p2q9zzqung1to4nh_firsti.jpg',
            name: '71. 王力宏-星期六的深夜',
            duration: 304,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200917649',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230718052oajuavrnbet8s6yibh2byx_firsti.jpg',
            name: '72. 王力宏-星座',
            duration: 186,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200918089',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n230718033hags1gakz5wo20j2wpwpwl_firsti.jpg',
            name: '73. 王力宏-摇滚怎么了！！',
            duration: 156,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200918120',
            cover:
              'http://i1.hdslb.com/bfs/storyff/n23071801278xgeh5xnj920lo3s8cyk9_firsti.jpg',
            name: '74. 王力宏-一首简单的歌',
            duration: 250,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200918179',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n230718031gl6lc3klkolh20sgi0rzt2_firsti.jpg',
            name: '75. 王力宏&孙燕姿&汪峰&张靓颖-点燃激情 传递梦想',
            duration: 227,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200918510',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230718053gkom4ra20a0w3p0s4bauxm_firsti.jpg',
            name: '76. 王力宏-在梅边',
            duration: 277,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200918559',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230718032511ass7sfju73c7bi3m3tw_firsti.jpg',
            name: '77. 王力宏-这就是爱',
            duration: 258,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200918587',
            cover:
              'http://i2.hdslb.com/bfs/storyff/n23071802iaqjtmwa2jhy2d1j43nn6e7_firsti.jpg',
            name: '78. 成龙&雷佳&王力宏&谭维维-和平的薪火',
            duration: 303,
            author: '',
            origin: 'bili',
          },
          {
            id: '273564036_BV1rF411Q7SL_1200918485',
            cover:
              'http://i0.hdslb.com/bfs/storyff/n230718063scgqfcwgpm8c3330mjrj6c_firsti.jpg',
            name: '79. 王力宏&田桐&成龙&李光洁&肖战&吴京&沈腾&宋佳&杨培',
            duration: 292,
            author: '',
            origin: 'bili',
          },
        ],
        cover:
          'http://i0.hdslb.com/bfs/archive/ae473a6fff1599b9e0178fe6d26f2414787296e9.png',
        createdAt: null,
        updatedAt: null,
      },
    ];
  }
  mixinKeyEncTab = [
    46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
    33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
    61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
    36, 20, 34, 44, 52,
  ];
}

export default TestSongExtension;
