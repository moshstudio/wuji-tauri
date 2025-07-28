## 函数定义

```typescript
// 照片项接口 - 表示单个照片/图集的基本信息
export interface PhotoItem {
  id: string;                   // 唯一标识符
  title?: string | null;        // 可选标题（支持null）
  desc?: string | null;         // 可选描述（支持null）
  cover: string | string[];     // 封面图URL（单张或多张）
  coverHeaders?: Record<string, string> | null;  // 封面图请求头（可选）
  author?: string | null;       // 作者信息（可选）
  datetime?: string | null;     // 创建时间（可选）
  hot?: string | number | null; // 热度指标（支持字符串或数字）
  view?: number | null;         // 浏览次数（可选）
  url?: string | null;          // 详情页链接（可选）
  noDetail?: boolean;           // 标记是否没有详情页（默认false）
  extra?: any | null;           // 扩展字段（任意类型）
  sourceId: string;             // 数据源标识（自动填充）
}

// 照片详情接口 - 扩展的照片详情数据
export interface PhotoDetail {
  item: PhotoItem;                     // 关联的照片项
  photos: string[];                    // 详情页图片URL数组
  photosHeaders?: Record<string, string> | null;  // 图片请求头（可选）
  page: number;                        // 当前页码
  pageSize?: number | null;            // 每页数量（可选）
  totalPage?: number | null;           // 总页数（可选）
  extra?: any | null;                  // 扩展字段（任意类型）
  sourceId: string;                    // 数据源标识（自动填充）
}

/**
 * 抽象方法 - 获取照片详情
 * @param item 照片项对象（必传）
 * @param pageNo 页码（可选，默认未指定）
 * @returns 返回Promise包装的PhotoDetail对象或null
 */
abstract getPhotoDetail(
  item: PhotoItem,
  pageNo?: number,
): Promise<PhotoDetail | null>;
```

## 从DOM获取元素

```javascript
async getPhotoDetail(item, pageNo) {
  pageNo ||= 1;
  const url = this.urlJoin(item.url, `page/${pageNo}/`);
  const document = await this.fetchDom(url);
  const imgs = document.querySelectorAll('.image-container img');
  const imgItems = Array.from(imgs).map((img) =>
    this.urlJoin(URL.parse(item.url).origin, img.getAttribute('data-src')),
  );

  const pageElements = document.querySelectorAll(
    '.pagination a, .pagination span',
  );
  return {
    item,
    photos: imgItems,
    photosHeaders: { referer: item.url },
    page: pageNo,
    totalPage: this.maxPageNoFromElements(pageElements),
  };
}
```

## 从api获取元素

```javascript
async getPhotoDetail(item, pageNo) {
  pageNo ||= 1;
  const url = `${this.baseUrl}api/v1/posts/${item.id}/`;
  const response = await this.fetch(url);
  const data = await response.json();
  return {
    item,
    photos: data.data.photos,
    page: pageNo,
    totalPage: data.data.totalPage,
  }
}
```
