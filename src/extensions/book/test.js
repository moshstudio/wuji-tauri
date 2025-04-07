import { BookExtension } from './index';

class TestBookExtension extends BookExtension {
  id = 'testBook';
  name = 'testBook';
  version = '0.0.1';
  baseUrl = 'https://www.kkxsz.com/';
  ua =
    'mozilla/5.0 (windows nt 10.0; win64; x64) applewebkit/537.36 (khtml, like gecko) chrome/134.0.0.0 safari/537.36 edg/134.0.0.0';

  async getRecommendBooks(pageNo, type) {
    let items = [
      {
        name: '玄幻',
        tag: `list-4-{pageNo}/`,
      },
      {
        name: '仙侠',
        tag: `list-7-{pageNo}/`,
      },
      {
        name: '都市',
        tag: `list-8-{pageNo}/`,
      },
      {
        name: '游戏',
        tag: `list-11-{pageNo}/`,
      },
      {
        name: '奇缘',
        tag: `list-17-{pageNo}/`,
      },
      {
        name: '现代',
        tag: `list-18-{pageNo}/`,
      },
      {
        name: '悬疑',
        tag: `list-21-{pageNo}/`,
      },
      {
        name: '科幻',
        tag: `list-22-{pageNo}/`,
      },
    ];
    if (!type) {
      return items.map((item) => ({
        id: item.tag,
        type: item.name,
        list: [],
        page: pageNo,
        sourceId: '',
      }));
    }
    const item = items.find((item) => item.name === type);
    if (!item) return null;
    pageNo = pageNo || 1;
    let url = `${this.baseUrl}${item.tag.replace('{pageNo}', pageNo)}`;
    const document = await this.fetchDom(url);
    const list = await this.queryBookElements(document, {
      element: '.mainCate li',
      cover: 'img',
      title: '.name a',
      author: '.author',
      intro: '.intro',
      url: '.name a',
    });
    const pageElements = document.querySelectorAll('.page a[href]');

    return {
      list,
      page: pageNo,
      totalPage: this.maxPageNoFromElements(pageElements),
      type: item.name,
      sourceId: '',
    };
  }

  async search(keyword, pageNo) {
    const url = `https://www.rrssk.com/keywords-${keyword}-${pageNo}.html`;
    const document = await this.fetchDom(url, {
      headers: {
        'User-Agent': this.ua,
        'upgrade-insecure-requests': '1',
        Referer: 'https://www.rrssk.com/?89',
      },
    });

    const numMatch = document.head.textContent.match(/const num = '(.+)'/);
    const numB64 = numMatch[1];

    const elements = document.querySelectorAll('.list li');
    const list = [];
    elements.forEach((element) => {
      const cover = element.querySelector('img').getAttribute('src');
      const title = element.querySelector('.name a').textContent.trim();
      const author = element
        .querySelector('.infoM2 dl:nth-of-type(1) a')
        .textContent.trim();
      const intro = element.querySelector('.intro').textContent.trim();
      const a = element.querySelector('.name a');

      const regex = /toUrl\('([^']+)'/;
      const match = a.getAttribute('onClick').match(regex);
      if (match && match[1]) {
        list.push({
          cover: cover,
          title: title,
          author: author,
          intro: intro,
          url: this.openUrl(match[1], numB64),
        });
      }
    });
    const pageElements = document.querySelectorAll('.page a[href]');

