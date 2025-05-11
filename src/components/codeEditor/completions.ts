import SimpleLRUCache from '@/utils/lruCache';
import CryptoJS from 'crypto-js';
import * as forge from 'node-forge';
import * as iconv from 'iconv-lite';
import { getProxyUrl } from '@/utils/proxyUrl';
import * as lodash from 'lodash';
import { nanoid } from 'nanoid';

const lruCache = new SimpleLRUCache<string, AceAutocompleteItem[]>(100);

// 定义自动提示项的接口
interface AceAutocompleteItem {
  name: string;
  value: string;
  meta: string;
  snippet?: string;
  docText?: string;
}

// 优化后的递归获取对象属性和方法
function getObjectProperties(
  obj: any,
  prefix: string = '',
  depth: number = 0,
  cache: Set<any> = new Set(),
  results: AceAutocompleteItem[] = [],
): AceAutocompleteItem[] {
  // 防止无限递归和重复处理
  if (!obj || typeof obj !== 'object' || depth > 8 || cache.has(obj)) {
    return results;
  }

  // 添加到缓存，防止循环引用
  cache.add(obj);

  // 获取对象自身的所有属性名（包括不可枚举属性）
  let properties: string[];
  try {
    properties = Object.getOwnPropertyNames(obj);
  } catch (e) {
    // 某些特殊属性可能无法访问
    return results;
  }

  for (const prop of properties) {
    // 跳过不需要的属性
    if (prop === 'constructor' || prop.startsWith('_') || prop === 'length') {
      continue;
    }

    const fullPath = prefix ? `${prefix}.${prop}` : prop;
    let value: any;

    try {
      value = obj[prop];
    } catch (e) {
      continue; // 跳过无法访问的属性
    }

    // 确定元数据类型
    let meta = 'property';
    if (typeof value === 'function') {
      meta = 'function';
    } else if (typeof value === 'object' && value !== null) {
      meta = 'object';
    }

    // 添加当前属性/方法
    results.push({
      name: fullPath,
      value: fullPath,
      meta: meta,
      snippet: fullPath + '$1',
    });

    // 如果是对象或函数，递归处理（限制深度）
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      getObjectProperties(value, fullPath, depth + 1, cache, results);
    }
  }

  // 处理原型链上的方法（限制只处理一级原型）
  if (depth < 2) {
    const proto = Object.getPrototypeOf(obj);
    if (proto && proto !== Object.prototype) {
      getObjectProperties(proto, prefix, depth + 1, cache, results);
    }
  }

  return results;
}

function _getAutocompleteItems(
  cacheKey: string,
  obj: any,
  prefix: string,
): AceAutocompleteItem[] {
  if (lruCache.has(cacheKey)) {
    return lruCache.get(cacheKey)!;
  }
  const items = getObjectProperties(obj, prefix);
  lruCache.set(cacheKey, items);
  return items;
}

export function getCryptoJsAutocompleteItems(): AceAutocompleteItem[] {
  return _getAutocompleteItems(
    'cryptoJsAutocompleteCache',
    CryptoJS,
    'this.cryptoJs',
  );
}

export function getForgeAutocompleteItems(): AceAutocompleteItem[] {
  return _getAutocompleteItems('forgeAutocompleteCache', forge, 'this.forge');
}

export function getIconvAutocompleteItems(): AceAutocompleteItem[] {
  return _getAutocompleteItems('iconvAutocompleteCache', iconv, 'this.iconv');
}

export function getGetProxyUrlAutocompleteItems(): AceAutocompleteItem[] {
  return [
    {
      name: 'this.getProxyUrl',
      value: 'this.getProxyUrl(url, headers)',
      meta: 'function',
      snippet: 'this.getProxyUrl($1, $2)',
      docText: ``,
    },
  ];
}

export function getLodashAutocompleteItems(): AceAutocompleteItem[] {
  return _getAutocompleteItems('lodashAutocompleteCache', lodash, 'this._');
}

