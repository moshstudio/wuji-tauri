import type { PITCH, RATE, VOLUME } from './constants.ts';
import { Buffer } from 'node:buffer';
import { OUTPUT_FORMAT } from './constants.ts';
import { generateSecMsGecToken } from './drm.ts';

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
  static OUTPUT_FORMAT = OUTPUT_FORMAT;
  private static SEC_MS_GEC_VERSION = '1-130.0.2849.68';
  private static CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
  private static VOICES_URL = `https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/list?trustedclienttoken=${EdgeTTSClient.CLIENT_TOKEN}`;
  private static SYNTH_URL = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${EdgeTTSClient.CLIENT_TOKEN}`;
  private static BINARY_DELIM = 'Path:audio\r\n';

  private enableLogging: boolean;
  private closeOnFinish: boolean;
  private ws: WebSocket | null = null;
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
    for (
      let attempt = 1;
      attempt <= 3 && this.ws?.readyState !== WebSocket.OPEN;
      attempt++
    ) {
      if (attempt === 1) this.connectionStartTime = Date.now();
      this.log(`Connecting... attempt ${attempt}`);
      await this.initWebSocket();
    }
    this.ws?.send(message);
  }

  private initWebSocket() {
    this.ws = new WebSocket(
      `${EdgeTTSClient.SYNTH_URL}&Sec-MS-GEC=${generateSecMsGecToken()}` +
        `&Sec-MS-GEC-Version=${EdgeTTSClient.SEC_MS_GEC_VERSION}` +
        `&ConnectionId=${generateRandomHex(16)}`,
    );
    this.ws.binaryType = 'arraybuffer';
    const metadataBuffer: Metadata = [];

    return new Promise<void>((resolve, reject) => {
      this.ws!.onopen = () => {
        this.log(
          'Connected in',
          (Date.now() - this.connectionStartTime) / 1000,
          'seconds',
        );
        this.sendMessage(this.getConfigMessage()).then(resolve);
      };

      this.ws!.onmessage = (event) => this.handleMessage(event, metadataBuffer);
      this.ws!.onclose = () => this.handleClose();
      this.ws!.onerror = (error) => reject(`Connection Error: ${error}`);
    });
  }

  private handleMessage(event: MessageEvent, metadataBuffer: Metadata) {
    const buffer = Buffer.from(event.data as ArrayBuffer);
    const message = buffer.toString();
    const requestIdMatch = /X-RequestId:(.*)\r\n/.exec(message);
    const requestId = requestIdMatch ? requestIdMatch[1] : '';

    if (message.includes('Path:turn.start')) {
      metadataBuffer.length = 0;
    } else if (message.includes('Path:turn.end')) {
      this.requestQueue[requestId]?.emit('end', metadataBuffer);
      if (this.closeOnFinish) {
        this.ws?.close();
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
    this.log('Received audio chunk of size:', audioData?.length);
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
    return `Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{
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
    const response = await fetch(EdgeTTSClient.VOICES_URL);
    const data = await response.json();
    return data.filter((voice: Voice) =>
      voice.FriendlyName.includes('Chinese'),
    );
  }

  close() {
    this.ws?.close();
  }

  async toStream(text: string, options: ProsodyOptions): Promise<EventEmitter> {
    options.pitch ||= '+0Hz';
    options.rate ||= 1.0;
    options.volume ||= 200;

    return this.sendSSMLRequest(await this.buildSSML(text, options));
  }

  private async buildSSML(
    text: string,
    options: ProsodyOptions,
  ): Promise<string> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
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

  private sendSSMLRequest(ssml: string): EventEmitter {
    if (!this.ws) {
      throw new Error('WebSocket not initialized. Call setMetadata first.');
    }

    const requestId = generateRandomHex(16);
    const requestMessage = `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n${ssml.trim()}`;

    const eventEmitter = new EventEmitter();
    this.requestQueue[requestId] = eventEmitter;
    this.sendMessage(requestMessage).then();

    return eventEmitter;
  }
}
