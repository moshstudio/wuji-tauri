import { PhotoExtension } from '.';

class TestPhotoExtension extends PhotoExtension {
  id = 'testPhoto';
  name = 'ceshi';
  version = '0.0.1';
  baseUrl = 'https://clickme.net/';

  async getRecommendList(pageNo) {
    pageNo ||= 1;
    let url = `https://api.clickme.net/article/list?key=clickme`;
    try {
      const formData = new FormData();
      for (const [key, value] of new Map([
        ['articleType', 'article'],
        ['subtype', 'category'],
        ['subtypeSlug', 'beauty'],
        ['device', ''],
        ['limit', '18'],
        ['page', pageNo],
      ]).entries()) {
        formData.append(key, value);
      }

      const response = await this.fetch(url, {
        method: 'POST',
        body: formData,
      });
      const json = await response.json();
      if (json.hasError) return null;

      return {
        list: json.data.items.map((item) => {
          return {
            id: item.articleIndex,
            title: item.title,
            url: item.url,
            cover: item.thumbnail,
            coverHeaders: { Referer: this.baseUrl },
            datetime: item.date,
            view: item.visitedCount,
            sourceId: '',
          };
        }),
        page: pageNo,
        totalPage: json.data.total_pages,
      };
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  async search(keyword, pageNo) {
    pageNo ||= 1;
    let url = `https://api.clickme.net/article/list?key=clickme`;
    try {
      const formData = new FormData();
      for (const [key, value] of new Map([
        ['articleType', 'article'],
        ['subtype', 'search'],
        ['subtypeSlug', keyword],
        ['device', ''],
        ['limit', '18'],
        ['page', pageNo],
      ]).entries()) {
        formData.append(key, value);
      }

      const response = await this.fetch(url, {
        method: 'POST',
        body: formData,
      });
      const json = await response.json();
      if (json.hasError) return null;
      return {
        list: json.data.items.map((item) => {
          return {
            id: item.articleIndex,
            title: item.title,
            url: item.url,
            cover: item.thumbnail,
            coverHeaders: { Referer: this.baseUrl },
            datetime: item.date,
            view: item.visitedCount,
            sourceId: '',
          };
        }),
        page: pageNo,
        totalPage: json.data.total_pages,
      };
    } catch (error) {
      console.log(error);
      return null;
    }
  }
  async getPhotoDetail(item, pageNo) {
    try {
      const document = await this.fetchDom(item.url);
      const imgs = document.querySelectorAll('.article-detail-content img');
      const imgItems = Array.from(imgs).map((img) => img.getAttribute('src'));
      return {
        item,
        photos: imgItems,
        photosHeaders: { referer: this.baseUrl },
        page: 1,
        totalPage: 1,
      };
    } catch (error) {
      console.log(error);
      return null;
    }
  }
}

export default TestPhotoExtension;
