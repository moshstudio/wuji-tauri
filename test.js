class CustomComicExtension extends ComicExtension {
  id = 'zhOBTLwfYRRX4NPbVI2FE';
  name = 'goda漫画';

  
constructor() {
  super();
  this.baseUrl = 'https://manhuafree.com/';
}


  
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

}

  
async search(keyword, pageNo) {
  pageNo = pageNo || 1;
  const url = this.urlJoin(this.baseUrl, `s/${keyword}`);
  const document = await this.fetchDom(url, {verify: false});
  const list = await this.queryComicElements(document, {
    element: '.container .cardlist a[href]',
    cover: 'img',
    title: '.cardtitle',
    url: null
  })
  const pageElements = document.querySelectorAll('.container div:nth-child(6) a[href] button')
  return {
    list,
    page: pageNo,
    totalPage: this.maxPageNoFromElements(pageElements),
  }
}

  
async getComicDetail(item, pageNo) {
  const document = await this.fetchDom(item.url);
  const div = document.querySelector('#mangachapters');
  const dataMid = div.getAttribute('data-mid');
  
  const url = `https://api-get-v3.mgsearcher.com/api/manga/get?mid=${dataMid}&mode=all`
  const response = await this.fetch(url)
  const json = await response.json()
  
  item.intro = json.data.desc;

  const chapters = json.data.chapters.map((c) => {
    const url = this.urlJoin(this.baseUrl, `manga/${json.data.slug}/${c.attributes.slug}`);
    return {
      id: c.id,
      title: c.attributes.title,
      url
    };
  });
  item.chapters = chapters;

  return item;
}


  
async getContent(item, chapter) {
  const document = await this.fetchDom(chapter.url);
  const div = document.querySelector('#chapterContent');
  const ms = div.getAttribute('data-ms');
  const cs = div.getAttribute('data-cs');
  
  const url = `https://api-get-v3.mgsearcher.com/api/chapter/getinfo?m=${ms}&c=${cs}`
  const response = await this.fetch(url);
  const json = await response.json();
  const baseUrl = json.data.info.images.line=== 2 ? "https://f40-1-4.g-mh.online" : "https://t40-1-4.g-mh.online";
  const images = json.data.info.images.images.map((i) => {
    return this.urlJoin(baseUrl, i.url)
  })
  return {
    photos: images,
    page: 1,
    totalPage: 1,
  }
}


}

return CustomComicExtension;
