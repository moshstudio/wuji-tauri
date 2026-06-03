import type { VideoUrlMap } from '@wuji-tauri/source-extension';
import type { CastDevice, DiscoverDevicesResult } from 'tauri-plugin-cast-api';
import type { PlaybackProxyAlignOptions } from '@/utils/videoPlaybackProxy';
import { invoke } from '@tauri-apps/api/core';
import {
  discoverDevices,
  getCastState,
  getLanIp,
  stopCast,
} from 'tauri-plugin-cast-api';
import { showConfirmDialog, showToast } from 'vant';
import { ref, watch } from 'vue';
import {
  buildPlaybackAlignedProxyHeaders,
  isHlsVideoSource,
  isLocalPlayerProxyUrl,
  needsPlaybackAlignedProxy,
  unwrapLocalPlayerProxyUrl,
} from '@/utils/videoPlaybackProxy';

export type { PlaybackProxyAlignOptions as CastProxyAlignOptions };
export type { CastDevice, DiscoverDevicesResult };

export interface CastMediaResult {
  success: boolean;
  error?: string;
}

const LAN_HOST_PLACEHOLDER = '__LAN_HOST__';

/** 当前投屏设备（切集时用于自动续投） */
export const activeCastDevice = ref<CastDevice | null>(null);

const CAST_SYNC_INTERVAL_MS = 2_500;
const CAST_END_NEAR_TAIL_MS = 2_500;
const CAST_END_STREAK_REQUIRED = 2;
const CAST_IDLE_STREAK_REQUIRED = 2;

let castSyncTimer: ReturnType<typeof setInterval> | undefined;
let castSyncTickRunning = false;

interface CastSyncContext {
  hadPlayback: boolean;
  lastPositionMs: number;
  lastDurationMs: number;
  /** 本轮投屏中出现过的最大进度，用于电视停止上报后仍能识别片尾 */
  peakPositionMs: number;
  peakDurationMs: number;
  endStreak: number;
  idleStreak: number;
  noProgressStreak: number;
}

let castSyncCtx: CastSyncContext = createCastSyncContext();

function createCastSyncContext(): CastSyncContext {
  return {
    hadPlayback: false,
    lastPositionMs: -1,
    lastDurationMs: 0,
    peakPositionMs: 0,
    peakDurationMs: 0,
    endStreak: 0,
    idleStreak: 0,
    noProgressStreak: 0,
  };
}

function trackCastProgress(pos: number, dur: number) {
  if (dur > 0 && pos > castSyncCtx.peakPositionMs) {
    castSyncCtx.peakPositionMs = pos;
    castSyncCtx.peakDurationMs = dur;
  }
}

function resetCastSyncContext() {
  castSyncCtx = createCastSyncContext();
}

function stopCastSyncWatcher() {
  if (castSyncTimer) {
    clearInterval(castSyncTimer);
    castSyncTimer = undefined;
  }
}

function startCastSyncWatcher() {
  stopCastSyncWatcher();
  resetCastSyncContext();
  castSyncTimer = setInterval(() => {
    void tickCastSync();
  }, CAST_SYNC_INTERVAL_MS);
}

/** 电视端当前集播完时尝试自动播放下一集，返回 true 表示已续播 */
export type CastAutoNextHandler = () => Promise<boolean>;

let castAutoNextHandler: CastAutoNextHandler | null = null;
let castAutoNextInFlight = false;
/** 连播下一集时由 handler 自行 reconnect，避免 videoSrc watch 重复投屏 */
let castReconnectSkipOnce = false;

export function setCastAutoNextHandler(handler: CastAutoNextHandler | null) {
  castAutoNextHandler = handler;
}

/** 投屏连播已处理续投时，videoSrc 的 watch 应跳过一次 reconnect */
export function shouldSkipCastReconnectFromVideoSrc(): boolean {
  if (!castReconnectSkipOnce) {
    return false;
  }
  castReconnectSkipOnce = false;
  return true;
}

export function markCastReconnectHandledByAutoNext() {
  castReconnectSkipOnce = true;
}

function wasNearEndOfTrackedEpisode(): boolean {
  const pos = Math.max(castSyncCtx.peakPositionMs, castSyncCtx.lastPositionMs);
  const dur = Math.max(castSyncCtx.peakDurationMs, castSyncCtx.lastDurationMs);
  return dur > 0 && pos >= dur - CAST_END_NEAR_TAIL_MS;
}

