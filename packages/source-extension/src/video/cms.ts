import type {
  VideoEpisode,
  VideoItem,
  VideoList,
  VideoResource,
  VideosList,
  VideoUrlMap,
} from './index';
import { VideoExtension } from './index';

/**
 * CMS 源 API 响应类型定义（苹果CMS V10 标准接口）
 */
interface CmsVodListItem {
  vod_id: number;
  vod_name: string;
  type_id: number;
  type_name: string;
  vod_en: string;
  vod_time: string;
  vod_remarks: string;
  vod_play_from: string;
}

interface CmsVodDetailItem extends CmsVodListItem {
  vod_pic: string;
  vod_pic_thumb?: string;
  vod_actor: string;
  vod_director: string;
  vod_writer?: string;
  vod_blurb: string;
  vod_content: string;
  vod_area: string;
  vod_lang: string;
  vod_year: string;
  vod_sub?: string;
  vod_class?: string;
  vod_score?: string;
  vod_duration?: string;
  vod_pubdate?: string;
  vod_total?: number;
  vod_serial?: string;
  vod_isend?: number;
  vod_play_url: string;
  vod_play_server?: string;
  vod_play_note?: string;
  vod_down_from?: string;
  vod_down_url?: string;
}

interface CmsClassItem {
  type_id: number;
  type_pid?: number;
  type_name: string;
}

interface CmsApiResponse {
  code: number;
  msg: string;
  page: number;
  pagecount: number;
  limit: string;
  total: number;
  list: (CmsVodListItem | CmsVodDetailItem)[];
  class?: CmsClassItem[];
}

/**
 * 苹果CMS V10 标准接口适配器
 *
 * 使用方式：继承此类，只需设置 baseUrl 即可快速接入一个 CMS 源。
 *
 * @example
 * ```ts
 * class My360Source extends CmsVideoExtension {
 *   id = '360zy';
 *   name = '360资源';
 *   version = '1.0.0';
 *   baseUrl = 'https://360zy.com/api.php/provide/vod';
 *   // 可选：设置代理请求头，用于 m3u8/mp4 播放时携带
 *   proxyHeaders = { Referer: 'https://360zy.com/' };
 * }
 * ```
 */
abstract class CmsVideoExtension extends VideoExtension {
  /**
   * 每页数量，默认 20
   */
  pageSize = 20;

  /**
   * 是否过滤敏感/不适当的分类 Tab（如"伦理"等），默认为 true。
   * 设置为 false 可关闭过滤，显示所有分类。
   */
  filterSensitiveTypes = true;

  /**
   * 敏感分类关键词列表，分类名称包含其中任一关键词将被过滤。
   * 仅在 filterSensitiveTypes 为 true 时生效。
   * 子类可覆盖此属性以自定义过滤词。
   */
  sensitiveTypeKeywords: string[] = ['伦理', '福利', '情色', '成人'];

  /**cd
   * 可选的代理请求 headers
   *
   * 在 getPlayUrl 中，调用 getM3u8ProxyUrl / getProxyUrl 时会携带这些 headers。
   * 子类可在构造函数中设置，例如 Referer、User-Agent 等。
   *
   * @example
   * ```ts
   * this.proxyHeaders = { Referer: 'https://example.com/' };
   * ```
   */
  proxyHeaders?: Record<string, string>;

  public constructor() {
    super();
  }

  /**
   * 从 CMS 列表项转换为 VideoItem
   */
  protected cmsListItemToVideoItem(item: CmsVodListItem): VideoItem {
    return {
      id: String(item.vod_id),
      title: item.vod_name,
      tags: item.type_name || undefined,
      latestUpdate: item.vod_time || undefined,
      status: item.vod_remarks || undefined,
      url: String(item.vod_id),
      sourceId: '',
    };
  }

