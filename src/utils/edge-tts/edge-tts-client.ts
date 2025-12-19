import type { PITCH, RATE, VOLUME } from './constants.ts';
import { Buffer } from 'node:buffer';
import {
  OUTPUT_FORMAT,
  SEC_MS_GEC_VERSION,
  SYNTH_URL,
  VOICES_URL,
  WSS_HEADERS,
} from './constants.ts';
import { generateSecMsGecToken, dateToString } from './drm.ts';
import TauriWebSocket from '@/utils/websocketPlugin';
import type { Message } from '@/utils/websocketPlugin';

// Ensure Buffer is globally available for browser-like environments
if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = Buffer;
}

// Generates a random hex string of the specified length
function generateRandomHex(length: number): string {
  const randomValues = new Uint8Array(length);
  window.crypto.getRandomValues(randomValues);
  return Array.from(randomValues, (byte) =>
    `0${byte.toString(16)}`.slice(-2),
  ).join('');
}

type EventType = 'data' | 'close' | 'end';

class EventEmitter {
  private eventListeners: Record<EventType, ((...args: any[]) => void)[]>;

  constructor() {
    this.eventListeners = { data: [], close: [], end: [] };
  }

  on(event: EventType, callback: (...args: any[]) => void) {
    this.eventListeners[event].push(callback);
  }

  emit(event: EventType, data: any) {
    this.eventListeners[event].forEach((callback) => callback(data));
  }
}

export interface Voice {
  Name: string;
  ShortName: string;
  Gender: string;
  Locale: string;
  SuggestedCodec: string;
  FriendlyName: string;
  Status: string;
}

type Metadata = {
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
}[];

export interface ProsodyOptions {
  voice: string;
  voiceLocale: string;
  pitch?: PITCH | string;
  rate?: RATE | string | number;
  volume?: VOLUME | string | number;
}

export class EdgeTTSClient {
  private static BINARY_DELIM = 'Path:audio\r\n';

  private enableLogging: boolean;
  private closeOnFinish: boolean;
  private ws: TauriWebSocket | null = null;
  private wsConnected: boolean = false;
  private outputFormat: OUTPUT_FORMAT | null =
    OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3;

  private requestQueue: Record<string, EventEmitter> = {};
  private connectionStartTime = 0;

  constructor(enableLogging = false, closeOnFinish = true) {
    this.enableLogging = enableLogging;
    this.closeOnFinish = closeOnFinish;
  }

  private log(...args: any[]) {
    if (this.enableLogging) console.log(...args);
  }

  private async sendMessage(message: string) {
    for (let attempt = 1; attempt <= 3 && !this.wsConnected; attempt++) {
      if (attempt === 1) this.connectionStartTime = Date.now();
      this.log(`Connecting... attempt ${attempt}`);
      await this.initWebSocket();
    }
    if (this.ws && this.wsConnected) {
      await this.ws.send(message);
    }
  }

  private async initWebSocket() {
    const metadataBuffer: Metadata = [];

    return new Promise<void>(async (resolve, reject) => {
      try {
        const url =
          `${SYNTH_URL}&Sec-MS-GEC=${generateSecMsGecToken()}` +
          `&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}` +
          `&ConnectionId=${generateRandomHex(16)}`;
        this.ws = await TauriWebSocket.connect(url, {
          headers: WSS_HEADERS,
        });
        this.wsConnected = true;

        this.log(
          'Connected in',
          (Date.now() - this.connectionStartTime) / 1000,
          'seconds',
        );

        // 添加消息监听器
        this.ws.addListener((message: Message) => {
          console.log(message);

          if (message.type === 'Binary') {
            const buffer = Buffer.from(message.data);
            this.handleMessage(buffer, metadataBuffer);
          } else if (message.type === 'Close') {
            this.handleClose();
          } else if (message.type === 'Text') {
            if (message.data.includes('Path:turn.end')) {
              const data = message.data.toString();
              const requestIdMatch = /X-RequestId:(.*)\r\n/.exec(data);
              const requestId = requestIdMatch ? requestIdMatch[1] : '';
              this.requestQueue[requestId]?.emit('end', metadataBuffer);
              if (this.closeOnFinish) {
                this.ws?.disconnect();
                this.wsConnected = false;
              }
            }
          } else {
            this.log('Unknown message type:', message.type);
          }
        });

        await this.sendMessage(this.getConfigMessage());
        resolve();
      } catch (error) {
        this.log('Connection Error:', error);
        reject(`Connection Error: ${error}`);
      }
    });
  }

