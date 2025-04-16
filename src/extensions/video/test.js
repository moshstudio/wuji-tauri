import { VideoExtension } from './index';

class TestVideoExtension extends VideoExtension {
  id = 'testVideo';
  name = 'testVideo';
  version = '0.0.1';
  baseUrl = 'https://jiandantv.com/';
  async getRecommendVideos(pageNo, type) {
    return null;
  }

  async search(keyword, pageNo) {
    pageNo ||= 1;
    const url = `${this.baseUrl}?key=${keyword}`;
    const document = await this.fetchDom(url);
    const list = await this.queryVideoElements(document, {
      element: '.notifications-container',
      cover: 'img',
      title: 'h1 a',
      url: 'h1 a',
      intro: '.scc',
      tags: '.scc1',
      latestUpdate: '.success-prompt-prompt p:nth-child(2)',
    });

    list.forEach((item) => {
      if (item?.latestUpdate.includes('|')) {
        item.latestUpdate = item.latestUpdate.split('|').pop().trim();
      }
    });

    return {
      list,
      page: pageNo,
      totalPage: 1,
    };
  }

  async getVideoDetail(item, pageNo) {
    pageNo ||= 1;
    const document = await this.fetchDom(item.url);
    const element = document.querySelector('.videolists');
    const sourceName = element.querySelector('.listclass span')?.textContent;
    const episodeElements = element.querySelectorAll(
      '.listcontent a[data-url]',
    );
    const episodes = [];
    episodeElements.forEach((a) => {
      const url = a.getAttribute('data-url');
      if (url) {
        episodes.push({
          id: url,
          title: a.textContent,
          url: url,
        });
      }
    });
    item.resources = [
      {
        id: sourceName,
        title: sourceName,
        episodes: episodes,
      },
    ];
    return item;
  }

  async getPlayUrl(item, resource, episode) {
    console.log(episode.url);

    return { url: await this.getM3u8ProxyUrl(episode.url) };
  }
}

export default TestVideoExtension;
