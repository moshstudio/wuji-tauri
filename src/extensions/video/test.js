import { VideoExtension } from './index';

class TestVideoExtension extends VideoExtension {
  id = 'testVideo';
  name = 'testVideo';
  version = '0.0.1';
  baseUrl = 'https://v.contentchina.com/';
  recommands = null;
  async getRecommendVideos(pageNo, type) {
    if (!this.recommands) {
      const response = await this.fetch(
        `https://sp-api.contentchina.com/website/v1/index`,
      );
      this.recommands = await response.json();
    }
    if (!type) {
      const items = this.recommands.data.categories_list.map((item, index) => {
        return {
          id: index,
          type: item.title,
        };
      });
      return items;
    }
    const items = this.recommands.data.categories_list
      .find((item) => item.title === type)
      .list.map((item) => {
        return {
          id: `https://v.contentchina.com/play/${item.serial_id}.html`,
          title: item.title,
          cover: item.cover_url,
          coverHeaders: {},
          url: `https://v.contentchina.com/play/${item.serial_id}.html`,
          tags: item.categories,
          intro: item.introduction,
        };
      });

    return {
      list: items,
      page: pageNo,
      totalPage: 1,
      type,
    };
  }

  async search(keyword, pageNo) {
    return null;
  }

  async getVideoDetail(item, pageNo) {
    pageNo ||= 1;
    const document = await this.fetchDom(item.url, { verify: false });
    const scripts = document.querySelectorAll('script');

    for (let script of scripts) {
      if (script.textContent.includes('window.__NUXT__')) {
        eval(script.textContent);
      }
    }
    item.resources = window.__NUXT__.data.map((resource, index) => {
      return {
        id: index,
        title: '播放地址' + (index === 0 ? '' : index + 1),
        episodes: resource.episodeList.map((episode) => {
          return {
            id: episode.vid,
            title: episode.title,
            url:
              episode.play_url ||
              episode.play_url_list.H264 ||
              episode.play_url_list.H265,
          };
        }),
      };
    });
    return item;
  }

  async getPlayUrl(item, resource, episode) {
    return {
      url: episode.url,
      headers: { referer: this.baseUrl },
    };
  }
}

export default TestVideoExtension;
