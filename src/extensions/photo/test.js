import { PhotoExtension } from '.';

class TestPhotoExtension extends PhotoExtension {
  id = 'testPhoto';
  name = 'ceshi';
  version = '0.0.1';
  baseUrl = 'https://mt.20rs.com/';

  async getRecommendList(pageNo = 1) {
    pageNo ??= 1;
    const url = `${this.baseUrl}page_${pageNo}.html`;
    const document = await this.fetchDom(url);

    const list = await this.queryPhotoElements(document, {
      element: '.update_area_content li',
      title: '.case_info a',
      cover: 'img',
      datetime: '.meta-post',
      url: 'a',
    });
    const pageElements = document.querySelectorAll('.nav-links .page-numbers');
    return {
      list: list,
      page: pageNo,
      totalPage: this.maxPageNoFromElements(pageElements),
      sourceId: '',
    };
  }

  async search(keyword, pageNo = 1) {
    pageNo ??= 1;
    const url = `${this.baseUrl}page/${pageNo}?post_type=post&s=${keyword}`;
    const document = await this.fetchDom(url);

    const list = await this.queryPhotoElements(document, {
      element: '.update_area_content li',
      title: '.case_info a',
      cover: 'img',
      datetime: '.meta-post',
      url: 'a',
    });
    const pageElements = document.querySelectorAll('.nav-links .page-numbers');
    return {
      list: list,
      page: pageNo,
      totalPage: this.maxPageNoFromElements(pageElements),
      sourceId: '',
    };
  }

  async getPhotoDetail(item, pageNo = 1) {
    const url =
      pageNo === 1 ? item.url : item.url.replace('.html', `_${pageNo}.html`);
    const body = await this.fetchDom(url);
    const elements = body.querySelectorAll('.content img');
    const photos = [];
    for (const element of elements) {
      const src = element.getAttribute('src');
      if (src) {
        photos.push(src);
      }
    }
    const pageElements = body.querySelectorAll('.nav-links .page-numbers');
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
