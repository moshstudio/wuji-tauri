import { fetch } from '@wuji-tauri/fetch';
import { SongInfo, SongList } from '@wuji-tauri/source-extension';
const baseUrl = 'https://www.kuwo.cn/';
let cookies:
  | {
      key: string;
      value: string;
    }
  | undefined;

async function initCookie() {
  const response = await fetch(baseUrl);
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    cookies = {
      key: setCookie.split('=')[0],
      value: setCookie.split('=')[1].split(';')[0],
    };
  }
}

async function generateSecret() {
  if (!cookies) {
    await initCookie();
  }
  if (!cookies) return '';
  const t = cookies.value;
  const e = cookies.key;

  if (null == e || e.length <= 0) return '';
  let n: string | number = '';
  for (let i = 0; i < e.length; i++) n += e.charCodeAt(i).toString();
  const r = Math.floor(n.length / 5);
  const o = parseInt(
    n.charAt(r) +
      n.charAt(2 * r) +
      n.charAt(3 * r) +
      n.charAt(4 * r) +
      n.charAt(5 * r),
  );
  const l = Math.ceil(e.length / 2);
  const c = Math.pow(2, 31) - 1;
  if (o < 2) return '';
  let d = Math.round(1e9 * Math.random()) % 1e8;
  n += d.toString();
  while (n.length > 10) {
    n = (
      parseInt(n.substring(0, 10)) + parseInt(n.substring(10, n.length))
    ).toString();
  }
  n = (o * Number(n) + l) % c;
  let f = '';
  for (let i = 0; i < t.length; i++) {
    const charCode = t.charCodeAt(i);
    const xorResult = charCode ^ Math.floor((n / c) * 255);
    const hex = xorResult.toString(16).padStart(2, '0');
    f += hex;
    n = (o * n + l) % c;
  }
  let dHex = d.toString(16);
  while (dHex.length < 8) dHex = '0' + dHex;
  return f + dHex;
}

export async function searchSongs(
  keyword: string,
  pageNo: number = 1,
): Promise<SongList> {
  const url = `${baseUrl}search/searchMusicBykeyWord`;
  const params = new URLSearchParams();
  params.append('encoding', 'utf8');
  params.append('rformat', 'json');
  params.append('ft', 'music');
  params.append('pn', `${pageNo}`);
  params.append('rn', `20`);
  params.append('vipver', `1`);
  params.append('client', 'kt');
  params.append('cluster', `0`);
  params.append('mobi', `1`);
  params.append('issubtitle', `1`);
  params.append('show_copyright_off', `1`);
  params.append('all', keyword);
  const response = await fetch(url + '?' + params.toString(), {
    headers: {
      Secret: await generateSecret(),
      cookie: `${cookies!.key}=${cookies!.value}`,
      referer: baseUrl,
    },
  });
  const json = await response.json();
  const list: SongInfo[] = [];
  json.abslist?.forEach((element: any) => {
    list.push({
      id: element.DC_TARGETID,
      cid: element.MUSICRID,
      name: element.SONGNAME,
      picUrl: element.hts_MVPIC,
      artists: [element.ARTIST],
      duration: element.DURATION,
      extra: {
        pay: element.PAY,
      },
      sourceId: 'kuwo',
    });
  });
  return {
    list,
    page: pageNo,
    totalPage: Math.ceil(Number(json.TOTAL) / 20),
  };
}

export async function getLyric(item: SongInfo) {
  const url = `${baseUrl}openapi/v1/www/`;
  const params = new URLSearchParams();
  params.append('musicId', item.id);
  const response = await fetch(url + '?' + params.toString(), {
    headers: {
      Secret: await generateSecret(),
      cookie: `${cookies!.key}=${cookies!.value}`,
      referer: baseUrl,
    },
  });
  const json = await response.json();
  if (json.code === 200) {
    return json.data.lrclist
      .map((l: any) => `${l.time} ${l.lineLyric}`)
      .join('\n');
  }

  return null;
}

export default { searchSongs, getLyric };
