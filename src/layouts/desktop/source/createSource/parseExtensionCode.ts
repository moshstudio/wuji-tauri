import type { FormItem } from '@/store/sourceCreateStore';

type SourceType = 'photo' | 'song' | 'book' | 'comic' | 'video';

export interface ParsedExtensionCode {
  type: SourceType;
  mode?: 'custom' | 'cms';
  id?: string;
  name?: string;
  version?: string;
  pages: Record<string, string>;
}

const METHOD_PAGE_MAP: Record<SourceType, Record<string, string>> = {
  book: {
    constructor: 'constructor',
    getRecommendBooks: 'list',
    search: 'searchList',
    getBookDetail: 'detail',
    getContent: 'content',
  },
  photo: {
    constructor: 'constructor',
    getRecommendList: 'list',
    search: 'searchList',
    getPhotoDetail: 'detail',
  },
  comic: {
    constructor: 'constructor',
    getRecommendComics: 'list',
    search: 'searchList',
    getComicDetail: 'detail',
    getContent: 'content',
  },
  song: {
    constructor: 'constructor',
    getRecommendPlaylists: 'playlist',
    getRecommendSongs: 'songList',
    searchPlaylists: 'searchPlaylist',
    searchSongs: 'searchSongList',
    getPlaylistDetail: 'playlistDetail',
    getSongUrl: 'playUrl',
    getLyric: 'lyric',
  },
  video: {
    constructor: 'constructor',
    getRecommendVideos: 'list',
    search: 'searchList',
    getVideoDetail: 'detail',
    getPlayUrl: 'playUrl',
  },
};

type CharContext
  = | 'code'
    | 'single'
    | 'double'
    | 'template'
    | 'lineComment'
    | 'blockComment';

const REGEX_PREFIX_KEYWORDS = new Set([
  'return',
  'throw',
  'case',
  'else',
  'in',
  'of',
  'await',
  'yield',
  'typeof',
  'delete',
  'void',
  'new',
  'instanceof',
]);

const CONTROL_FLOW_KEYWORDS = new Set([
  'if',
  'else',
  'for',
  'while',
  'do',
  'switch',
  'catch',
  'with',
  'try',
  'finally',
]);

/** Whether `/` at `slashIndex` can start a RegExp literal (vs division / comment). */
function canStartRegexLiteral(source: string, slashIndex: number): boolean {
  let i = slashIndex - 1;
  while (i >= 0 && /[ \t\u000b\u000c\r\n]/.test(source[i])) {
    i--;
  }
  if (i < 0) {
    return true;
  }

  const c = source[i];
  if ('(,[{;=!&|?:~^+-*%<>'.includes(c)) {
    return true;
  }

  if (/[a-zA-Z_$]/.test(c)) {
    let j = i;
    while (j >= 0 && /[\w$]/.test(source[j])) {
      j--;
    }
    const word = source.slice(j + 1, i + 1);
    return REGEX_PREFIX_KEYWORDS.has(word);
  }

  return false;
}

/**
 * Scan a RegExp literal starting at `/`.
 * Returns index just past flags, or -1 if not a valid regex span.
 */
function scanRegexLiteral(source: string, start: number): number {
  let i = start + 1;
  let inClass = false;

  while (i < source.length) {
    const c = source[i];
    if (c === '\\') {
      i += 2;
      continue;
    }
    if (c === '\n' || c === '\r') {
      return -1;
    }
    if (c === '[') {
      inClass = true;
      i++;
      continue;
    }
    if (c === ']' && inClass) {
      inClass = false;
      i++;
      continue;
    }
    if (c === '/' && !inClass) {
      i++;
      while (i < source.length && /[a-zA-Z]/.test(source[i])) {
        i++;
      }
      return i;
    }
    i++;
  }

  return -1;
}

function findMatchingBrace(source: string, openIndex: number): number {
  if (source[openIndex] !== '{') {
    return -1;
  }
  let depth = 0;
  let ctx: CharContext = 'code';
  let i = openIndex;

  while (i < source.length) {
    const c = source[i];
    const next = source[i + 1];

    if (ctx === 'lineComment') {
      if (c === '\n') {
        ctx = 'code';
      }
      i++;
      continue;
    }
    if (ctx === 'blockComment') {
      if (c === '*' && next === '/') {
        ctx = 'code';
        i += 2;
        continue;
      }
      i++;
      continue;
    }
    if (ctx === 'single') {
      if (c === '\\') {
        i += 2;
        continue;
      }
      if (c === '\'') {
        ctx = 'code';
      }
      i++;
      continue;
    }
    if (ctx === 'double') {
      if (c === '\\') {
        i += 2;
        continue;
      }
      if (c === '"') {
        ctx = 'code';
      }
      i++;
      continue;
    }
    if (ctx === 'template') {
      if (c === '\\') {
        i += 2;
        continue;
      }
      if (c === '`') {
        ctx = 'code';
        i++;
        continue;
      }
      // Handle ${ ... } so nested braces / strings / regex stay accurate
      if (c === '$' && next === '{') {
        const exprEnd = findMatchingBrace(source, i + 1);
        if (exprEnd === -1) {
          return -1;
        }
        i = exprEnd + 1;
        continue;
      }
      i++;
      continue;
    }

    if (c === '/' && next === '/') {
      ctx = 'lineComment';
      i += 2;
      continue;
    }
    if (c === '/' && next === '*') {
      ctx = 'blockComment';
      i += 2;
      continue;
    }
    if (c === '/' && canStartRegexLiteral(source, i)) {
      const regexEnd = scanRegexLiteral(source, i);
      if (regexEnd !== -1) {
        i = regexEnd;
        continue;
      }
    }
    if (c === '\'') {
      ctx = 'single';
      i++;
      continue;
    }
    if (c === '"') {
      ctx = 'double';
      i++;
      continue;
    }
    if (c === '`') {
      ctx = 'template';
      i++;
      continue;
    }
    if (c === '{') {
      depth++;
    }
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
    i++;
  }

  return -1;
}

