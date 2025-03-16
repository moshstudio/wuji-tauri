import { PhotoExtension } from '.';

class TestPhotoExtension extends PhotoExtension {
  id = 'testPhoto';
  name = 'ceshi';
  version = '0.0.1';
  baseUrl = 'http://www.weibomn.com/';

  async getRecommendList(pageNo) {
    pageNo ||= 1;
    let url = `${this.baseUrl}database.php?page=${pageNo}`;
    const response = await this.fetch(url, {
      headers: {
        refererr: this.baseUrl,
        'x-requested-with': 'XMLHttpRequest',
      },
      verify: false,
      noProxy: true,
    });
    const json = await response.json();
    const list = json.data.map((item) => {
      const url = `${this.baseUrl}/girl${item.createtime}.html`;
      const cover = this.urlJoin(this.baseUrl, item.image);
      return {
        id: url,
        title: '',
        url,
        cover,
        sourceId: '',
      };
    });
    return {
      list,
      page: pageNo,
      totalPage: 74,
    };
  }

  async search(keyword, pageNo) {
    return null;
  }
  async getPhotoDetail(item, pageNo) {
    try {
      const document = await this.fetchDom(item.url, {
        headers: {
          'upgrade-insecure-requests': '1',
        },
        verify: false,
        noProxy: true,
      });
      const imgs = document.querySelectorAll('.post-content img');
      const imgItems = Array.from(imgs).map((img) =>
        this.urlJoin(this.baseUrl, img.getAttribute('src'))
      );
      return {
        item,
        photos: imgItems,
        photosHeaders: { 'upgrade-insecure-requests': '1' },
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
