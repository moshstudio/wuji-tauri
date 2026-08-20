import { Buffer } from 'node:buffer';
import { randomBytes } from 'node:crypto';
import {
  MAX_MESSAGE_BYTES,
  MP3_BITRATE_BPS,
  TICKS_PER_SECOND,
} from './constants.ts';
import { dateToString } from './drm.ts';

export interface CommunicateState {
  offsetCompensation: number;
  lastDurationOffset: number;
  chunkAudioBytes: number;
  cumulativeAudioBytes: number;
}

export interface BoundaryMetadata {
  Type: 'WordBoundary' | 'SentenceBoundary';
  Data: {
    Offset: number;
    Duration: number;
    text: {
      Text: string;
      Length: number;
      BoundaryType: 'WordBoundary' | 'SentenceBoundary';
    };
  };
}

export interface ProsodyOptions {
  voice: string;
  voiceLocale: string;
  pitch?: string | number;
  rate?: string | number;
  volume?: string | number;
}

export type SessionEvent
  = | { type: 'audio'; data: Buffer }
    | { type: 'metadata'; data: BoundaryMetadata }
    | { type: 'turn.end' }
    | { type: 'ignored' };

export function createCommunicateState(): CommunicateState {
  return {
    offsetCompensation: 0,
    lastDurationOffset: 0,
    chunkAudioBytes: 0,
    cumulativeAudioBytes: 0,
  };
}

export function ticksFromAudioBytes(bytes: number): number {
  if (bytes <= 0)
    return 0;
  return Number(
    (BigInt(bytes) * 8n * BigInt(TICKS_PER_SECOND)) / BigInt(MP3_BITRATE_BPS),
  );
}

/** Inter-chunk offset from cumulative 48 kbps CBR audio bytes (edge-tts 7.2.8). */
export function compensateOffset(state: CommunicateState): void {
  state.cumulativeAudioBytes += state.chunkAudioBytes;
  state.offsetCompensation = ticksFromAudioBytes(state.cumulativeAudioBytes);
  state.chunkAudioBytes = 0;
}

export function generateConnectId(): string {
  return randomBytes(16).toString('hex');
}

export function removeIncompatibleCharacters(text: string): string {
  let result = '';
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if ((code >= 0 && code <= 8) || (code >= 11 && code <= 12) || (code >= 14 && code <= 31))
      result += ' ';
    else
      result += char;
  }
  return result;
}

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function unescapeXml(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, '\'')
    .replace(/&amp;/g, '&');
}

function findLastNewlineOrSpace(text: Buffer, limit: number): number {
  const slice = text.subarray(0, limit);
  const newline = slice.lastIndexOf(0x0A);
  if (newline >= 0)
    return newline;
  return slice.lastIndexOf(0x20);
}

function findSafeUtf8SplitPoint(segment: Buffer): number {
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let splitAt = segment.length;
  while (splitAt > 0) {
    try {
      decoder.decode(segment.subarray(0, splitAt));
      return splitAt;
    }
    catch {
      splitAt -= 1;
    }
  }
  return splitAt;
}

function adjustSplitPointForXmlEntity(text: Buffer, splitAt: number): number {
  while (splitAt > 0 && text.subarray(0, splitAt).includes(0x26)) {
    const ampersandIndex = text.subarray(0, splitAt).lastIndexOf(0x26);
    if (text.subarray(ampersandIndex, splitAt).includes(0x3B))
      break;
    splitAt = ampersandIndex;
  }
  return splitAt;
}

function stripAsciiWs(buf: Buffer): Buffer {
  let start = 0;
  let end = buf.length;
  while (start < end && (buf[start] === 0x20 || buf[start] === 0x09 || buf[start] === 0x0A || buf[start] === 0x0D || buf[start] === 0x0B || buf[start] === 0x0C))
    start++;
  while (end > start && (buf[end - 1] === 0x20 || buf[end - 1] === 0x09 || buf[end - 1] === 0x0A || buf[end - 1] === 0x0D || buf[end - 1] === 0x0B || buf[end - 1] === 0x0C))
    end--;
  return buf.subarray(start, end);
}

export function splitTextByByteLength(
  text: string,
  byteLength: number = MAX_MESSAGE_BYTES,
): string[] {
  if (byteLength <= 0)
    throw new Error('byteLength must be greater than 0');

  let remaining = Buffer.from(text, 'utf8');
  const chunks: string[] = [];

  while (remaining.length > byteLength) {
    let splitAt = findLastNewlineOrSpace(remaining, byteLength);
    if (splitAt < 0)
      splitAt = findSafeUtf8SplitPoint(remaining.subarray(0, byteLength));
    splitAt = adjustSplitPointForXmlEntity(remaining, splitAt);
    if (splitAt < 0)
      throw new Error('Maximum byte length is too small or invalid text near &');

    const chunk = stripAsciiWs(remaining.subarray(0, splitAt));
    if (chunk.length > 0)
      chunks.push(chunk.toString('utf8'));
    remaining = remaining.subarray(splitAt > 0 ? splitAt : 1);
  }

  const last = stripAsciiWs(remaining);
  if (last.length > 0)
    chunks.push(last.toString('utf8'));
  return chunks;
}

export function prepareTextChunks(
  text: string,
  byteLength: number = MAX_MESSAGE_BYTES,
): string[] {
  return splitTextByByteLength(
    escapeXml(removeIncompatibleCharacters(text)),
    byteLength,
  );
}

