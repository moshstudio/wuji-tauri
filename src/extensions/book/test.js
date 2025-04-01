import { BookExtension } from './index';

class TestBookExtension extends BookExtension {
  id = 'testBook';
  name = 'testBook';
  version = '0.0.1';
  baseUrl = 'https://www.mayi93.com/';

  async getRecommendBooks(pageNo, type) {
    let items = [
      {
        name: '全部',
        tag: `1-a-a-a-a-{pageNo}`,
      },
      {
        name: '玄幻',
        tag: `1-1-a-a-a-{pageNo}`,
      },
      {
        name: '女生',
        tag: `1-94-a-a-a-{pageNo}`,
      },
      {
        name: '幻言',
        tag: `1-93-a-a-a-{pageNo}`,
      },
      {
        name: '古言',
        tag: `1-92-a-a-a-{pageNo}`,
      },
      {
        name: '体育',
        tag: `1-91-a-a-a-{pageNo}`,
      },
      {
        name: '武侠',
        tag: `1-90-a-a-a-{pageNo}`,
      },
      {
        name: '奇幻',
        tag: `1-89-a-a-a-{pageNo}`,
      },
      {
        name: '都市',
        tag: `1-2-a-a-a-{pageNo}`,
      },
      {
        name: '仙侠',
        tag: `1-3-a-a-a-{pageNo}`,
      },
      {
        name: '言情',
        tag: `1-4-a-a-a-{pageNo}`,
      },
      {
        name: '穿越',
        tag: `1-5-a-a-a-{pageNo}`,
      },
      {
        name: '游戏',
        tag: `1-6-a-a-a-{pageNo}`,
      },
      {
        name: '科幻',
        tag: `1-7-a-a-a-{pageNo}`,
      },
      {
        name: '悬疑',
        tag: `1-9-a-a-a-{pageNo}`,
      },
      {
        name: '灵异',
        tag: `1-10-a-a-a-{pageNo}`,
      },
      {
        name: '历史',
        tag: `1-11-a-a-a-{pageNo}`,
      },
      {
        name: '青春',
        tag: `1-12-a-a-a-{pageNo}`,
      },
      {
        name: '军事',
        tag: `1-13-a-a-a-{pageNo}`,
      },
      {
        name: '竞技',
        tag: `1-14-a-a-a-{pageNo}`,
      },
      {
        name: '现言',
        tag: `1-15-a-a-a-{pageNo}`,
      },
      {
        name: '其他',
        tag: `1-16-a-a-a-{pageNo}`,
      },
    ];
    if (!type) {
      return items.map((item) => ({
        id: item.tag,
        type: item.name,
        list: [],
        page: pageNo,
        sourceId: '',
      }));
    }
    const item = items.find((item) => item.name === type);
    if (!item) return null;
    pageNo = pageNo || 1;
    let url = `${this.baseUrl}book/store/${item.tag.replace('{pageNo}', pageNo)}`;
    const document = await this.fetchDom(url);

    const list = await this.queryBookElements(document, {
      element: '.bookList li',
      cover: 'img',
      title: '.bookNm',
      author: '.authorNm',
      intro: '.bookIntro',
      url: '.bookNm',
      tags: '.classifyLt',
    });
    const pageElements = document.querySelectorAll('#pageForm a');

    return {
      list,
      page: pageNo,
      totalPage: this.maxPageNoFromElements(pageElements),
      type: item.name,
      sourceId: '',
    };
  }

  async search(keyword, pageNo) {
    const url = `${this.baseUrl}book/store?q=${keyword}`;
    const document = await this.fetchDom(url);
    const list = await this.queryBookElements(document, {
      element: '.bookList li',
      cover: 'img',
      title: '.bookNm',
      author: '.authorNm',
      intro: '.bookIntro',
      url: '.bookNm',
      tags: '.classifyLt',
    });
    return {
      list,
      page: pageNo,
      totalPage: 1,
      sourceId: '',
    };
  }

  async getBookDetail(item) {
    let url = item.url;
    const document = await this.fetchDom(url);
    const chapters = [];

    let elements = Array.from(document.querySelectorAll('.lf.lfT a[href]'));
    elements.forEach((element) => {
      const url = this.urlJoin(this.baseUrl, element.getAttribute('href'));
      chapters.push({
        id: url,
        title: element.textContent.trim(),
        url: url,
      });
    });
    item.chapters = chapters;
    return item;
  }

  async getContent(item, chapter) {
    let url = chapter.url;
    const document = await this.fetchDom(url);
    let articleContent = document.querySelector('.read_details');
    return this.getContentText(articleContent);
  }
  
  getContentText = (element) => {
    if (!element) return '';
    let text = '';
    for (const child of element.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        text += child.textContent + '\n';
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        text += this.getContentText(child) + '\n';
      }
    }
    return text.trim();
  };
}

export default TestBookExtension;
