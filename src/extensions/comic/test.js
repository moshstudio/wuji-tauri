import { ComicExtension } from './index';

class TestComicExtension extends ComicExtension {
  id = 'testComic';
  name = 'testComic';
  version = '0.0.1';
  baseUrl = 'https://kxmanhua.com/';
  async getRecommendComics(pageNo, type) {
    let items = [
      {
        name: '3D漫画',
        type: 1,
      },
      {
        name: '韩漫',
        type: 2,
      },
      {
        name: '日漫',
        type: 3,
      },
      {
        name: '真人',
        type: 4,
      },
      {
        name: '耽美',
        type: 5,
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
    const url = `${this.baseUrl}manga/library?type=${item.type}&complete=1&page=${pageNo}&orderby=1`;
    const body = await this.fetchDom(url, {
      verify: false,
    });
    const list = await this.queryComicElements(body, {
      element: '.container .product__item',
      cover: '.product__item__pic',
      title: 'h6 a',
      url: 'h6 a',
    });

    const pageElements = body.querySelectorAll('.product__pagination a');
    return {
      list,
      page: pageNo,
      totalPage: this.maxPageNoFromElements(pageElements),
    };
  }

  async search(keyword, pageNo) {
    pageNo ||= 1;
    const url = `${this.baseUrl}manga/search?keyword=${keyword}`;
    const body = await this.fetchDom(url, {
      verify: false,
    });
    const list = await this.queryComicElements(body, {
      element: '.container .product__item',
      cover: '.product__item__pic',
      title: 'h6 a',
      url: 'h6 a',
    });
    return {
      list,
      page: pageNo,
      totalPage: 1,
    };
  }

  async getComicDetail(item, pageNo) {
    pageNo ||= 1;
    const body = await this.fetchDom(item.url);
    item.author = body.querySelector(
      '.anime__details__title span'
    )?.textContent;
    item.intro = body.querySelector(
      '.anime__details__text p:nth-child(4)'
    )?.textContent;
    const chapters = await this.queryChapters(body, {
      element: '.chapter_list a',
    });
    console.log(chapters);
    item.chapters = chapters;
    return item;
  }

  async getContent(item, chapter) {
    const body = await this.fetchDom(chapter.url);
    const images = body.querySelectorAll('.blog__details__content img');
    const photos = [];
    images.forEach((item) => {
      photos.push(item.getAttribute('src'));
    });

    return {
      photos,
      page: 1,
      totalPage: 1,
    };
  }
}

export default TestComicExtension;
