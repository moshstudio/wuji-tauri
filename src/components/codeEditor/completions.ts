import { MonacoEditor } from '@guolao/vue-monaco-editor';
import domTypes from '@/components/codeEditor/monaco-types/monaco-dom/index.d.ts.txt?raw';
import cryptoJsTypes from '@/components/codeEditor/monaco-types/monaco-crypto/index.d.ts.txt?raw';
import fetchDomTypes from '@/components/codeEditor/monaco-types/monaco-fetch-dom/index.d.ts.txt?raw';
import fetchWebviewTypes from '@/components/codeEditor/monaco-types/monaco-fetch-webview/index.d.ts.txt?raw';
import fetchTypes from '@/components/codeEditor/monaco-types/monaco-fetch/index.d.ts.txt?raw';
import iconvTypes from '@/components/codeEditor/monaco-types/monaco-iconv/index.d.ts.txt?raw';
import plimitTypes from '@/components/codeEditor/monaco-types/monaco-plimit/index.d.ts.txt?raw';
import lodashCommonArrayTypes from '@/components/codeEditor/monaco-types/monaco-lodash/common/array.d.ts.txt?raw';
import lodashCommonCollectionTypes from '@/components/codeEditor/monaco-types/monaco-lodash/common/collection.d.ts.txt?raw';
import lodashCommonCommonTypes from '@/components/codeEditor/monaco-types/monaco-lodash/common/common.d.ts.txt?raw';
import lodashCommonDateTypes from '@/components/codeEditor/monaco-types/monaco-lodash/common/date.d.ts.txt?raw';
import lodashCommonFunctionTypes from '@/components/codeEditor/monaco-types/monaco-lodash/common/function.d.ts.txt?raw';
import lodashCommonLangTypes from '@/components/codeEditor/monaco-types/monaco-lodash/common/lang.d.ts.txt?raw';
import lodashCommonMathTypes from '@/components/codeEditor/monaco-types/monaco-lodash/common/math.d.ts.txt?raw';
import lodashCommonNumberTypes from '@/components/codeEditor/monaco-types/monaco-lodash/common/number.d.ts.txt?raw';
import lodashCommonObjectTypes from '@/components/codeEditor/monaco-types/monaco-lodash/common/object.d.ts.txt?raw';
import lodashCommonSeqTypes from '@/components/codeEditor/monaco-types/monaco-lodash/common/seq.d.ts.txt?raw';
import lodashCommonStringTypes from '@/components/codeEditor/monaco-types/monaco-lodash/common/string.d.ts.txt?raw';
import lodashCommonUtilTypes from '@/components/codeEditor/monaco-types/monaco-lodash/common/util.d.ts.txt?raw';
import lodashTypes from '@/components/codeEditor/monaco-types/monaco-lodash/index.d.ts.txt?raw';
import m3u8ParserTypes from '@/components/codeEditor/monaco-types/monaco-m3u8-parser/index.d.ts.txt?raw';
import forgeTypes from '@/components/codeEditor/monaco-types/monaco-node-forge/index.d.ts.txt?raw';
import proxyTypes from '@/components/codeEditor/monaco-types/monaco-proxy/index.d.ts.txt?raw';
import queryBookElementsTypes from '@/components/codeEditor/monaco-types/monaco-query-book/index.d.ts.txt?raw';
import queryComicElementsTypes from '@/components/codeEditor/monaco-types/monaco-query-comic/index.d.ts.txt?raw';
import queryPhotoElementsTypes from '@/components/codeEditor/monaco-types/monaco-query-photo/index.d.ts.txt?raw';
import querySongElementsTypes from '@/components/codeEditor/monaco-types/monaco-query-song/index.d.ts.txt?raw';
import queryVideoElementsTypes from '@/components/codeEditor/monaco-types/monaco-query-video/index.d.ts.txt?raw';
import sourceExtensionTypes from '@/components/codeEditor/monaco-types/source-extension/index.d.ts.txt?raw';

