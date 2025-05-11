import { PhotoExtension } from '.';

class TestPhotoExtension extends PhotoExtension {
  id = 'testPhoto';
  name = 'ceshi';
  version = '0.0.1';
  baseUrl = 'https://xx.knit.bid/';

  /**
 * 获取推荐图片列表
 * @param {number} [pageNo=1] - 页码，默认为1
 * @returns {Promise<{list: Array, page: number, totalPage: number}> | null} - 返回包含图片列表、当前页码和总页数的对象，如果出错则返回null
 */
  async getRecommendList(pageNo) {
    pageNo ||= 1;
    let url = `${this.baseUrl}page/${pageNo}/`;
    try {
      const document = await this.fetchDom(url);

      const list = await this.queryPhotoElements(document, {
        element: '.image-container .excerpt',
        title: 'h2 a',
        url: 'h2 a',
      });
      const pageElements = document.querySelectorAll(
        '.pagination a, .pagination span',
      );

      return {
        list,
        page: pageNo,
        totalPage: this.maxPageNoFromElements(pageElements),
      };
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  async search(keyword, pageNo) {
    pageNo ||= 1;
    let url = `${this.baseUrl}search/page/${pageNo}/?s=${keyword}`;
    try {
      const document = await this.fetchDom(url);
      const list = await this.queryPhotoElements(document, {
        element: '.image-container .excerpt',
        title: 'h2 a',
        url: 'h2 a',
      });
      const pageElements = document.querySelectorAll(
        '.pagination a, .pagination span',
      );

      return {
        list,
        page: pageNo,
        totalPage: this.maxPageNoFromElements(pageElements),
      };
    } catch (error) {
      console.log(error);
      return null;
    }
  }
  async getPhotoDetail(item, pageNo) {
    try {
      pageNo ||= 1;
      const url = this.urlJoin(item.url, `page/${pageNo}/`);
      const document = await this.fetchDom(url);
      const imgs = document.querySelectorAll('.image-container img');
      const imgItems = Array.from(imgs).map((img) =>
        this.urlJoin(URL.parse(item.url).origin, img.getAttribute('data-src')),
      );

      const pageElements = document.querySelectorAll(
        '.pagination a, .pagination span',
      );
      return {
        item,
        photos: imgItems,
        photosHeaders: { referer: item.url },
        page: pageNo,
        totalPage: this.maxPageNoFromElements(pageElements),
      };
    } catch (error) {
      console.log(error);
      return null;
    }
  }
}

export default TestPhotoExtension;
