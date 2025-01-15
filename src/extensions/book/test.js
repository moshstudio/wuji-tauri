import { BookExtension } from "./index";

class TestBookExtension extends BookExtension {
  id = "testBook";
  name = "testBook";
  version = "0.0.1";
  baseUrl = "https://www.qhdbu.com";

  async getRecommendBooks(pageNo, type) {
    let items = [
      {
        name: "热门小说",
        url: this.urlJoin(this.baseUrl, "top/"),
      },
      {
        name: "总点击榜",
        url: this.urlJoin(this.baseUrl, "top/"),
      },
      {
        name: "月点击榜",
        url: this.urlJoin(this.baseUrl, "top/"),
      },
      {
        name: "周点击榜",
        url: this.urlJoin(this.baseUrl, "top/"),
      },
    ];
    if (!type) {
      return items.map((item) => ({
        id: item.url,
        type: item.name,
        list: [],
        page: pageNo,
        totalPage: 1,
        sourceId: "",
      }));
    }
    const item = items.find((item) => item.name === type);
    if (!item) return null;

    const body = await this.fetchDom(item.url, {
      referrer: this.baseUrl,
      headers: {
        "accept-language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });
    if (type == "热门小说") {
      const list = await this.queryBookElements(body, {
        element: "#fengtui .bookbox",
        cover: "img",
        title: "h4 a",
        intro: ".update",
        author: ".author a",
        tags: ".author:nth-of-type(2)",
        status: ".author .author",
        url: "h4 a",
        latestChapter: ".cat a",
        latestUpdate: ".author:nth-of-type(3)",
      });
      return {
        list: list,
        page: pageNo,
        totalPage: 1,
      };
    } else {
      let q = "#fengyou:nth-of-type(1) li";
      if (type === "月点击榜") {
        q = "#fengyou:nth-of-type(2) li";
      }
      if (type === "周点击榜") {
        q = "#fengyou:nth-of-type(3) li";
      }
      const list = await this.queryBookElements(body, {
        element: q,
        title: "a",
        author: "span a",
        url: "a",
        latestChapter: ".cat a",
      });
      return {
        list: list,
        page: pageNo,
        totalPage: 1,
      };
    }
  }

  async search(keyword, pageNo) {
    const url = `https://www.jdzwo.com/search.php?searchkey=${keyword}&action=login&submit=&page=${pageNo}`;
    const body = await this.fetchDom(url, {
      headers: {
        "accept-language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });
    console.log(body);

    const list = await this.queryBookElements(body, {
      element: "#fengtui .bookbox",
      cover: "img",
      title: "h4 a",
      intro: ".update",
      author: ".author a",
      tags: ".author:nth-of-type(2)",
      status: ".author .author",
      url: "h4 a",
      latestChapter: ".cat a",
      latestUpdate: ".author:nth-of-type(3)",
    });

    if (!list.length) {
      // 直接跳转到了书籍中
      return {
        list: (
          await this.queryBookElements(body, {
            element: "html",
            cover: "img",
            title: "h1",
            url: "head link[rel='canonical']",
            intro: ".bookintromore",
            author: ".booktag a",
            status: ".booktag span:nth-of-type(2)",
            latestChapter: ".bookchapter",
            latestUpdate: ".booktime",
          })
        ).filter((item) => item.url),
        page: pageNo,
        totalPage: 1,
      };
    }
    const totalPage = this.maxPageNoFromElements(
      body.querySelectorAll(".pagination a")
    );

    return {
      list,
      page: pageNo,
      totalPage: totalPage,
    };
  }

  async getBookDetail(item) {
    console.log(item);

    if (!item.url) return null;
    const body = await this.fetchDom(item.url, {
      headers: {
        "accept-language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });

    const chapterElements = body.querySelectorAll("#showmore01 a");
    const chapters = [];
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

  async getContent(item, chapter) {
    if (!chapter.url) return "";
    const body = await this.fetchDom(chapter.url, {
      headers: {
        "accept-language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });
    return Array.from(body.querySelectorAll("#TextContent p"))
      .map((p) => p.textContent || "")
      .join("\n");
  }
}

export default TestBookExtension;
