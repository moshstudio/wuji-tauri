import _urlJoin from 'url-join';

export function maxPageNoFromElements(
  elements?: NodeListOf<Element> | null,
  onlyKeepNumbers = true,
): number | null {
  if (!elements) return null;

  function keepOnlyNumbers(input: string): string {
    // 保留数字、小数点、负号、加号、科学计数法符号
    return input.replace(/[^\d.\-]/g, '');
  }

  const res = Math.max(
    ...Array.from(elements.values())
      .map((el) =>
        Number(
          onlyKeepNumbers
            ? keepOnlyNumbers(el.textContent || '')
            : el.textContent,
        ),
      )
      .filter((v) => !isNaN(v)),
  );
  if (res === Infinity || res === -Infinity) return null;
  return res;
}

export function urlJoin(
  parts: (string | null | undefined)[],
  option?: { baseUrl: string },
): string {
  const filter = parts.filter((part) => part != null && part !== undefined);
  if (!filter.length) return '';
  if (filter.length === 1) {
    if (filter[0].startsWith('//')) {
      return `http:${filter[0]}`;
    } else if (
      !filter[0].startsWith('http://') &&
      !filter[0].startsWith('https://')
    ) {
      if (option?.baseUrl) {
        return urlJoin([option.baseUrl, filter[0]], {
          baseUrl: option.baseUrl,
        });
      } else {
        return `http://${filter[0]}`;
      }
    } else {
      return filter[0];
    }
  }
  if (filter[1].startsWith('http')) return urlJoin(filter.slice(1));
  if (filter[1].startsWith('../')) {
    // 适配，返回一级
    filter[0] = filter[0].split('/').slice(0, -1).join('/');
    filter[1] = filter[1].substring(2);
    return urlJoin(filter);
  }

  return _urlJoin(filter);
}

export function purifyText(text: string): string {
  // 1. 统一换行符
  text = text.replace(/\r\n|\\n|\r/g, '\n');

  // 2. 去除 HTML 标签
  text = text.replace(/<[^>]+>/g, '');

  // 3. 替换 HTML 实体
  const htmlEntities: { [key: string]: string } = {
    '&quot;': '"',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&apos;': "'",
    '&nbsp;': ' ',
    // 可以根据需要添加更多 HTML 实体
  };
  Object.keys(htmlEntities).forEach((entity) => {
    const regex = new RegExp(entity, 'g');
    text = text.replace(regex, htmlEntities[entity]);
  });

  // 4. 去除无用的文本行
  const uselessPatterns: RegExp[] = [
    /.*本章未完.*/g,
    /.*最新章节.*/g,
    /.*广告内容.*/g,
    /.*点击下一页继续阅读.*/g,
    /章节错误，点此举报/g,
    /请继续关注后续内容/g,
    /章节错误/g,
    /退出阅读模式/g,
    /（本章完）|（本章未完，请翻页）|.*书友群.*/g,
    /為您提供精彩小說/g,
    /.*作者：.*|\(本章完\)|PS：.*求推荐！|PS：.*求收藏！|感谢.*打赏.*|感谢.*推荐票.*|感谢.*月票.*|（.*月票.*）|（为大家的.*票加更.*）|第二更在.*/g,
    /.*\(第\d+\/\d+页\)$/g, // 新增：匹配以 (第x/x页) 结尾的行
    // 可以根据需要添加更多无用文本的正则表达式
  ];
  const lines = text.split('\n');
  const cleanedLines = lines.filter(
    (line) => !uselessPatterns.some((pattern) => pattern.test(line)),
  );
  text = cleanedLines.join('\n');

  // 5. 去除空行
  text = text.replace(/(\n)+/g, '\n').replace(/^\n|\n$/g, '');

  // 6. 去除每行开头和结尾的多余空格
  text = text
    .split('\n')
    .map((line) => line.trim())
    .join('\n');

  return text;
}
