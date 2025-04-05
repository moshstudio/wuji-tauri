import _ from 'lodash';
import { Extension, transformResult } from '../baseExtension';
import { nanoid } from 'nanoid';

export interface VideoUrlMap {
  url: string;
  headers?: Record<string, string> | null;
}

export interface VideoEpisode {
  id: string;
  title: string;
  url?: string;
  extra?: any;
  lastWatchPosition?: number;
}

export interface VideoResource {
  id: string;
  title: string;
  url?: string;
  episodes?: VideoEpisode[];
  extra?: any;
}

export interface VideoItem {
  id: string;
  title: string;
  intro?: string;
  cover?: string;
  coverHeaders?: Record<string, string> | null;
  releaseDate?: string;
  country?: string;
  duration?: string;
  director?: string;
  cast?: string;
  tags?: string[] | string;
  status?: string;
  latestUpdate?: string;
  url?: string;
  resources?: VideoResource[];
  lastWatchResourceId?: string;
  lastWatchEpisodeId?: string;
  extra?: Record<string, any>;
  sourceId: string;
}

export interface VideoList {
  id?: string;
  list?: VideoItem[];
  page: number;
  pageSize?: number | null;
  totalPage?: number | null;
  type?: string;
}

export type VideosList = VideoList | VideoList[];

export interface VideoItemInShelf {
  video: VideoItem;
  createTime?: number;
  extra?: any;
}

export interface VideoShelf {
  id: string; // 书架id
  name: string; // 书架名称
  videos: VideoItemInShelf[];
  createTime: number; // 创建时间
}

abstract class VideoExtension extends Extension {
  public constructor() {
    super();
  }

  @transformResult<VideosList | null>((r) => {
    if (r) {
      _.castArray(r).forEach((videoList) => {
        videoList.id = String(videoList.id) || nanoid();
        videoList.list?.forEach((videoItem) => {
          videoItem.id = String(videoItem.id);
        });
      });
    }
    return r;
  })
  async execGetRecommendVideos(pageNo?: number, type?: string) {
    const ret = await this.getRecommendVideos(pageNo, type);
    if (ret) {
      _.castArray(ret).forEach((videoList) => {
        videoList.list?.forEach((videoItem) => {
          videoItem.sourceId = String(this.id);
        });
      });
    }
    return ret;
  }
  // 1. 首页推荐
  abstract getRecommendVideos(
    pageNo?: number,
    type?: string
  ): Promise<VideosList | null>;

  @transformResult<VideosList | null>((r) => {
    if (r) {
      _.castArray(r).forEach((videoList) => {
        videoList.id = String(videoList.id || nanoid());
        videoList.list?.forEach((videoItem) => {
          videoItem.id = String(videoItem.id);
        });
      });
    }
    return r;
  })
  async execSearch(keyword: string, pageNo?: number) {
    const ret = await this.search(keyword, pageNo);
    if (ret) {
      _.castArray(ret).forEach((videoList) => {
        videoList.list?.forEach((videoItem) => {
          videoItem.sourceId = String(this.id);
        });
      });
    }
    return ret;
  }
  // 2. 搜索
  abstract search(keyword: string, pageNo?: number): Promise<VideosList | null>;

  @transformResult<VideoItem | null>((r) => {
    // 放到execGetVideoDetail优先执行
    return r;
  })
  async execGetVideoDetail(item: VideoItem) {
    const ret = await this.getVideoDetail(_.cloneDeep(item));
    if (ret) {
      ret.id = String(ret.id);
      let index = 1;
      ret.resources?.forEach((resource) => {
        if (!resource.title) {
          resource.title = `播放地址${index}`;
          index += 1;
        }
        resource.id = String(
          resource.id || resource.url || resource.title || nanoid()
        );
        resource.episodes?.forEach((episode) => {
          episode.id = String(
            episode.id || episode.url || episode.title || nanoid()
          );
        });
      });

      ret.sourceId = String(this.id);
      ret.lastWatchResourceId = item.lastWatchResourceId;
      ret.lastWatchEpisodeId = item.lastWatchEpisodeId;
      ret.resources?.forEach((resource) => {
        const oldResource = item.resources?.find((r) => r.id === resource.id);
        if (oldResource) {
          resource.episodes?.forEach((episode) => {
            const oldEpisode = oldResource.episodes?.find(
              (e) => e.id === episode.id
            );
            if (oldEpisode) {
              episode.lastWatchPosition = oldEpisode.lastWatchPosition;
            }
          });
        }
      });
    }
    return ret;
  }
  // 3. 获取章节
  abstract getVideoDetail(item: VideoItem): Promise<VideoItem | null>;

  @transformResult<string | null>((r) => {
    return r;
  })
  execGetPlayUrl(
    item: VideoItem,
    resource: VideoResource,
    episode: VideoEpisode
  ) {
    return this.getPlayUrl(item, resource, episode);
  }
  // 4. 获取内容
  abstract getPlayUrl(
    item: VideoItem,
    resource: VideoResource,
    episode: VideoEpisode
  ): Promise<VideoUrlMap | null>;
}

function loadVideoExtensionString(
  codeString: string
): VideoExtension | undefined {
  try {
    const func = new Function('VideoExtension', codeString);
    const extensionclass = func(VideoExtension);
    return new extensionclass();
  } catch (error) {
    console.error('Error executing code:\n', error);
  }
}

export { VideoExtension, loadVideoExtensionString };
