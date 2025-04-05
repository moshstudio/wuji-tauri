import { VideoExtension } from './index';

class TestVideoExtension extends VideoExtension {
  id = 'testVideo';
  name = 'testVideo';
  version = '0.0.1';
  baseUrl = 'http://hscangku.com/';
  newUrl = null;
  async getRecommendVideos(pageNo, type) {
    await this.initUrl();
    if (!this.newUrl) return null;
    const items = [
      {
        name: '日韩',
        tag: 'vodtype/1-{pageNo}.html',
      },
      {
        name: '国产',
        tag: 'vodtype/2-{pageNo}.html',
      },
      {
        name: '欧美',
        tag: 'vodtype/3-{pageNo}.html',
      },
      {
        name: '动漫',
        tag: 'vodtype/4-{pageNo}.html',
      },
    ];
    if (!type) {
      return items.map((item) => ({
        id: item.tag,
        type: item.name,
        list: [],
        page: pageNo,
        totalPage: 1,
        sourceId: '',
      }));
    }

    const item = items.find((item) => item.name === type);
    pageNo ||= 1;
    const url = this.urlJoin(this.newUrl, item.tag.replace('{pageNo}', pageNo));
    const document = await this.fetchDom(url);

    const list = (
      await this.queryVideoElements(document, {
        element: '.stui-vodlist li',
        cover: 'a[data-original]',
        title: 'h4 a',
        url: 'h4 a',
        tags: '.sub ',
        baseUrl: this.newUrl,
      })
    ).filter((item) => item.url.includes('vodplay'));

    const pageElements = document.querySelectorAll('.stui-page a[href]');
    return {
      list,
      page: pageNo,
      totalPage: this.maxPageNoFromElements(pageElements),
      type: item.name,
      sourceId: '',
    };
  }

  async search(keyword, pageNo) {
    await this.initUrl();
    if (!this.newUrl) return null;
    const url = `${this.newUrl}vodsearch/${keyword}----------${pageNo}---.html`;
    const document = await this.fetchDom(url);

    const list = (
      await this.queryVideoElements(document, {
        element: '.stui-vodlist li',
        cover: 'a[data-original]',
        title: 'h4 a',
        url: 'h4 a',
        tags: '.sub .number',
        baseUrl: this.newUrl,
      })
    ).filter((item) => item.url.includes('vodplay'));

    const pageElements = document.querySelectorAll('.stui-page a[href]');
    return {
      list,
      page: pageNo,
      totalPage: this.maxPageNoFromElements(pageElements),
      sourceId: '',
    };
  }

  async getVideoDetail(item, pageNo) {
    await this.initUrl();
    if (!this.newUrl) return null;
    pageNo ||= 1;
    const document = await this.fetchDom(item.url);
    const scripts = document.querySelectorAll('script');
    let playerObj = null;

    // 遍历script标签查找目标对象
    for (let script of scripts) {

      if (script.textContent.includes('var player_aaaa=')) {
        // 提取对象定义部分
        const start = script.textContent.indexOf('{');
        const end = script.textContent.lastIndexOf('}') + 1;
        const jsonStr = script.textContent.slice(start, end);

        try {
          playerObj = JSON.parse(jsonStr);
          break;
        } catch (e) {
          console.error('解析JSON失败:', e);
        }
      }
    }

    item.resources = [
      {
        episodes: [
          {
            id: playerObj.url,
            title: '播放地址',
            url: playerObj.url,
          },
        ],
      },
    ];
    return item;
  }

  async getPlayUrl(item, resource, episode) {
    return { url: episode.url };
  }
  async initUrl() {
    const cache = localStorage.getItem('hscangku');
    if (cache) {
      if (Date.now() - JSON.parse(cache).ts < 1000 * 60 * 60 * 3) {
        this.newUrl = JSON.parse(cache).url;
        this.baseUrl = this.newUrl;
        return;
      }
    }
    const response = await this.fetch(this.baseUrl);
    const text = await response.text();
    var match = text.match(/strU=\"([^\"]+)\"/);
    if (!match || !match[1]) return;
    const directUrl = match[1] + this.baseUrl;
    const response2 = await this.fetch(directUrl);
    this.newUrl = response2.url;
    this.baseUrl = this.newUrl;
    localStorage.setItem(
      'hscangku',
      JSON.stringify({
        url: this.newUrl,
        ts: Date.now(),
      })
    );
  }
}

export default TestVideoExtension;
