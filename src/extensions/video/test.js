import { VideoExtension } from './index';

class TestVideoExtension extends VideoExtension {
  id = 'testVideo';
  name = 'testVideo';
  version = '0.0.1';
  baseUrl = 'https://www.duse0.com/';
  async getRecommendVideos(pageNo, type) {
    const items = [
      {
        name: '电影',
        tag: 'show/1-----3-{pageNo}.html',
      },
      {
        name: '连续剧',
        tag: 'show/2-----3-{pageNo}.html',
      },
      {
        name: '动漫',
        tag: 'show/3-----3-{pageNo}.html',
      },
      {
        name: '综艺记录',
        tag: 'show/4-----3-{pageNo}.html',
      },
      {
        name: '短剧',
        tag: 'show/6-----3-{pageNo}.html',
      },
    ];
    if (!type) {
      return items.map((item) => ({
        id: this.urlJoin(this.baseUrl, item.tag),
        type: item.name,
        list: [],
        page: pageNo,
        totalPage: 1,
        sourceId: '',
      }));
    }
    const item = items.find((item) => item.name === type);
    pageNo ||= 1;
    const url = this.urlJoin(
      this.baseUrl,
      item.tag.replace('{pageNo}', pageNo)
    );
    const document = await this.fetchDom(url);
    const list = await this.queryVideoElements(document, {
      element: '.main .module-item',
      cover: 'img:nth-child(2)',
      coverDomain: 'https://vres1.ipvav.cn/',
      title: '.v-item-title:nth-child(2)',
      url: 'a',
    });
    const pageElements = Array.from(
      document.querySelectorAll('.pagenation-box a').values()
    );
    return {
      list,
      page: pageNo,
      totalPage: pageElements.find((a) => a.textContent.includes('下一页'))
        ? pageNo + 1
        : pageNo,
      type: item.name,
      sourceId: '',
    };
  }

  async search(keyword, pageNo) {
    const url = `${this.baseUrl}search?k=${keyword}&page=${pageNo}&os=pc`;
    const document = await this.fetchDom(url);

    const list = await this.queryVideoElements(document, {
      element: '.search-result-list a',
      cover: 'img:nth-child(1)',
      coverDomain: 'https://vres1.ipvav.cn/',
      title: '.title',
      url: '',
    });
    const pageElements = Array.from(
      document.querySelectorAll('.pagenation-box a').values()
    );

    return {
      list,
      page: pageNo,
      totalPage: pageElements.find((a) => a.textContent.includes('下一页'))
        ? pageNo + 1
        : pageNo,
      sourceId: '',
    };
  }

  async getVideoDetail(item, pageNo) {
    pageNo ||= 1;
    const document = await this.fetchDom(item.url);

    item.intro = document.querySelector('.detail-desc p')?.textContent.trim();
    const rows = Array.from(
      document.querySelectorAll('.detail-info-row').values()
    );
    item.director = rows[0].querySelector('.detail-info-row-main')?.textContent;
    item.cast = rows[1].querySelector('.detail-info-row-main')?.textContent;

    const tagElements = Array.from(
      document.querySelectorAll('.detail-tags a').values()
    );
    item.releaseDate = tagElements[0]?.textContent;
    item.country = tagElements[1]?.textContent;
    if (tagElements.length > 2) {
      item.tags = tagElements
        .slice(2)
        .map((a) => a.textContent)
        .join('');
    }
    const resources = [];
    const sourceNames = Array.from(
      document
        .querySelectorAll('.episode-box .swiper-slide .source-item span')
        .values()
    ).map((a) => a.textContent);
    const episodeElements = Array.from(
      document.querySelectorAll('.episode-box-main .episode-list').values()
    );
    sourceNames.forEach((sourceName, index) => {
      const episodeElement = episodeElements[index];
      if (!episodeElement) return;
      const episodes = [];
      episodeElement.querySelectorAll('a[href]').forEach((a) => {
        const url = this.urlJoin(this.baseUrl, a.getAttribute('href'));
        episodes.push({
          id: url,
          title: a.textContent,
          url: url,
        });
      });
      resources.push({
        id: sourceName,
        title: sourceName,
        episodes: episodes,
      });
    });
    item.resources = resources;
    return item;
  }

  async getPlayUrl(item, resource, episode) {
    const response = await this.fetch(episode.url);
    const text = await response.text();

    const regex = /const\s*playSource\s*=\s*([^;]+);/;
    const match = text.match(regex);
    if (match && match[1]) {
      const func = new Function('return ' + match[1]);
      const playSource = func();

      if (!playSource) {
        return null;
      }
      if (playSource.src) {
        return { url: playSource.src };
      } else {
        return { url: playSource };
      }
    }
  }
}

export default TestVideoExtension;
