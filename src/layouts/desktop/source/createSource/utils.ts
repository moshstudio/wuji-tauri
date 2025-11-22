import { FormItem } from '@/store/sourceCreateStore';
import BOOK_TEMPLATE from '@/components/codeEditor/templates/bookTemplate.txt?raw';
import COMIC_TEMPLATE from '@/components/codeEditor/templates/comicTemplate.txt?raw';
import PHOTO_TEMPLATE from '@/components/codeEditor/templates/photoTemplate.txt?raw';
import SONG_TEMPLATE from '@/components/codeEditor/templates/songTemplate.txt?raw';
import VIDEO_TEMPLATE from '@/components/codeEditor/templates/videoTemplate.txt?raw';
import {
  loadBookExtensionString,
  loadComicExtensionString,
  loadPhotoExtensionString,
  loadSongExtensionString,
  loadVideoExtensionString,
} from '@wuji-tauri/source-extension';
import { showFailToast } from 'vant';

export async function generateCode(content: FormItem, id: string, name: string): Promise<string | undefined> {
  const findPage = (name: string) => {
    return content.pages.find((page) => page.type === name);
  };

  let code = '';
  switch (content.type) {
    case 'photo':
      code = PHOTO_TEMPLATE.replace("id = 'testPhoto';", `id = '${id}';`)
        .replace('// @METHOD_CONSTRUCTOR', findPage('constructor')!.code)
        .replace("name = '测试';", `name = '${name}';`)
        .replace('// @METHOD_LIST', findPage('list')!.code)
        .replace('// @METHOD_SEARCH_LIST', findPage('searchList')!.code)
        .replace('// @METHOD_DETAIL', findPage('detail')!.code);
      break;
    case 'song':
      code = SONG_TEMPLATE.replace("id = 'testSong';", `id = '${id}';`)
        .replace('// @METHOD_CONSTRUCTOR', findPage('constructor')!.code)
        .replace("name = '测试';", `name = '${name}';`)
        .replace('// @METHOD_PLAYLIST', findPage('playlist')!.code)
        .replace('// @METHOD_SONG_LIST', findPage('songList')!.code)
        .replace('// @METHOD_SEARCH_PLAYLIST', findPage('searchPlaylist')!.code)
        .replace('// @METHOD_SEARCH_SONG_LIST', findPage('searchSongList')!.code)
        .replace('// @METHOD_PLAYLIST_DETAIL', findPage('playlistDetail')!.code)
        .replace('// @METHOD_PLAY_URL', findPage('playUrl')!.code)
        .replace('// @METHOD_LYRIC', findPage('lyric')!.code);
      break;
    case 'book':
      code = BOOK_TEMPLATE.replace("id = 'testBook';", `id = '${id}';`)
        .replace('// @METHOD_CONSTRUCTOR', findPage('constructor')!.code)
        .replace("name = '测试';", `name = '${name}';`)
        .replace('// @METHOD_LIST', findPage('list')!.code)
        .replace('// @METHOD_SEARCH_LIST', findPage('searchList')!.code)
        .replace('// @METHOD_DETAIL', findPage('detail')!.code)
        .replace('// @METHOD_CONTENT', findPage('content')!.code);
      break;
    case 'comic':
      code = COMIC_TEMPLATE.replace("id = 'testComic';", `id = '${id}';`)
        .replace('// @METHOD_CONSTRUCTOR', findPage('constructor')!.code)
        .replace("name = '测试';", `name = '${name}';`)
        .replace('// @METHOD_LIST', findPage('list')!.code)
        .replace('// @METHOD_SEARCH_LIST', findPage('searchList')!.code)
        .replace('// @METHOD_DETAIL', findPage('detail')!.code)
        .replace('// @METHOD_CONTENT', findPage('content')!.code);
      break;
    case 'video':
      code = VIDEO_TEMPLATE.replace("id = 'testVideo';", `id = '${id}';`)
        .replace('// @METHOD_CONSTRUCTOR', findPage('constructor')!.code)
        .replace("name = '测试';", `name = '${name}';`)
        .replace('// @METHOD_LIST', findPage('list')!.code)
        .replace('// @METHOD_SEARCH_LIST', findPage('searchList')!.code)
        .replace('// @METHOD_DETAIL', findPage('detail')!.code)
        .replace('// @METHOD_PLAY_URL', findPage('playUrl')!.code);
      break;
  }

  try {
    switch (content.type) {
      case 'photo':
        loadPhotoExtensionString(code, true);
        break;
      case 'song':
        loadSongExtensionString(code, true);
        break;
      case 'book':
        loadBookExtensionString(code, true);
        break;
      case 'comic':
        loadComicExtensionString(code, true);
        break;
      case 'video':
        loadVideoExtensionString(code, true);
        break;
    }
    return code;
  } catch (error) {
    showFailToast(`代码错误: ${error}`);
  }
}

export function getExtensionInstance(code: string, type: string) {
  switch (type) {
    case 'photo':
      return loadPhotoExtensionString(code, true);
    case 'song':
      return loadSongExtensionString(code, true);
    case 'book':
      return loadBookExtensionString(code, true);
    case 'comic':
      return loadComicExtensionString(code, true);
    case 'video':
      return loadVideoExtensionString(code, true);
  }
}
