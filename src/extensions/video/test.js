import { VideoExtension } from './index';

class TestVideoExtension extends VideoExtension {
  id = 'testVideo';
  name = 'testVideo';
  version = '0.0.1';
  baseUrl = 'https://yang-1989.eu.org/';
  ua = '(Windows NT 10.0; Win64; x64) PotPlayer/25.02.26';
  channels = [
    {
      id: 'https://tv.iill.top/m3u/Gather',
      title: '电视直播',
      cover: 'https://image-bed.s3.bitiful.net/tv.png?no-wait=on',
      url: 'https://tv.iill.top/m3u/Gather',
    },
    {
      id: 'https://tv.iill.top/m3u/Live',
      title: '网络直播',
      cover: 'https://image-bed.s3.bitiful.net/platform.jpg?no-wait=on',
      url: 'https://tv.iill.top/m3u/Live',
    },
    {
      id: 'https://github.moeyy.xyz/https://iptv-org.github.io/iptv/index.m3u',
      title: '国外直播IPTV',
      cover:
        'https://q8.itc.cn/images01/20240220/9ca41439dde44af2b5ea707c15348d2b.png',
      url: 'https://github.moeyy.xyz/https://iptv-org.github.io/iptv/index.m3u',
    },
    {
      id: 'https://github.moeyy.xyz/https://raw.githubusercontent.com/Guovin/iptv-api/gd/output/ipv4/result.m3u',
      title: '网络电视IPTV',
      cover: 'https://image-bed.s3.bitiful.net/iptv.jpg?no-wait=on',
      url: 'https://github.moeyy.xyz/https://raw.githubusercontent.com/Guovin/iptv-api/gd/output/ipv4/result.m3u',
    },
  ];

  async getRecommendVideos(pageNo, type) {
    const list = [...this.channels];
    return {
      list,
      page: pageNo,
      totalPage: 1,
      sourceId: '',
    };
  }

  async search(keyword, pageNo) {
    const list = [];
    for (const channel of this.channels) {
      if (channel.name.includes(keyword) || channel.url.includes(keyword)) {
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
    pageNo ||= 1;
    const response = await this.fetch(item.url, {
      headers: { 'user-agent': this.ua },
    });
    const text = await response.text();
    const parser = new this.m3u8Parser.Parser();
    parser.push(text);
    parser.end();
    const resources = {};
    for (const segment of parser.manifest.segments) {
      if (!segment.title || !segment.uri) {
        continue;
      }
      if (segment.uri.startsWith('rtsp://')) {
        // 不支持rtsp
        continue;
      }

      const tvgNameMatch = segment.title?.match(/tvg-name="([^"]*)"/);
      let tvgName = tvgNameMatch ? tvgNameMatch[1] : null;
      if (!tvgName) {
        tvgName = segment.title.split(',').pop();
        if (tvgName.length > 10) {
          const n = tvgName.length;
          tvgName = tvgName.substring(n - 11, n - 1);
        }
      }

      // 提取 group-title
      const groupTitleMatch = segment.title.match(/group-title="([^"]*)"/);
      const groupTitle = groupTitleMatch ? groupTitleMatch[1] : null;
      if (
        !tvgName
        || tvgName.includes('免费订阅')
        || tvgName.includes('查看重要信息')
      ) {
        continue;
      }
      if (!resources[groupTitle]) {
        resources[groupTitle] = {
          id: groupTitle,
          title: groupTitle,
          episodes: [],
        };
      }
      resources[groupTitle].episodes.push({
        id: segment.uri,
        title: tvgName,
        url: segment.uri,
      });
    }
    item.resources = Object.values(resources);
    return item;
  }

  async getPlayUrl(item, resource, episode) {
    const channel = this.channels.find(c => c.id === item.id);

    // return {
    //   url: episode.url,
    //   isLive: true,
    // };
    // if (channel.ipv6) {
    //   return {
    //     url: episode.url,
    //     isLive: true,
    //   };
    // }
    return {
      url: await this.getProxyServerUrl(episode.url, { 'user-agent': this.ua }),
      isLive: true,
    };
  }
}

export default TestVideoExtension;