export function normalizeVoiceName(voice: string): string {
  const match = /^([a-z]{2,})-([A-Z]{2,})-(.+Neural)$/.exec(voice);
  if (!match)
    return voice;
  const lang = match[1];
  let region = match[2];
  let name = match[3];
  const dash = name.indexOf('-');
  if (dash !== -1) {
    region = `${region}-${name.slice(0, dash)}`;
    name = name.slice(dash + 1);
  }
  return `Microsoft Server Speech Text to Speech Voice (${lang}-${region}, ${name})`;
}

export function buildSsml(text: string, options: ProsodyOptions): string {
  const pitch = options.pitch ?? '+0Hz';
  const rate = options.rate ?? 1.0;
  const volume = options.volume ?? 200;
  const voice = normalizeVoiceName(options.voice);
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${options.voiceLocale}">
            <voice name="${voice}">
                <prosody pitch="${pitch}" rate="${rate}" volume="${volume}">
                    ${text}
                </prosody>
            </voice>
        </speak>`;
}

export function buildConfigMessage(outputFormat: string): string {
  return `X-Timestamp:${dateToString()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"true","wordBoundaryEnabled":"true"},"outputFormat":"${outputFormat}"}}}}\r\n`;
}

export function buildSsmlRequest(
  requestId: string,
  timestamp: string,
  ssml: string,
): string {
  return `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${timestamp}Z\r\nPath:ssml\r\n\r\n${ssml}`;
}

export function parseHeadersAndData(
  data: Buffer,
  headerLength: number,
): { headers: Record<string, string>; body: Buffer } {
  const headers: Record<string, string> = {};
  const headerText = data.subarray(0, Math.max(0, headerLength)).toString('utf8');
  for (const line of headerText.split('\r\n')) {
    const idx = line.indexOf(':');
    if (idx <= 0)
      continue;
    const key = line.slice(0, idx).replace(/[^\x20-\x7E]/g, '').trim();
    const value = line.slice(idx + 1).trim();
    if (key)
      headers[key] = value;
  }
  const bodyStart = Math.min(data.length, headerLength + 2);
  return { headers, body: data.subarray(bodyStart) };
}

export function parseBinaryAudioMessage(
  data: Buffer,
): { headers: Record<string, string>; audio: Buffer } | null {
  if (data.length < 2)
    return null;
  const headerLength = data.readUInt16BE(0);
  if (headerLength > data.length)
    return null;

  const { headers, body } = parseHeadersAndData(data, headerLength);
  if (headers.Path && headers.Path !== 'audio')
    return null;

  const contentType = headers['Content-Type'];
  if (!contentType) {
    if (body.length === 0)
      return null;
    return null;
  }
  if (contentType !== 'audio/mpeg')
    return null;
  if (body.length === 0)
    return null;
  return { headers, audio: body };
}

export function parseMetadataList(
  body: string,
  offsetCompensation: number,
): BoundaryMetadata[] {
  const parsed = JSON.parse(body) as {
    Metadata?: Array<{
      Type: string;
      Data?: {
        Offset: number;
        Duration: number;
        text?: {
          Text: string;
          Length: number;
          BoundaryType: 'WordBoundary' | 'SentenceBoundary';
        };
      };
    }>;
  };
  const result: BoundaryMetadata[] = [];
  for (const meta of parsed.Metadata ?? []) {
    if (meta.Type === 'SessionEnd')
      continue;
    if (meta.Type !== 'WordBoundary' && meta.Type !== 'SentenceBoundary')
      continue;
    if (!meta.Data?.text)
      continue;
    result.push({
      Type: meta.Type,
      Data: {
        Offset: meta.Data.Offset + offsetCompensation,
        Duration: meta.Data.Duration,
        text: {
          Text: unescapeXml(meta.Data.text.Text),
          Length: meta.Data.text.Length,
          BoundaryType: meta.Data.text.BoundaryType,
        },
      },
    });
  }
  return result;
}

export class TtsStreamSession {
  readonly state: CommunicateState = createCommunicateState();
  readonly metadata: BoundaryMetadata[] = [];

  handleBinary(data: Buffer): SessionEvent {
    const parsed = parseBinaryAudioMessage(data);
    if (!parsed)
      return { type: 'ignored' };
    this.state.chunkAudioBytes += parsed.audio.length;
    return { type: 'audio', data: parsed.audio };
  }

  handleText(text: string): SessionEvent[] {
    const sep = text.indexOf('\r\n\r\n');
    if (sep === -1)
      return [{ type: 'ignored' }];

    const { headers, body } = parseHeadersAndData(Buffer.from(text, 'utf8'), sep);
    const path = headers.Path;
    if (path === 'audio.metadata') {
      const items = parseMetadataList(body.toString('utf8'), this.state.offsetCompensation);
      const events: SessionEvent[] = [];
      for (const item of items) {
        this.metadata.push(item);
        this.state.lastDurationOffset = item.Data.Offset + item.Data.Duration;
        events.push({ type: 'metadata', data: item });
      }
      return events.length > 0 ? events : [{ type: 'ignored' }];
    }
    if (path === 'turn.end') {
      this.finishTurn();
      return [{ type: 'turn.end' }];
    }
    return [{ type: 'ignored' }];
  }

  finishTurn(): void {
    compensateOffset(this.state);
  }
}
