import { showNotify } from 'vant';
import { SongExtension } from '.';

class TestSongExtension extends SongExtension {
  id = 'testSong';
  name = 'testSong';
  version = '0.0.1';
  version = '0.0.1';
  baseUrl = 'https://zz123.com/';
  ajaxUrl = 'https://zz123.com/ajax/';
  async getRecommendPlaylists(pageNo) {
    pageNo ||= 1;
    const body = await this.fetchDom(this.baseUrl, {
      verify: false,
    });
    const elements = body.querySelectorAll('.cate-list a');

    const list = [
      { id: '/list/mxuxuu.htm', name: '热歌榜' },
      { id: '/list/mxuxzv.htm', name: '新歌榜' },
      { id: '/list/mxuxkm.htm', name: '抖音歌曲榜' },
      { id: '/list/mxuxds.htm', name: 'DJ嗨歌榜' },
      { id: '/list/mxuxkd.htm', name: '极品电音榜' },
      { id: '/list/mxuxkz.htm', name: '流行趋势榜' },
      { id: '/list/mxuass.htm', name: '彩铃榜' },
      { id: '/list/mxuask.htm', name: '尖叫热歌榜' },
      { id: '/list/mxuxvd.htm', name: '飙升榜' },
      { id: '/list/mxuxqk.htm', name: '台湾地区榜' },
      { id: '/list/mxuxqq.htm', name: '欧美榜' },
      { id: '/list/mxuaxv.htm', name: '韩国榜' },
      { id: '/list/mxuaxd.htm', name: '香港地区榜' },
      { id: '/list/mxuaaa.htm', name: '日本榜' },
      { id: '/list/mxuaak.htm', name: '内地榜' },
      { id: '/list/mxuasv.htm', name: '港台榜' },
      { id: '/list/mxuxux.htm', name: '越南语榜' },
      {
        id: '/list/mxuxuk.htm',
        name: 'Beatport全球电子舞曲榜',
      },
      {
        id: '/list/mxuxuq.htm',
        name: '日本Oricon榜',
      },
      {
        id: '/list/mxuamx.htm',
        name: '美国BillBoard榜',
      },
      {
        id: '/list/mxuavu.htm',
        name: '美国iTunes榜',
      },
      { id: '/list/mxuxda.htm', name: '听歌识曲榜' },
      { id: '/list/mxuxdd.htm', name: '睡前放松榜' },
      { id: '/list/mxuxku.htm', name: '禅心佛乐榜' },
      { id: '/list/mxuxdz.htm', name: '酷我铃声榜' },
      { id: '/list/mxuxdk.htm', name: '酷我热评榜' },
      { id: '/list/mxuxkx.htm', name: '酷我综艺榜' },
      { id: '/list/mxuasq.htm', name: '酷我新歌榜' },
      { id: '/list/mxuavx.htm', name: '酷我飙升榜' },
      { id: '/list/mxuava.htm', name: '酷我热歌榜' },
      {
        id: '/list/mxuaxm.htm',
        name: '酷狗音乐人原创榜',
      },
      { id: '/list/mxuaad.htm', name: '酷狗分享榜' },
      { id: '/list/mxuams.htm', name: '酷狗飙升榜' },
      {
        id: '/list/mxuxud.htm',
        name: '云音乐韩语榜',
      },
      {
        id: '/list/mxuxzx.htm',
        name: '云音乐古典榜',
      },
      {
        id: '/list/mxuxza.htm',
        name: '云音乐ACG VOCALOID榜',
      },
      {
        id: '/list/mxuxzk.htm',
        name: '云音乐ACG动画榜',
      },
      {
        id: '/list/mxuxvk.htm',
        name: '云音乐国电榜',
      },
      {
        id: '/list/mxuxvq.htm',
        name: '云音乐欧美热歌榜',
      },
      {
        id: '/list/mxuxum.htm',
        name: '云音乐欧美新歌榜',
      },
      {
        id: '/list/mxuxus.htm',
        name: '云音乐ACG游戏榜',
      },
      { id: '/list/mxuxuz.htm', name: '原创榜' },
      { id: '/list/mxuxzm.htm', name: '潜力爆款榜' },
      { id: '/list/mxuxdv.htm', name: '最强翻唱榜' },
      { id: '/list/mxuxdu.htm', name: '通勤路上榜' },
      { id: '/list/mxuxdq.htm', name: '网红新歌榜' },
      { id: '/list/mxuxka.htm', name: '会员畅听榜' },
      { id: '/list/mxuxks.htm', name: '冬日恋曲榜' },
      { id: '/list/mxuxkv.htm', name: '宝宝哄睡榜' },
      { id: '/list/mxuxkk.htm', name: '经典怀旧榜' },
      { id: '/list/mxuxkq.htm', name: '跑步健身榜' },
      { id: '/list/mxuxqx.htm', name: '古风音乐榜' },
      { id: '/list/mxuxqa.htm', name: 'KTV点唱榜' },
      { id: '/list/mxuxqm.htm', name: '车载嗨曲榜' },
      { id: '/list/mxuxqs.htm', name: '熬夜修仙榜' },
      { id: '/list/mxuxqv.htm', name: 'Vlog必备榜' },
      { id: '/list/mxuxqu.htm', name: '爆笑相声榜' },
      { id: '/list/mxuaax.htm', name: 'DJ热歌榜' },
      { id: '/list/mxuaas.htm', name: '快手热歌榜' },
      { id: '/list/mxuaav.htm', name: '尖叫新歌榜' },
      { id: '/list/mxuaau.htm', name: '影视金曲榜' },
      { id: '/list/mxuavm.htm', name: '俄语榜' },
      { id: '/list/mxuavz.htm', name: 'KTV榜' },
      { id: '/list/mxuavd.htm', name: '尖叫原创榜' },
      {
        id: '/list/mxuxua.htm',
        name: '法国 NRJ Vos Hits 周榜',
      },
      { id: '/list/mxuxuu.htm', name: '热歌榜' },
      { id: '/list/mxuxzv.htm', name: '新歌榜' },
      { id: '/list/mxuxkm.htm', name: '抖音歌曲榜' },
      { id: '/list/mxuxds.htm', name: 'DJ嗨歌榜' },
      { id: '/list/mxuxkd.htm', name: '极品电音榜' },
      { id: '/list/mxuxkz.htm', name: '流行趋势榜' },
      { id: '/list/mxuass.htm', name: '彩铃榜' },
      { id: '/list/mxuask.htm', name: '尖叫热歌榜' },
      { id: '/list/mxuxvd.htm', name: '飙升榜' },
      { id: '/list/mxuxqk.htm', name: '台湾地区榜' },
      { id: '/list/mxuxqq.htm', name: '欧美榜' },
      { id: '/list/mxuaxv.htm', name: '韩国榜' },
      { id: '/list/mxuaxd.htm', name: '香港地区榜' },
      { id: '/list/mxuaaa.htm', name: '日本榜' },
      { id: '/list/mxuaak.htm', name: '内地榜' },
      { id: '/list/mxuasv.htm', name: '港台榜' },
      { id: '/list/mxuxux.htm', name: '越南语榜' },
      {
        id: '/list/mxuxuk.htm',
        name: 'Beatport全球电子舞曲榜',
      },
      {
        id: '/list/mxuxuq.htm',
        name: '日本Oricon榜',
      },
      {
        id: '/list/mxuamx.htm',
        name: '美国BillBoard榜',
      },
      {
        id: '/list/mxuavu.htm',
        name: '美国iTunes榜',
      },
      { id: '/list/mxuxda.htm', name: '听歌识曲榜' },
      { id: '/list/mxuxdd.htm', name: '睡前放松榜' },
      { id: '/list/mxuxku.htm', name: '禅心佛乐榜' },
      { id: '/list/mxuxdz.htm', name: '酷我铃声榜' },
      { id: '/list/mxuxdk.htm', name: '酷我热评榜' },
      { id: '/list/mxuxkx.htm', name: '酷我综艺榜' },
      { id: '/list/mxuasq.htm', name: '酷我新歌榜' },
      { id: '/list/mxuavx.htm', name: '酷我飙升榜' },
      { id: '/list/mxuava.htm', name: '酷我热歌榜' },
      {
        id: '/list/mxuaxm.htm',
        name: '酷狗音乐人原创榜',
      },
      { id: '/list/mxuaad.htm', name: '酷狗分享榜' },
      { id: '/list/mxuams.htm', name: '酷狗飙升榜' },
      {
        id: '/list/mxuxud.htm',
        name: '云音乐韩语榜',
      },
      {
        id: '/list/mxuxzx.htm',
        name: '云音乐古典榜',
      },
      {
        id: '/list/mxuxza.htm',
        name: '云音乐ACG VOCALOID榜',
      },
      {
        id: '/list/mxuxzk.htm',
        name: '云音乐ACG动画榜',
      },
      {
        id: '/list/mxuxvk.htm',
        name: '云音乐国电榜',
      },
      {
        id: '/list/mxuxvq.htm',
        name: '云音乐欧美热歌榜',
      },
      {
        id: '/list/mxuxum.htm',
        name: '云音乐欧美新歌榜',
      },
      {
        id: '/list/mxuxus.htm',
        name: '云音乐ACG游戏榜',
      },
      { id: '/list/mxuxuz.htm', name: '原创榜' },
      { id: '/list/mxuxzm.htm', name: '潜力爆款榜' },
      { id: '/list/mxuxdv.htm', name: '最强翻唱榜' },
      { id: '/list/mxuxdu.htm', name: '通勤路上榜' },
      { id: '/list/mxuxdq.htm', name: '网红新歌榜' },
      { id: '/list/mxuxka.htm', name: '会员畅听榜' },
      { id: '/list/mxuxks.htm', name: '冬日恋曲榜' },
      { id: '/list/mxuxkv.htm', name: '宝宝哄睡榜' },
      { id: '/list/mxuxkk.htm', name: '经典怀旧榜' },
      { id: '/list/mxuxkq.htm', name: '跑步健身榜' },
      { id: '/list/mxuxqx.htm', name: '古风音乐榜' },
      { id: '/list/mxuxqa.htm', name: 'KTV点唱榜' },
      { id: '/list/mxuxqm.htm', name: '车载嗨曲榜' },
      { id: '/list/mxuxqs.htm', name: '熬夜修仙榜' },
      { id: '/list/mxuxqv.htm', name: 'Vlog必备榜' },
      { id: '/list/mxuxqu.htm', name: '爆笑相声榜' },
      { id: '/list/mxuaax.htm', name: 'DJ热歌榜' },
      { id: '/list/mxuaas.htm', name: '快手热歌榜' },
      { id: '/list/mxuaav.htm', name: '尖叫新歌榜' },
      { id: '/list/mxuaau.htm', name: '影视金曲榜' },
      { id: '/list/mxuavm.htm', name: '俄语榜' },
      { id: '/list/mxuavz.htm', name: 'KTV榜' },
      { id: '/list/mxuavd.htm', name: '尖叫原创榜' },
      {
        id: '/list/mxuxua.htm',
        name: '法国 NRJ Vos Hits 周榜',
      },
    ];
    list.forEach((item) => {
      item.picUrl = '';
      item.sourceId = '';
    });
    return {
      list,
      page: 1,
      totalPage: 1,
    };
  }
  async getRecommendSongs(pageNo) {
    pageNo ||= 1;
    const url = this.ajaxUrl;
    const form = new FormData();
    form.append('act', 'tag_music');
    form.append('type', 'tuijian');
    form.append('tid', 'vszs');
    form.append('lang', '');
    form.append('page', String(pageNo));
    const response = await this.fetch(url, {
      method: 'POST',
      body: form,
    });
    const json = await response.json();

    const list = [];
    json.data.forEach((item) => {
      list.push({
        id: item.id,
        name: item.mname,
        artists: [item.sname],
        picUrl: item.pic,
        picHeaders: { referer: this.baseUrl, 'upgrade-insecure-requests': '1' },
        cid: item.sid,
        url: {
          '128k': item.mp3,
          headers: {},
        },
        sourceId: '',
      });
    });
    return {
      list,
      page: 1,
      totalPage: 1,
    };
  }
  async searchPlaylists(keyword, pageNo) {
    return null;
  }
  async searchSongs(keyword, pageNo) {
    const url = `https://zz123.com/search/?key=${keyword}&page=${pageNo}`;
    const response = await this.fetch(url, {
      verify: false,
    });
    const text = await response.text();

    const regex = /var pageSongArr=\[(.*?)\];/;
    const match = text.match(regex);
    if (match && match[1]) {
      // 将匹配到的字符串转换为数组
      const songArray = JSON.parse(`[${match[1]}]`);

      const list = songArray.map((song) => {
        return {
          id: song.id,
          name: song.mname,
          artists: [song.sname],
          picUrl: song.pic,
          picHeaders: {
            referer: this.baseUrl,
            'upgrade-insecure-requests': '1',
          },
          cid: song.sid,
          sourceId: '',
        };
      });
      return {
        list,
        page: pageNo,
        totalPage: list.length === 0 ? pageNo : pageNo + 1,
      };
    } else {
      return null;
    }
  }
  async getPlaylistDetail(item, pageNo) {
    const url = this.urlJoin(this.baseUrl, item.id);
    const response = await this.fetch(url, {
      verify: false,
    });
    const text = await response.text();

    const regex = /var pageSongArr=\[(.*?)\];/;
    const match = text.match(regex);
    if (match && match[1]) {
      // 将匹配到的字符串转换为数组
      const songArray = JSON.parse(`[${match[1]}]`);

      const list = songArray.map((song) => {
        return {
          id: song.id,
          name: song.mname,
          artists: [song.sname],
          picUrl: song.pic,
          picHeaders: {
            referer: this.baseUrl,
            'upgrade-insecure-requests': '1',
          },
          cid: song.sid,
          sourceId: '',
        };
      });
      item.list = {
        list,
        page: 1,
        totalPage: 1,
      };
      return item;
    } else {
      return null;
    }
  }
  async getSongUrl(item, size) {
    const url = this.ajaxUrl;
    const form = new FormData();
    form.append('act', 'songinfo');
    form.append('id', item.id);
    const response = await this.fetch(url, {
      method: 'POST',
      body: form,
    });
    const json = await response.json();
    return {
      '128k': json.data.mp3,
      lyric: json.data.lrc,
      headers: {},
    };
  }
  async getLyric(item) {
    return null;
  }
}

export default TestSongExtension;
