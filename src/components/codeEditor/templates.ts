export const PHOTO_CONSTRUCTOR = `
constructor() {
  super();
  this.baseUrl = 'https://v2.jk.rs/';
}
`;
export const PHOTO_LIST = `
async getRecommendList(pageNo) {
  pageNo ||= 1;
  let url = \`\${this.baseUrl}page/\${pageNo}/\`;
  const document = await this.fetchDom(url, { verify: false });
  const lists = await this.queryPhotoElements(document, {
    element: '#masonry .item',
    cover: 'img',
    title: '.item-link-text',
    hot: '.item-num',
    url: '.item-link',
  });
  const pageElements = document.querySelectorAll('.page-navigator a');
  return {
    list: lists,
    page: pageNo,
    totalPage: this.maxPageNoFromElements(pageElements),
  };
}`;

export const PHOTO_SEARCH = `
async search(keyword, pageNo) {
  pageNo ||= 1;
  let url = \`\${this.baseUrl}search/\${keyword}/\`;
  const document = await this.fetchDom(url, { verify: false });
  const lists = await this.queryPhotoElements(document, {
    element: '#masonry .item',
    cover: 'img',
    title: '.item-link-text',
    hot: '.item-num',
    url: '.item-link',
  });
  const pageElements = document.querySelectorAll('.page-navigator a');
  return {
    list: lists,
    page: pageNo,
    totalPage: this.maxPageNoFromElements(pageElements),
  };
}`;

export const PHOTO_DETAIL = `
async getPhotoDetail(item, pageNo) {
  const document = await this.fetchDom(item.url, { verify: false });
    const imgs = document.querySelectorAll('#masonry img');
    const imgItems = Array.from(imgs).map((img) =>
      img.getAttribute('data-original')
    );
    return {
      item,
      photos: imgItems,
      page: 1,
      totalPage: 1,
    };
}`;

export const SONG_CONSTRUCTOR = `
constructor() {
  super();
  this.baseUrl = 'https://music.migu.cn/';
}
`;

export const SONG_PLAYLIST = `
async getRecommendPlaylists(pageNo) {
  pageNo ||= 1;
  const url = \`http://m.music.migu.cn/migu/remoting/playlist_bycolumnid_tag?playListType=2&type=1&columnId=15127272&tagId=&startIndex=\${(pageNo - 1) * 10}\`;
  const data = await this.fetch(url);

  const list = [];
  data.retMsg.playlist.forEach((ele) => {
    list.push({
      name: ele.playListName,
      id: ele.playListId,
      picUrl: ele.image,
      desc: ele.summary,
      createTime: ele.createTime,
      creator: {
        id: ele.createUserId,
        name: ele.createName,
      },
      songCount: ele.contentCount,
      playCount: ele.playCount,
      extra: { type: ele.playListType },
    });
  });
  return {
    list,
    page: pageNo,
    totalPage: Math.ceil(Number(data.retMsg.countSize) / 10),
  };
}
`;

export const SONG_SEARCH_PLAYLIST = `
async searchPlaylists(keyword, pageNo) {
  pageNo ||= 1;
  const url =
    \`https://m.music.migu.cn/migu/remoting/scr_search_tag\` +
    \`?keyword=\${keyword}&pgc=\${pageNo}&rows=10&type=6\`;
  const response = await this.fetch(url);

  const list = [];
  response.songLists.forEach((ele) => {
    list.push({
      name: ele.name,
      id: ele.id,
      picUrl: ele.img,
      songCount: ele.musicNum,
      playCount: ele.playNum,
      extra: { userId: ele.userId, type: ele.songlistType },
    });
  });
  return {
    list,
    page: pageNo,
    totalPage: response.pgt,
  };
}
`;

