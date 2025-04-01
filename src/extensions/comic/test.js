import { ComicExtension } from './index';

class TestComicExtension extends ComicExtension {
  id = 'testComic';
  name = 'testComic';
  version = '0.0.1';
  baseUrl = 'https://www.hdmanhua.com/';
  async getRecommendComics(pageNo, type) {
    let items = [
      {
        name: '人气排行',
        tag: 'hot',
      },
      {
        name: '收藏排行',
        tag: 'collect',
      },
      {
        name: '热门全本',
        tag: 'wanben',
      },
      {
        name: '评分排行',
        tag: 'score',
      },
      {
        name: '最新漫画',
        tag: 'new',
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
    let url = `${this.baseUrl}top/${item.tag}/`;
    if (pageNo > 1) {
      url = `${this.baseUrl}top/${item.tag}/index_${pageNo}.html`;
    }
    const document = await this.fetchDom(url);
    const list = await this.queryComicElements(document, {
      element: '.book-like a[href]',
      cover: 'img',
      title: 'h4',
      author: 'span',
      url: '',
    });

    const pageElement = document.querySelector('.page span');
    let totalPage = 1;
    if (pageElement) {
      totalPage = parseInt(pageElement.textContent.split('/').pop());
    }
    return {
      list,
      page: pageNo,
      totalPage: totalPage,
    };
  }

  async search(keyword, pageNo) {
    pageNo ||= 1;
    const url = `https://www.aakkrr.com/comic/${keyword}/${pageNo}`;
    const document = await this.fetchDom(url);
    const list = await this.queryComicElements(document, {
      element: '.grid .grid-item',
      cover: 'img',
      title: 'h3 a',
      url: 'h3 a',
    });

    const pageElement = document.querySelector('.page span');
    let totalPage = 1;
    if (pageElement) {
      totalPage = parseInt(pageElement.textContent.split('/').pop());
    }
    return {
      list,
      page: pageNo,
      totalPage: totalPage,
    };
  }

  async getComicDetail(item, pageNo) {
    pageNo ||= 1;
    let body = await this.fetchDom(item.url);
    item.intro = body.querySelector('.book-desc').textContent;
    const chapters = await this.queryChapters(body, {
      element: '.book-chapter a',
    });
    item.chapters = chapters;
    return item;
  }

  async getContent(item, chapter) {
    console.log(chapter.url);

    const document = await this.fetchDom(chapter.url);
    const elements = document.querySelectorAll('.images img');
    const photos = [];
    elements.forEach((element) => {
      photos.push(element.getAttribute('src'));
    });

    return {
      photos,
      page: 1,
      totalPage: 1,
    };
  }
}

export default TestComicExtension;