function shouldAttemptCastAutoNext(reason: 'finished' | 'stopped' | 'lost'): boolean {
  if (!castAutoNextHandler) {
    return false;
  }
  if (reason === 'finished') {
    return true;
  }
  return wasNearEndOfTrackedEpisode();
}

/** 是否为当前集自然播完（区别于用户/电视手动停止） */
function isNaturalCastPlaybackEnd(
  state: Awaited<ReturnType<typeof getCastState>>,
): boolean {
  if (state.hasFinished) {
    return true;
  }

  const pos = state.positionMs ?? 0;
  const dur = state.durationMs ?? 0;

  if (dur > 0 && pos >= dur - CAST_END_NEAR_TAIL_MS) {
    return true;
  }

  if (wasNearEndOfTrackedEpisode()) {
    return true;
  }

  if (dur > 0 && pos === 0 && castSyncCtx.lastPositionMs > 30_000) {
    return true;
  }

  return false;
}

function resolveCastEndReason(
  state: Awaited<ReturnType<typeof getCastState>>,
): 'finished' | 'stopped' | 'lost' {
  if (isNaturalCastPlaybackEnd(state) || wasNearEndOfTrackedEpisode()) {
    return 'finished';
  }
  if (!state.isConnected && castSyncCtx.hadPlayback) {
    return 'lost';
  }
  return 'stopped';
}

function resolveCastEndReasonWithoutState(): 'finished' | 'stopped' | 'lost' {
  return wasNearEndOfTrackedEpisode() ? 'finished' : 'lost';
}

async function tryCastAutoPlayNext(): Promise<boolean> {
  if (!castAutoNextHandler || !activeCastDevice.value || castAutoNextInFlight) {
    return false;
  }
  castAutoNextInFlight = true;
  try {
    return await castAutoNextHandler();
  }
  finally {
    castAutoNextInFlight = false;
  }
}

async function handleCastEndedOnTv(reason: 'finished' | 'stopped' | 'lost') {
  if (!activeCastDevice.value) {
    return;
  }
  const name = activeCastDevice.value.name;

  if (shouldAttemptCastAutoNext(reason)) {
    stopCastSyncWatcher();
    try {
      const continued = await tryCastAutoPlayNext();
      if (continued) {
        resetCastSyncContext();
        startCastSyncWatcher();
        showToast('正在播放下一集');
        return;
      }
      console.warn('cast auto next: handler returned false', { reason });
    }
    catch (error) {
      console.warn('cast auto next failed', error);
    }
  }

  stopCastSyncWatcher();
  await endCastSession();
  const message = reason === 'finished'
    ? `电视端播放已结束（${name}）`
    : reason === 'lost'
      ? `与电视连接已断开（${name}）`
      : `电视端已停止播放（${name}）`;
  showToast(message);
}

/** 离开视频页前确认是否结束投屏（供路由守卫使用） */
export async function confirmLeaveCastRoute(): Promise<boolean> {
  if (!activeCastDevice.value) {
    return true;
  }
  const ok = await confirmLeaveWhileCasting();
  if (ok) {
    await endCastSession();
  }
  return ok;
}

function isTvPlaybackEnded(state: Awaited<ReturnType<typeof getCastState>>): boolean {
  const pos = state.positionMs ?? 0;
  const dur = state.durationMs ?? 0;

  if (state.hasFinished) {
    return true;
  }

  if (state.playbackState === 'stopped' && castSyncCtx.hadPlayback) {
    return true;
  }

  if (castSyncCtx.hadPlayback && dur > 0 && pos >= dur - CAST_END_NEAR_TAIL_MS) {
    return true;
  }

  if (castSyncCtx.hadPlayback && dur > 0 && pos === 0 && castSyncCtx.lastPositionMs > 30_000) {
    return true;
  }

  if (castSyncCtx.hadPlayback && dur === 0 && pos === 0) {
    return wasNearEndOfTrackedEpisode();
  }

  return false;
}

function castEndStreakRequired(state: Awaited<ReturnType<typeof getCastState>>): number {
  return state.hasFinished ? 1 : CAST_END_STREAK_REQUIRED;
}

