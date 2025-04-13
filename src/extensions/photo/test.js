import { PhotoExtension } from '.';

class TestPhotoExtension extends PhotoExtension {
  id = 'testPhoto';
  name = 'ceshi';
  version = '0.0.1';
  baseUrl = 'https://kkmzt.com/';

  async getRecommendList(pageNo) {
    pageNo ||= 1;
    const url = `${this.baseUrl}photo/page/${pageNo}/`;
    const document = await this.fetchDom(url, {
      headers: { 'Upgrade-Insecure-Requests': '1', 'Referer': this.baseUrl },
    });
    const list = await this.queryPhotoElements(document, {
      element: 'main .uk-card',
      cover: 'img',
      title: '.uk-card-body a',
      url: 'a',
      datetime: '.uk-article-meta',
    });
    list.forEach((item) => {
      item.coverHeaders = { Referer: this.baseUrl };
    });

    const pageItems = document?.querySelectorAll('.uk-pagination li');
    return {
      list,
      page: pageNo,
      totalPage: this.maxPageNoFromElements(pageItems),
    };
  }

  async search(keyword, pageNo) {
    pageNo ||= 1;
    const url = `${this.baseUrl}search/${keyword}/page/${pageNo}/`;

    const document = await this.fetchDom(url, {
      headers: { 'Upgrade-Insecure-Requests': '1', 'Referer': this.baseUrl },
    });
    const list = await this.queryPhotoElements(document, {
      element: '.uk-article',
      cover: 'img',
      title: 'h2 a',
      url: 'a',
      datetime: 'time',
    });
    list.forEach((item) => {
      item.coverHeaders = { Referer: URL.parse(item.cover).origin };
    });

    const pageItems = document?.querySelectorAll('.uk-pagination li');
    return {
      list,
      page: pageNo,
      totalPage: this.maxPageNoFromElements(pageItems),
    };
  }

  async getPhotoDetail(item, pageNo) {
    const firstResponse = await this.fetch(item.url, {
      headers: { 'Upgrade-Insecure-Requests': '1', 'Referer': this.baseUrl },
    });
    const element = new DOMParser().parseFromString(
      await firstResponse.text(),
      'text/html',
    );
    const img = element?.querySelector('.uk-container img');
    const imgSrc = img?.getAttribute('src');
    // 使用 / 进行分割，去除最后一个，然后重新拼接
    const imgPrefix = imgSrc?.split('/').slice(0, -1).join('/');

    const pid = item.url?.split('/').pop();
    const url = `${this.baseUrl}app/post/p?id=${pid}`;

    const response = await this.fetch(url, {
      headers: {
        'Upgrade-Insecure-Requests': '1',
        'Referer': this.baseUrl,
      },
    });

    const encryptData = (await response.json()).data;
    const iv = Array.from({ length: 16 }, (_, i) =>
      ((Number.parseInt(pid) % (i + 3)) % 9).toString()).join('');
    const data = this.decryptPid(pid, encryptData, iv);
    return {
      item,
      photos: data.map(link => this.urlJoin(imgPrefix, link)),
      photosHeaders: { Referer: imgPrefix },
      page: pageNo || 1,
      totalPage: pageNo || 1,
    };
  }

  decryptPid(pid, encryptData, iv) {
    // 常量
    const sign = 'Bxk80i9Rt';
    // 生成签名 s
    const s = this.cryptoJs.MD5(pid + sign).toString();
    // 生成密钥 splitWord
    const key = this.cryptoJs
      .MD5(iv + s)
      .toString()
      .substring(8, 24);
    // 从 encryptData 中提取加密数据
    const data1 = encryptData.split(s)[1];
    // 将16进制字符串转换为Base64编码
    const base64 = this.cryptoJs.enc.Base64.stringify(
      this.cryptoJs.enc.Hex.parse(data1),
    );

    const decryptedData = this.cryptoJs.AES.decrypt(
      base64,
      this.cryptoJs.enc.Utf8.parse(key),
      {
        iv: this.cryptoJs.enc.Utf8.parse(iv),
      },
    )
      .toString(this.cryptoJs.enc.Utf8)
      .toString();

    // 解析 JSON 并返回
    return JSON.parse(decryptedData.toString());
  }
}

export default TestPhotoExtension;