  /**
   * 从 CMS 详情项转换为 VideoItem（含播放资源）
   */
  protected cmsDetailItemToVideoItem(item: CmsVodDetailItem): VideoItem {
    // 解析简介：优先 vod_blurb，其次 vod_content（去除 HTML 标签）
    const intro =
      item.vod_blurb?.trim() ||
      item.vod_content?.replace(/<[^>]+>/g, '').trim() ||
      undefined;

    // 解析分类标签
    let tags: string[] | string | undefined;
    if (item.vod_class) {
      tags = item.vod_class
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean);
      if (tags.length === 1) tags = tags[0];
      if ((tags as string[]).length === 0) tags = item.type_name || undefined;
    } else {
      tags = item.type_name || undefined;
    }

    // 解析播放资源
    const resources = this.parseCmsPlayUrl(
      item.vod_play_from,
      item.vod_play_url,
    );

    return {
      id: String(item.vod_id),
      title: item.vod_name,
      intro,
      cover: item.vod_pic || undefined,
      releaseDate: item.vod_year || item.vod_pubdate || undefined,
      country: item.vod_area || undefined,
      duration: item.vod_duration || undefined,
      director: item.vod_director || undefined,
      cast: item.vod_actor || undefined,
      tags,
      status: item.vod_remarks || undefined,
      latestUpdate: item.vod_time || undefined,
      url: String(item.vod_id),
      resources,
      sourceId: '',
    };
  }

  /**
   * 解析 CMS 播放地址
   *
   * vod_play_from: "来源1$$$来源2"
   * vod_play_url:  "集1$url1#集2$url2$$$集1$url1#集2$url2"
   */
  protected parseCmsPlayUrl(
    playFrom: string,
    playUrl: string,
  ): VideoResource[] {
    if (!playUrl) return [];

    const sources = playFrom ? playFrom.split('$$$') : ['默认'];
    const urlGroups = playUrl.split('$$$');
    const resources: VideoResource[] = [];

    for (let i = 0; i < urlGroups.length; i++) {
      const sourceName = sources[i] || `播放源${i + 1}`;
      const episodeStr = urlGroups[i];
      if (!episodeStr?.trim()) continue;

      const episodes: VideoEpisode[] = [];
      const episodeParts = episodeStr.split('#');

      for (const part of episodeParts) {
        if (!part.trim()) continue;
        const dollarIndex = part.indexOf('$');
        if (dollarIndex === -1) continue;

        const title = part.substring(0, dollarIndex).trim();
        const url = part.substring(dollarIndex + 1).trim();
        if (!title || !url) continue;

        episodes.push({
          id: url,
          title,
          url,
        });
      }

      if (episodes.length > 0) {
        resources.push({
          id: sourceName,
          title: sourceName,
          episodes,
        });
      }
    }

    return resources;
  }

  /**
   * 构建 CMS API 请求 URL
   */
  protected buildApiUrl(params: Record<string, string | number>): string {
    const url = new URL(this.baseUrl);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  /**
   * 请求 CMS API
   */
  protected async fetchCmsApi(
    params: Record<string, string | number>,
  ): Promise<CmsApiResponse | null> {
    try {
      const url = this.buildApiUrl(params);
      const response = await this.fetch(url);
      if (!response.ok) {
        this.log(`CMS API request failed: ${response.status}`);
        return null;
      }
      return (await response.json()) as CmsApiResponse;
    } catch (error) {
      this.log(`CMS API request error: ${String(error)}`);
      return null;
    }
  }

  // ============ VideoExtension 抽象方法实现 ============

  private get _validClassesStorageKey(): string {
    return `cms_validClasses_${this.name}_${this.id}_${btoa(this.baseUrl)}`;
  }

  private _getValidClassesFromStorage(): CmsClassItem[] | null {
    try {
      const raw = localStorage.getItem(this._validClassesStorageKey);
      if (raw) {
        const data = JSON.parse(raw);
        const today = new Date().toDateString();
        if (data.date === today && Array.isArray(data.classes)) {
          return data.classes;
        } else {
          localStorage.removeItem(this._validClassesStorageKey);
        }
      }
    } catch {
      // ignore
    }
    return null;
  }

  private _setValidClassesToStorage(classes: CmsClassItem[]) {
    try {
      const today = new Date().toDateString();
      localStorage.setItem(
        this._validClassesStorageKey,
        JSON.stringify({ date: today, classes }),
      );
    } catch {
      // ignore
    }
  }

  /**
   * localStorage key，基于 name 和 id 保证唯一性
   */
  private get _classMapStorageKey(): string {
    return `cms_classMap_${this.name}_${this.id}_${btoa(this.baseUrl)}`;
  }

  /**
   * 分类名称 → 分类 ID 的缓存映射（持久化到 localStorage）
   */
  private get _classMap(): Record<string, number> {
    try {
      const raw = localStorage.getItem(this._classMapStorageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private set _classMap(value: Record<string, number>) {
    try {
      localStorage.setItem(this._classMapStorageKey, JSON.stringify(value));
    } catch (e) {
      this.log(`Failed to persist classMap to localStorage: ${String(e)}`);
    }
  }

  /**
   * 1. 首页推荐（懒加载模式）
   *
   * - 当 type 为空时：获取所有分类，返回 VideoList[]，每个分类的 list 为空。
   *   会先用第一个顶级分类试探性请求，判断该 CMS 源是否支持顶级分类查询：
   *   - 支持：使用顶级分类作为 Tab
   *   - 不支持：降级使用子分类作为 Tab
   *   前端 Tab 渲染时会通过 @rendered 事件触发加载具体分类的数据。
   * - 当 type 有值时（分类名称）：查找对应的 type_id，请求该分类的数据。
   */
  async getRecommendVideos(
    pageNo?: number,
    type?: string,
  ): Promise<VideosList | null> {
    pageNo ||= 1;

    if (!type) {
      // 检查每天缓存的有效分类
      let displayClasses = this._getValidClassesFromStorage();

      if (!displayClasses) {
        // 无指定分类（首页推荐）：获取分类列表
        const initData = await this.fetchCmsApi({ ac: 'list' });
        const classes = initData?.class || [];

        if (classes.length > 0) {
          // 缓存分类名称 → ID 的映射（整体赋值以触发 setter 持久化）
          const newClassMap: Record<string, number> = { ...this._classMap };
          for (const cls of classes) {
            newClassMap[cls.type_name] = cls.type_id;
          }
          this._classMap = newClassMap;
        }

        if (classes.length === 0) {
          return this.fetchCategoryVideos(pageNo);
        }

        const validClasses: CmsClassItem[] = [];
        const batchSize = 5;
        for (let i = 0; i < classes.length; i += batchSize) {
          const batch = classes.slice(i, i + batchSize);
          const results = await Promise.all(
            batch.map(async (cls) => {
              try {
                const probeData = await this.fetchCmsApi({
                  ac: 'detail',
                  t: cls.type_id,
                  pg: 1,
                });
                return {
                  cls,
                  isValid: !!(
                    probeData &&
                    (probeData.total > 0 ||
                      (probeData.list && probeData.list.length > 0))
                  ),
                };
              } catch {
                return { cls, isValid: false };
              }
            }),
          );
          for (const res of results) {
            if (res.isValid) {
              validClasses.push(res.cls);
            }
          }
        }

        displayClasses = validClasses;
        this._setValidClassesToStorage(validClasses);
      }

      // 过滤敏感/不适当的分类
      if (this.filterSensitiveTypes) {
        displayClasses = displayClasses.filter(
          (cls) =>
            !this.sensitiveTypeKeywords.some((keyword) =>
              cls.type_name.includes(keyword),
            ),
        );
      }

      if (displayClasses.length === 0) {
        return this.fetchCategoryVideos(pageNo);
      }

      // 返回所有分类，list 为空，等待 Tab 渲染时懒加载
      return displayClasses.map((cls) => ({
        type: cls.type_name,
        list: [],
        page: pageNo,
      }));
    } else {
      const typeId = this._classMap[type];

      if (!typeId) {
        return {
          list: [],
          page: 1,
          totalPage: 1,
          type,
        };
      }
      return this.fetchCategoryVideos(pageNo, typeId, type);
    }
  }

  /**
   * 获取指定分类的视频列表
   */
  protected async fetchCategoryVideos(
    pageNo: number,
    typeId?: number,
    typeName?: string,
  ): Promise<VideoList | null> {
    const params: Record<string, string | number> = {
      ac: 'detail',
      pg: pageNo,
    };

    if (typeId) {
      params.t = typeId;
    }

    const data = await this.fetchCmsApi(params);
    if (!data || !data.list) return null;

    const list: VideoItem[] = (data.list as CmsVodDetailItem[]).map((item) =>
      this.cmsDetailItemToVideoItem(item),
    );

    return {
      list,
      page: Number(data.page) || 1,
      totalPage: Number(data.pagecount) || null,
      pageSize: Number(data.limit) || this.pageSize,
      type: typeName || undefined,
    };
  }

  /**
   * 2. 搜索
   */
  async search(keyword: string, pageNo?: number): Promise<VideosList | null> {
    const data = await this.fetchCmsApi({
      ac: 'detail',
      wd: keyword,
      pg: pageNo || 1,
    });
    if (!data || !data.list) return null;

    const list: VideoItem[] = (data.list as CmsVodDetailItem[]).map((item) =>
      this.cmsDetailItemToVideoItem(item),
    );

    return {
      list,
      page: Number(data.page) || 1,
      totalPage: Number(data.pagecount) || null,
      pageSize: Number(data.limit) || this.pageSize,
    };
  }

  /**
   * 3. 获取视频详情（含集数和播放链接）
   */
  async getVideoDetail(item: VideoItem): Promise<VideoItem | null> {
    const vodId = item.id || item.url;
    if (!vodId) return null;

    const data = await this.fetchCmsApi({
      ac: 'detail',
      ids: vodId,
    });

    if (!data || !data.list || data.list.length === 0) return null;

    const detail = data.list[0] as CmsVodDetailItem;
    return this.cmsDetailItemToVideoItem(detail);
  }

  /**
   * 4. 获取播放地址
   *
   * CMS 源的播放地址已经在 detail 阶段解析好了，直接从 episode 的 url 返回。
   */
  async getPlayUrl(
    _item: VideoItem,
    _resource: VideoResource,
    episode: VideoEpisode,
  ): Promise<VideoUrlMap | null> {

    let url = episode.url;
    if (!url) return null;

    // 自动判断播放类型
    let type: VideoUrlMap['type'] = undefined;
    if (url.includes('.m3u8')) {
      type = 'm3u8';
      if (this.proxyHeaders) {
        url = (await this.getM3u8ProxyUrl(url, this.proxyHeaders)) || url;
      }
    } else if (url.includes('.mp4')) {
      type = 'mp4';
      if (this.proxyHeaders) {
        url = (await this.getProxyUrl(url, this.proxyHeaders)) || url;
      }
    } else {
      if (this.proxyHeaders) {
        url = (await this.getProxyUrl(url, this.proxyHeaders)) || url;
      }
    }

    return {
      url,
      type,
    };
  }

  /**
   * 获取 CMS 源的所有分类
   * 可以在子类中调用，用于构建分类导航
   */
  async getCategories(): Promise<CmsClassItem[]> {
    const data = await this.fetchCmsApi({ ac: 'list' });
    return data?.class || [];
  }
}

/**
 * 从代码字符串加载 CMS 视频扩展
 */
function loadCmsVideoExtensionString(
  codeString: string,
  raise = false,
): CmsVideoExtension | undefined {
  try {
    const func = new Function('CmsVideoExtension', codeString);
    const extensionclass = func(CmsVideoExtension);
    return new extensionclass();
  } catch (error) {
    console.error('Error executing code:\n', error);
    if (raise) throw error;
  }
}

export { CmsVideoExtension, loadCmsVideoExtensionString };
export type { CmsApiResponse, CmsClassItem, CmsVodDetailItem, CmsVodListItem };
