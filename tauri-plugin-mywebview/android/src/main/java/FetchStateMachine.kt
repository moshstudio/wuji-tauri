package wuji.plugin.mywebview

import android.net.Uri
import android.os.Handler
import android.util.Log
import android.webkit.WebView
import java.lang.ref.WeakReference

/**
 * fetchWebview 桌面浏览器采集状态机（对齐 desktop.rs）。
 *
 * ```
 * LOADING ──(稳定延迟)──► STABILIZING ──(注入 scraping.js)──► SCRAPING ──► COMPLETED
 *    ▲                                                           │
 *    └── onPageStarted 重置计时                                   └── Bridge / 轮询
 * 硬超时: LOADING/SCRAPING ──► RESCUING ──► COMPLETED（抢救）| URL 兜底 | ERROR
 * ```
 */
class FetchStateMachine(
        private val handler: Handler,
        private val initialUrl: String,
        private val delayTime: Long,
        private val maxPollRetries: () -> Int,
        private val getScrapingJs: () -> String,
        private val onInjectPageScripts: (WebView) -> Unit,
        private val onBeforeScraping: (WebView) -> Unit = {},
        private val resolvePageUrl: (WebView?, String) -> String,
        private val deliverPayload: (String, String) -> Unit,
        private val deliverUrlOnly: (String) -> Unit,
        private val fail: (String) -> Unit,
        private val isCompleted: () -> Boolean,
) {

    enum class Phase {
        IDLE,
        LOADING,
        STABILIZING,
        SCRAPING,
        RESCUING,
        COMPLETED,
    }

    private var phase = Phase.IDLE
    /** 每次主文档导航递增，用于作废过期的稳定/注入任务 */
    private var loadGeneration = 0
    /** 目标站内主文档跳转次数（对齐 desktop redirect_times） */
    private var sameSiteNavigationCount = 0
    /** 采集脚本是否已注入（注入后忽略 iframe/广告触发的后续加载） */
    private var scrapingInjected = false
    private var pollRetry = 0
    private var pendingUrl: String = initialUrl
    private var lastUrlChangeAtMs: Long = 0L

    private val targetHost: String? =
            try {
                Uri.parse(initialUrl).host
            } catch (_: Exception) {
                null
            }

    private var stabilizeRunnable: Runnable? = null
    private var pollRunnable: PollRunnable? = null
    private var rescueFinalizeRunnable: Runnable? = null

    fun onSessionStart() {
        if (phase != Phase.IDLE) return
        phase = Phase.LOADING
        pendingUrl = initialUrl
        lastUrlChangeAtMs = now()
        log("sessionStart url=$initialUrl")
    }

    fun onPageStarted(view: WebView, url: String?) {
        if (isCompleted() || phase == Phase.COMPLETED || scrapingInjected) return

        cancelStabilize()
        loadGeneration++
        val generation = loadGeneration

        recordSameSiteNavigation(url)
        if (!url.isNullOrBlank()) {
            pendingUrl = url
        }
        lastUrlChangeAtMs = now()
        phase = Phase.LOADING
        if (!BackstageWebView.isErrorPageUrl(url)) {
            onInjectPageScripts(view)
        }

        scheduleStabilize(
                view = view,
                baseDelayMs = PAGE_STARTED_INJECT_DELAY_MS,
                reason = "pageStarted",
                generation = generation,
        )
        log("pageStarted gen=$generation url=$url sameSiteNav=$sameSiteNavigationCount")
    }

    fun onPageFinished(view: WebView, url: String) {
        if (isCompleted() || phase == Phase.COMPLETED || scrapingInjected) return

        if (BackstageWebView.isErrorPageUrl(url)) {
            log("ignore error page finish url=$url")
            return
        }

        if (!BackstageWebView.isErrorPageUrl(url)) {
            pendingUrl = url
        }
        lastUrlChangeAtMs = now()
        val generation = loadGeneration

        // Finished 优先：更短延迟，覆盖 Started 的兜底调度
        cancelStabilize()
        phase = Phase.STABILIZING
        scheduleStabilize(
                view = view,
                baseDelayMs = PAGE_FINISHED_INJECT_DELAY_MS,
                reason = "pageFinished",
                generation = generation,
        )
        log("pageFinished gen=$generation url=$url")
    }

    fun onBridgeResult(json: String, webView: WebView?) {
        if (isCompleted() || phase == Phase.COMPLETED) return
        transitionToCompleted()
        deliverPayload(json, resolvePageUrl(webView, pendingUrl))
    }

    fun destroy() {
        cancelAll()
        phase = Phase.COMPLETED
    }

    fun currentPhase(): Phase = phase

    /** 硬超时：先抢救已收集数据，再 URL 兜底 */
    fun onHardTimeout(webView: WebView?, lastNavigationUrl: String?) {
        if (isCompleted() || phase == Phase.COMPLETED) return

        val activeView = webView
        if (activeView != null && !scrapingInjected) {
            tryInjectScraping(activeView, loadGeneration, "hardTimeoutPreInject")
        }

        if (activeView != null && (phase == Phase.SCRAPING || scrapingInjected)) {
            phase = Phase.RESCUING
            attemptRescue(activeView)
            rescueFinalizeRunnable?.let { handler.removeCallbacks(it) }
            val finalize =
                    Runnable {
                        if (!isCompleted()) {
                            finalizeTimeout(lastNavigationUrl)
                        }
                    }
            rescueFinalizeRunnable = finalize
            handler.postDelayed(finalize, RESCUE_WAIT_MS)
            return
        }

        finalizeTimeout(lastNavigationUrl)
    }

    private fun finalizeTimeout(lastNavigationUrl: String?) {
        if (isCompleted()) return
        transitionToCompleted()

        val redirectUrl =
                lastNavigationUrl?.takeUnless {
                    BackstageWebView.isErrorPageUrl(it) || BackstageWebView.isLocalAppUrl(it)
                }
        if (!redirectUrl.isNullOrBlank()) {
            deliverUrlOnly(redirectUrl)
        } else {
            fail("Request timeout")
        }
    }

    private fun recordSameSiteNavigation(url: String?) {
        if (url.isNullOrBlank() || targetHost == null) return
        val host =
                try {
                    Uri.parse(url).host
                } catch (_: Exception) {
                    null
                }
        if (host == targetHost) {
            sameSiteNavigationCount++
        }
    }

    private fun redirectExtraDelay(): Long =
            if (sameSiteNavigationCount > 1) REDIRECT_EXTRA_DELAY_MS else 0L

    private fun scheduleStabilize(
            view: WebView,
            baseDelayMs: Long,
            reason: String,
            generation: Int,
    ) {
        cancelStabilize()
        val delay = baseDelayMs + redirectExtraDelay() + delayTime
        val runnable =
                Runnable {
                    if (generation != loadGeneration) {
                        log(
                                "skip obsolete stabilize reason=$reason gen=$generation current=$loadGeneration"
                        )
                        return@Runnable
                    }
                    if (isCompleted() || scrapingInjected) return@Runnable
                    val remainingStableWait = remainingUrlStableWaitMs()
                    if (remainingStableWait > 0L) {
                        log(
                                "wait url stable reason=$reason remaining=${remainingStableWait}ms url=$pendingUrl"
                        )
                        scheduleStabilize(
                                view = view,
                                baseDelayMs = remainingStableWait,
                                reason = "$reason/urlStable",
                                generation = generation,
                        )
                        return@Runnable
                    }
                    phase = Phase.STABILIZING
                    tryInjectScraping(view, generation, reason)
                }
        stabilizeRunnable = runnable
        handler.postDelayed(runnable, delay)
        log("scheduleStabilize reason=$reason delay=${delay}ms gen=$generation")
    }

    private fun tryInjectScraping(view: WebView, generation: Int, reason: String) {
        if (isCompleted() || scrapingInjected || generation != loadGeneration) return

        val activeUrl = view.url?.takeIf { it.isNotBlank() && it != "about:blank" }
        if (!activeUrl.isNullOrBlank() && activeUrl != pendingUrl) {
            pendingUrl = activeUrl
            lastUrlChangeAtMs = now()
            log("active url changed before inject reason=$reason active=$activeUrl")
            scheduleStabilize(
                    view = view,
                    baseDelayMs = URL_STABLE_WAIT_MS,
                    reason = "$reason/activeUrlChanged",
                    generation = generation,
            )
            return
        }

        scrapingInjected = true
        phase = Phase.SCRAPING
        pollRetry = 0

        log("injectScraping reason=$reason gen=$generation")
        onBeforeScraping(view)
        view.evaluateJavascript(getScrapingJs(), null)
        startPolling(view, generation)
    }

    private fun startPolling(view: WebView, generation: Int) {
        cancelPoll()
        val poll = PollRunnable(view, generation)
        pollRunnable = poll
        handler.postDelayed(poll, POLL_INTERVAL_MS)
    }

    private fun attemptRescue(view: WebView) {
        log("attemptRescue")
        view.evaluateJavascript(RESCUE_SCRIPT, null)
    }

    private fun transitionToCompleted() {
        phase = Phase.COMPLETED
        cancelAll()
    }

    private inner class PollRunnable(
            webView: WebView,
            private val generation: Int,
    ) : Runnable {
        private val webViewRef = WeakReference(webView)

        override fun run() {
            if (isCompleted() || generation != loadGeneration || phase != Phase.SCRAPING) return

            val wv =
                    webViewRef.get()
                            ?: run {
                                fail("WebView已被回收")
                                return
                            }

            wv.evaluateJavascript("window.__wuji_scraping_ready__ === true") { readyResult ->
                if (isCompleted()) return@evaluateJavascript

                val isReady = readyResult?.trim()?.removeSurrounding("\"") == "true"
                log("poll ready=$isReady retry=$pollRetry")

                if (isReady) {
                    wv.evaluateJavascript("window.__wuji_scraping_result__") { rawResult ->
                        if (isCompleted()) return@evaluateJavascript
                        transitionToCompleted()
                        deliverPayload(rawResult ?: "", resolvePageUrl(wv, pendingUrl))
                    }
                    return@evaluateJavascript
                }

                if (pollRetry >= maxPollRetries()) {
                    transitionToCompleted()
                    fail("js执行超时")
                    return@evaluateJavascript
                }
                pollRetry++
                handler.postDelayed(this, POLL_INTERVAL_MS)
            }
        }
    }

    private fun cancelStabilize() {
        stabilizeRunnable?.let { handler.removeCallbacks(it) }
        stabilizeRunnable = null
    }

    private fun cancelPoll() {
        pollRunnable?.let { handler.removeCallbacks(it) }
        pollRunnable = null
    }

    private fun cancelAll() {
        cancelStabilize()
        cancelPoll()
        rescueFinalizeRunnable?.let { handler.removeCallbacks(it) }
        rescueFinalizeRunnable = null
    }

    private fun remainingUrlStableWaitMs(): Long {
        return (URL_STABLE_WAIT_MS - (now() - lastUrlChangeAtMs)).coerceAtLeast(0L)
    }

    private fun now(): Long = android.os.SystemClock.elapsedRealtime()

    private fun log(message: String) {
        Log.d(TAG, "[$phase] $message")
    }

    companion object {
        private const val TAG = "FetchStateMachine"
        private const val PAGE_STARTED_INJECT_DELAY_MS = 1_400L
        private const val PAGE_FINISHED_INJECT_DELAY_MS = 500L
        private const val REDIRECT_EXTRA_DELAY_MS = 1_500L
        private const val URL_STABLE_WAIT_MS = 3_000L
        private const val POLL_INTERVAL_MS = 1_000L
        private const val RESCUE_WAIT_MS = 3_000L

        private val RESCUE_SCRIPT =
                """
            (function(){
                try {
                    var r = (window.__wuji_sniffed__ || []).map(function(x) {
                        return {
                            url: x.url,
                            type: x.type || 'other',
                            resourceType: x.type || 'other',
                            method: x.method || 'GET',
                            contentType: x.contentType || null,
                            size: x.size || null
                        };
                    });
                    var d = JSON.stringify({
                        content: document.documentElement ? document.documentElement.innerHTML : '',
                        title: document.title || '',
                        resources: r
                    });
                    if (window.WujiScrapBridge && typeof window.WujiScrapBridge.onScrapingResult === 'function') {
                        window.WujiScrapBridge.onScrapingResult(d);
                    } else {
                        window.__wuji_scraping_result__ = d;
                        window.__wuji_scraping_ready__ = true;
                    }
                } catch (e) {}
            })();
        """
                        .trimIndent()
    }
}
