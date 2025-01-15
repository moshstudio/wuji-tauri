import { SongExtension } from ".";

class TestSongExtension extends SongExtension {
  id = "testSong";
  name = "ZZ123";
  version = "0.0.1";
  baseUrl = "https://zz123.com/";
  ajaxUrl = "https://zz123.com/ajax/";
  async getRecommendPlaylists(pageNo) {
    pageNo ||= 1;
    const body = await this.fetchDom(this.baseUrl, {
      verify: false,
    });
    const elements = body.querySelectorAll(".cate-list a");

    const list = [];
    elements?.forEach((item) => {
      const href = item.getAttribute("href");
      if (href) {
        const name = item.textContent?.trim() || "";
        list.push({
          id: href,
          name,
          picUrl: "",
          sourceId: "",
        });
      }
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
    form.append("act", "tag_music");
    form.append("type", "tuijian");
    form.append("tid", "vszs");
    form.append("lang", "");
    form.append("page", String(pageNo));
    const response = await this.fetch(url, {
      method: "POST",
      body: form,
    });
    const json = await response.json();

    const list = [];
    json.data.forEach((item) => {
      list.push({
        id: item.id,
        name: item.mname,
        artists: [item.sname],
        picUrl: this.toProxyUrl(item.pic),
        cid: item.sid,
        url: {
          "128k": item.mp3,
          headers: {},
        },
        sourceId: "",
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
    const response = await this.fetch(url);
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
          picUrl: this.toProxyUrl(song.pic),
          cid: song.sid,
          sourceId: "",
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
    const response = await this.fetch(url);
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
          picUrl: this.toProxyUrl(song.pic),
          cid: song.sid,
          sourceId: "",
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
    form.append("act", "songinfo");
    form.append("id", item.id);
    const response = await this.fetch(url, {
      method: "POST",
      body: form,
    });
    const json = await response.json();

    return {
      "128k": json.data.mp3,
      lyric: json.data.lrc,
      headers: {},
    };
  }
  async getLyric(item) {
    return null;
  }
}

export default TestSongExtension;
