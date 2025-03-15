import { PhotoExtension } from '.';

class TestPhotoExtension extends PhotoExtension {
  id = 'testPhoto';
  name = 'ceshi';
  version = '0.0.1';
  baseUrl = 'https://www.hotgirl2024.com/';

  async getRecommendList(pageNo) {
    pageNo ||= 1;
    let url = `${this.baseUrl}?page=${pageNo}`;
    try {
      const document = await this.fetchDom(url, {
        headers: { 'Upgrade-Insecure-Requests': '1', Referer: this.baseUrl },
      });
      const list = await this.queryPhotoElements(document, {
        element: '.articles-grid__content',
        cover: 'img',
        title: '.articles-grid__title',
        datetime: '.articles-grid__publish-date',
        hot: '.articles-grid__views',
        url: 'a',
      });
      console.log(list);
      const pageItems = document?.querySelectorAll('.pagination__item');
      return {
        list,
        page: pageNo,
        totalPage: this.maxPageNoFromElements(pageItems),
      };
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  async search(keyword, pageNo) {
    pageNo ||= 1;
    let url = `${this.baseUrl}search.html/?page=${pageNo}&q=${keyword}`;
    try {
      const document = await this.fetchDom(url, {
        headers: { 'Upgrade-Insecure-Requests': '1', Referer: this.baseUrl },
      });
      const list = await this.queryPhotoElements(document, {
        element: '.articles-grid__content',
        cover: 'img',
        title: '.articles-grid__title',
        datetime: '.articles-grid__publish-date',
        hot: '.articles-grid__views',
        url: 'a',
      });

      const pageItems = document?.querySelectorAll('.pagination__item');
      return {
        list,
        page: pageNo,
        totalPage: this.maxPageNoFromElements(pageItems),
      };
    } catch (error) {
      console.log(error);
      return null;
    }
  }
  async getPhotoDetail(item, pageNo) {
    try {
      const url = item.url + `/?page=${pageNo}`;
      const document = await this.fetchDom(url, {
        headers: { 'Upgrade-Insecure-Requests': '1', Referer: this.baseUrl },
      });
      const list = document
        ?.querySelector('.article__image-list')
        ?.querySelectorAll('img');

      const imgItems = [];
      list?.forEach((item) => {
        const img = item;
        const cover = img?.getAttribute('data-src') || '';
        imgItems.push(cover ? this.urlJoin(this.baseUrl, cover) : '');
      });
      const pageElement = document?.querySelector('.pagination__item--active');
      const page = Number(pageElement?.textContent?.trim()) || pageNo || 1;
      const totalPage = this.maxPageNoFromElements(
        document?.querySelectorAll('.pagination__total')
      );
      return {
        item,
        photos: imgItems,
        page,
        totalPage,
      };
    } catch (error) {
      console.log(error);
      return null;
    }
  }
}

export default TestPhotoExtension;