  private handleMessage(buffer: Buffer, metadataBuffer: Metadata) {
    const message = buffer.toString();
    const requestIdMatch = /X-RequestId:(.*)\r\n/.exec(message);
    const requestId = requestIdMatch ? requestIdMatch[1] : '';

    if (message.includes('Path:turn.start')) {
      metadataBuffer.length = 0;
    } else if (message.includes('Path:turn.end')) {
      this.requestQueue[requestId]?.emit('end', metadataBuffer);
      if (this.closeOnFinish) {
        this.ws?.disconnect();
        this.wsConnected = false;
      }
    } else if (message.includes('Path:audio')) {
      this.cacheAudioData(buffer, requestId);
    } else if (message.includes('Path:audio.metadata')) {
      const startIndex = message.indexOf('{');
      metadataBuffer.push(JSON.parse(message.slice(startIndex)).Metadata[0]);
    } else {
      this.log('Unknown Message', message);
    }
  }

  private handleClose() {
    this.log(
      'Disconnected after:',
      (Date.now() - this.connectionStartTime) / 1000,
      'seconds',
    );
    for (const requestId in this.requestQueue) {
      this.requestQueue[requestId].emit('close', null);
    }
    if (this.closeOnFinish) {
      this.ws?.disconnect();
      this.wsConnected = false;
    }
  }

  private cacheAudioData(buffer: Uint8Array, requestId: string) {
    // Convert the BINARY_DELIM string to a Uint8Array using TextEncoder
    const binaryDelimBytes = new TextEncoder().encode(
      EdgeTTSClient.BINARY_DELIM,
    );

    // Use the helper function to find the delimiter index in the buffer
    const delimiterIndex = this.findDelimiterIndex(buffer, binaryDelimBytes);
    if (delimiterIndex === -1) {
      this.log('Delimiter not found in the buffer.');
      return;
    }

    const audioDataStart = delimiterIndex + binaryDelimBytes.length;
    const audioData = buffer.slice(audioDataStart);
    this.requestQueue[requestId]?.emit('data', audioData);
    // this.log('Received audio chunk of size:', audioData?.length);
  }

  // Helper function to find the index of a byte sequence within another byte sequence
  private findDelimiterIndex(
    buffer: Uint8Array,
    delimiter: Uint8Array,
  ): number {
    for (let i = 0; i <= buffer.length - delimiter.length; i++) {
      let match = true;
      for (let j = 0; j < delimiter.length; j++) {
        if (buffer[i + j] !== delimiter[j]) {
          match = false;
          break;
        }
      }
      if (match) return i;
    }
    return -1;
  }

  private getConfigMessage(): string {
    return `X-Timestamp:${dateToString()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{
            "context": {
                "synthesis": {
                    "audio": {
                        "metadataoptions": {
                            "sentenceBoundaryEnabled": "true",
                            "wordBoundaryEnabled": "true"
                        },
                        "outputFormat": "${this.outputFormat}"
                    }
                }
            }
        }`;
  }

  async getVoices(): Promise<Voice[]> {
    const response = await fetch(VOICES_URL);
    const data = await response.json();
    return data.filter((voice: Voice) =>
      voice.FriendlyName.includes('Chinese'),
    );
  }

  close() {
    if (this.ws) {
      this.ws.disconnect();
      this.wsConnected = false;
    }
  }

  async toStream(text: string, options: ProsodyOptions): Promise<EventEmitter> {
    options.pitch ||= '+0Hz';
    options.rate ||= 1.0;
    options.volume ||= 200;

    const ssml = await this.buildSSML(text, options);
    return await this.sendSSMLRequest(ssml);
  }

  private async buildSSML(
    text: string,
    options: ProsodyOptions,
  ): Promise<string> {
    if (!this.ws || !this.wsConnected) {
      this.connectionStartTime = Date.now();
      await this.initWebSocket();
    }
    return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${options.voiceLocale}">
            <voice name="${options.voice}">
                <prosody pitch="${options.pitch}" rate="${options.rate}" volume="${options.volume}">
                    ${text}
                </prosody>
            </voice>
        </speak>`;
  }

  private async sendSSMLRequest(ssml: string): Promise<EventEmitter> {
    if (!this.ws) {
      throw new Error('WebSocket not initialized. Call setMetadata first.');
    }

    const requestId = generateRandomHex(16);
    const requestMessage = `X-RequestId:${requestId}\r
Content-Type:application/ssml+xml\r
X-Timestamp:${dateToString()}Z\r
Path:ssml\r
\r
${ssml.trim()}`;

    const eventEmitter = new EventEmitter();
    this.requestQueue[requestId] = eventEmitter;
    await this.sendMessage(requestMessage);

    return eventEmitter;
  }
}
