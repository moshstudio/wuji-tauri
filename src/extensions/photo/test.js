import { PhotoExtension } from '.';

class TestPhotoExtension extends PhotoExtension {
  id = 'testPhoto';
  name = 'ceshi';
  version = '0.0.1';
  baseUrl = 'https://www.1y.is/';

  async getRecommendList(pageNo = 1) {
    const url = `${this.baseUrl}page/${pageNo}`;
    const document = await this.fetchDom(url);

    const list = await this.queryPhotoElements(document, {
      element: '.site-main .entry-card',
      title: '.np-entry-title a',
      cover: 'img',
      desc: '.np-entry-summary p',
      author: '.author a',
      datetime: 'time',
      url: '.np-entry-title a',
    });

    const pageElements = document.querySelectorAll('.page-numbers-container a');
    return {
      list: list,
      page: pageNo,
      totalPage: this.maxPageNoFromElements(pageElements),
      sourceId: '',
    };
  }

  async search(keyword, pageNo = 1) {
    return null;
  }

  async getPhotoDetail(item, pageNo = 1) {
    const url = `${item.url}/${pageNo}`;
    const body = await this.fetchDom(url);
    const elements = body.querySelectorAll('.entry-content img');
    const photos = [];
    for (const element of elements) {
      const src = element.getAttribute('src');
      if (src) {
        photos.push(src);
      }
    }
    const pageElements = body.querySelectorAll('.page-links a > span');
    return {
      item,
      photos,
      page: pageNo,
      totalPage: this.maxPageNoFromElements(pageElements),
      sourceId: '',
    };
  }
}

export default TestPhotoExtension;
