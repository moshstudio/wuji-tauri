import { VideoExtension } from './index';

class TestVideoExtension extends VideoExtension {
  id = 'testVideo';
  name = 'testVideo';
  version = '0.0.1';
  baseUrl = 'https://www.66s6.net/';
  headers = {
    'Upgrade-Insecure-Requests': '1',
    Origin: 'https://www.66s6.net',
    Host: 'www.66s6.net',
    Referer: 'https://www.66s6.net/',
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: '*/*',
  };
  searchIds = {};
  async getRecommendVideos(pageNo, type) {
    let items = [
      {
        name: '首页',
        tag: '',
      },
      {
        name: '喜剧',
        tag: 'xijupian',
      },
      {
        name: '动作',
        tag: 'dongzuopian',
      },
      {
        name: '爱情',
        tag: 'aiqingpian',
      },
      {
        name: '科幻',
        tag: 'kehuanpian',
      },
    ];
    if (!type) {
      return items.map((item) => ({
        type: item.name,
        list: [],
        page: pageNo,
        totalPage: 1,
        sourceId: '',
      }));
    }
    const item = items.find((item) => item.name === type);
    if (!item) return null;
    pageNo = pageNo || 1;
    let url = `${this.baseUrl}${item.tag}/`;
    if (pageNo > 1) {
      url += `index_${pageNo}.html`;
    }
    const document = await this.fetchDom(url);
    const list = await this.queryVideoElements(document, {
      element: '#post_container li',
      cover: 'img',
      title: 'h2 a',
      url: 'h2 a',
      tag: '.info_category a',
      latestUpdate: '.info_date',
    });

    const pageElements = document.querySelectorAll('.pagination a');
    return {
      list,
      page: pageNo,
      totalPage: this.maxPageNoFromElements(pageElements),
    };
  }

  async search(keyword, pageNo) {
    pageNo ||= 1;
    let document;
    if (pageNo === 1 || !this.searchIds[keyword]) {
      const url = `${this.baseUrl}/e/search/1index.php`;
      const body = `show=title&tempid=1&tbname=article&mid=1&dopost=search&submit=&keyboard=${keyword}`;
      const response = await this.fetch(url, {
        method: 'POST',
        body: body,
        headers: this.headers,
      });
      const text = await response.text();
      const searchId = URL.parse(response.url).searchParams.get('searchid');
      if (!searchId) return null;
      this.searchIds[keyword] = searchId;
      document = new DOMParser().parseFromString(text, 'text/html');
    } else {
      const url = `${this.baseUrl}e/search/result/?page=${pageNo}&searchid=${this.searchIds[keyword]}`;
      document = await this.fetchDom(url);
    }
    const list = await this.queryVideoElements(document, {
      element: '#post_container li',
      cover: 'img',
      title: 'h2 a',
      url: 'h2 a',
      tag: '.info_category a',
      latestUpdate: '.info_date',
    });

    const pageElements = document.querySelectorAll('.pagination a');
    return {
      list,
      page: pageNo,
      totalPage: this.maxPageNoFromElements(pageElements),
    };
  }

  async getVideoDetail(item, pageNo) {
    pageNo ||= 1;
    const document = await this.fetchDom(item.url, { headers: this.headers });
    const pElements = Array.from(
      document.querySelectorAll('#post_content p').values()
    );
    let infoIndex = null;
    pElements.forEach((p, index) => {
      const text = p.textContent;
      if (text.includes('译　　名')) {
        infoIndex = index;
        const infos = p.textContent
          .replace(/\r?\n|\r/g, '', '')
          .split('◎')
          .map((info) => info.trim());

        if (infos.find((i) => i.startsWith('年　　代'))) {
          item.releaseDate = infos
            .find((i) => i.startsWith('年　　代'))
            .substring(5);
        }
        if (infos.find((i) => i.startsWith('产　　地'))) {
          item.country = infos
            .find((i) => i.startsWith('产　　地'))
            .substring(5);
        }
        if (infos.find((i) => i.startsWith('片　　长'))) {
          item.duration = infos
            .find((i) => i.startsWith('片　　长'))
            .substring(5);
        }
        if (infos.find((i) => i.startsWith('导　　演'))) {
          item.director = infos
            .find((i) => i.startsWith('导　　演'))
            .substring(5);
        }
        if (infos.find((i) => i.startsWith('主　　演'))) {
          item.cast = infos.find((i) => i.startsWith('主　　演')).substring(5);
        }
        if (infos.find((i) => i.startsWith('类　　别'))) {
          item.tags = infos.find((i) => i.startsWith('类　　别')).substring(5);
        }
      }
    });
    if (infoIndex !== null) {
      let introP = pElements[infoIndex + 1];
      if (!introP?.textContent || introP.textContent.includes('简　　介')) {
        introP = pElements[infoIndex + 2];
      }
      item.intro = introP?.textContent.trim();
    }

    const widgets = document.querySelectorAll('.context .widget.box.row');
    const resources = [];
    widgets.forEach((widget) => {
      const title = widget.querySelector('h3')?.textContent;
      if (!title) return;
      const resource = {
        id: title,
        title: title,
        episodes: [],
      };
      const elements = widget.querySelectorAll('a[title]');
      elements.forEach((element) => {
        const url = this.urlJoin(this.baseUrl, element.getAttribute('href'));
        resource.episodes.push({
          id: url,
          title: element.textContent,
          url: url,
        });
      });

      resources.push(resource);
    });
    item.resources = resources;
    return item;
  }

  async getPlayUrl(item, resource, episode) {
    const document = await this.fetchDom(episode.url, {
      headers: this.headers,
    });
    const iframe = document.querySelector('.video iframe');
    let domExtractedUrl = '';
    if (iframe) {
      const url = iframe.getAttribute('src');
      const doc = await this.fetchDom(url);
      const scripts = doc.querySelectorAll('script');

      scripts.forEach((script) => {
        if (script.textContent.includes('url:')) {
          const urlMatch = script.textContent.match(/url:\s*'([^']+)'/);
          if (urlMatch) {
            domExtractedUrl = urlMatch[1];
          }
        }
      });
    } else {
      const scripts = document.querySelectorAll('script');
      scripts.forEach((script) => {
        if (script.textContent.includes('source:')) {
          // source: "
          const urlMatch = script.textContent.match(/source: "([^"]+)"/);
          if (urlMatch) {
            domExtractedUrl = urlMatch[1];
          }
        }
      });
    }
    return { url: domExtractedUrl };
  }
}

export default TestVideoExtension;
