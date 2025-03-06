import { BookExtension } from './index';

class TestBookExtension extends BookExtension {
  id = 'testBook';
  name = 'testBook';
  version = '0.0.1';
  baseUrl = 'https://www.deqixs.com/';

  async getRecommendBooks(pageNo, type) {
    let items = [
      {
        name: '最近更新',
        url: `${this.baseUrl}xiaoshuo/1-`,
      },
      {
        name: '热门小说',
        url: `${this.baseUrl}xiaoshuo/2-`,
      },
    ];
    if (!type) {
      return items.map((item) => ({
        id: item.url,
        type: item.name,
        list: [],
        page: pageNo,
        sourceId: '',
      }));
    }
    const item = items.find((item) => item.name === type);
    if (!item) return null;
    pageNo = pageNo || 1;
    let url = `${item.url}${pageNo}.html`;
    if (pageNo === 1 && item.name === '最近更新') {
      url = `${this.baseUrl}xiaoshuo/`;
    }
    const document = await this.fetchDom(url, {
      verify: false,
      headers: {
        referer: this.baseUrl,
      },
    });

    const list = await this.queryBookElements(document, {
      element: '.container .item',
      title: 'h3 a',
      cover: 'img',
      tags: '.itemtxt p:first-of-type span',
      latestChapter: 'ul li a',
      url: 'h3 a',
    });

    let totalPage = pageNo;
    const pageElement = document.querySelector('.page ul li span');
    if (pageElement) {
      totalPage = Number(pageElement.textContent.split('/').pop());
    }

    return {
      list: list,
      page: pageNo,
      totalPage,
      type: item.name,
      sourceId: '',
    };
  }

  async search(keyword, pageNo) {
    const url = `${this.baseUrl}tag/?key=${keyword}`;
    const document = await this.fetchDom(url);
    console.log(document);

    const list = await this.queryBookElements(document, {
      element: '.container .item',
      title: 'h3 a',
      cover: 'img',
      tags: '.itemtxt p:first-of-type span',
      latestChapter: 'ul li a',
      url: 'h3 a',
    });

    let totalPage = pageNo;
    const pageElement = document.querySelector('.page ul li span');
    if (pageElement) {
      totalPage = Number(pageElement.textContent.split('/').pop());
    }

    return {
      list: list,
      page: pageNo,
      totalPage,
      sourceId: '',
    };
  }

  async getBookDetail(item) {
    let url = item.url;
    let hasNextPage = true;
    const chapters = [];
    while (hasNextPage) {
      hasNextPage = false;

      const document = await this.fetchDom(url);
      const elements = document.querySelectorAll('#list ul li a');
      elements.forEach((element) => {
        const url = this.urlJoin(this.baseUrl, element.getAttribute('href'));
        chapters.push({
          id: url,
          title: element.textContent.trim(),
          url: url,
        });
      });
      const nextElements = document.querySelectorAll('#pages a');
      nextElements.forEach((element) => {
        if (
          element.textContent.trim() === '下一页' &&
          element.getAttribute('href')
        ) {
          url = this.urlJoin(this.baseUrl, element.getAttribute('href'));
          hasNextPage = true;
        }
      });
    }
    item.chapters = chapters;
    return item;
  }

  async getContent(item, chapter) {
    let url = chapter.url;
    let hasNext = false;
    let res = '';
    do {
      hasNext = false;
      const document = await this.fetchDom(url);
      const contentElements = document.querySelectorAll('.con p');
      contentElements.forEach((element) => {
        res += element.textContent.trim() + '\n';
      });
      const nextElements = document.querySelectorAll('.prenext a');
      nextElements.forEach((element) => {
        if (
          element.textContent.trim() === '下一页' &&
          element.getAttribute('href')
        ) {
          url = this.urlJoin(this.baseUrl, element.getAttribute('href'));
          hasNext = true;
        }
      });
    } while (hasNext);
    return res;
  }
}

export default TestBookExtension;
