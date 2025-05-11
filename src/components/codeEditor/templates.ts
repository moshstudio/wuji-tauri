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
  const data = await this.fetch(url);

  if (!data) {
    return null;
  }
  if (data instanceof String) {
    return null;
  }
  const list = [];
  data.result.results.forEach((ele) => {
    list.push({
      name: ele.songData.songName,
      artists: [ele.songData.singerName],
      id: ele.songData.songId || this.nanoid(),
      cid: ele.songData.copyrightId,
      lyric: ele.songData.lyricLrc,
      album: ele.songData.albumData,
      mvId: ele.songData.mvData,
      mvCid: ele.songData.mvData?.copyrightId,
      url: ele.songData.listenUrl,
      picUrl: ele.songData.picM,
      bigPicUrl: ele.songData.picL,
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
  response.musics.forEach((ele) => {
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