export function getFetchAutocompleteItems(): AceAutocompleteItem[] {
  return [
    {
      name: 'this.fetch',
      value: 'this.fetch(url, options)',
      meta: 'function',
      snippet: 'this.fetch($1, $2)',
      docText: ``,
    },
  ];
}

export function getFetchDomAutocompleteItems(): AceAutocompleteItem[] {
  return [
    {
      name: 'this.fetchDom',
      value: 'this.fetchDom',
      meta: 'function',
      snippet: 'this.fetchDom($1)',
      docText: ``,
    },
  ];
}

export function getNanoidAutocompleteItems(): AceAutocompleteItem[] {
  return _getAutocompleteItems(
    'nanoidAutocompleteCache',
    nanoid,
    'this.nanoid',
  );
}

export function getUrlJoinAutocompleteItems(): AceAutocompleteItem[] {
  return [
    {
      name: 'this.urlJoin',
      value: 'this.urlJoin(baseUrl, url)',
      meta: 'function',
      snippet: 'this.urlJoin($1, $2)',
      docText: ``,
    },
  ];
}

export function getMaxPageAutocompleteItems(): AceAutocompleteItem[] {
  return [
    {
      name: 'this.maxPageNoFromElements',
      value: 'this.maxPageNoFromElements(elements)',
      meta: 'function',
      snippet: 'this.maxPageNoFromElements($1)',
      docText: ``,
    },
  ];
}

export function getQueryBookElementsAutocompleteItems(): AceAutocompleteItem[] {
  return [
    {
      name: 'this.queryBookElements',
      value: 'this.queryBookElements(document, selector)',
      meta: 'function',
      snippet: 'this.queryBookElements($1, $2)',
      docText: ``,
    },
  ];
}

export function getQueryComicElementsAutocompleteItems(): AceAutocompleteItem[] {
  return [
    {
      name: 'this.queryComicElements',
      value: 'this.queryComicElements(document, selector)',
      meta: 'function',
      snippet: 'this.queryComicElements($1, $2)',
      docText: ``,
    },
  ];
}

export function getQueryVideoElementsAutocompleteItems(): AceAutocompleteItem[] {
  return [
    {
      name: 'this.queryVideoElements',
      value: 'this.queryVideoElements(document, selector)',
      meta: 'function',
      snippet: 'this.queryVideoElements($1, $2)',
      docText: ``,
    },
  ];
}

export function getQueryPhotoElementsAutocompleteItems(): AceAutocompleteItem[] {
  return [
    {
      name: 'this.queryPhotoElements',
      value: 'this.queryPhotoElements(document, selector)',
      meta: 'function',
      snippet: 'this.queryPhotoElements($1, $2)',
      docText: ``,
    },
  ];
}

export function getQueryPlaylistElementsAutocompleteItems(): AceAutocompleteItem[] {
  return [
    {
      name: 'this.queryPlaylistElements',
      value: 'this.queryPlaylistElements(document, selector)',
      meta: 'function',
      snippet: 'this.queryPlaylistElements($1, $2)',
      docText: ``,
    },
  ];
}

export function getQuerySongElementsAutocompleteItems(): AceAutocompleteItem[] {
  return [
    {
      name: 'this.querySongElements',
      value: 'this.querySongElements(document, selector)',
      meta: 'function',
      snippet: 'this.querySongElements($1, $2)',
      docText: ``,
    },
  ];
}

export function getQueryChaptersElementsAutocompleteItems(): AceAutocompleteItem[] {
  return [
    {
      name: 'this.queryChapters',
      value: 'this.queryChapters(document, selector)',
      meta: 'function',
      snippet: 'this.queryChapters($1, $2)',
      docText: ``,
    },
  ];
}

export function getContentTextAutocompleteItems(): AceAutocompleteItem[] {
  return [
    {
      name: 'this.getContentText',
      value: 'this.getContentText(elements)',
      meta: 'function',
      snippet: 'this.getContentText($1)',
      docText: ``,
    },
  ];
}