async function tickCastSync() {
  if (!activeCastDevice.value || castSyncTickRunning) {
    return;
  }
  castSyncTickRunning = true;
  try {
    const state = await getCastState();
    const pos = state.positionMs ?? 0;
    const dur = state.durationMs ?? 0;

    if (state.isPlaying || (dur > 0 && pos > 1_000)) {
      castSyncCtx.hadPlayback = true;
      castSyncCtx.noProgressStreak = 0;
    }

    trackCastProgress(pos, dur);

    if (!castSyncCtx.hadPlayback) {
      castSyncCtx.lastPositionMs = pos;
      castSyncCtx.lastDurationMs = dur;
      return;
    }

    if (isTvPlaybackEnded(state)) {
      castSyncCtx.endStreak++;
      if (castSyncCtx.endStreak >= castEndStreakRequired(state)) {
        await handleCastEndedOnTv(resolveCastEndReason(state));
        return;
      }
    }
    else {
      castSyncCtx.endStreak = 0;
    }

    if (dur === 0 && pos === 0 && !state.isPlaying && wasNearEndOfTrackedEpisode()) {
      castSyncCtx.idleStreak++;
      if (castSyncCtx.idleStreak >= CAST_IDLE_STREAK_REQUIRED) {
        await handleCastEndedOnTv(resolveCastEndReason(state));
        return;
      }
    }
    else {
      castSyncCtx.idleStreak = 0;
    }

    if (dur === 0 && pos === 0 && !state.isConnected) {
      castSyncCtx.noProgressStreak++;
      if (castSyncCtx.noProgressStreak >= CAST_IDLE_STREAK_REQUIRED) {
        await handleCastEndedOnTv(resolveCastEndReason(state));
      }
    }

    castSyncCtx.lastPositionMs = pos;
    castSyncCtx.lastDurationMs = dur;
  }
  catch (error) {
    console.warn('cast sync tick failed', error);
    if (castSyncCtx.hadPlayback) {
      castSyncCtx.noProgressStreak++;
      if (castSyncCtx.noProgressStreak >= 3) {
        await handleCastEndedOnTv(resolveCastEndReasonWithoutState());
      }
    }
  }
  finally {
    castSyncTickRunning = false;
  }
}

watch(activeCastDevice, (device) => {
  if (device) {
    startCastSyncWatcher();
  }
  else {
    stopCastSyncWatcher();
  }
});

export async function getCastM3u8ProxyUrl(
  url: string,
  headers?: Record<string, string> | null,
): Promise<string | null> {
  return await invoke<string>('plugin:proxy-plugin|get_cast_m3u8_url', {
    originalUrl: url,
    headers: headers || {},
  });
}

export async function getCastProxyUrl(
  url: string,
  headers?: Record<string, string> | null,
): Promise<string | null> {
  return await invoke<string>('plugin:proxy-plugin|get_cast_proxy_url', {
    originalUrl: url,
    headers: headers || {},
  });
}

export async function stopCastProxyServer(): Promise<void> {
  await invoke('plugin:proxy-plugin|stop_cast_proxy_server');
}

function applyLanHostToCastUrl(castUrl: string, lanIp: string): string {
  return castUrl
    .replace(new RegExp(LAN_HOST_PLACEHOLDER, 'g'), lanIp)
    .replace('http://127.0.0.1:', `http://${lanIp}:`)
    .replace('http://localhost:', `http://${lanIp}:`);
}

export async function resolveCastPlayableUrl(
  videoSrc: VideoUrlMap,
  alignOpts?: PlaybackProxyAlignOptions,
): Promise<string> {
  const lanIp = await getLanIp();
  if (!lanIp) {
    throw new Error('无法获取局域网 IP，请确认手机与电视在同一 Wi-Fi');
  }

  let url = videoSrc.url;
  if (!url) {
    throw new Error('当前没有可投屏的播放地址');
  }

  let headers = videoSrc.headers ? { ...videoSrc.headers } : undefined;
  let forceProxy = false;
  let preferM3u8 = isHlsVideoSource(videoSrc);

  if (isLocalPlayerProxyUrl(url)) {
    const unwrapped = unwrapLocalPlayerProxyUrl(url);
    if (!unwrapped) {
      throw new Error('无法解析本地代理播放地址，请重新加载视频后再投屏');
    }
    url = unwrapped.url;
    headers = { ...unwrapped.headers, ...headers };
    forceProxy = true;
    preferM3u8 = preferM3u8 || unwrapped.wasM3u8;
  }

  const urlMapForProxy: VideoUrlMap = { ...videoSrc, url, headers };
  const shouldProxy = forceProxy
    || needsPlaybackAlignedProxy(urlMapForProxy, alignOpts);

  let castUrl: string | null;
  if (shouldProxy) {
    const proxyHeaders = buildPlaybackAlignedProxyHeaders(
      urlMapForProxy,
      alignOpts?.pageUrl,
    );
    castUrl = preferM3u8
      ? await getCastM3u8ProxyUrl(url, proxyHeaders)
      : await getCastProxyUrl(url, proxyHeaders);
  }
  else {
    castUrl = url;
  }

  if (!castUrl) {
    throw new Error('生成投屏地址失败');
  }

  return applyLanHostToCastUrl(castUrl, lanIp);
}

