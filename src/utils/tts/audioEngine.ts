/**
 * 听书双缓冲音频引擎
 *
 * 安卓 WebView 上 Audio 有三条硬约束，引擎按这个设计，避免「打补丁」：
 * 1. 已 ended 的元素再设 src，经常完全没声 → 下一段用另一块
 * 2. pause 后再 play，会丢掉播放资格，后续 play 被静默拒绝 → 成功播出前不要 pause
 * 3. 对正在播的元素改 src 会打断解码，听感就是卡顿 → 正在播时只允许 seek currentTime
 */

export interface TtsPlayRequest {
  blob: Blob;
  /** 从该秒起播；缺省或 0 表示从头 */
  seekSec?: number;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
}

function createElement(): HTMLAudioElement {
  const el = new Audio();
  el.preload = 'auto';
  el.setAttribute('playsinline', 'true');
  return el;
}

function clearHandlers(el: HTMLAudioElement) {
  el.onloadedmetadata = null;
  el.oncanplay = null;
  el.onplaying = null;
  el.onended = null;
  el.onerror = null;
  el.ontimeupdate = null;
}

function detachSource(el: HTMLAudioElement) {
  clearHandlers(el);
  if (!el.paused && !el.ended)
    el.pause();
  el.removeAttribute('src');
  el.load();
}

function revoke(url: string | null) {
  if (url)
    URL.revokeObjectURL(url);
}

export function createTtsAudioEngine() {
  const slots: [HTMLAudioElement, HTMLAudioElement] = [
    createElement(),
    createElement(),
  ];
  let active = 0;
  /** 每次 play/stop 递增，作废进行中的回调与重试 */
  let generation = 0;
  let activeUrl: string | null = null;
  let pendingUrl: string | null = null;

  const current = () => slots[active];
  const standby = () => slots[1 - active];

  /**
   * 空闲 / 暂停：复用当前块（用户手势 play 仍有效）
   * 已结束 / 正在播：用另一块，避免 ended 换 src、以及改正在播的 src
   * 注意：ended 时 paused 也为 true，必须先判断 ended
   */
  function pickIncoming(): HTMLAudioElement {
    const el = current();
    if (el.ended)
      return standby();
    if (!el.src || el.paused)
      return el;
    return standby();
  }

  function promote(incoming: HTMLAudioElement) {
    const outgoing = current();
    if (outgoing !== incoming) {
      detachSource(outgoing);
      active = incoming === slots[0] ? 0 : 1;
    }
    revoke(activeUrl);
    activeUrl = pendingUrl;
    pendingUrl = null;
  }

  function play(req: TtsPlayRequest) {
    generation += 1;
    const gen = generation;
    const incoming = pickIncoming();
    const seekSec = req.seekSec && req.seekSec > 0 ? req.seekSec : 0;

    clearHandlers(incoming);
    revoke(pendingUrl);
    pendingUrl = URL.createObjectURL(req.blob);

    incoming.ontimeupdate = () => {
      if (gen !== generation)
        return;
      req.onTimeUpdate?.(incoming.currentTime);
    };
    incoming.onended = () => {
      if (gen !== generation)
        return;
      req.onEnded?.();
    };

    const tryPlay = (attempt = 0) => {
      if (gen !== generation)
        return;
      void incoming.play().then(() => {
        if (gen !== generation)
          return;
        promote(incoming);
      }).catch(() => {
        if (gen !== generation || attempt >= 5)
          return;
        window.setTimeout(() => tryPlay(attempt + 1), 200 * (attempt + 1));
      });
    };

    let kicked = false;
    const kick = () => {
      if (kicked || gen !== generation)
        return;
      kicked = true;
      if (seekSec > 0 && incoming.readyState >= HTMLMediaElement.HAVE_METADATA)
        incoming.currentTime = seekSec;
      tryPlay();
    };

    incoming.onloadedmetadata = kick;
    incoming.src = pendingUrl;
    // 从头播不必等 metadata；锁屏后 loadedmetadata 可能迟迟不来
    if (seekSec <= 0)
      kick();
  }

  /** 同一段内跳转。目标与当前相差很小则不动，避免无意义 seek 造成卡顿 */
  function seek(sec: number): boolean {
    const el = current();
    if (!el.src || el.ended)
      return false;
    if (Math.abs(el.currentTime - sec) < 0.15)
      return true;
    el.currentTime = sec;
    if (el.paused)
      void el.play().catch(() => {});
    return true;
  }

  function pause() {
    const el = current();
    if (!el.paused && !el.ended)
      el.pause();
  }

  function resume() {
    const el = current();
    if (el.paused && el.src)
      void el.play().catch(() => {});
  }

  function stop() {
    generation += 1;
    detachSource(slots[0]);
    detachSource(slots[1]);
    revoke(activeUrl);
    revoke(pendingUrl);
    activeUrl = null;
    pendingUrl = null;
    active = 0;
  }

  return {
    play,
    seek,
    pause,
    resume,
    stop,
    get element() {
      return current();
    },
  };
}

export type TtsAudioEngine = ReturnType<typeof createTtsAudioEngine>;
