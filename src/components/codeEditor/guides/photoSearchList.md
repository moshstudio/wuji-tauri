## 函数定义

```typescript
// 定义图片项接口
export interface PhotoItem {
  id: string; // 唯一标识
  title?: string | null; // 标题（可选）
  desc?: string | null; // 描述（可选）
  cover: string | string[]; // 封面图片URL，支持单张或多张
  coverHeaders?: Record<string, string> | null; // 封面图片请求头（可选）
  author?: string | null; // 作者（可选）
  datetime?: string | null; // 创建日期时间（可选）
  hot?: string | number | null; // 热度值（可选）
  view?: number | null; // 浏览次数（可选）
  url?: string | null; // 详情页URL（可选）
  noDetail?: boolean; // 是否没有详情页（默认为false）
  extra?: any | null; // 扩展字段（可选）
  sourceId: string; // 数据源ID(自动填充)
}

// 定义照片列表接口
export interface PhotoList {
  list: PhotoItem[]; // 数组
  page: number; // 当前页码
  pageSize?: number | null; // 每页数量（可选）
  totalPage?: number | null; // 总页数（可选）
}

// 抽象方法：获取搜索照片列表
// params: keyword - 关键词
// params: pageNo - 页码（可选）
// returns: Promise包装的PhotoList对象或null
abstract search(keyword: string, pageNo?: number): Promise<PhotoList | null>;

```

## 从DOM获取元素

```javascript
async function search(keyword, pageNo) {
  pageNo ||= 1;
  const url = `${this.baseUrl}search/page/${pageNo}/?s=${keyword}`;
  const document = await this.fetchDom(url);
  const list = await this.queryPhotoElements(document, {
    element: '.image-container .excerpt',
    title: 'h2 a',
    url: 'h2 a',
  });
  const pageElements = document.querySelectorAll('.pagination a, .pagination span');

  return {
    list,
    page: pageNo,
    totalPage: this.maxPageNoFromElements(pageElements),
  };
}
```

## 从api获取元素

```javascript
async function getRecommendList(pageNo) {
  pageNo ||= 1;
  const url = `${this.baseUrl}api/v1/posts/`;
  const params = { page: pageNo, keyword: keywrod };
  const response = await this.fetch(url, { body: params });
  const data = await response.json();
  const list = [];
  data.data.list.forEach((item) => {
    list.push({
      id: item.url,
      title: item.title,
      cover: item.cover,
      url: item.url,
    });
  });
  return { list, page: pageNo, totalPage: data.data.totalPage };
}
```
