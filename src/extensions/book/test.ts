import {
  BookChapter,
  BookExtension,
  BookItem,
  BookList,
  BooksList,
  ChapterList,
} from ".";

class TestBookExtension extends BookExtension {
  id: string = "testBook";
  name: string = "testBook";
  version = "0.0.1";
  baseUrl = "http://www.x81zws.com/";
  async getRecommendBooks(
    pageNo: number,
    type: string | undefined
  ): Promise<BooksList | null> {
    let items = [
      {
        name: "玄幻魔法",
        url: this.urlJoin(this.baseUrl, "class/xuanhuan/"),
        totalPage: 159,
      },
      {
        name: "全本小说",
        url: this.urlJoin(this.baseUrl, "quanben/class/"),
        totalPage: 1,
      },
      {
        name: "武侠修真",
        url: this.urlJoin(this.baseUrl, "class/wuxia/"),
        totalPage: 300,
      },
      {
        name: "都市言情",
        url: this.urlJoin(this.baseUrl, "class/dushi/"),
        totalPage: 800,
      },
      {
        name: "历史军事",
        url: this.urlJoin(this.baseUrl, "class/lishi/"),
        totalPage: 150,
      },
      {
        name: "科幻灵异",
        url: this.urlJoin(this.baseUrl, "class/kehuan/"),
        totalPage: 160,
      },
      {
        name: "游戏竞技",
        url: this.urlJoin(this.baseUrl, "class/youxi/"),
        totalPage: 68,
      },
      {
        name: "女生耽美",
        url: this.urlJoin(this.baseUrl, "class/nvsheng/"),
        totalPage: 110,
      },
      {
        name: "其他类型",
        url: this.urlJoin(this.baseUrl, "class/qita/"),
        totalPage: 480,
      },
    ];
    if (!type) {
      return items.map((item) => ({
        id: item.url,
        type: item.name,
        list: [],
        page: pageNo,
        totalPage: item.totalPage,
        sourceId: "",
      }));
    }
    const item = items.find((item) => item.name === type);
    if (!item) return null;
    pageNo = pageNo || 1;
    const url = this.urlJoin(item.url, String(pageNo));

    const response = await this.fetch(url);
    const body = new DOMParser().parseFromString(
      await response.text(),
      "text/html"
    );

    const elements = body.querySelectorAll("#sitebox dl");

    const list: BookItem[] = [];
    elements.forEach((element) => {
      const img = element.querySelector("img");
      const cover = img?.getAttribute("data-original") || undefined;

      const a = element.querySelector("h3 a");
      const title = a?.textContent || undefined;
      if (!a?.getAttribute("href")) {
        return;
      }
      const href = this.urlJoin(this.baseUrl, a?.getAttribute("href") || null);

      const others = element.querySelectorAll(".book_other span");
      let author = undefined;
      let tags = undefined;
      let status = undefined;
      if (element.querySelector(".book_other")?.textContent?.includes("作者")) {
        author = others[0]?.textContent;
        tags = others[1]?.textContent;
        status = others[2]?.textContent;
      } else {
        tags = others[0]?.textContent;
        status = others[1]?.textContent;
      }

      const intro =
        element.querySelector(".book_des")?.textContent || undefined;
      list.push({
        id: href || this.nanoid(),
        title: title || "",
        author,
        cover,
        intro,
        tags,
        status,
        sourceId: "",
      });
    });

    return {
      list,
      page: pageNo,
      totalPage: item.totalPage,
    };
  }

  async search(keyword: string | Blob, pageNo: number) {
    const home = await this.fetch(this.baseUrl);
    const homeText = await home.text();
    // 使用正则获取 action="/soso8901d.html" 引号中的内容
    const action = homeText.match(/action="([^"]+)"/);
    if (!action) {
      return null;
    }

    const url = this.urlJoin(this.baseUrl, action[1]);
    const form = new FormData();
    form.append("searchkey", keyword);
    const response = await this.fetch(url, {
      method: "POST",
      body: form,
    });
    const body = new DOMParser().parseFromString(
      await response.text(),
      "text/html"
    );

    const elements = body.querySelectorAll("#sitebox dl");
    const list: BookItem[] = [];
    elements.forEach((element) => {
      const img = element.querySelector("img");
      const cover = img?.getAttribute("data-original") || undefined;

      const a = element.querySelector("h3 a");
      const title = a?.textContent || undefined;
      if (!a?.getAttribute("href")) {
        return;
      }
      const href = this.urlJoin(this.baseUrl, a?.getAttribute("href") || null);

      const others = element.querySelectorAll(".book_other span");
      let author = undefined;
      let tags = undefined;
      let status = undefined;
      if (element.querySelector(".book_other")?.textContent?.includes("作者")) {
        author = others[0]?.textContent;
        tags = others[1]?.textContent;
        status = others[2]?.textContent;
      } else {
        tags = others[0]?.textContent;
        status = others[1]?.textContent;
      }

      const intro =
        element.querySelector(".book_des")?.textContent || undefined;

      list.push({
        id: href || this.nanoid(),
        title: title || "",
        author,
        cover,
        intro,
        tags,
        status,
        sourceId: "",
      });
    });

    return {
      list,
      page: pageNo,
      totalPage: 1,
    };
  }

  async getBookDetail(item: BookItem, pageNo: undefined) {
    const url = item.id;

    const response = await this.fetch(url);
    const body = new DOMParser().parseFromString(
      await response.text(),
      "text/html"
    );

    const chapterElements = body.querySelectorAll("#chapterList a");
    const chapters: ChapterList = [];
    chapterElements.forEach((element) => {
      const href = element.getAttribute("href");
      if (!href) {
        return;
      }
      const url = this.urlJoin(this.baseUrl, href);
      const title = element.textContent;
      chapters.push({
        id: url,
        title: title || "",
        url,
      });
    });

    item.chapters = chapters;

    return item;
  }

  async getContent(item: BookItem, chapter: BookChapter) {
    let content = "";
    let nextPageUrl = chapter.url;
    while (nextPageUrl) {
      const response = await this.fetch(nextPageUrl);
      const body = new DOMParser().parseFromString(
        await response.text(),
        "text/html"
      );
      const elements = body.querySelectorAll("#TextContent p");
      elements.forEach((p) => {
        content += p.textContent + "\n";
      });
      const nextPageElement = body.querySelector("#next_url");
      if (nextPageElement && nextPageElement.textContent?.includes("下一页")) {
        nextPageUrl = nextPageElement.getAttribute("href");
        if (nextPageUrl && !nextPageUrl.startsWith("http")) {
          nextPageUrl = this.urlJoin(this.baseUrl, nextPageUrl);
        }
      } else {
        nextPageUrl = null;
      }
    }
    return content;
  }
}

export default TestBookExtension;
