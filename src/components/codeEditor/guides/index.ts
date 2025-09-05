import bookContentMD from './bookContent.md?raw';
import bookDetailMD from './bookDetail.md?raw';
import bookListMD from './bookList.md?raw';
import bookSearchListMD from './bookSearchList.md?raw';
import comicContentMD from './comicContent.md?raw';
import comicDetailMD from './comicDetail.md?raw';
import comicListMD from './comicList.md?raw';
import comicSearchListMD from './comicSearchList.md?raw';
import commonMD from './common.md?raw';
import photoDetailMD from './photoDetail.md?raw';
import photoListMD from './photoList.md?raw';
import photoSearchListMD from './photoSearchList.md?raw';
import songListMD from './songList.md?raw';
import lyricMD from './songLyric.md?raw';
import playlistMD from './songPlaylist.md?raw';
import playlistDetailMD from './songPlaylistDetail.md?raw';
import playUrlMD from './songPlayUrl.md?raw';
import searchSongListMD from './songSearchList.md?raw';
import searchPlaylistMD from './songSearchPlaylist.md?raw';
import videoDetailMD from './videoDetail.md?raw';
import videoListMD from './videoList.md?raw';
import videoPlayUrlMD from './videoPlayUrl.md?raw';
import videoSearchListMD from './videoSearchList.md?raw';

export const guideCommonMD = commonMD;

const photoConstructorMD = `构造函数必须填写baseUrl`;
const songConstructorMD = `构造函数必须填写baseUrl`;
const bookConstructorMD = `构造函数必须填写baseUrl`;
const comicConstructorMD = `构造函数必须填写baseUrl`;
const videoConstructorMD = `构造函数必须填写baseUrl`;

export const guideExamplesMD = {
  photo: {
    constructor: photoConstructorMD,
    list: photoListMD,
    searchList: photoSearchListMD,
    detail: photoDetailMD,
  },
  song: {
    constructor: songConstructorMD,
    songList: songListMD,
    searchSongList: searchSongListMD,
    playlist: playlistMD,
    searchPlaylist: searchPlaylistMD,
    playlistDetail: playlistDetailMD,
    playUrl: playUrlMD,
    lyric: lyricMD,
  },
  book: {
    constructor: bookConstructorMD,
    list: bookListMD,
    searchList: bookSearchListMD,
    detail: bookDetailMD,
    content: bookContentMD,
  },
  comic: {
    constructor: comicConstructorMD,
    list: comicListMD,
    searchList: comicSearchListMD,
    detail: comicDetailMD,
    content: comicContentMD,
  },
  video: {
    constructor: videoConstructorMD,
    list: videoListMD,
    searchList: videoSearchListMD,
    detail: videoDetailMD,
    content: videoPlayUrlMD,
  },
};
