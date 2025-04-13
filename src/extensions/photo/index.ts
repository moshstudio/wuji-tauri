import { Extension, transformResult } from '../baseExtension';

export interface PhotoItem {
  id: string;
  title?: string | null;
  desc?: string | null;
  cover: string | string[];
  coverHeaders?: Record<string, string> | null;
  author?: string | null;
  datetime?: string | null;
  hot?: string | number | null;
  view?: number | null;
  url?: string | null;
  noDetail?: boolean; // 是否具有详情页
  extra?: any | null;
  sourceId: string;
}

export interface PhotoList {
  list: PhotoItem[];
  page: number;
  pageSize?: number | null;
  totalPage?: number | null;
}

export interface PhotoDetail {
  item: PhotoItem;
  photos: string[];
  photosHeaders?: Record<string, string> | null;
  page: number;
  pageSize?: number | null;
  totalPage?: number | null;
  extra?: any | null;
  sourceId: string;
}

export interface PhotoShelf {
  id: string; // 图库id
  name: string; // 图库名称
  photos: PhotoItem[];
  photosHeaders?: Record<string, string> | null;
  createTime: number; // 创建时间
}

abstract class PhotoExtension extends Extension {
  hasDetailPage: boolean = true;

  public constructor() {
    super();
  }

  @transformResult<PhotoList | null>((r) => {
    if (r) {
      r.list.forEach((item) => {
        item.id = String(item.id);
      });
    }
    return r;
  })
  async execGetRecommendList(pageNo?: number) {
    const ret = await this.getRecommendList(pageNo);
    ret?.list.forEach((item) => {
      item.sourceId = String(this.id);
    });
    return ret;
  }
  // 1. 首页推荐
  abstract getRecommendList(pageNo?: number): Promise<PhotoList | null>;

  @transformResult<PhotoList | null>((r) => {
    if (r) {
      r.list.forEach((item) => {
        item.id = String(item.id);
      });
    }
    return r;
  })
  async execSearch(keyword: string, pageNo?: number) {
    const ret = await this.search(keyword, pageNo);
    ret?.list.forEach((item) => {
      item.sourceId = String(this.id);
    });
    return ret;
  }
  // 2. 搜索
  abstract search(keyword: string, pageNo?: number): Promise<PhotoList | null>;

  @transformResult<PhotoDetail | null>((r) => {
    if (r) {
      r.item.id = String(r.item.id);
    }
    return r;
  })
  async execGetPhotoDetail(item: PhotoItem, pageNo?: number) {
    const ret = await this.getPhotoDetail(item, pageNo);
    if (ret) {
      ret.item.sourceId = String(this.id);
    }
    return ret;
  }
  // 3. 获取图片详情
  abstract getPhotoDetail(
    item: PhotoItem,
    pageNo?: number,
  ): Promise<PhotoDetail | null>;
}

function loadPhotoExtensionString(
  codeString: string,
): PhotoExtension | undefined {
  try {
    const func = new Function('PhotoExtension', codeString);
    const extensionclass = func(PhotoExtension);
    return new extensionclass();
  }
  catch (error) {
    console.error('Error executing code:\n', error);
    // showNotify({
    //   type: 'danger',
    //   message: String(error),
    // });
  }
}

export { loadPhotoExtensionString, PhotoExtension };
