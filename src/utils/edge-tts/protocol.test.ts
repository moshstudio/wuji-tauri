import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
// eslint-disable-next-line test/no-import-node-test -- 仓库测试用 node:test，未安装 vitest
import { describe, it } from 'node:test';
import {
  MP3_BITRATE_BPS,
  TICKS_PER_SECOND,
} from './constants.ts';
import {
  generateMuid,
  generateSecMsGecToken,
  getClockSkewSeconds,
  handleClockSkewFromHeaders,
  headersWithMuid,
  parseRfc2616Date,
  resetClockSkewForTests,
} from './drm.ts';
import {
  buildSsml,
  compensateOffset,
  createCommunicateState,
  escapeXml,
  normalizeVoiceName,
  parseBinaryAudioMessage,
  prepareTextChunks,
  removeIncompatibleCharacters,
  splitTextByByteLength,
  ticksFromAudioBytes,
  TtsStreamSession,
  unescapeXml,
} from './protocol.ts';

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, items: T[]): T {
  return items[Math.floor(rng() * items.length)]!;
}

function randInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function buildBinaryAudioMessage(
  audio: Buffer,
  headers: Record<string, string> = {},
): Buffer {
  const merged = {
    'X-RequestId': 'req1',
    'Content-Type': 'audio/mpeg',
    'Path': 'audio',
    ...headers,
  };
  const headerText = `${Object.entries(merged)
    .map(([key, value]) => `${key}:${value}`)
    .join('\r\n')}\r\n`;
  const headerBytes = Buffer.from(headerText, 'utf8');
  const headerLength = 2 + headerBytes.length;
  const out = Buffer.alloc(2 + headerBytes.length + 2 + audio.length);
  out.writeUInt16BE(headerLength, 0);
  headerBytes.copy(out, 2);
  out[2 + headerBytes.length] = 0x0D;
  out[2 + headerBytes.length + 1] = 0x0A;
  audio.copy(out, headerLength + 2);
  return out;
}

function buildTextMessage(path: string, body: string, requestId = 'req1'): string {
  return `X-RequestId:${requestId}\r\nContent-Type:application/json; charset=utf-8\r\nPath:${path}\r\n\r\n${body}`;
}

function buildMetadataMessage(
  offset: number,
  duration: number,
  text: string,
  type: 'WordBoundary' | 'SentenceBoundary' = 'WordBoundary',
): string {
  return buildTextMessage(
    'audio.metadata',
    JSON.stringify({
      Metadata: [{
        Type: type,
        Data: {
          Offset: offset,
          Duration: duration,
          text: {
            Text: text,
            Length: text.length,
            BoundaryType: type,
          },
        },
      }],
    }),
  );
}

describe('drm', () => {
  it('generates stable Sec-MS-GEC inside a 5-minute window', () => {
    const base = 1_700_000_000 - (1_700_000_000 % 300);
    const a = generateSecMsGecToken(base);
    const b = generateSecMsGecToken(base + 299);
    const c = generateSecMsGecToken(base + 300);
    assert.match(a, /^[0-9A-F]{64}$/);
    assert.equal(a, b);
    assert.notEqual(a, c);
  });

  it('adjusts token after clock skew from Date header', () => {
    resetClockSkewForTests();
    const headers = new Headers({
      Date: 'Wed, 21 Oct 2015 07:28:00 GMT',
    });
    assert.equal(handleClockSkewFromHeaders(headers), true);
    assert.ok(Math.abs(getClockSkewSeconds()) > 60);
    resetClockSkewForTests();
  });

  it('parses RFC 2616 dates and injects muid cookie', () => {
    const unix = parseRfc2616Date('Wed, 21 Oct 2015 07:28:00 GMT');
    assert.equal(unix, Date.parse('Wed, 21 Oct 2015 07:28:00 GMT') / 1000);
    const muid = generateMuid();
    assert.match(muid, /^[0-9A-F]{32}$/);
    const headers = headersWithMuid({ Origin: 'chrome-extension://x' });
    assert.equal(headers.Origin, 'chrome-extension://x');
    assert.match(headers.Cookie, /^muid=[0-9A-F]{32};$/);
  });
});