export const SONG_LIST = `
async getRecommendSongs(pageNo) {
  pageNo ||= 1;
  const url =
    \`http://m.music.migu.cn/migu/remoting/cms_list_tag\` +
    \`?pageSize=10&nid=23853978&pageNo=\${pageNo - 1}\`;
  const response = await this.fetch(url);

  if (!response.ok) {
    return null;
  }
  const data = await response.json();
  const list = [];
  data.result.results.forEach((ele) => {
  const d = ele.songData;
    list.push({
      name: d.songName,
      artists: [d.singerName],
      id: d.songId,
      cid: d.copyrightId,
      lyric: d.lyricLrc,
      album: d.albumData,
      mvId: d.mvData,
      mvCid: d.mvData?.copyrightId,
      url: d.listenUrl,
      picUrl: d.picM,
      bigPicUrl: d.picL,
    });
  });

  return {
    list,
    page: pageNo,
    pageSize: data.result.pageSize,
    totalPage: Math.ceil(
      Number(data.result.totalCount) / data.result.pageSize
    ),
  };
}
`;

export const SONG_SEARCH_LIST = `
async searchSongs(keyword, pageNo) {
  pageNo ||= 1;
  const url =
    \`https://m.music.migu.cn/migu/remoting/scr_search_tag\` +
    \`?keyword=\${keyword}&pgc=\${pageNo}&rows=10&type=2\`;
  const response = await this.fetch(url);

  const songs = [];
  const data = await response.json();
  data.musics.forEach((ele) => {
    songs.push({
      name: ele.songName,
      artists: [ele.singerName],
      id: ele.id || this.nanoid(),
      cid: ele.copyrightId,
      lyric: ele.lyric,
      album: ele.albumId,
      mvId: ele.mvId,
      mvCid: ele.mvCopyrightId,
      picUrl: '',
      sourceId: '',
    });
  });
  return {
    list: songs,
    page: pageNo,
    pageSize: 10,
    totalPage: response.pgt,
  };
}
`;

export const SONG_PLAYLIST_DETAIL = `
async getPlaylistDetail(item, pageNo) {
  pageNo ||= 1;
  if (pageNo == 1) {
    const url = \`http://m.music.migu.cn/migu/remoting/query_playlist_by_id_tag?onLine=1&queryChannel=0&createUserId=\${item.extra?.userId || 'migu'}&contentCountMin=5&playListId=\${item.id}\`;
    const playListRes = await this.fetch(url);
    const listInfo = playListRes?.rsp?.playList[0];
    if (listInfo) {
      const {
        createUserId,
        playCount,
        contentCount,
        summary: desc,
        createTime,
        updateTime,
      } = listInfo;
      item.playCount = playCount;
      item.songCount = contentCount;
      item.desc = desc;
      item.creator = {
        id: createUserId,
        name: item.creator?.name,
      };
      item.createTime = createTime;
      item.updateTime = updateTime;
    }
  }

  const newUrl = \`http://m.music.migu.cn/migu/remoting/playlistcontents_query_tag?playListType=\${item.extra.type}&playListId=\${item.id}&contentCount=\${item.songCount}\`;
  const playListRes = await this.fetch(newUrl);
  const songs = [];

  playListRes.contentList.forEach((s) => {
    songs.push({
      id: s.songId,
      cid: s.contentId,
      name: s.contentName,
      artists: s.singerName?.split(','),
    });
  });
  item.list = {
    list: songs,
    page: pageNo,
    totalPage: 1,
  };

  return item;
}
`;

export const SONG_PLAY_URL = `
async getSongUrl(item, size) {
  const cid = item.cid;
  if (!cid) {
    return null;
  }

  for (const quality of ['PQ', 'HQ', 'SQ']) {
    const url =
      \`https://app.c.nf.migu.cn/MIGUM2.0/strategy/listen-url/v2.2\` +
      \`?netType=01&resourceType=E&songId=\${item.id}&toneFlag=\${quality}\`;
    const response = await this.fetch(url, {
      headers: {
        channel: '0146951',
        uuid: '1234',
      },
    });
    if (!response || response.info?.includes('歌曲下线')) {
      return null;
    }
    if (response.data?.url) {
      return {
        '128k': response.data.url,
        lyric: item.lyric || (await this.getLyric(item)),
      };
    }
  }
  return null;
}
`;

