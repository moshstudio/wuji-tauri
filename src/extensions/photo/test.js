import { PhotoExtension } from ".";

class TestPhotoExtension extends PhotoExtension {
  id = "testPhoto";
  name = "testPhoto";
  version = "0.0.1";
  baseUrl = "https://meirentu.cc/";

  async getRecommendList(pageNo = 1) {
    const url = `${this.baseUrl}index/${pageNo}.html`;
    return await this.fetchImages(url, pageNo, 15);
  }

  async search(keyword, pageNo = 1) {
    const url = `${this.baseUrl}s/${keyword}-${pageNo}.html`;
    return await this.fetchImages(url, pageNo);
  }

  async fetchImages(url, pageNo, totalPage) {
    const body = await this.fetchDom(url);

    const list = await this.queryPhotoElements(body, {
      element: ".update_area_content li",
      cover: "img",
      title: ".meta-title",
      datetime: "meta-post span",
      hot: ".cx_like span",
      url: "a",
    });
    list.forEach((item) => {
      item.coverHeaders = {
        referer: this.baseUrl,
      };
    });

    const pageElements = body.querySelectorAll(".page a");
    return {
      list,
      page: pageNo,
      totalPage: totalPage || this.maxPageNoFromElements(pageElements),
    };
  }

  async getPhotoDetail(item, pageNo = 1) {
    if (!item.url || item.url.length < 5) return null;
    const url = item.url.substring(0, item.url.length - 5) + `-${pageNo}.html`;
    const body = await this.fetchDom(url);
    const elements = body.querySelectorAll(".content img");
    const photos = [];
    for (const element of elements) {
      const src = element.getAttribute("src");
      if (src) {
        photos.push(src);
      }
    }
    const pageElements = body.querySelectorAll(".page a");
    return {
      item,
      photos,
      photosHeaders: {
        referer: url,
      },
      page: pageNo,
      totalPage: this.maxPageNoFromElements(pageElements),
      sourceId: "",
    };
  }
}

export default TestPhotoExtension;
