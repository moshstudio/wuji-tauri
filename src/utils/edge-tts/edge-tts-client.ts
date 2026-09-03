import type { PITCH, RATE, VOLUME } from './constants.ts';
import type { BoundaryMetadata, ProsodyOptions as ProtocolProsodyOptions } from './protocol.ts';
import type { Message } from '@/utils/websocketPlugin';
import { Buffer } from 'node:buffer';
import TauriWebSocket from '@/utils/websocketPlugin';
import {
  OUTPUT_FORMAT,
  SEC_MS_GEC_VERSION,
  SYNTH_URL,
  VOICE_HEADERS,
  VOICES_URL,
  WSS_HEADERS,
} from './constants.ts';
import {
  dateToString,
  generateSecMsGecToken,
  handleClockSkewFromHeaders,
  headersWithMuid,
  resetClockSkew,
} from './drm.ts';
import {
  buildConfigMessage,
  buildSsml,
  buildSsmlRequest,
  generateConnectId,
  prepareTextChunks,
  TtsStreamSession,
} from './protocol.ts';

export type { BoundaryMetadata };

export interface Voice {
  Name: string;
  ShortName: string;
  Gender: string;
  Locale: string;
  SuggestedCodec: string;
  FriendlyName: string;
  Status: string;
}

export interface ProsodyOptions {
  voice: string;
  voiceLocale: string;
  pitch?: PITCH | string;
  rate?: RATE | string | number;
  volume?: VOLUME | string | number;
}

type EventType = 'data' | 'close' | 'end' | 'metadata';

class EventEmitter {
  private eventListeners: Record<EventType, ((...args: any[]) => void)[]>;

  constructor() {
    this.eventListeners = { data: [], close: [], end: [], metadata: [] };
  }

  on(event: EventType, callback: (...args: any[]) => void) {
    this.eventListeners[event].push(callback);
  }

  emit(event: EventType, data: any) {
    this.eventListeners[event].forEach(callback => callback(data));
  }
}

export class EdgeTTSClient {
  private enableLogging: boolean;
  private closeOnFinish: boolean;
  private ws: TauriWebSocket | null = null;
  private wsConnected: boolean = false;
  private outputFormat = OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3;
  private connectionStartTime = 0;

  private session = new TtsStreamSession();
  private streamEmitter: EventEmitter | null = null;
  private pendingChunks: string[] = [];
  private chunkIndex = 0;
  private prosody: ProtocolProsodyOptions | null = null;
  private continuing = false;
  private socketGen = 0;

  constructor(enableLogging = false, closeOnFinish = true) {
    this.enableLogging = enableLogging;
    this.closeOnFinish = closeOnFinish;
  }

  private log(...args: any[]) {
    if (this.enableLogging)
      console.log(...args);
  }

  private async sendMessage(message: string) {
    for (let attempt = 1; attempt <= 3 && !this.wsConnected; attempt++) {
      if (attempt === 1)
        this.connectionStartTime = Date.now();
      this.log(`Connecting... attempt ${attempt}`);
      await this.initWebSocket();
    }
    if (!this.ws || !this.wsConnected)
      throw new Error('WebSocket not connected');
    await this.ws.send(message);
  }

  private async syncClockSkew() {
    try {
      const url
        = `${VOICES_URL}&Sec-MS-GEC=${generateSecMsGecToken()}`
          + `&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}`;
      const response = await fetch(url, {
        headers: headersWithMuid(VOICE_HEADERS),
      });
      handleClockSkewFromHeaders(response.headers);
    }
    catch (error) {
      this.log('Clock skew sync failed:', error);
    }
  }