export function addCompletions(monaco: MonacoEditor) {
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    domTypes,
    'ts:dom.d.ts',
  );
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    lodashTypes,
    'node_modules/@types/lodash/index.d.ts',
  );
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    lodashCommonArrayTypes,
    'node_modules/@types/lodash/common/array.d.ts',
  );
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    lodashCommonCollectionTypes,
    'node_modules/@types/lodash/common/collection.d.ts',
  );
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    lodashCommonCommonTypes,
    'node_modules/@types/lodash/common/common.d.ts',
  );
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    lodashCommonDateTypes,
    'node_modules/@types/lodash/common/date.d.ts',
  );
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    lodashCommonFunctionTypes,
    'node_modules/@types/lodash/common/function.d.ts',
  );
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    lodashCommonLangTypes,
    'node_modules/@types/lodash/common/lang.d.ts',
  );
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    lodashCommonMathTypes,
    'node_modules/@types/lodash/common/math.d.ts',
  );
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    lodashCommonNumberTypes,
    'node_modules/@types/lodash/common/number.d.ts',
  );
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    lodashCommonObjectTypes,
    'node_modules/@types/lodash/common/object.d.ts',
  );
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    lodashCommonSeqTypes,
    'node_modules/@types/lodash/common/seq.d.ts',
  );
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    lodashCommonStringTypes,
    'node_modules/@types/lodash/common/string.d.ts',
  );
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    lodashCommonUtilTypes,
    'node_modules/@types/lodash/common/util.d.ts',
  );

  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    cryptoJsTypes,
    'node_modules/@types/crypto-js/index.d.ts',
  );
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    forgeTypes,
    'node_modules/@types/forge/index.d.ts',
  );
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    iconvTypes,
    'node_modules/@types/iconv/index.d.ts',
  );
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    plimitTypes,
    'node_modules/@types/p-limit/index.d.ts',
  );
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    m3u8ParserTypes,
    'node_modules/@types/m3u8-parser/index.d.ts',
  );
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    proxyTypes,
    'node_modules/@types/proxy/index.d.ts',
  );
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    fetchTypes,
    'node_modules/@types/my-fetch/index.d.ts',
  );
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    fetchDomTypes,
    'node_modules/@types/fetch-dom/index.d.ts',
  );
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    fetchWebviewTypes,
    'node_modules/@types/fetch-webview/index.d.ts',
  );
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    `export function nanoid<Type extends string>(size?: number): Type`,
    'node_modules/@types/nanoid/index.d.ts',
  );
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    `export function urlJoin(
  parts: (string | null | undefined)[],
  option?: { baseUrl: string }
): string;`,
    'node_modules/@types/url-join/index.d.ts',
  );
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    `export function maxPageNoFromElements(
  elements?: NodeListOf<Element> | null,
  onlyKeepNumbers?: boolean
): number | null;`,
    'node_modules/@types/max-page-no/index.d.ts',
  );
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    queryBookElementsTypes,
    'node_modules/@types/query-book-elements/index.d.ts',
  );
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    queryComicElementsTypes,
    'node_modules/@types/query-comic-elements/index.d.ts',
  );
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    queryVideoElementsTypes,
    'node_modules/@types/query-video-elements/index.d.ts',
  );
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    queryPhotoElementsTypes,
    'node_modules/@types/query-photo-elements/index.d.ts',
  );
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    querySongElementsTypes,
    'node_modules/@types/query-song-elements/index.d.ts',
  );
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    sourceExtensionTypes,
    'node_modules/@wuji-tauri/source-extension/index.d.ts',
  );
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    `export function queryChapters(
    body: Document,
    tags: {
      element?: string;
    },
  ): Promise<{ id: string; title: string; url?: string }[]>;`,
    'node_modules/@types/query-chapters/index.d.ts',
  );
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    `export function getContentText(element?: HTMLElement): string | null;`,
    'node_modules/@types/get-content-text/index.d.ts',
  );
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    `export function log(...args: any[]): void`,
    'node_modules/@types/log/index.d.ts',
  );
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    `export const baseUrl: string;`,
    'node_modules/@types/my-consts/index.d.ts',
  );
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    `export function getM3u8ProxyUrl(
      url: string,
      headers?: Record<string, string>,
    ): Promise<string | null>}`,
    'node_modules/@types/m3u8-proxy/index.d.ts',
  );
  // 声明全局
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    `import _ from 'lodash';
     import * as cryptoJs from 'crypto-js';
     import * as forge from 'forge';
     import * as iconv from 'iconv';
     import * as plimit from 'p-limit';
     import * as m3u8Parser from 'm3u8-parser';
     import * as getProxyUrl from 'proxy';
     import * as fetch from 'my-fetch';
     import * as fetchDom from 'fetch-dom';
     import * as fetchWebview from 'fetch-webview';
     import * as nanoid from 'nanoid';
     import * as urlJoin from 'url-join';
     import * as maxPageNoFromElements from 'max-page-no';
     import * as queryBookElements from 'query-book-elements';
     import * as queryComicElements from 'query-comic-elements';
     import * as queryVideoElements from 'query-video-elements';
     import * as queryPhotoElements from 'query-photo-elements';
     import * as querySongElements from 'query-photo-elements';
     import * as queryChapters from 'query-chapters';
     import * as getContentText from 'get-content-text';
     import * as log from 'log';
     import * as myConsts from 'my-consts';
     import * as getM3u8ProxyUrl from 'm3u8-proxy';
     import { BookExtension, ComicExtension, PhotoExtension, VideoExtension, SongExtension } from '@wuji-tauri/source-extension';

     declare const _: typeof _;
     declare global {
      var cryptoJs: typeof import('crypto-js');
      var forge: typeof import('forge');
      var iconv: typeof import('iconv').iconv;
      var pLimit: typeof import('p-limit').pLimit;
      var m3u8Parser: typeof import('m3u8-parser');
      var fetch: typeof import('my-fetch').fetch;
      var fetchDom: typeof import('fetch-dom').fetchDom;
      var fetchWebview: typeof import('fetch-webview').fetchWebview;
      var nanoid: typeof import('nanoid').nanoid;
      var urlJoin: typeof import('url-join').urlJoin;
      var maxPageNoFromElements: typeof import('max-page-no').maxPageNoFromElements;
      var queryBookElements: typeof import('query-book-elements').queryBookElements;
      var queryComicElements: typeof import('query-comic-elements').queryComicElements;
      var queryVideoElements: typeof import('query-video-elements').queryVideoElements;
      var queryPhotoElements: typeof import('query-photo-elements').queryPhotoElements;
      var querySongElements: typeof import('query-song-elements').querySongElements;
      var queryPlaylistElements: typeof import('query-song-elements').queryPlaylistElements;
      var queryChapters: typeof import('query-chapters').queryChapters;
      var getContentText: typeof import('get-content-text').getContentText;
      var log: typeof import('log').log;
      var baseUrl: typeof import('my-consts').baseUrl;
      var getM3u8ProxyUrl: typeof import('m3u8-proxy').getM3u8ProxyUrl;
      var getProxyUrl: typeof import('proxy').getProxyUrl;
      var BookExtension: typeof import('@wuji-tauri/source-extension').BookExtension;
      var ComicExtension: typeof import('@wuji-tauri/source-extension').ComicExtension;
      var PhotoExtension: typeof import('@wuji-tauri/source-extension').PhotoExtension;
      var VideoExtension: typeof import('@wuji-tauri/source-extension').VideoExtension;
      var SongExtension: typeof import('@wuji-tauri/source-extension').SongExtension;

      interface GlobalThis {
        pLimit: typeof import('p-limit').pLimit;
      }
     }
     export {};
    `,
    'globals.d.ts',
  );
  monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
    allowNonTsExtensions: true,
    target: monaco.languages.typescript.ScriptTarget.ESNext,
    lib: ['esnext'],
    allowJs: true,
    typeRoots: ['node_modules/@types'],
  });
}
