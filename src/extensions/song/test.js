import { method } from 'lodash';
import { SongExtension } from '.';

class TestSongExtension extends SongExtension {
  id = 'testSong';
  name = 'testSong';
  version = '0.0.1';
  baseUrl = 'https://www.2t58.com/';
  async getRecommendPlaylists(pageNo) {
    pageNo ||= 1;
    const url = `${this.baseUrl}playtype/index/${pageNo}.html`;
    const document = await this.fetchDom(url);

    const list = await this.queryPlaylistElements(document, {
      element: '.video_list li',
      picUrl: 'img',
      name: '.name a',
      url: '.name a',
    });
    const pageElements = document?.querySelectorAll('.page a');

    return {
      list,
      page: pageNo,
      totalPage: this.maxPageNoFromElements(pageElements),
    };
  }
  async getRecommendSongs(pageNo) {
    pageNo ||= 1;
    const url = `${this.baseUrl}list/new/${pageNo}.html`;
    const document = await this.fetchDom(url);
    const list = await this.querySongElements(document, {
      element: '.play_list li',
      name: '.name a',
      url: '.name a',
    });
    list.forEach((item) => {
      if (item.name.includes('-') && item.name.split('-')[1].trim()) {
        const tmp = item.name.split('-');
        item.artists = [tmp[0].trim()];
        item.name = tmp[1].trim();
      }
    });
    const pageElements = document?.querySelectorAll('.page a');
    return {
      list,
      page: pageNo,
      totalPage: this.maxPageNoFromElements(pageElements),
    };
  }
  async searchPlaylists(keyword, pageNo) {
    return null;
  }
  async searchSongs(keyword, pageNo) {
    pageNo ||= 1;
    const url = `${this.baseUrl}so/${keyword}/${pageNo}.html`;
    const document = await this.fetchDom(url);
    const list = await this.querySongElements(document, {
      element: '.play_list li',
      name: '.name a',
      url: '.name a',
    });
    list.forEach((item) => {
      if (item.name.includes('-') && item.name.split('-')[1].trim()) {
        const tmp = item.name.split('-');
        item.artists = [tmp[0].trim()];
        item.name = tmp[1].trim();
      }
    });
    const pageElements = document?.querySelectorAll('.page a');
    return {
      list,
      page: pageNo,
      totalPage: this.maxPageNoFromElements(pageElements),
    };
  }

  async getPlaylistDetail(item, pageNo) {
    pageNo ||= 1;
    const url = item.url.replace('.html', `${pageNo}.html`);
    const document = await this.fetchDom(url);
    item.desc = document?.querySelector('.info')?.textContent;
    const list = await this.querySongElements(document, {
      element: '.play_list li',
      name: '.name a',
      url: '.name a',
    });
    list.forEach((item) => {
      if (item.name.includes('-') && item.name.split('-')[1].trim()) {
        const tmp = item.name.split('-');
        item.artists = [tmp[1].trim()];
        item.name = tmp[0].trim();
      }
    });
    const pageElements = document?.querySelectorAll('.page a');
    item.list = {
      list,
      page: pageNo,
      totalPage: this.maxPageNoFromElements(pageElements),
    };

    return item;
  }

  async getSongUrl(item, size) {
    const id = new URL(item.url).pathname.split('/').pop().replace('.html', '');
    const url = `${this.baseUrl}js/play.php`;
    const form = new FormData();
    form.append('id', id);
    form.append('type', 'music');

    const response = await this.fetch(url, {
      method: 'POST',
      body: form,
    });
    const json = await response.json();
    return json.url;
  }
  async getLyric(item) {
    return null;
  }
}

export default TestSongExtension;