export const SONG_LYRIC = `
async getLyric(item) {
  const cid = item.cid;
  if (!cid) {
    return null;
  }
  const url =
    \`http://music.migu.cn/v3/api/music/audioPlayer/getLyric\` +
    \`?copyrightId=\${cid}\`;
  const response = await this.fetch(url);
  return response.lyric;
}
`;

export const BOOK_CONSTRUCTOR = `
constructor() {
  super();
  this.baseUrl = 'http://appi.kuwo.cn/';
  this.headers = {
        "Accept": "*/*",
        "Connection": "Close",
        "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 8.0.0; LND-AL40 Build/HONORLND-AL40)",
    }
}
`;

export const BOOK_LIST = `
async getRecommendBooks(pageNo, type) {
  pageNo = pageNo || 1;
  const url = this.urlJoin(this.baseUrl, \`novels/api/book/search?keyword=玄幻&pi=\${pageNo}&ps=30\`);
  const response = await this.fetch(url);
  
  const json = await response.json();
  
  if (json.code != 200) return;
  
  const list = [];
  json.data.forEach((b)=>{
    list.push({
      id: b.book_id,
      title: b.title,
      desc: b.intro,
      cover: b.cover_url,
      author: b.author_name

    })
  })
  return {
    list,
    page: pageNo,
    totalPage: Math.ceil(json.paging.count / 30),
  };
}`;

export const BOOK_SEARCH = `
async search(keyword, pageNo) {
  pageNo = pageNo || 1;
  const url = this.urlJoin(this.baseUrl, \`novels/api/book/search?keyword=\${keyword}&pi=\${pageNo}&ps=30\`);
  const response = await this.fetch(url);
  
  const json = await response.json();
  
  if (json.code != 200) return;
  
  const list = [];
  json.data.forEach((b)=>{
    list.push({
      id: b.book_id,
      title: b.title,
      desc: b.intro,
      cover: b.cover_url,
      author: b.author_name

    })
  })
  return {
    list,
    page: pageNo,
    totalPage: Math.ceil(json.paging.count / 30),
  };
}`;

export const BOOK_DETAIL = `
async getBookDetail(item, pageNo) {
  const url = item.id;

  const response = await this.fetch(url);
  const body = new DOMParser().parseFromString(await response.text(), "text/html");

  const chapterElements = body.querySelectorAll("#chapterList a");
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
`;

export const BOOK_CONTENT = `
async getContent(item, chapter) {
  let content = "";
  let nextPageUrl = chapter.url;
  while (nextPageUrl) {
    const response = await this.fetch(nextPageUrl);
    const body = new DOMParser().parseFromString(await response.text(), "text/html");
    const elements = body.querySelectorAll("#TextContent p");
    elements.forEach((p) => {
      content += p.textContent + "\\n";
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
`;

export const COMIC_CONSTRUCTOR = `
constructor() {
  super();
  this.baseUrl = 'https://manhuafree.com/';
}
`;

export const COMIC_LIST = `
async getRecommendComics(pageNo, type) {
  let items = [
    {
      name: '人气推荐',
      tag: 'hots',
    },
    {
      name: '热门更新',
      tag: 'dayup',
    },
    {
      name: '最新上架',
      tag: 'newss',
    },
  ];
  if (!type) {
    return items.map((item) => ({
      type: item.name,
      list: [],
      page: pageNo,
      totalPage: 1,
      sourceId: '',
    }));
  }
  const item = items.find((item) => item.name === type);
  if (!item) return null;
  pageNo = pageNo || 1;
  const url = this.urlJoin(this.baseUrl, item.tag);
  const document = await this.fetchDom(url, {verify: false});
  const list = await this.queryComicElements(document, {
    element: '.container .cardlist a[href]',
    cover: 'img',
    title: '.cardtitle',
    url: null
  })
  const pageElements = document.querySelectorAll('.container div:nth-child(4) a[href] button')
  return {
    list,
    page: pageNo,
    totalPage: this.maxPageNoFromElements(pageElements),
    type
  }
}`;