    return {
      list,
      page: pageNo,
      totalPage: this.maxPageNoFromElements(pageElements),
      sourceId: '',
    };
  }

  async getBookDetail(item) {
    const chapters = [];
    let url = item.url;
    const document = await this.fetchDom(url);
    let elements = Array.from(
      document.querySelectorAll('.chapterList div:nth-child(4) a').values()
    );
    if (!elements.length) {
      elements = Array.from(
        document.querySelectorAll('.chapListBody a').values()
      );
    }
    elements.forEach((element) => {
      const chapter = {
        title: element.textContent.trim(),
        url: this.urlJoin(
          URL.parse(item.url).origin,
          element.getAttribute('href')
        ),
      };
      chapters.push(chapter);
    });
    let pageNums = document.querySelectorAll('.select option').length;
    if (!pageNums) {
      pageNums = document.querySelectorAll('.dropDown li').length;
    }
    for (let i = 2; i <= pageNums; i++) {
      const url = `${URL.parse(item.url).origin}/index.php?action=loadChapterPage`;
      const form = new FormData();
      form.append('page', i);
      form.append('id', item.url.split('/').pop().replace('.html', ''));
      const response = await this.fetch(url, { method: 'POST', body: form });
      (await response.json()).data.forEach((chapter) => {
        const chapterItem = {
          title: chapter.chaptername,
          url: URL.parse(item.url).origin + chapter.chapterurl,
        };
        chapters.push(chapterItem);
      });
    }
    item.chapters = chapters;
    return item;
  }

  async getContent(item, chapter) {
    let url = chapter.url;
    const document = await this.fetchDom(url);
    let contentElements = document.querySelectorAll('.content p');
    return Array.from(contentElements.values())
      .map((element) => element.textContent)
      .join('\n');
  }

  openUrl = (_0x493axe, num) => {
    var __Ox125fa8 = [
      '\x73\x6C\x69\x64\x65\x44\x6F\x77\x6E',
      '\x73\x74\x6F\x70',
      '\x2E\x73\x75\x62\x5F\x6E\x61\x76',
      '\x63\x68\x69\x6C\x64\x72\x65\x6E',
      '\x68\x6F\x76\x65\x72',
      '\x61\x64\x64\x43\x6C\x61\x73\x73',
      '\x73\x6C\x69\x64\x65\x55\x70',
      '\x72\x65\x6D\x6F\x76\x65\x43\x6C\x61\x73\x73',
      '\x2E\x6E\x61\x76\x20\x6C\x69',
      '\x64\x69\x73\x70\x6C\x61\x79',
      '\x62\x6C\x6F\x63\x6B',
      '\x63\x73\x73',
      '\x2E\x68\x65\x61\x64\x65\x72\x57',
      '\x63\x6C\x69\x63\x6B',
      '\x2E\x6E\x61\x76\x4D\x20\x2E\x62\x74\x6E\x4D\x65\x6E\x75',
      '\x61\x61\x61\x61',
      '\x6C\x6F\x67',
      '\x6E\x6F\x6E\x65',
      '\x2E\x68\x65\x61\x64\x65\x72\x57\x20\x2E\x63\x6C\x6F\x73\x65',
      '\x2E\x6E\x61\x76\x4D\x20\x6C\x69\x20\x2E\x61\x72\x72\x6F\x77',
      '\x73\x68\x6F\x77',
      '\x68\x61\x73\x43\x6C\x61\x73\x73',
      '\x70\x61\x72\x65\x6E\x74',
      '\x73\x69\x62\x6C\x69\x6E\x67\x73',
      '\x2E\x6E\x61\x76\x4D\x20\x75\x6C\x20\x6C\x69\x20\x2E\x74\x69\x74\x6C\x65',
      '\x6D\x6F\x72\x65',
      '\x2E\x63\x68\x61\x70\x42\x6F\x78\x20\x2E\x63\x6F\x6E\x74\x65\x6E\x74',
      '\x2E\x62\x74\x6E\x52\x57\x20\x2E\x62\x74\x6E\x52\x65\x61\x64\x4D\x6F\x72\x65',
      '\x69\x6E\x64\x65\x78',
      '\x63\x75\x72',
      '\x2E\x63\x6F\x6E\x43',
      '\x2E\x63\x6F\x6E\x43\x5A',
      '\x65\x71',
      '\x2E\x63\x68\x61\x70\x42\x6F\x78\x20\x2E\x74\x61\x62\x20\x6C\x69',
      '\x2E\x70\x6F\x70\x75\x70\x41\x73\x6B\x20\x2E\x70\x6F\x70\x75\x70\x42\x6F\x78\x20\x2E\x63\x6C\x6F\x73\x65',
      '\x2E\x70\x6F\x70\x75\x70\x41\x73\x6B',
      '\x2E\x62\x74\x6E\x41\x73\x6B\x42\x6F\x6F\x6B',
      '\x66\x6F\x72\x6D',
      '\x70\x61\x72\x65\x6E\x74\x73',
      '\x76\x61\x6C',
      '\x69\x6E\x70\x75\x74\x5B\x63\x6C\x61\x73\x73\x3D\x22\x69\x6E\x70\x75\x74\x22\x5D',
      '\x66\x69\x6E\x64',
      '\x74\x65\x78\x74\x61\x72\x65\x61\x5B\x63\x6C\x61\x73\x73\x3D\x22\x74\x65\x78\x74\x61\x72\x65\x61\x22\x5D',
      '',
      '\u8BF7\u8F93\u5165\u4E66\u7C4D\u540D\u79F0',
      '\x6D\x73\x67',
      '\x2F\x69\x6E\x64\x65\x78\x2E\x70\x68\x70\x3F\x61\x63\x74\x69\x6F\x6E\x3D\x61\x73\x6B\x42\x6F\x6F\x6B',
      '\x63\x6F\x64\x65',
      '\x6A\x73\x6F\x6E',
      '\x70\x6F\x73\x74',
      '\x2E\x62\x74\x6E\x42\x6C\x75\x65',
      '\x2E\x70\x6F\x70\x75\x70\x45\x72\x72\x6F\x72\x20\x2E\x70\x6F\x70\x75\x70\x42\x6F\x78\x20\x2E\x63\x6C\x6F\x73\x65',
      '\x2E\x70\x6F\x70\x75\x70\x45\x72\x72\x6F\x72',
      '\x2E\x62\x74\x6E\x45\x72\x72\x6F\x72',
      '\x73\x65\x6C',
      '\x74\x6F\x67\x67\x6C\x65\x43\x6C\x61\x73\x73',
      '\x2E\x70\x6F\x70\x75\x70\x45\x72\x72\x6F\x72\x20\x2E\x70\x6F\x70\x75\x70\x42\x6F\x78\x20\x2E\x6C\x69\x73\x74\x20\x6C\x69',
      '\x2E\x70\x6F\x70\x75\x70\x53\x65\x74',
      '\x2E\x74\x6F\x70\x4D\x20\x2E\x62\x74\x6E\x53\x65\x74',
      '\x2E\x70\x6F\x70\x75\x70\x53\x65\x74\x20\x2E\x70\x6F\x70\x75\x70\x42\x6F\x78\x20\x2E\x63\x6C\x6F\x73\x65',
      '\x2E\x63\x6F\x6E\x52\x45',
      '\x2E\x63\x6F\x6E\x52\x45\x5A',
      '\x2E\x72\x65\x63\x6F\x42\x6F\x78\x20\x2E\x74\x61\x62\x20\x6C\x69',
      '\x2E\x72\x65\x63\x6F\x42\x6F\x78\x32\x20\x2E\x74\x61\x62\x20\x6C\x69',
      '\x73\x74\x6F\x70\x50\x72\x6F\x70\x61\x67\x61\x74\x69\x6F\x6E',
      '\x2E\x64\x72\x6F\x70\x44\x6F\x77\x6E',
      '\x6E\x6F\x74',
      '\x2E\x73\x65\x6C\x42\x6F\x78\x20\x2E\x62\x74\x6E',
      '\x74\x65\x78\x74',
      '\x2E\x74\x78\x74',
      '\x2E\x62\x74\x6E',
      '\x64\x61\x74\x61\x2D\x69\x6E\x66\x6F',
      '\x61\x74\x74\x72',
      '\x2E\x64\x6F\x77\x6E\x61\x62\x6F\x75\x74',
      '\x2E\x64\x6F\x77\x6E\x57',
      '\x70',
      '\x64\x61\x74\x61',
      '\x61\x69\x64',
      '\x2E\x73\x65\x6C\x42\x6F\x78\x20\x2E\x64\x72\x6F\x70\x44\x6F\x77\x6E\x20\x6C\x69',
      '\x6C\x65\x6E\x67\x74\x68',
      '\x2E\x73\x65\x6C\x42\x6F\x78\x20\x2E\x64\x72\x6F\x70\x44\x6F\x77\x6E\x20\x6C\x69\x3A\x65\x71\x28',
      '\x29',
      '\x2E\x73\x65\x6C\x42\x6F\x78',
      '\x2E\x73\x65\x6C\x42\x6F\x78\x20\x2E\x64\x72\x6F\x70\x44\x6F\x77\x6E',
      '\x2E\x6E\x65\x78\x74',
      '\x2E\x75\x70\x70\x65\x72',
      '\x2E\x62\x74\x6E\x53\x65\x61\x72\x63\x68',
      '\x69\x6E\x70\x75\x74\x5B\x6E\x61\x6D\x65\x3D\x22\x6B\x65\x79\x77\x6F\x72\x64\x22\x5D',
      '\u8BF7\u8F93\u5165\u5173\u952E\u8BCD',
      '\x68\x72\x65\x66',
      '\x6C\x6F\x63\x61\x74\x69\x6F\x6E',
      '\x7B\x6B\x65\x79\x77\x6F\x72\x64\x7D',
      '\x72\x65\x70\x6C\x61\x63\x65',
      '\x6F\x6E',
      '\x62\x6F\x64\x79',
      '\x2E\x73\x65\x6C\x42\x6F\x78\x20\x2E\x64\x72\x6F\x70\x44\x6F\x77\x6E\x20\x6C\x69\x2E\x63\x75\x72',
      '\x65\x61\x63\x68',
      '\x70\x61\x72\x73\x65',
      '\x42\x61\x73\x65\x36\x34',
      '\x65\x6E\x63',
      '\x73\x6C\x69\x63\x65',
      '\x77\x6F\x72\x64\x73',
      '\x63\x72\x65\x61\x74\x65',
      '\x57\x6F\x72\x64\x41\x72\x72\x61\x79',
      '\x6C\x69\x62',
      '\x73\x69\x67\x42\x79\x74\x65\x73',
      '\x74\x6F\x4C\x6F\x77\x65\x72\x43\x61\x73\x65',
      '\x75\x73\x65\x72\x41\x67\x65\x6E\x74',
      '\x73\x74\x72\x69\x6E\x67\x69\x66\x79',
      '\x55\x74\x66\x38',
      '\x43\x42\x43',
      '\x6D\x6F\x64\x65',
      '\x50\x6B\x63\x73\x37',
      '\x70\x61\x64',
      '\x64\x65\x63\x72\x79\x70\x74',
      '\x41\x45\x53',
      '\x6F\x70\x65\x6E',
      '\x2F\x69\x6E\x64\x65\x78\x2E\x70\x68\x70\x3F\x61\x63\x74\x69\x6F\x6E\x3D\x75\x70\x63\x6C\x69\x63\x6B',
      '\x6B\x65\x79\x43\x6F\x64\x65',
      '\x77\x68\x69\x63\x68',
      '\x31\x33',
      '\x75\x6E\x64\x65\x66\x69\x6E\x65\x64',
      '\u5220\u9664',
      '\u7248\u672C\u53F7\uFF0C\x6A\x73\u4F1A\u5B9A',
      '\u671F\u5F39\u7A97\uFF0C',
      '\u8FD8\u8BF7\u652F\u6301\u6211\u4EEC\u7684\u5DE5\u4F5C',
      '\x6A\x73\x6A\x69\x61',
      '\x6D\x69\x2E\x63\x6F\x6D',
    ];

    let _0x493axf =
      this.cryptoJs[__Ox125fa8[0x63]][__Ox125fa8[0x62]][__Ox125fa8[0x61]](
        _0x493axe
      );
    let _0x493ax10 = this.cryptoJs[__Ox125fa8[0x68]][__Ox125fa8[0x67]][
      __Ox125fa8[0x66]
    ](_0x493axf[__Ox125fa8[0x65]][__Ox125fa8[0x64]](0, 4), 16);
    let _0x493ax11 = this.cryptoJs[__Ox125fa8[0x68]][__Ox125fa8[0x67]][
      __Ox125fa8[0x66]
    ](
      _0x493axf[__Ox125fa8[0x65]][__Ox125fa8[0x64]](4),
      _0x493axf[__Ox125fa8[0x69]] - 16
    );
    let _0x493ax12 = this.ua;
    let _0x493ax13 =
      this.cryptoJs[__Ox125fa8[0x63]][__Ox125fa8[0x62]][__Ox125fa8[0x61]](num);
    const numStr =
      this.cryptoJs[__Ox125fa8[0x63]][__Ox125fa8[0x6d]][__Ox125fa8[0x6c]](
        _0x493ax13
      );
    let _0x493ax14 = this.cryptoJs[__Ox125fa8[0x63]][__Ox125fa8[0x6d]][
      __Ox125fa8[0x61]
    ](
      this.cryptoJs
        .MD5(_0x493ax12 + numStr)
        .toString()
        [__Ox125fa8[0x6a]]()
    );
    let _0x493ax15 = this.cryptoJs[__Ox125fa8[0x73]][__Ox125fa8[0x72]](
      {
        ciphertext: _0x493ax11,
      },
      _0x493ax14,
      {
        iv: _0x493ax10,
        mode: this.cryptoJs[__Ox125fa8[0x6f]][__Ox125fa8[0x6e]],
        padding: this.cryptoJs[__Ox125fa8[0x71]][__Ox125fa8[0x70]],
      }
    );
    return _0x493ax15.toString(this.cryptoJs[__Ox125fa8[0x63]].Utf8);
  };
}

export default TestBookExtension;
