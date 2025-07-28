import commonMD from './common.md?raw';
import photoListMD from './photoList.md?raw';
import photoSearchListMD from './photoSearchList.md?raw';
import photoDetailMD from './photoDetail.md?raw';
import songListMD from './songList.md?raw';
import searchSongListMD from './songSearchList.md?raw';
import playlistMD from './songPlaylist.md?raw';
import searchPlaylistMD from './songSearchPlaylist.md?raw';
import playlistDetailMD from './songPlaylistDetail.md?raw';
import playUrlMD from './songPlayUrl.md?raw';
import lyricMD from './songLyric.md?raw';

export const guideCommonMD = commonMD;

const photoConstructorMD = `构造函数必须填写baseUrl`;
const songConstructorMD = `构造函数必须填写baseUrl`;

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
};
