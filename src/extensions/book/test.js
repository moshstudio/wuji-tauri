import { BookExtension } from './index';

class TestBookExtension extends BookExtension {
  id = 'testBook';
  name = 'testBook';
  version = '0.0.1';
  baseUrl = 'https://wap.xs74w.com/';
  async getRecommendBooks(pageNo, type) {
    let items = [
      {
        name: '全部',
        id: 'xclass/0',
      },
      {
        name: '玄幻小说',
        id: 'xclass/0',
      },
      {
        name: '武侠小说',
        id: 'xclass/0',
      },
      {
        name: '都市小说',
        id: 'xclass/0',
      },
      {
        name: '穿越小说',
        id: 'xclass/0',
      },
      {
        name: '网游小说',
        id: 'xclass/0',
      },
      {
        name: '科幻小说',
        id: 'xclass/0',
      },
    ];
    if (!type) {
      return items.map((item) => ({
        id: item.id,
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
    const url = this.urlJoin(this.baseUrl, item.id, `/${pageNo}.html`);
    const body = await this.fetchDom(url);
    const list = await this.queryBookElements(body, {
      element: '.hot_sale',
      cover: 'img',
      title: '.detail a p',
      url: '.detail a',
      intro: '.review',
      author: '.author',
      latestUpdate: '.score',
    });
    let totalPage = 1;
    const totalPageElement = body.querySelector('.page_txt');
    if (totalPageElement?.getAttribute('value')) {
      totalPage = parseInt(
        totalPageElement.getAttribute('value').split('/').pop()
      );
    }

    return {
      list,
      page: pageNo,
      totalPage: totalPage,
    };
  }

  async search(keyword, pageNo) {
    const url = `${this.baseUrl}search.php?keyword=${keyword}`;
    const body = await this.fetchDom(url);
    const list = await this.queryBookElements(body, {
      element: '.hot_sale',
      title: 'a p',
      author: '.author',
      latestChapter: '.author:nth-of-type(2) a',
    });
    return {
      list,
      page: pageNo,
      totalPage: 1,
    };
  }

  async getBookDetail(item, pageNo) {
    const body = await this.fetchDom(item.url);
    item.cover ??= this.urlJoin(
      this.baseUrl,
      body.querySelector('#bookdetail img')?.getAttribute('src')
    );
    item.intro ??= body.querySelector('.review').textContent;
    const allChaptersElement = body.querySelector(
      '.recommend h2:nth-of-type(2) a'
    );
    const allChaptersUrl = allChaptersElement?.getAttribute('href')
      ? this.urlJoin(this.baseUrl, allChaptersElement?.getAttribute('href'))
      : itemFromKind.url.replace('.html', '/all.html');

    const allChaptersBody = await this.fetchDom(allChaptersUrl);
    const allChaptersElements =
      allChaptersBody.querySelectorAll('#chapterlist a');
    const chapters = [];
    allChaptersElements.forEach((a) => {
      const title = a.textContent;
      if (!title || title.includes('直达页面底部')) {
        return;
      }
      const url = a.getAttribute('href');
      if (url) {
        chapters.push({
          id: this.urlJoin(this.baseUrl, url),
          title: title,
          url: this.urlJoin(this.baseUrl, url),
        });
      }
    });
    item.chapters = chapters;

    return item;
  }

  async getContent(item, chapter) {
    const chapterId = chapter.url.split('/').pop().replace('.html', '');
    let content = '';
    let nextPageUrl = chapter.url;
    while (nextPageUrl) {
      const body = await this.fetchDom(nextPageUrl);
      const chapterContent = body.querySelector('#chaptercontent');

      chapterContent?.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          content += node.textContent + '\n';
        }
      });
      const nextPageElement = body.querySelector('#pt_next');
      if (
        nextPageElement &&
        nextPageElement.getAttribute('href').includes(chapterId)
      ) {
        nextPageUrl = nextPageElement.getAttribute('href');
        if (nextPageUrl && !nextPageUrl.startsWith('http')) {
          nextPageUrl = this.urlJoin(this.baseUrl, nextPageUrl);
        }
      } else {
        nextPageUrl = null;
      }
    }
    return content;
  }
}

export default TestBookExtension;
