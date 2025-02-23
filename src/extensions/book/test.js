import { BookExtension } from './index';

class TestBookExtension extends BookExtension {
  id = 'testBook';
  name = 'testBook';
  version = '0.0.1';
  baseUrl = 'http://sma.yueyouxs.com/';

  async getRecommendBooks(pageNo, type) {
    const prefixUrl = this.urlJoin(this.baseUrl, 'api/book/classify');
    let items = [
      {
        name: '都市人生',
        id: 1100,
      },
      {
        name: '玄幻奇幻',
        id: 1101,
      },
      {
        name: '仙侠武侠',
        id: 1102,
      },
      {
        name: '军事历史',
        id: 1103,
      },
      {
        name: '科幻末世',
        id: 1104,
      },
      {
        name: '游戏体育',
        id: 1105,
      },
      {
        name: '悬疑灵异',
        id: 1107,
      },
      {
        name: '脑洞大开',
        id: 1108,
      },
      {
        name: '现代言情',
        id: 2100,
      },
      {
        name: '古代言情',
        id: 2101,
      },
      {
        name: '幻想言情',
        id: 2102,
      },
      {
        name: '穿越时空',
        id: 2104,
      },
      {
        name: '宫闱争斗',
        id: 2105,
      },
      {
        name: '豪门总裁',
        id: 2106,
      },
      {
        name: '婚恋爱情',
        id: 2107,
      },
      {
        name: '经商种田',
        id: 2108,
      },
      {
        name: '现实情感',
        id: 4100,
      },
      {
        name: '世俗百态',
        id: 4101,
      },
      {
        name: '家庭婚姻',
        id: 4102,
      },
      {
        name: '热血青春',
        id: 4103,
      },
      {
        name: '治愈成长',
        id: 4104,
      },
      {
        name: '奇闻怪谈',
        id: 4105,
      },
      {
        name: '悬疑脑洞',
        id: 4106,
      },
      {
        name: '古风言情',
        id: 4107,
      },
      {
        name: '学习强国',
        id: 3104,
      },
      {
        name: '文学小说',
        id: 3102,
      },
      {
        name: '出版读物',
        id: 3101,
      },
      {
        name: '史家专著',
        id: 3108,
      },
    ];
    if (!type) {
      return items.map((item) => ({
        id: prefixUrl + `?site_id=&classify_id=${item.id}`,
        type: item.name,
        list: [],
        page: pageNo,
        sourceId: '',
      }));
    }
    const item = items.find((item) => item.name === type);
    if (!item) return null;
    pageNo = pageNo || 1;
    let url = prefixUrl + `?site_id=&classify_id=${item.id}&page=${pageNo}`;

    const response = await this.fetch(url);
    const json = await response.json();
    if (json.code !== 0) {
      return null;
    }

    return {
      list: json.data.list.map((item) => {
        return {
          id: item.id,
          title: item.bookName,
          intro: item.intro,
          cover: item.bookPic,
          author: item.authorName,
          tags: [item.classifyName, item.classifySecondName],
          latestChapter: item.latestChapterName,
          latestUpdate: item.updateTime,
          extra: { wapBookId: item.wapBookId },
          sourceId: '',
        };
      }),
      page: pageNo,
      totalPage: Math.floor(json.data.count / json.data.list.length),
      type: item.name,
      sourceId: '',
    };
  }

  async search(keyword, pageNo) {
    const url = `${this.baseUrl}api/book/search?keyword=${keyword}&page=${pageNo}`;
    const response = await this.fetch(url);
    const json = await response.json();
    if (json.code !== 0) {
      return null;
    }

    return {
      list: json.data.list.map((item) => {
        return {
          id: item.id,
          title: item.bookName,
          intro: item.intro,
          cover: item.bookPic,
          author: item.authorName,
          tags: [item.classifyName, item.classifySecondName],
          latestChapter: item.latestChapterName,
          latestUpdate: item.updateTime,
          extra: { wapBookId: item.wapBookId },
          sourceId: '',
        };
      }),
      page: pageNo,
      totalPage: Math.floor(json.data.count / json.data.list.length),
      sourceId: '',
    };
  }

  async getBookDetail(item) {
    const url = `${this.baseUrl}c/${item.extra.wapBookId}.html`;
    const document = await this.fetchDom(url);
    const chapterElements = document.querySelectorAll('.catalog_ls li a');

    const chapters = [];
    chapterElements.forEach((a) => {
      const href = a.getAttribute('href');
      if (!href) {
        return;
      }
      const url = this.urlJoin(this.baseUrl, href);
      const title = a.textContent.trim();
      chapters.push({
        id: url,
        title: title || '',
        url,
      });
    });

    item.chapters = chapters;

    return item;
  }

  async getContent(item, chapter) {
    const body = await this.fetchDom(chapter.url);
    const res = Array.from(body.querySelectorAll('.con p'))
      .map((p) => p.textContent || '')
      .join('\n');
    // 将 （本章完）|（本章未完，请翻页）|.*书友群.* 使用正则去掉
    return res.replace(
      /（本章完）|（本章未完，请翻页）|.*书友群.*|（本章未完，请翻页）/g,
      ''
    );
  }
}

export default TestBookExtension;