describe('text sanitization and split', () => {
  it('strips incompatible control characters and escapes XML', () => {
    const cleaned = removeIncompatibleCharacters('a\u000B b\u0000c\u001F d');
    assert.equal(cleaned, 'a  b c  d');
    assert.equal(escapeXml('a<b>c&"\''), 'a&lt;b&gt;c&amp;&quot;&apos;');
    assert.equal(unescapeXml('a&lt;b&gt;c&amp;'), 'a<b>c&');
  });

  it('normalizes short voice names', () => {
    assert.equal(
      normalizeVoiceName('zh-CN-XiaoyiNeural'),
      'Microsoft Server Speech Text to Speech Voice (zh-CN, XiaoyiNeural)',
    );
    assert.equal(
      normalizeVoiceName('zh-CN-liaoning-XiaobeiNeural'),
      'Microsoft Server Speech Text to Speech Voice (zh-CN-liaoning, XiaobeiNeural)',
    );
    const long = 'Microsoft Server Speech Text to Speech Voice (zh-CN, YunxiNeural)';
    assert.equal(normalizeVoiceName(long), long);
  });

  it('mutates long multilingual text and keeps utf-8 / entity / size invariants', () => {
    const rng = mulberry32(20260820);
    const atoms = [
      '第一段。',
      'hello world ',
      '😀🎉',
      'a&b <c>',
      'newline\nnext',
      'space '.repeat(20),
      '\u000B\u0000',
      '&amp;already',
      '。'.repeat(50),
    ];
    for (let trial = 0; trial < 80; trial++) {
      let text = '';
      const parts = randInt(rng, 3, 12);
      for (let i = 0; i < parts; i++)
        text += pick(rng, atoms).repeat(randInt(rng, 1, 8));
      if (rng() < 0.3)
        text = text.repeat(randInt(rng, 2, 6));

      const limit = randInt(rng, 64, 512);
      const chunks = prepareTextChunks(text, limit);
      for (const chunk of chunks) {
        assert.ok(Buffer.byteLength(chunk, 'utf8') <= limit, `chunk too large: ${Buffer.byteLength(chunk, 'utf8')} > ${limit}`);
        new TextDecoder('utf-8', { fatal: true }).decode(Buffer.from(chunk, 'utf8'));
        const amps = [...chunk.matchAll(/&/g)];
        for (const match of amps) {
          const idx = match.index ?? 0;
          assert.ok(/&(?:amp|lt|gt|quot|apos);/.test(chunk.slice(idx, idx + 10)), `unterminated entity in ${chunk.slice(idx, idx + 12)}`);
        }
      }
      const joined = unescapeXml(chunks.join(''));
      const sanitized = removeIncompatibleCharacters(text).replace(/\s+/g, '');
      const recovered = joined.replace(/\s+/g, '');
      assert.equal(recovered, sanitized);
    }
  });

  it('does not split inside an XML entity', () => {
    const prefix = '字'.repeat(10);
    const text = `${prefix}&amp;tail`;
    const prefixBytes = Buffer.byteLength(prefix, 'utf8');
    const chunks = splitTextByByteLength(text, prefixBytes + 3);
    assert.ok(chunks.every(c => !c.includes('&am') || c.includes('&amp;')));
    assert.equal(chunks.join(''), text.replace(/\s+$/, ''));
  });
});

