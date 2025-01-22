import { fetch } from '@/utils/fetch';

export interface HotItem {
  code: number;
  name: string;
  title: string;
  type: string;
  params: {
    type: {
      name: string;
      type: {
        [key: string]: string;
      };
    };
  };
  link: string;
  total: number;
  updateTime: string;
  fromCache: boolean;
  data: Array<{
    id: number;
    title: string;
    desc?: string;
    cover?: string;
    author: string;
    timestamp: number;
    hot: number;
    url: string;
    mobileUrl: string;
  }>;
}

export async function fetchHotApi(): Promise<HotItem[]> {
  const baseUrl = 'https://api-hot.imsyy.top/';
  const types = [
    'zhihu',
    'juejin',
    '36kr',
    'qq-news',
    'thepaper',
    'netease-news',
    'toutiao',
    'ithome',
    'bilibili',
    'douyin',
    'weibo',
    'baidu',
    'sspai',
    'tieba',
    'zhihu-daily',
    'hellogithub',
    'jianshu',
    // 'douban-movie',
    // 'douban-group',
    'weread',
    'ngabbs',
    'genshin',
    'starrail',
    'lol',
  ];
  const result: (HotItem | null)[] = await Promise.all(
    types.map(async (type) => {
      let url = `${baseUrl}${type}?cache=true`;
      try {
        let res = await fetch(url);
        const data = await res.json();
        if (type === 'sspai') {
          data.data.forEach((item: any) => {
            if (item.cover) {
              item.cover = undefined;
            }
          });
        }

        if (
          [
            'sspai',
            'ithome',
            'bilibili',
            'thepaper',
            'tieba',
            'jianshu',
          ].includes(type)
        ) {
          data.data.forEach((item: any) => {
            if (item.cover) {
              item.cover =
                'https://images.weserv.nl/?url=' +
                encodeURIComponent(item.cover);
            }
          });
        }
        return data;
      } catch (error) {
        console.log(`hot api error: ${url}`);
        return null;
      }
    })
  );
  return result.filter((item) => item !== null);
}