function extractClassBody(code: string): string | null {
  const match = code.match(/class\s+\w+\s+extends\s+\w+\s*\{/);
  if (!match || match.index === undefined) {
    return null;
  }
  const openIndex = match.index + match[0].length - 1;
  const closeIndex = findMatchingBrace(code, openIndex);
  if (closeIndex === -1) {
    return null;
  }
  return code.slice(openIndex + 1, closeIndex);
}

function extractMethods(classBody: string): { name: string; code: string }[] {
  const methods: { name: string; code: string }[] = [];
  const methodRe
    = /(?:^|\n)(\s*)(async\s+)?(constructor|[a-zA-Z_$][\w$]*)\s*\([^)]*\)\s*\{/g;
  let match: RegExpExecArray | null;

  while ((match = methodRe.exec(classBody)) !== null) {
    const name = match[3];
    // Skip control-flow that looks like methods: `if (...) {`, `catch (...) {`
    if (CONTROL_FLOW_KEYWORDS.has(name)) {
      continue;
    }
    const braceStart = match.index + match[0].length - 1;
    const braceEnd = findMatchingBrace(classBody, braceStart);
    if (braceEnd === -1) {
      break;
    }
    methods.push({
      name,
      code: classBody.slice(match.index, braceEnd + 1).trim(),
    });
    methodRe.lastIndex = braceEnd + 1;
  }

  return methods;
}

function detectSourceType(code: string): Pick<ParsedExtensionCode, 'type' | 'mode'> | null {
  if (/extends\s+CmsVideoExtension/.test(code)) {
    return { type: 'video', mode: 'cms' };
  }
  if (/extends\s+VideoExtension/.test(code)) {
    return { type: 'video', mode: 'custom' };
  }
  if (/extends\s+BookExtension/.test(code)) {
    return { type: 'book' };
  }
  if (/extends\s+ComicExtension/.test(code)) {
    return { type: 'comic' };
  }
  if (/extends\s+PhotoExtension/.test(code)) {
    return { type: 'photo' };
  }
  if (/extends\s+SongExtension/.test(code)) {
    return { type: 'song' };
  }
  return null;
}

function extractStringField(classBody: string, field: string): string | undefined {
  const match = classBody.match(
    new RegExp(`${field}\\s*=\\s*(['"\`])([\\s\\S]*?)\\1`),
  );
  return match?.[2];
}

export function parseExtensionCode(code: string): ParsedExtensionCode {
  const trimmed = code.trim();
  const detected = detectSourceType(trimmed);
  if (!detected) {
    throw new Error('无法识别源类型，请确认代码继承自正确的 Extension 基类');
  }

  const classBody = extractClassBody(trimmed);
  if (!classBody) {
    throw new Error('无法解析类定义');
  }

  const methods = extractMethods(classBody);
  if (!methods.length) {
    throw new Error('未找到任何方法');
  }

  const pageMap = METHOD_PAGE_MAP[detected.type];
  const pages: Record<string, string> = {};
  const helperMethods: string[] = [];

  for (const method of methods) {
    const pageType = pageMap[method.name];
    if (pageType) {
      pages[pageType] = method.code;
    }
    else if (method.name !== 'constructor') {
      helperMethods.push(method.code);
    }
    else {
      pages.constructor = method.code;
    }
  }

  if (!pages.constructor) {
    throw new Error('未找到 constructor 方法');
  }

  if (helperMethods.length) {
    pages.constructor = `${pages.constructor}\n\n${helperMethods.join('\n\n')}`;
  }

  const missingMethods = Object.entries(pageMap)
    .filter(([methodName, pageType]) => {
      return methodName !== 'constructor' && !pages[pageType];
    })
    .map(([methodName]) => methodName);

  if (missingMethods.length) {
    throw new Error(`缺少必要方法: ${missingMethods.join(', ')}`);
  }

  return {
    ...detected,
    id: extractStringField(classBody, 'id'),
    name: extractStringField(classBody, 'name'),
    version: extractStringField(classBody, 'version'),
    pages,
  };
}

export function applyParsedExtensionCode(
  formItem: FormItem,
  parsed: ParsedExtensionCode,
): void {
  if (parsed.id) {
    formItem.id = parsed.id;
  }
  if (parsed.name) {
    formItem.name = parsed.name;
  }
  if (parsed.version) {
    formItem.version = parsed.version;
  }
  if (parsed.type === 'video' && parsed.mode) {
    formItem.mode = parsed.mode;
  }

  for (const page of formItem.pages) {
    const nextCode = parsed.pages[page.type];
    if (nextCode !== undefined) {
      page.code = nextCode;
      page.passed = false;
      page.result = undefined;
      page.ts = undefined;
    }
  }
}
