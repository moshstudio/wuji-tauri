import { ComicExtension } from './index';

class TestComicExtension extends ComicExtension {
  id = 'testComic';
  name = 'testComic';
  version = '0.0.1';
  baseUrl = 'https://www.wxzhm.top/';
  async getRecommendComics(pageNo, type) {
    let items = [
      {
        name: '青春',
        tag: '青春',
      },
      {
        name: '性感',
        tag: '性感',
      },
      {
        name: '长腿',
        tag: '长腿',
      },
      {
        name: '多人',
        tag: '多人',
      },
      {
        name: '御姐',
        tag: '御姐',
      },
      {
        name: '巨乳',
        tag: '巨乳',
      },
      {
        name: '新婚',
        tag: '新婚',
      },
      {
        name: '媳妇',
        tag: '媳妇',
      },
      {
        name: '暧昧',
        tag: '暧昧',
      },
      {
        name: '清纯',
        tag: '清纯',
      },
      {
        name: '调教',
        tag: '调教',
      },
      {
        name: '少妇',
        tag: '少妇',
      },
      {
        name: '风骚',
        tag: '风骚',
      },
      {
        name: '同居',
        tag: '同居',
      },
      {
        name: '好友',
        tag: '好友',
      },
      {
        name: '女神',
        tag: '女神',
      },
      {
        name: '诱惑',
        tag: '诱惑',
      },
      {
        name: '偷情',
        tag: '偷情',
      },
      {
        name: '出轨',
        tag: '出轨',
      },
      {
        name: '正妹',
        tag: '正妹',
      },
      {
        name: '家教',
        tag: '家教',
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
    const url = `${this.baseUrl}booklist?tag=${item.tag}&area=-1&end=-1`;
    const body = await this.fetchDom(url, {
      verify: false,
    });
    const list = await this.queryComicElements(body, {
      element: '.mh-list li',
      cover: '.mh-cover',
      title: 'h2 a',
      url: 'h2 a',
      intro: '.chapter',
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
    const url = `${this.baseUrl}search?keyword=${keyword}`;
    const body = await this.fetchDom(url, {
      verify: false,
    });
    const list = await this.queryComicElements(body, {
      element: '.mh-list li',
      cover: '.mh-cover',
      title: 'h2 a',
      url: 'h2 a',
      intro: '.chapter',
    });

    const pageElements = body.querySelectorAll('.product__pagination a');
    return {
      list,
      page: pageNo,
      totalPage: this.maxPageNoFromElements(pageElements),
    };
  }

  async getComicDetail(item, pageNo) {
    pageNo ||= 1;
    const body = await this.fetchDom(item.url);
    item.intro = body.querySelector('.info .content')?.textContent?.trim();
    const chapters = await this.queryChapters(body, {
      element: '#chapterlistload ul a',
    });
    console.log(chapters);
    item.chapters = chapters;
    return item;
  }

  async getContent(item, chapter) {
    const body = await this.fetchDom(chapter.url);
    const images = body.querySelectorAll('.comicpage img');
    const photos = [];
    images.forEach((item) => {
      photos.push(item.getAttribute('data-original'));
    });

    return {
      photos,
      page: 1,
      totalPage: 1,
    };
  }
}

export default TestComicExtension;
