class CustomPhotoExtension extends PhotoExtension {
  id = 'wai76';
  name = '心动美图';
  version = '1.0.0';

  constructor() {
    super();
    this.baseUrl = 'https://www.wai76.com/';
    this.headers = {
      Referer: this.baseUrl,
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };
    this.imgHeaders = { Referer: this.baseUrl };
    this.pageSize = 20;
  }

  _fetchOpts() {
    return { verify: false, headers: this.headers };
  }

  _text(html) {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(String(html), 'text/html');
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
  }

  _abs(path) {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    return this.urlJoin(this.baseUrl, path);
  }

  _mapPost(post) {
    const media =
      post._embedded &&
      post._embedded['wp:featuredmedia'] &&
      post._embedded['wp:featuredmedia'][0];
    return {
      id: String(post.id),
      title: this._text(post.title && post.title.rendered),
      desc: this._text(post.excerpt && post.excerpt.rendered),
      cover: (media && media.source_url) || '',
      coverHeaders: this.imgHeaders,
      datetime: (post.date || '').slice(0, 10),
      url: post.link,
    };
  }

  async _listPosts(pageNo, extra) {
    const params = new URLSearchParams({
      page: String(pageNo),
      per_page: String(this.pageSize),
      _embed: 'wp:featuredmedia',
      _fields: 'id,date,link,title,excerpt,_links',
    });
    if (extra) {
      Object.keys(extra).forEach((key) => {
        if (extra[key] != null && extra[key] !== '') params.set(key, extra[key]);
      });
    }
    const response = await this.fetch(
      `${this.baseUrl}wp-json/wp/v2/posts?${params.toString()}`,
      this._fetchOpts(),
    );
    if (!response || response.status === 400) {
      return { list: [], page: pageNo, pageSize: this.pageSize, totalPage: pageNo };
    }
    if (!response.ok) return null;
    const data = await response.json();
    return {
      list: (Array.isArray(data) ? data : []).map((post) => this._mapPost(post)),
      page: pageNo,
      pageSize: this.pageSize,
      totalPage: Number(response.headers.get('X-WP-TotalPages')) || pageNo,
    };
  }

  async getRecommendList(pageNo) {
    pageNo ||= 1;
    return this._listPosts(pageNo);
  }

  async search(keyword, pageNo) {
    pageNo ||= 1;
    return this._listPosts(pageNo, { search: keyword });
  }

  async getPhotoDetail(item) {
    const id = String(item.id || '').replace(/\D/g, '') || item.id;
    const response = await this.fetch(
      `${this.baseUrl}wp-json/wp/v2/posts/${id}?_fields=id,content`,
      this._fetchOpts(),
    );
    if (!response || !response.ok) return null;
    const post = await response.json();
    const html = (post.content && post.content.rendered) || '';
    const photos = [];
    const seen = {};
    const re = /data-src=["']([^"']+)["']/g;
    let match;
    while ((match = re.exec(html))) {
      const src = this._abs(match[1]);
      if (src && !seen[src]) {
        seen[src] = true;
        photos.push(src);
      }
    }
    return {
      item,
      photos,
      photosHeaders: this.imgHeaders,
      page: 1,
      totalPage: 1,
    };
  }
}

return CustomPhotoExtension;
