import { SongExtension } from '.';

class TestSongExtension extends SongExtension {
  id = 'testSong';
  name = 'testSong';
  version = '0.0.1';
  baseUrl = 'https://music.migu.cn/';
  async getRecommendPlaylists(pageNo) {
    pageNo ||= 1;
    const typeMap = {
      2: 15127272, // 最新
      1: 15127315, // 推荐
    };
    const url = `http://m.music.migu.cn/migu/remoting/playlist_bycolumnid_tag?playListType=2&type=1&columnId=${typeMap[2]}&tagId=&startIndex=${(pageNo - 1) * 10}`;
    const data = await this.getData(url);

    const list = [];
    data.retMsg.playlist.forEach((ele) => {
      list.push({
        name: ele.playListName,
        id: ele.playListId,
        picUrl: ele.image,
        desc: ele.summary,
        createTime: ele.createTime,
        creator: {
          id: ele.createUserId,
          name: ele.createName,
        },
        songCount: ele.contentCount,
        playCount: ele.playCount,
        sourceId: '',
        extra: { type: ele.playListType },
      });
    });
    return {
      list,
      page: pageNo,
      pageSize: 10,
      totalPage: Math.ceil(Number(data.retMsg.countSize) / 10),
    };
  }
  async getRecommendSongs(pageNo) {
    pageNo ||= 1;
    const url =
      `http://m.music.migu.cn/migu/remoting/cms_list_tag` +
      `?pageSize=10&nid=23853978&pageNo=${pageNo - 1}`;
    const data = await this.getData(url);

    if (!data) {
      return null;
    }
    if (data instanceof String) {
      return null;
    }
    const list = [];
    data.result.results.forEach((ele) => {
      list.push({
        name: ele.songData.songName,
        artists: [ele.songData.singerName],
        id: ele.songData.songId || this.nanoid(),
        cid: ele.songData.copyrightId,
        lyric: ele.songData.lyricLrc,
        album: ele.songData.albumData,
        mvId: ele.songData.mvData,
        mvCid: ele.songData.mvData?.copyrightId,
        url: ele.songData.listenUrl,
        picUrl: ele.songData.picM,
        bigPicUrl: ele.songData.picL,
        sourceId: '',
      });
    });

    return {
      list,
      page: pageNo,
      pageSize: data.result.pageSize,
      totalPage: Math.ceil(
        Number(data.result.totalCount) / data.result.pageSize
      ),
    };
  }
  async searchPlaylists(keyword, pageNo) {
    pageNo ||= 1;
    const url =
      `https://m.music.migu.cn/migu/remoting/scr_search_tag` +
      `?keyword=${keyword}&pgc=${pageNo}&rows=10&type=6`;
    const response = await this.getData(url);

    const list = [];
    console.log(response);

    response.songLists.forEach((ele) => {
      list.push({
        name: ele.name,
        id: ele.id,
        picUrl: ele.img,
        songCount: ele.musicNum,
        playCount: ele.playNum,
        sourceId: '',
        extra: { userId: ele.userId, type: ele.songlistType },
      });
    });
    return {
      list,
      page: pageNo,
      pageSize: 10,
      totalPage: response.pgt,
    };
  }
  async searchSongs(keyword, pageNo) {
    pageNo ||= 1;
    const url =
      `https://m.music.migu.cn/migu/remoting/scr_search_tag` +
      `?keyword=${keyword}&pgc=${pageNo}&rows=10&type=2`;
    const response = await this.getData(url);
    console.log(response);

    const songs = [];
    response.musics.forEach((ele) => {
      songs.push({
        name: ele.songName,
        artists: [ele.singerName],
        id: ele.id || this.nanoid(),
        cid: ele.copyrightId,
        lyric: ele.lyric,
        album: ele.albumId,
        mvId: ele.mvId,
        mvCid: ele.mvCopyrightId,
        picUrl: '',
        sourceId: '',
      });
    });
    return {
      list: songs,
      page: pageNo,
      pageSize: 10,
      totalPage: response.pgt,
    };
  }

  async getPlaylistDetail(item, pageNo) {
    pageNo ||= 1;
    if (pageNo == 1) {
      const url = `http://m.music.migu.cn/migu/remoting/query_playlist_by_id_tag?onLine=1&queryChannel=0&createUserId=${item.extra?.userId || 'migu'}&contentCountMin=5&playListId=${item.id}`;
      const playListRes = await this.getData(url);
      const listInfo = playListRes?.rsp?.playList[0];
      if (listInfo) {
        const {
          createUserId,
          playCount,
          contentCount,
          summary: desc,
          createTime,
          updateTime,
        } = listInfo;
        item.playCount = playCount;
        item.songCount = contentCount;
        item.desc = desc;
        item.creator = {
          id: createUserId,
          name: item.creator?.name,
        };
        item.createTime = createTime;
        item.updateTime = updateTime;
      }
    }

    const newUrl = `http://m.music.migu.cn/migu/remoting/playlistcontents_query_tag?playListType=${item.extra.type}&playListId=${item.id}&contentCount=${item.songCount}`;
    const playListRes = await this.getData(newUrl);
    const songs = [];

    playListRes.contentList.forEach((s) => {
      songs.push({
        id: s.songId,
        cid: s.contentId,
        name: s.contentName,
        artists: s.singerName?.split(','),
        sourceId: '',
      });
    });
    item.list = {
      list: songs,
      page: pageNo,
      totalPage: 1,
    };

    return item;
  }
  async getData(url, options) {
    options ||= {};
    const headers = new Headers(options.headers || {});
    if (!headers.has('Referer') && !headers.has('referer')) {
      headers.set('Referer', 'http://m.music.migu.cn/v3');
    }
    if (!headers.has('user-agent') && !headers.has('User-Agent')) {
      headers.set(
        'User-Agent',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
      );
    }
    options.headers = headers;
    const response = await this.fetch(url, options);
    if (response.status !== 200) {
      return null;
    }
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (error) {
      return text;
    }
  }

  async getSongUrl(item, size) {
    const cid = item.cid;
    if (!cid) {
      return null;
    }

    for (const quality of ['PQ', 'HQ', 'SQ']) {
      const url =
        `https://app.c.nf.migu.cn/MIGUM2.0/strategy/listen-url/v2.2` +
        `?netType=01&resourceType=E&songId=${item.id}&toneFlag=${quality}`;
      const response = await this.getData(url, {
        headers: {
          channel: '0146951',
          uuid: '1234',
        },
      });
      if (!response || response.info?.includes('歌曲下线')) {
        return null;
      }
      if (response.data?.url) {
        return {
          '128k': response.data.url,
          lyric: item.lyric || (await this.getLyric(item)),
        };
      }
    }
    return null;
  }
  async getLyric(item) {
    const cid = item.cid;
    if (!cid) {
      return null;
    }
    const url =
      `http://music.migu.cn/v3/api/music/audioPlayer/getLyric` +
      `?copyrightId=${cid}`;
    const response = await this.getData(url);
    return response.lyric;
  }
}

export default TestSongExtension;
