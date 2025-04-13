import { BookExtension } from './index';

class TestBookExtension extends BookExtension {
  id = 'testBook';
  name = 'testBook';
  version = '0.0.1';
  baseUrl = 'https://hotxww.com/';

  async getRecommendBooks(pageNo, type) {
    const items = [
      {
        name: '玄幻魔法',
        tag: `sort/xuanhuan/{pageNo}/`,
      },
      {
        name: '武侠修真',
        tag: `sort/wuxia/{pageNo}/`,
      },
      {
        name: '历史军事',
        tag: `sort/lishi/{pageNo}/`,
      },
      {
        name: '科幻灵异',
        tag: `sort/kehuan/{pageNo}/`,
      },
      {
        name: '游戏竞技',
        tag: `sort/youxi/{pageNo}/`,
      },
      {
        name: '女生耽美',
        tag: `sort/nvsheng/{pageNo}/`,
      },
      {
        name: '其他类型',
        tag: `sort/qita/{pageNo}/`,
      },
    ];
    if (!type) {
      return items.map(item => ({
        id: item.tag,
        type: item.name,
        list: [],
        page: pageNo,
        sourceId: '',
      }));
    }
    const item = items.find(item => item.name === type);
    if (!item)
      return null;
    pageNo = pageNo || 1;
    const url = `${this.baseUrl}${item.tag.replace('{pageNo}', pageNo)}`;
    const document = await this.fetchDom(url);
    const list = await this.queryBookElements(document, {
      element: '.list_center dl',
      cover: 'img',
      title: 'h3 a',
      intro: '.book_des',
      url: 'h3 a',
    });
    const pageElements = document.querySelectorAll('.pages a[href]');

    return {
      list,
      page: pageNo,
      totalPage: this.maxPageNoFromElements(pageElements),
      type: item.name,
      sourceId: '',
    };
  }

  async search(keyword, pageNo) {
    const url = `${this.baseUrl}search/`;
    const form = new FormData();
    form.append('searchkey', keyword);
    const document = await this.fetchDom(url, {
      method: 'POST',
      body: form,
    });

    const list = await this.queryBookElements(document, {
      element: '.list_center dl',
      cover: 'img',
      title: 'h3 a',
      intro: '.book_des',
      url: 'h3 a',
    });
    const pageElements = document.querySelectorAll('.pages a[href]');

    return {
      list,
      page: pageNo,
      totalPage: this.maxPageNoFromElements(pageElements),
      sourceId: '',
    };
  }

  async getBookDetail(item) {
    const url = item.url;
    const document = await this.fetchDom(url);
    item.author = document.querySelector('.p_author a')?.textContent;
    const chapters = await this.queryChapters(document, {
      element: '#chapterList a[href]',
    });
    item.chapters = chapters;
    return item;
  }

  async getContent(item, chapter) {
    let url = chapter.url;
    let res = '';
    do {
      const document = await this.fetchDom(url);
      const pElements = document.querySelectorAll('#TextContent p');
      pElements.forEach((element) => {
        res += `${element.textContent}\n`;
      });
      const nextPageElement = document.querySelector('#next_url');
      if (nextPageElement?.textContent === '下一页') {
        url = this.urlJoin(this.baseUrl, nextPageElement.getAttribute('href'));
      }
      else {
        url = null;
      }
    } while (url);
    return res;
  }
}

export default TestBookExtension;