/** DLNA 设备搜索等待时长（毫秒）；需足够时间解析电视友好名称 */
export const CAST_DEVICE_SEARCH_TIMEOUT_MS = 10000;

export async function searchCastDevices(
  timeoutMs = CAST_DEVICE_SEARCH_TIMEOUT_MS,
): Promise<DiscoverDevicesResult> {
  const result = await discoverDevices(timeoutMs);
  return {
    devices: Array.isArray(result.devices) ? result.devices : [],
    lanIp: result.lanIp ?? null,
    error: result.error,
  };
}

let castWarmupPromise: Promise<void> | null = null;

/** 进入播放页后后台预热 SSDP，减轻首次打开投屏列表搜不到设备 */
export function warmupCastDiscovery(): void {
  if (castWarmupPromise) {
    return;
  }
  castWarmupPromise = discoverDevices(4000)
    .then(() => {})
    .catch(() => {})
    .finally(() => {
      castWarmupPromise = null;
    });
}

/** 原生投屏+播放确认总时长约 22s，前端略留余量防止 invoke 永不返回 */
const CAST_MEDIA_INVOKE_TIMEOUT_MS = 28_000;

export async function startDlnaCast(
  device: CastDevice,
  videoSrc: VideoUrlMap,
  title?: string,
  alignOpts?: PlaybackProxyAlignOptions,
): Promise<CastMediaResult> {
  const url = await resolveCastPlayableUrl(videoSrc, alignOpts);
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error('投屏请求超时，请重试')),
      CAST_MEDIA_INVOKE_TIMEOUT_MS,
    );
  });
  try {
    const res = await Promise.race([
      invoke<CastMediaResult>('plugin:cast|cast_media', {
        payload: {
          deviceId: device.id,
          url,
          title,
          deviceAddress: device.address,
        },
      }),
      timeoutPromise,
    ]);
    return {
      success: !!res.success,
      error: res.error,
    };
  }
  finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

/** 投屏中离开页面前确认；返回 true 允许离开，false 留在当前页 */
export async function confirmLeaveWhileCasting(): Promise<boolean> {
  const device = activeCastDevice.value;
  if (!device) {
    return true;
  }
  try {
    await showConfirmDialog({
      title: '正在投屏',
      message: `正在投屏到「${device.name}」，离开页面将停止投屏，确定离开吗？`,
      confirmButtonText: '离开',
      cancelButtonText: '继续投屏',
    });
    return true;
  }
  catch {
    return false;
  }
}

export async function endCastSession(): Promise<void> {
  stopCastSyncWatcher();
  try {
    await stopCast();
  }
  catch (error) {
    console.warn('stopCast failed', error);
  }
  try {
    await stopCastProxyServer();
  }
  catch (error) {
    console.warn('stopCastProxyServer failed', error);
  }
  activeCastDevice.value = null;
}

export async function isCastingActive(): Promise<boolean> {
  if (!activeCastDevice.value) {
    return false;
  }
  try {
    const state = await getCastState();
    return !!state.isPlaying || (!!state.isConnected && !state.hasFinished);
  }
  catch {
    return !!activeCastDevice.value;
  }
}

/** 投屏连播：向当前设备推送新地址（由页面在切集后调用） */
export async function castContinueMedia(
  videoSrc: VideoUrlMap,
  title?: string,
  alignOpts?: PlaybackProxyAlignOptions,
): Promise<boolean> {
  const device = activeCastDevice.value;
  if (!device?.id || !videoSrc.url || videoSrc.isLive) {
    return false;
  }
  markCastReconnectHandledByAutoNext();
  const success = (await startDlnaCast(device, videoSrc, title, alignOpts)).success;
  if (success) {
    resetCastSyncContext();
  }
  return success;
}

export async function reconnectCast(
  videoSrc: VideoUrlMap,
  title?: string,
  alignOpts?: PlaybackProxyAlignOptions,
): Promise<boolean> {
  return await castContinueMedia(videoSrc, title, alignOpts);
}

export { getCastState, stopCast };
