import { PhotoDetail, PhotoExtension, PhotoItem, PhotoList } from ".";
import { invoke } from "@tauri-apps/api/core";

class TestPhotoExtension extends PhotoExtension {
  id = "testPhoto";
  name = "妹子图";
  version = "0.0.1";
  baseUrl = "https://meizi2.com/";

  async getRecommendList(pageNo?: number): Promise<PhotoList | null> {
    pageNo ||= 1;
    const url = `${this.baseUrl}page/${pageNo}`;
    return await this.fetchImages(url, pageNo, 15);
  }

  async search(keyword: string, pageNo?: number): Promise<PhotoList | null> {
    pageNo ||= 1;
    const url = `${this.baseUrl}page/${pageNo}?s=${keyword}`;
    return await this.fetchImages(url, pageNo);
  }
  async fetchImages(url: string, pageNo: number, totalPage?: number) {
    const response = await this.fetch(url);
    const body = new DOMParser().parseFromString(
      await response.text(),
      "text/html"
    );
    const elements = body?.querySelectorAll("article");
    const list: PhotoItem[] = [];
    for (const item of elements) {
      const img = item.querySelector("img");
      const title = item.querySelector("h2 a")?.textContent;
      if (!img?.src) continue;
      const cover = img.src;
      const datetime = item.querySelector(".entry-date")?.textContent?.trim();
      const url = item.querySelector(".entry-thumbnail")?.getAttribute("href");
      list.push({
        id: this.nanoid(),
        title,
        cover,
        coverHeaders: {
          Referer: this.baseUrl,
        },
        url,
        datetime,
        sourceId: "",
      });
    }
    return {
      list,
      page: pageNo,
      totalPage: totalPage ? totalPage : list.length ? pageNo + 1 : pageNo,
    };
  }

  async getPhotoDetail(
    item: PhotoItem,
    pageNo?: number
  ): Promise<PhotoDetail | null> {
    const url = item.url;
    if (!url) return null;
    const response = await this.fetch(url);
    const body = new DOMParser().parseFromString(
      await response.text(),
      "text/html"
    );
    const elements = body.querySelectorAll(".entry-content img");
    const photos: string[] = [];
    for (const element of elements) {
      const src = element.getAttribute("src");
      if (src) {
        photos.push(src);
      }
    }
    return {
      item,
      photos,
      photosHeaders: {
        referer: url,
      },
      page: 1,
      totalPage: 1,
      sourceId: "",
    };
  }
}

export default TestPhotoExtension;