describe('CBR 偏移与二进制帧', () => {
  it('converts 48kbps CBR bytes to ticks exactly for 1 second', () => {
    const oneSecondBytes = MP3_BITRATE_BPS / 8;
    assert.equal(ticksFromAudioBytes(oneSecondBytes), TICKS_PER_SECOND);
    const state = createCommunicateState();
    state.chunkAudioBytes = oneSecondBytes;
    compensateOffset(state);
    assert.equal(state.offsetCompensation, TICKS_PER_SECOND);
    assert.equal(state.chunkAudioBytes, 0);
    assert.equal(state.cumulativeAudioBytes, oneSecondBytes);
  });

  it('parses 2-byte header audio frames and skips empty terminators', () => {
    const audio = Buffer.from([0xFF, 0xFB, 0x90, 0x00, 0x01, 0x02]);
    const frame = buildBinaryAudioMessage(audio);
    const parsed = parseBinaryAudioMessage(frame);
    assert.ok(parsed);
    assert.equal(parsed.headers.Path, 'audio');
    assert.deepEqual([...parsed.audio], [...audio]);

    const headerText = 'X-RequestId:req1\r\nPath:audio\r\n';
    const headerBytes = Buffer.from(headerText, 'utf8');
    const headerLength = 2 + headerBytes.length;
    const term = Buffer.alloc(2 + headerBytes.length + 2);
    term.writeUInt16BE(headerLength, 0);
    headerBytes.copy(term, 2);
    term[2 + headerBytes.length] = 0x0D;
    term[2 + headerBytes.length + 1] = 0x0A;
    assert.equal(parseBinaryAudioMessage(term), null);
  });
});

