import CryptoJS from "crypto-js";
import urlJoin from "url-join";
import { nanoid } from "nanoid";
import { fetch } from "@tauri-apps/plugin-http";
import {
  maxPageNoFromElements,
  parseAndExecuteHtml,
  toProxyUrl,
} from "@/utils";

abstract class Extension {
  cryptoJs: typeof CryptoJS;
  fetch: typeof fetch;
  nanoid: typeof nanoid;
  urlJoin: (...parts: (string | null)[]) => string;
  maxPageNoFromElements: typeof maxPageNoFromElements;
  parseAndExecuteHtml: typeof parseAndExecuteHtml;
  toProxyUrl: typeof toProxyUrl;

  abstract id: string;
  abstract name: string;
  abstract version: string;
  abstract baseUrl: string;
  codeString?: string;

  protected constructor() {
    this.cryptoJs = CryptoJS;
    this.fetch = fetch;
    this.nanoid = nanoid;

    this.urlJoin = (...parts: (string | null)[]): string => {
      const filter = parts.filter((part) => part != null);
      if (!filter.length) return "";
      if (filter.length === 1) return filter[0];
      if (filter[1].startsWith("http")) return this.urlJoin(...filter.slice(1));
      return urlJoin(...filter);
    };
    this.maxPageNoFromElements = maxPageNoFromElements;
    this.parseAndExecuteHtml = parseAndExecuteHtml;
    this.toProxyUrl = toProxyUrl;
  }

  get hash() {
    // 由id+name+version生成，不可重复
    return this.cryptoJs.MD5(this.id + this.name + this.version).toString();
  }
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      version: this.version,
      baseUrl: this.baseUrl,
      hash: this.hash,
    };
  }
}

export { Extension };