  private async initWebSocket(attempt = 0): Promise<void> {
    try {
      const url
        = `${SYNTH_URL}&Sec-MS-GEC=${generateSecMsGecToken()}`
          + `&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}`
          + `&ConnectionId=${generateConnectId()}`;
      this.ws = await TauriWebSocket.connect(url, {
        headers: headersWithMuid(WSS_HEADERS),
      });
      this.wsConnected = true;
      const gen = ++this.socketGen;

      this.log(
        'Connected in',
        (Date.now() - this.connectionStartTime) / 1000,
        'seconds',
      );

      this.ws.addListener((message: Message) => {
        if (gen !== this.socketGen)
          return;
        this.handleSocketMessage(message);
      });

      await this.ws.send(buildConfigMessage(this.outputFormat));
    }
    catch (error) {
      this.log('Connection Error:', error);
      this.close();
      if (attempt === 0) {
        await this.syncClockSkew();
        return this.initWebSocket(1);
      }
      if (attempt === 1) {
        resetClockSkew();
        return this.initWebSocket(2);
      }
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  private handleSocketMessage(message: Message) {
    if (message.type === 'Binary') {
      this.dispatchSessionEvent(
        this.session.handleBinary(Buffer.from(message.data)),
      );
      return;
    }
    if (message.type === 'Close') {
      this.handleClose();
      return;
    }
    if (message.type === 'Text') {
      for (const event of this.session.handleText(message.data))
        this.dispatchSessionEvent(event);
      return;
    }
    this.log('Unknown message type:', message.type);
  }

  private dispatchSessionEvent(event: ReturnType<TtsStreamSession['handleBinary']>) {
    if (event.type === 'audio') {
      this.streamEmitter?.emit('data', event.data);
      return;
    }
    if (event.type === 'metadata') {
      this.streamEmitter?.emit('metadata', event.data);
      return;
    }
    if (event.type === 'turn.end')
      void this.onTurnEnd();
  }

  private async onTurnEnd() {
    if (this.continuing)
      return;
    this.continuing = true;
    try {
      this.chunkIndex += 1;
      if (this.chunkIndex < this.pendingChunks.length) {
        this.close();
        this.connectionStartTime = Date.now();
        await this.initWebSocket();
        await this.sendCurrentChunk();
        return;
      }
      this.streamEmitter?.emit('end', this.session.metadata);
      if (this.closeOnFinish)
        this.close();
    }
    catch (error) {
      this.log('Failed to continue TTS stream:', error);
      this.streamEmitter?.emit('close', null);
      this.close();
    }
    finally {
      this.continuing = false;
    }
  }

  private handleClose() {
    this.log(
      'Disconnected after:',
      (Date.now() - this.connectionStartTime) / 1000,
      'seconds',
    );
    this.wsConnected = false;
    if (this.continuing)
      return;
    if (this.chunkIndex < this.pendingChunks.length && this.streamEmitter)
      this.streamEmitter.emit('close', null);
  }

  private async sendCurrentChunk() {
    if (!this.prosody)
      throw new Error('TTS prosody is not set');
    const text = this.pendingChunks[this.chunkIndex];
    const ssml = buildSsml(text, this.prosody);
    const requestId = generateConnectId();
    await this.sendMessage(buildSsmlRequest(requestId, dateToString(), ssml));
  }

  async getVoices(): Promise<Voice[]> {
    const request = () => {
      const url
        = `${VOICES_URL}&Sec-MS-GEC=${generateSecMsGecToken()}`
          + `&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}`;
      return fetch(url, { headers: headersWithMuid(VOICE_HEADERS) });
    };

    let response = await request();
    if (response.status === 403) {
      handleClockSkewFromHeaders(response.headers);
      response = await request();
    }
    if (response.status === 403) {
      resetClockSkew();
      response = await request();
    }
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

    this.prosody = options;
    this.pendingChunks = prepareTextChunks(text);
    this.chunkIndex = 0;
    this.session = new TtsStreamSession();
    this.streamEmitter = new EventEmitter();

    if (this.pendingChunks.length === 0) {
      queueMicrotask(() => this.streamEmitter?.emit('end', []));
      return this.streamEmitter;
    }

    if (!this.ws || !this.wsConnected) {
      this.connectionStartTime = Date.now();
      await this.initWebSocket();
    }
    await this.sendCurrentChunk();
    return this.streamEmitter;
  }
}
