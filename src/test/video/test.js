import { VideoExtension } from '@wuji-tauri/source-extension';

class TestVideoExtension extends VideoExtension {
  id = 'testVideo';
  name = 'IPTV';

  constructor() {
    super();
    this.baseUrl = 'https://github.com/Guovin/iptv-api';
    this.headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko',
      Accept: '*/*',
    };

    this.channels = [
      {
        id: 'https://raw.githubusercontent.com/Guovin/iptv-api/gd/output/ipv4/result.m3u',
        title: 'IPTV',
        cover: 'https://image-bed.moshangwangluo.com/tv.png',
        url: 'https://raw.githubusercontent.com/Guovin/iptv-api/gd/output/ipv4/result.m3u',
      },
    ];
  }
  async getRecommendVideos(pageNo, type) {
    const list = [...this.channels];
    return {
      list,
      page: pageNo,
      totalPage: 1,
    };
  }

  async search(keyword, pageNo) {
    const list = [];
    for (const channel of this.channels) {
      if (channel.title.includes(keyword) || channel.url.includes(keyword)) {
        list.push(channel);
      }
    }
    return {
      list,
      page: pageNo,
      totalPage: 1,
      sourceId: '',
    };
  }

  async getVideoDetail(item, pageNo) {
    const response = await this.fetch(item.url, {
      headers: this.headers,
      verify: false,
    });
    const text = await response.text();
    const lines = text.split('\n');
    const resources = [];
    for (let line of lines) {
      line = line.trim();
      if (line.startsWith('★')) {
        resources.unshift({});
        const title = line.split(',')[0].replace('★', '').trim();
        resources[0].title = title;
        resources[0].episodes = [];
      } else if (line.includes('http')) {
        let [eNmae, eUrl] = line.split(',');
        eUrl = eUrl.split('$A')[0].trim();
        resources[0].episodes.push({
          id: eUrl,
          title: eNmae,
        });
      }
    }

    item.resources = resources.reverse();
    return item;
  }

  async getPlayUrl(item, resource, episode) {
    const response = await this.fetch(episode.id, {
      maxRedirections: 0,
      headers: this.headers,
    });
    const url = response.url;
    return {
      url: url,
      isLive: true,
    };
  }
}

export default TestVideoExtension;
