import { VideoExtension } from './index';

class TestVideoExtension extends VideoExtension {
  id = 'testVideo';
  name = 'testVideo';
  version = '0.0.1';
  baseUrl = 'https://www.hhlqilongzhu.cn/api/duanju_hema.php';
  async getRecommendVideos(pageNo, type) {
    return await this.search('系统', pageNo);
  }

  async search(keyword, pageNo) {
    const url = `${this.baseUrl}?name=${keyword}&page=${pageNo}`;
    const response = await this.fetch(url);
    const json = await response.json();
    const list = [];
    json.data.forEach((element) => {
      list.push({
        id: element.book_id,
        title: element.title,
        intro: element.intro,
        cover: element.cover,
        cast: element.author,
        tags: element.type?.map((v) => v.name).join(','),
      });
    });
    return {
      list,
      page: pageNo,
      totalPage: json.total_page,
    };
  }

  async getVideoDetail(item, pageNo) {
    const url = `${this.baseUrl}?book_id=${item.id}`;
    const response = await this.fetch(url);
    const json = await response.json();
    const resources = [
      {
        id: item.id,
        title: '播放列表',
        episodes: [],
      },
    ];
    json.data.forEach((e) => {
      resources[0].episodes.push({
        id: e.video_id,
        title: e.title,
        url: e.url_mp4,
      });
    });

    item.resources = resources;
    return item;
  }

  async getPlayUrl(item, resource, episode) {
    const response = await this.fetch(episode.url);
    return {
      url: await this.getProxyUrl(response.url, { referer: response.url }),
    };
  }
}

export default TestVideoExtension;
