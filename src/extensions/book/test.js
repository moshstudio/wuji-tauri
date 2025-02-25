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
      headers: {
        'upgrade-insecure-requests': '1',
        referer: this.baseUrl,
        origin: this.baseUrl,
        host: 'www.deqixs.com',
        connection: 'keep-alive',
        'accept-encoding': 'gzip, deflate, br, zstd',
        'accept-language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
        accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
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
    const url = `https://m.xseeshu.net/search.html`;
    const formData = new FormData();
    formData.append('s', keyword);
    const document = await this.fetchDom(url, {
      method: 'POST',
      body: formData,
    });
    const list = await this.queryBookElements(document, {
      element: '.sort_list li',
      title: '.s2 a',
      latestUpdate: '.s5',
      tags: '.s1',
      url: '.s2 a',
    });

    const pageElements = document.querySelectorAll('.sort_page_num a');

    return {
      list: list,
      page: pageNo,
      totalPage: this.maxPageNoFromElements(pageElements),
      sourceId: '',
    };
  }

  async getBookDetail(item) {
    const url = item.url.replace('\/loop/', '\/list\/');
    const document = await this.fetchDom(url);
    item.cover = this.urlJoin(
      this.baseUrl,
      document.querySelector('.book-img img').getAttribute('src')
    );
    item.author = document.querySelector('.bookname h1').textContent.trim();

    const options = Array.from(
      document
        .querySelector('.page_num')
        .querySelectorAll('select option')
        .values()
    );
    const getChapters = (body) => {
      const chapterLists = Array.from(
        body.querySelectorAll('.chapter-list').values()
      );
      const chapterList = chapterLists.pop();
      if (chapterList) {
        return chapterList
          .querySelectorAll('li a')
          .values()
          .map((a) => {
            const url = this.urlJoin(this.baseUrl, a.getAttribute('href'));
            return {
              id: url,
              title: a.textContent.trim(),
              url: url,
            };
          });
      }
      return [];
    };
    const chapters = Array.from({ length: options.length }, () => []);
    await Promise.all(
      options.map(async (option, index) => {
        const url = this.urlJoin(this.baseUrl, option.getAttribute('value'));
        const document = await this.fetchDom(url);
        chapters[index].push(...getChapters(document));
      })
    );
    item.chapters = chapters.flat();
    return item;
  }

  async getContent(item, chapter) {
    const id = chapter.url.split('/').pop().replace('.html', '');

    const getContent = async (url, id) => {
      const body = await this.fetchDom(url);
      let res = Array.from(body.querySelectorAll('.txt p'))
        .map((p) => p.textContent || '')
        .join('\n');
      const nextElement = body.querySelector('.next a');
      if (nextElement && nextElement.getAttribute('href')?.includes(id)) {
        res =
          res +
          (await getContent(
            this.urlJoin(this.baseUrl, nextElement.getAttribute('href')),
            id
          ));
      }
      return res;
    };
    return await getContent(chapter.url, id);
  }
}

export default TestBookExtension;
