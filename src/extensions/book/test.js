import { BookExtension } from './index';

class TestBookExtension extends BookExtension {
  id = 'testBook';
  name = 'testBook';
  version = '0.0.1';
  baseUrl = 'http://m.umixs.info/';
  initLoad = false;

  async getRecommendBooks(pageNo, type) {
    let items = [
      {
        name: '完结小说',
        url: `${this.baseUrl}quanben/pageNo.html`,
      },
      {
        name: '玄幻小说',
        url: `${this.baseUrl}class/1_pageNo.html`,
      },
      {
        name: '仙侠小说',
        url: `${this.baseUrl}class/2_pageNo.html`,
      },
      {
        name: '都市小说',
        url: `${this.baseUrl}class/3_pageNo.html`,
      },
      {
        name: '历史小说',
        url: `${this.baseUrl}class/4_pageNo.html`,
      },
      {
        name: '游戏小说',
        url: `${this.baseUrl}class/5_pageNo.html`,
      },
      {
        name: '科幻小说',
        url: `${this.baseUrl}class/6_pageNo.html`,
      },
      {
        name: '恐怖小说',
        url: `${this.baseUrl}class/7_pageNo.html`,
      },
      {
        name: '女生小说',
        url: `${this.baseUrl}class/8_pageNo.html`,
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
    if (!this.initLoad) {
      await this.fetch(this.baseUrl);
      this.initLoad = true;
    }
    pageNo = pageNo || 1;
    let url = item.url.replace('pageNo', pageNo);
    const document = await this.fetchDom(url, {
      verify: false,
    });
    console.log(document);

    const list = await this.queryBookElements(document, {
      element: '.bd li',
      title: 'a',
      tags: '.sort',
      url: 'a',
    });
    list.forEach((item) => {
      item.title = item.title.replace(/\[.*?\]/, '');
      if (item.title.includes(':')) {
        [item.author, item.title] = item.title.split(':');
      }
      if (item.title.includes('【')) {
        item.title = item.title.replace(/【(.*?)】/g, '$1');
      }
    });

    const pageElements = document.querySelectorAll('.pagelist option');
    return {
      list: list,
      page: pageNo,
      totalPage: this.maxPageNoFromElements(pageElements),
      type: item.name,
      sourceId: '',
    };
  }

  async search(keyword, pageNo) {
    if (!this.initLoad) {
      await this.fetch(this.baseUrl);
      this.initLoad = true;
    }
    const url = `${this.baseUrl}s.php`;
    const form = new FormData();
    form.append('s', keyword);
    const document = await this.fetchDom(url, { body: form, method: 'POST' });
    console.log(document);

    const list = await this.queryBookElements(document, {
      element: '.bd li',
      title: 'a',
      tags: '.sort',
      url: 'a',
    });
    list.forEach((item) => {
      item.title = item.title.replace(/\[.*?\]/, '');
      if (item.title.includes('(')) {
        [item.title, item.author] = item.title.split('(');
      }
      if (item.author.includes(')')) {
        item.author = item.author.replace(/\)/g, '');
      }
    });

    const pageElements = document.querySelectorAll('.pagelist option');
    return {
      list: list,
      page: pageNo,
      totalPage: this.maxPageNoFromElements(pageElements),
      sourceId: '',
    };
  }

  async getBookDetail(item) {
    if (!this.initLoad) {
      await this.fetch(this.baseUrl);
      this.initLoad = true;
    }
    const document = await this.fetchDom(item.url);
    item.cover = document.querySelector('.book-info img').getAttribute('src');
    item.intro = document.querySelector('.intro.clearfix').textContent.trim();
    const chapterElement = document.querySelector('#reading');
    if (!chapterElement) return item;
    const chapterUrl = this.urlJoin(
      this.baseUrl,
      chapterElement.getAttribute('href')
    );

    const chapterDocument = await this.fetchDom(chapterUrl);
    const elementsDiv = chapterDocument.querySelectorAll(
      '#listsss div[data-id]'
    );

    const chapters = [];
    Array.from(elementsDiv.values())
      .sort(
        (a, b) =>
          Number(a.getAttribute('data-id')) - Number(b.getAttribute('data-id'))
      )
      .forEach((div) => {
        const elements = div.querySelectorAll('a');
        elements.forEach((element) => {
          chapters.push({
            id: this.urlJoin(chapterUrl, element.getAttribute('href')),
            title: element.textContent.trim(),
            url: this.urlJoin(chapterUrl, element.getAttribute('href')),
          });
        });
      });

    item.chapters = chapters;
    return item;
  }

  async getContent(item, chapter) {
    if (!this.initLoad) {
      await this.fetch(this.baseUrl);
      this.initLoad = true;
    }
    let url = chapter.url;
    let hasNext = false;
    let res = '';
    do {
      hasNext = false;
      console.log(url);

      const document = await this.fetchDom(url);

      const ddElements = document.querySelectorAll('.content dd[data-id]');
      Array.from(ddElements.values())
        .sort(
          (a, b) =>
            Number(a.getAttribute('data-id')) -
            Number(b.getAttribute('data-id'))
        )
        .forEach((dd) => {
          const contentElements = dd.querySelectorAll('p');
          contentElements.forEach((element) => {
            res += element.textContent.trim() + '\n';
          });
        });

      const nextElements = document.querySelectorAll('.pager a');
      nextElements.forEach((element) => {
        if (
          element.textContent.trim() === '下一页' &&
          element.getAttribute('href')
        ) {
          url = new URL(element.getAttribute('href'), url).href;
          // url = this.urlJoin(item.url, element.getAttribute('href'));
          hasNext = true;
        }
      });
    } while (hasNext);
    return res.replace(/^.*\(第\d+\/\d+页\).*$\n?/gm, '');
  }
}

export default TestBookExtension;