export const COMIC_SEARCH = `
async search(keyword, pageNo) {
  pageNo = pageNo || 1;
  const url = this.urlJoin(this.baseUrl, \`s/\${keyword}\`);
  
}`;

export const COMIC_DETAIL = `
async getComicDetail(item, pageNo) {
  const url = item.id;

  const response = await this.fetch(url);
  const body = new DOMParser().parseFromString(await response.text(), "text/html");

  const chapterElements = body.querySelectorAll("#chapterList a");
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
`;

export const COMIC_CONTENT = `
async getContent(item, chapter) {
  let content = "";
  let nextPageUrl = chapter.url;
  while (nextPageUrl) {
    const response = await this.fetch(nextPageUrl);
    const body = new DOMParser().parseFromString(await response.text(), "text/html");
    const elements = body.querySelectorAll("#TextContent p");
    elements.forEach((p) => {
      content += p.textContent + "\\n";
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
`;

export const VIDEO_CONSTRUCTOR = `
constructor() {
  super();
  this.baseUrl = "https://www.66s6.net/";
  this.headers = {
    "Upgrade-Insecure-Requests": "1",
    Origin: "https://www.66s6.net",
    Host: "www.66s6.net",
    Referer: "https://www.66s6.net/",
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "*/*",
  };
  this.searchIds = {};
}
`;

export const VIDEO_LIST = `
async getRecommendVideos(pageNo, type) {
  let items = [
    {
      name: "首页",
      tag: "",
    },
    {
      name: "喜剧",
      tag: "xijupian",
    },
  ];
  if (!type) {
    return items.map((item) => ({
      type: item.name,
      list: [],
      page: pageNo,
      totalPage: 1,
      sourceId: "",
    }));
  }
  const item = items.find((item) => item.name === type);
  if (!item) return null;
  pageNo = pageNo || 1;
  let url = \`\${this.baseUrl}\${item.tag}\`;
  if (pageNo > 1) {
    url += \`/index_\${pageNo}.html\`;
  }
  const document = await this.fetchDom(url);
  const list = await this.queryVideoElements(document, {
    element: "#post_container li",
    cover: "img",
    title: "h2 a",
    url: "h2 a",
    tag: ".info_category a",
    latestUpdate: ".info_date",
  });

  const pageElements = document.querySelectorAll(".pagination a");
  return {
    list,
    page: pageNo,
    totalPage: this.maxPageNoFromElements(pageElements),
  };
}`;

export const VIDEO_SEARCH = `
async search(keyword, pageNo) {
  pageNo ||= 1;
  let document;
  if (pageNo === 1 || !this.searchIds[keyword]) {
    const url = \`\${this.baseUrl}/e/search/1index.php\`;
    const body = \`show=title&tempid=1&tbname=article&mid=1&dopost=search&submit=&keyboard=\${keyword}\`;
    const response = await this.fetch(url, {
      method: "POST",
      body: body,
      headers: this.headers,
    });
    const text = await response.text();
    const searchId = URL.parse(response.url).searchParams.get("searchid");
    if (!searchId) return null;
    this.searchIds[keyword] = searchId;
    document = new DOMParser().parseFromString(text, "text/html");
  } else {
    const url = \`\${this.baseUrl}e/search/result/?page=\${pageNo}&searchid=\${this.searchIds[keyword]}\`;
    document = await this.fetchDom(url);
  }
  const list = await this.queryVideoElements(document, {
    element: "#post_container li",
    cover: "img",
    title: "h2 a",
    url: "h2 a",
    tag: ".info_category a",
    latestUpdate: ".info_date",
  });

  const pageElements = document.querySelectorAll(".pagination a");
  return {
    list,
    page: pageNo,
    totalPage: this.maxPageNoFromElements(pageElements),
  };
  
}`;