describe('多文本连续 CBR 字幕 offset', () => {
  it('compensates later chunks from cumulative audio bytes, not metadata overflow', () => {
    const session = new TtsStreamSession();
    const chunkBytes = [6000, 9000, 3000];
    const rawOffsets = [
      [0, 2_000_000],
      [0, 1_500_000],
      [0, 800_000],
    ];
    const fakeOverflowLastDuration = 123;

    const collected: number[][] = [];
    for (let i = 0; i < chunkBytes.length; i++) {
      const audio = Buffer.alloc(chunkBytes[i], i + 1);
      const audioEvent = session.handleBinary(buildBinaryAudioMessage(audio));
      assert.equal(audioEvent.type, 'audio');
      if (audioEvent.type === 'audio')
        assert.equal(audioEvent.data.length, chunkBytes[i]);

      const offsets: number[] = [];
      for (const raw of rawOffsets[i]) {
        const events = session.handleText(
          buildMetadataMessage(raw, fakeOverflowLastDuration, `w${i}`),
        );
        assert.equal(events[0]?.type, 'metadata');
        if (events[0]?.type === 'metadata')
          offsets.push(events[0].data.Data.Offset);
      }
      collected.push(offsets);
      const end = session.handleText(buildTextMessage('turn.end', ''));
      assert.equal(end[0]?.type, 'turn.end');
    }

    const expectedComp = [
      0,
      ticksFromAudioBytes(chunkBytes[0]),
      ticksFromAudioBytes(chunkBytes[0] + chunkBytes[1]),
    ];
    for (let i = 0; i < collected.length; i++) {
      assert.deepEqual(
        collected[i],
        rawOffsets[i].map(raw => raw + expectedComp[i]),
      );
    }
    assert.equal(
      session.state.offsetCompensation,
      ticksFromAudioBytes(chunkBytes[0] + chunkBytes[1] + chunkBytes[2]),
    );
    assert.notEqual(session.state.offsetCompensation, fakeOverflowLastDuration);
    assert.equal(session.metadata.length, 6);
  });

  it('keeps continuous timestamps under mutated multi-text sequences', () => {
    const rng = mulberry32(42);
    for (let trial = 0; trial < 60; trial++) {
      const session = new TtsStreamSession();
      const chunkCount = randInt(rng, 2, 10);
      let cumulativeBytes = 0;
      let lastOffset = -1;
      const texts: string[] = [];

      for (let chunk = 0; chunk < chunkCount; chunk++) {
        const expectedCompensation = ticksFromAudioBytes(cumulativeBytes);
        const audioBytes = randInt(rng, 64, 24_000);
        const chunkTicks = ticksFromAudioBytes(audioBytes);
        const boundaryCount = randInt(rng, 1, 8);
        const audio = Buffer.alloc(audioBytes, chunk + 1);
        session.handleBinary(buildBinaryAudioMessage(audio));

        let raw = 0;
        for (let b = 0; b < boundaryCount; b++) {
          const remaining = boundaryCount - b;
          const maxStep = Math.floor((chunkTicks - raw) / remaining);
          raw += randInt(rng, 0, Math.max(0, maxStep));
          const duration = randInt(rng, 1, Math.max(1, chunkTicks - raw));
          const word = pick(rng, ['春', '夏', '秋', '冬', 'wind', '&lt;tag&gt;']);
          texts.push(word);
          const events = session.handleText(
            buildMetadataMessage(raw, duration, word, pick(rng, ['WordBoundary', 'SentenceBoundary'] as const)),
          );
          assert.equal(events[0]?.type, 'metadata');
          if (events[0]?.type !== 'metadata')
            continue;
          const offset = events[0].data.Data.Offset;
          assert.equal(offset, raw + expectedCompensation);
          assert.ok(offset >= lastOffset);
          lastOffset = offset;
          assert.equal(events[0].data.Data.text.Text, unescapeXml(word));
        }

        session.handleText(buildTextMessage('turn.end', ''));
        cumulativeBytes += audioBytes;
        assert.equal(session.state.offsetCompensation, ticksFromAudioBytes(cumulativeBytes));
      }

      assert.equal(session.state.cumulativeAudioBytes, cumulativeBytes);
      assert.ok(session.metadata.length >= chunkCount);
    }
  });

  it('counts encoded silence bytes so variable pauses do not drift', () => {
    const session = new TtsStreamSession();
    session.handleBinary(buildBinaryAudioMessage(Buffer.alloc(3000, 1)));
    session.handleText(buildMetadataMessage(0, 100, 'a'));
    // extra silence frames in the same turn
    session.handleBinary(buildBinaryAudioMessage(Buffer.alloc(9000, 2)));
    session.handleText(buildTextMessage('turn.end', ''));

    const events = session.handleText(buildMetadataMessage(50, 10, 'b'));
    assert.equal(events[0]?.type, 'metadata');
    if (events[0]?.type === 'metadata') {
      assert.equal(
        events[0].data.Data.Offset,
        50 + ticksFromAudioBytes(12000),
      );
    }
  });

  it('splits a long chapter then applies CBR across the resulting turns', () => {
    const chapter = `${'这是很长的一段阅读内容，包含标点、换行和特殊符号 & < >。\n'.repeat(80)}emoji😀`;
    const chunks = prepareTextChunks(chapter, 200);
    assert.ok(chunks.length >= 3);

    const session = new TtsStreamSession();
    const ssml = chunks.map(c => buildSsml(c, {
      voice: 'zh-CN-XiaoyiNeural',
      voiceLocale: 'zh-CN',
    }));
    assert.ok(ssml.every(s => s.includes('Microsoft Server Speech Text to Speech Voice (zh-CN, XiaoyiNeural)')));
    assert.ok(ssml.some(s => s.includes('&amp;')));
    assert.ok(ssml.every(s => !s.includes(' < ') && !s.includes('& <')));

    let bytes = 0;
    for (let i = 0; i < chunks.length; i++) {
      const size = 800 + i * 17;
      session.handleBinary(buildBinaryAudioMessage(Buffer.alloc(size, i)));
      const events = session.handleText(buildMetadataMessage(0, 1000, chunks[i].slice(0, 2)));
      assert.equal(events[0]?.type, 'metadata');
      if (events[0]?.type === 'metadata')
        assert.equal(events[0].data.Data.Offset, ticksFromAudioBytes(bytes));
      session.handleText(buildTextMessage('turn.end', ''));
      bytes += size;
    }
    assert.equal(session.metadata.length, chunks.length);
  });
});