export const VIDEO_DETAIL = `
async getVideoDetail(item, pageNo) {
  pageNo ||= 1;
  const document = await this.fetchDom(item.url, { headers: this.headers });
  const pElements = Array.from(
    document.querySelectorAll("#post_content p").values()
  );
  let infoIndex = null;
  pElements.forEach((p, index) => {
    const text = p.textContent;
    if (text.includes("译　　名1")) {
      infoIndex = index;
      const infos = p.textContent
        .replace(/\\r?\\n|\\r/g, "", "")
        .split("◎")
        .map((info) => info.trim());

      if (infos.find((i) => i.startsWith("年　　代"))) {
        item.releaseDate = infos
          .find((i) => i.startsWith("年　　代"))
          .substring(5);
      }
      if (infos.find((i) => i.startsWith("产　　地"))) {
        item.country = infos
          .find((i) => i.startsWith("产　　地"))
          .substring(5);
      }
      if (infos.find((i) => i.startsWith("片　　长"))) {
        item.duration = infos
          .find((i) => i.startsWith("片　　长"))
          .substring(5);
      }
      if (infos.find((i) => i.startsWith("导　　演"))) {
        item.director = infos
          .find((i) => i.startsWith("导　　演"))
          .substring(5);
      }
      if (infos.find((i) => i.startsWith("主　　演"))) {
        item.cast = infos.find((i) => i.startsWith("主　　演")).substring(5);
      }
      if (infos.find((i) => i.startsWith("类　　别"))) {
        item.tags = infos.find((i) => i.startsWith("类　　别")).substring(5);
      }
    }
  });
  if (infoIndex !== null) {
    let introP = pElements[infoIndex + 1];
    if (!introP?.textContent || introP.textContent.includes("简　　介")) {
      introP = pElements[infoIndex + 2];
    }
    item.intro = introP?.textContent.trim();
  }

  const widgets = document.querySelectorAll(".context .widget.box.row");
  const resources = [];
  widgets.forEach((widget) => {
    const title = widget.querySelector("h3")?.textContent;
    if (!title) return;
    const resource = {
      id: title,
      title: title,
      episodes: [],
    };
    const elements = widget.querySelectorAll("a[title]");
    elements.forEach((element) => {
      const url = this.urlJoin(this.baseUrl, element.getAttribute("href"));
      resource.episodes.push({
        id: url,
        title: element.textContent,
        url: url,
      });
    });

    resources.push(resource);
  });
  item.resources = resources;
  return item;
}
`;

export const VIDEO_PLAY_URL = `
async getPlayUrl(item, resource, episode) {
  const document = await this.fetchDom(episode.url, {
    headers: this.headers,
  });
  const iframe = document.querySelector(".video iframe");
  let domExtractedUrl = "";
  if (iframe) {
    const url = iframe.getAttribute("src");
    const doc = await this.fetchDom(url);
    const scripts = doc.querySelectorAll("script");

    scripts.forEach((script) => {
      if (script.textContent.includes("url:")) {
        const urlMatch = script.textContent.match(/url:\\s*'([^']+)'/);
        if (urlMatch) {
          domExtractedUrl = urlMatch[1];
        }
      }
    });
  } else {
    const scripts = document.querySelectorAll("script");
    scripts.forEach((script) => {
      if (script.textContent.includes("source:")) {
        // source: "
        const urlMatch = script.textContent.match(/source: "([^"]+)"/);
        if (urlMatch) {
          domExtractedUrl = urlMatch[1];
        }
      }
    });
  }
  return { url: domExtractedUrl };
}
`;
