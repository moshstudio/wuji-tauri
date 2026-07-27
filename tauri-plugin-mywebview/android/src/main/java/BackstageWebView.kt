package wuji.plugin.mywebview

import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.ApplicationInfo
import android.net.Uri
import android.net.http.SslError
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.AndroidRuntimeException
import android.util.Log
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.SslErrorHandler
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import java.lang.ref.WeakReference
import java.util.concurrent.TimeoutException
import java.util.concurrent.atomic.AtomicBoolean
import org.apache.commons.text.StringEscapeUtils
import org.json.JSONObject
import wuji.plugin.mywebview.coroutine.Coroutine
import wuji.plugin.mywebview.exception.NoStackTraceException

data class StrResponse(
        val success: Boolean,
        val error: String? = null,
        val content: String? = null,
        val cookie: String? = null,
        val url: String? = null,
        val title: String? = null,
        val resources: org.json.JSONArray? = null
)

/** 后台webView */
class BackstageWebView(
        private var context: Context,
        private val url: String? = null,
        private val html: String? = null,
        private val encode: String? = null,
        private val tag: String? = null,
        private val headerMap: Map<String, String>? = null,
        private val sourceRegex: String? = null,
        private val overrideUrlRegex: String? = null,
        private val javaScript: String? = null,
        private val delayTime: Long = 0,
        /** 超时时长（毫秒） */
        private val timeout: Long = 20000L,
        private val waitForResources: String? = null,
        private val useSavedCookie: Boolean = true,
) {

    private val mHandler = Handler(Looper.getMainLooper())
    private var callback: Callback? = null
    private var mWebView: WebView? = null
    private var fetchStateMachine: FetchStateMachine? = null
    private val assetCache = mutableMapOf<String, String>()
    private val resultDelivered = AtomicBoolean(false)
    /** 最近一次成功加载完成的主文档 URL（与桌面端 window.url() 对齐） */
    private var lastNavigationUrl: String? = null

    /** Rust/桌面端对齐：JS 超时 + 宽限；额外覆盖轮询等待窗口 */
    private val hardTimeoutMs: Long
        get() = timeout + SCRAPING_GRACE_MS + maxPollRetries() * 1000L

    private fun isDebugBuild(): Boolean {
        return (context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0
    }

    private fun handleSslError(handler: SslErrorHandler?, error: SslError?) {
        if (handler == null) return
        if (isDebugBuild()) {
            Log.w(
                    "BackstageWebView",
                    "SSL error in debug build, proceeding: primary=${error?.primaryError}"
            )
            handler.proceed()
        } else {
            Log.e(
                    "BackstageWebView",
                    "SSL error in release build, canceling: primary=${error?.primaryError}"
            )
            handler.cancel()
            callback?.onError(NoStackTraceException("SSL certificate error"))
            destroy()
        }
    }

    fun getStrResponse(onResult: (StrResponse) -> Unit, onError: (Throwable) -> Unit) {
        val timeoutHandler = Handler(Looper.getMainLooper())
        var isCompleted = false
        var timeoutRunnable: Runnable? = null

        // 硬超时：状态机抢救 → URL 兜底 → 错误
        timeoutRunnable = Runnable {
            if (!isCompleted) {
                runOnUI {
                    if (resultDelivered.get()) return@runOnUI
                    fetchStateMachine?.onHardTimeout(mWebView, lastNavigationUrl)
                            ?: run {
                                isCompleted = true
                                destroy()
                                onError(TimeoutException("Request timeout after ${hardTimeoutMs}ms"))
                            }
                }
            }
        }
        timeoutHandler.postDelayed(timeoutRunnable, hardTimeoutMs)

        callback =
                object : Callback() {
                    override fun onResult(response: StrResponse) {
                        if (!isCompleted) {
                            isCompleted = true
                            timeoutRunnable.let { timeoutHandler.removeCallbacks(it) }
                            onResult(response)
                        }
                    }

                    override fun onError(error: Throwable) {
                        if (!isCompleted) {
                            isCompleted = true
                            timeoutRunnable.let { timeoutHandler.removeCallbacks(it) }
                            onError(error)
                        }
                    }
                }

        runOnUI {
            try {
                load()
            } catch (error: Throwable) {
                if (!isCompleted) {
                    isCompleted = true
                    timeoutRunnable.let { timeoutHandler.removeCallbacks(it) }
                    onError(error)
                }
            }
        }
    }

    private fun getEncoding(): String {
        return encode ?: "utf-8"
    }

    private fun createFetchStateMachine(): FetchStateMachine {
        return FetchStateMachine(
                handler = mHandler,
                initialUrl = url ?: "",
                delayTime = delayTime,
                maxPollRetries = { maxPollRetries() },
                getScrapingJs = { getJs() },
                onInjectPageScripts = { view ->
                    injectSpoof(view)
                    injectSniffInit(view)
                },
                onBeforeScraping = { view -> injectMinimalRenderingCss(view) },
                resolvePageUrl = { webView, fallback -> resolvePageUrl(webView, fallback) },
                deliverPayload = { rawJson, pageUrl -> deliverScrapingPayload(rawJson, pageUrl) },
                deliverUrlOnly = { pageUrl -> deliverUrlOnlyResult(pageUrl) },
                fail = { message -> failLoad(message) },
                isCompleted = { resultDelivered.get() },
        )
    }

    @Throws(AndroidRuntimeException::class)
    private fun load() {
        val webView = createWebView()
        mWebView = webView
        fetchStateMachine = createFetchStateMachine()
        fetchStateMachine?.onSessionStart()
        try {
            when {
                !html.isNullOrEmpty() ->
                        if (url.isNullOrEmpty()) {
                            webView.loadData(html, "text/html", getEncoding())
                        } else {
                            webView.loadDataWithBaseURL(url, html, "text/html", getEncoding(), url)
                        }
                else -> {
                    val headers = desktopRequestHeaders().toMutableMap()
                    headerMap?.let { headers.putAll(it) }
                    webView.loadUrl(url!!, headers)
                }
            }
        } catch (e: Exception) {
            callback?.onError(e)
            destroy()
        }
    }

    @SuppressLint("SetJavaScriptEnabled", "JavascriptInterface")
    private fun createWebView(): WebView {
        val webView = WebView(context)

        // 跳过渲染层缓存，减少不必要的渲染开销
        webView.setLayerType(android.view.View.LAYER_TYPE_NONE, null)

        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.blockNetworkImage = true
        settings.userAgentString = AppConst.UA
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        settings.cacheMode = WebSettings.LOAD_NO_CACHE
        settings.setSupportMultipleWindows(false)
        settings.loadsImagesAutomatically = false
        // 桌面视口：宽屏 + 不缩放到手机宽度
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = false
        // 嗅探场景需要无手势自动播放，与桌面端行为对齐
        settings.mediaPlaybackRequiresUserGesture = false

        webView.addJavascriptInterface(ScrapResultBridge(), "WujiScrapBridge")
        installDocumentStartSniffer(webView)
        installDocumentStartSpoof(webView)

        prepareInitialCookies()

        if (sourceRegex.isNullOrBlank() && overrideUrlRegex.isNullOrBlank()) {
            Log.e("createWebView", "HtmlWebViewClient")
            webView.webViewClient = HtmlWebViewClient()
        } else {
            Log.e("createWebView", "SnifferWebClient")
            webView.webViewClient = SnifferWebClient()
        }
        return webView
    }

    /** 注入 CSS 禁用动画/滚动；在 DOM 就绪后执行，避免 onPageStarted 时 head 为空 */
    private fun injectMinimalRenderingCss(webView: WebView) {
        val css =
                """
            (function() {
                function apply() {
                    try {
                        var style = document.createElement('style');
                        style.textContent = '*, *::before, *::after { animation: none !important; transition: none !important; } body { overflow: hidden !important; }';
                        var parent = document.head || document.documentElement;
                        if (parent) parent.appendChild(style);
                    } catch (e) {}
                }
                try {
                    if (document.head || document.documentElement) {
                        apply();
                    } else if (document.readyState === 'loading') {
                        document.addEventListener('DOMContentLoaded', apply, { once: true });
                    } else {
                        apply();
                    }
                } catch (e) {}
            })();
        """.trimIndent()
        webView.evaluateJavascript(css, null)
    }

    private fun prepareInitialCookies() {
        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)
        val pageUrl = url ?: return
        if (useSavedCookie) {
            CookieStore.getCookieByUrl(context, pageUrl)?.let { saved ->
                cookieManager.setCookie(pageUrl, saved)
                cookieManager.flush()
            }
        } else {
            clearWebViewCookiesForUrl(pageUrl)
        }
    }

    /** 清除 WebView 全局 Cookie 池中会影响该 URL 的条目，保证本次请求初始无 Cookie */
    private fun clearWebViewCookiesForUrl(pageUrl: String) {
        val cookieManager = CookieManager.getInstance()
        val existing = cookieManager.getCookie(pageUrl) ?: return
        for (part in existing.split(";")) {
            val name = part.trim().substringBefore("=").trim()
            if (name.isEmpty()) continue
            cookieManager.setCookie(pageUrl, "$name=; Max-Age=0; Path=/")
        }
        cookieManager.flush()
    }

    private fun installDocumentStartSniffer(webView: WebView) {
        val sniffInit = readAssetCached("sniff_init.js")
        if (sniffInit.isEmpty()) return
        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            try {
                WebViewCompat.addDocumentStartJavaScript(webView, sniffInit, setOf("*"))
                Log.d("BackstageWebView", "Installed document-start sniff_init.js")
            } catch (e: Exception) {
                Log.w("BackstageWebView", "Failed to install document-start script", e)
            }
        }
    }

    private fun installDocumentStartSpoof(webView: WebView) {
        val spoofScript = buildSpoofScript()
        if (spoofScript.isEmpty()) return
        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            try {
                WebViewCompat.addDocumentStartJavaScript(webView, spoofScript, setOf("*"))
                Log.d("BackstageWebView", "Installed document-start spoof.js")
            } catch (e: Exception) {
                Log.w("BackstageWebView", "Failed to install document-start spoof", e)
            }
        }
    }

    private fun buildSpoofScript(): String {
        return readAssetCached("spoof.js")
                .replace("__WUJI_DESKTOP_UA__", JSONObject.quote(AppConst.UA))
                .replace("__WUJI_DESKTOP_WIDTH__", AppConst.DESKTOP_WIDTH.toString())
                .replace("__WUJI_DESKTOP_HEIGHT__", AppConst.DESKTOP_HEIGHT.toString())
    }

    /** 桌面 Chrome 常见请求头，配合 Sec-CH-UA* 减少被识别为移动端 */
    private fun desktopRequestHeaders(): Map<String, String> =
            mapOf(
                    "Accept" to
                            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                    "Accept-Language" to "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
                    "Sec-CH-UA" to
                            "\"Chromium\";v=\"141\", \"Google Chrome\";v=\"141\", \"Not;A=Brand\";v=\"99\"",
                    "Sec-CH-UA-Mobile" to "?0",
                    "Sec-CH-UA-Platform" to "\"Windows\"",
                    "Upgrade-Insecure-Requests" to "1",
            )

    private fun destroy() {
        fetchStateMachine?.destroy()
        fetchStateMachine = null
        mHandler.removeCallbacksAndMessages(null)
        val webView = mWebView ?: return
        mWebView = null
        try {
            webView.stopLoading()
            webView.loadUrl("about:blank")
            webView.webViewClient = WebViewClient()
            webView.webChromeClient = null
            webView.clearHistory()
            webView.removeAllViews()
            (webView.parent as? android.view.ViewGroup)?.removeView(webView)
            webView.destroy()
        } catch (e: Exception) {
            Log.w("BackstageWebView", "destroy failed", e)
        }
    }

    private fun getJs(): String {
        val rawJs = (javaScript?.takeIf { it.isNotEmpty() } ?: readAssetCached("scraping.js"))
        return rawJs.replace("{{timeout}}", timeout.toString())
                .replace("{{target_type}}", waitForResources ?: "")
    }

    private fun readAssetCached(fileName: String): String {
        assetCache[fileName]?.let {
            return it
        }
        val content = readAsset(fileName)
        if (content.isNotEmpty()) {
            assetCache[fileName] = content
        }
        return content
    }

    private fun readAsset(fileName: String): String {
        return try {
            context.assets.open(fileName).bufferedReader().use { it.readText() }
        } catch (e: Exception) {
            Log.e("BackstageWebView", "Failed to read asset: $fileName", e)
            ""
        }
    }

    private fun injectSniffInit(webView: WebView) {
        webView.evaluateJavascript(readAssetCached("sniff_init.js"), null)
    }

    private fun injectSpoof(webView: WebView) {
        webView.evaluateJavascript(buildSpoofScript(), null)
    }

    private fun setCookie(url: String) {
        if (!useSavedCookie) return
        CookieStore.saveCookie(context, url)
    }

    private fun resolvePageUrl(webView: WebView?, fallback: String): String {
        val fromWebView = webView?.url?.takeIf { it.isNotBlank() && it != "about:blank" }
        val candidate = fromWebView ?: lastNavigationUrl ?: fallback
        return when {
            isErrorPageUrl(candidate) ->
                    lastNavigationUrl?.takeUnless { isLocalAppUrl(it) || isErrorPageUrl(it) }
                            ?: fallback
            isLocalAppUrl(candidate) ->
                    lastNavigationUrl?.takeUnless { isLocalAppUrl(it) || isErrorPageUrl(it) }
                            ?: fallback
            else -> candidate
        }
    }

    /** Bridge 直接传 JSON；evaluateJavascript 回调会多包一层引号与转义 */
    private fun decodeScrapingJson(rawJson: String): String {
        var raw = rawJson.trim()
        if (raw.isEmpty() || raw == "null") return raw
        if (raw.startsWith("{") && raw.endsWith("}")) return raw
        if (raw.startsWith("\"") && raw.endsWith("\"")) {
            raw = StringEscapeUtils.unescapeJson(raw)
            if (raw.length >= 2 && raw.startsWith("\"") && raw.endsWith("\"")) {
                raw = raw.substring(1, raw.length - 1)
            }
            if (raw.startsWith("{") && raw.endsWith("}")) return raw
            return StringEscapeUtils.unescapeJson(raw)
        }
        return raw
    }

    private fun isWebViewErrorContent(title: String?, content: String?): Boolean {
        if (title == "网页无法打开") return true
        val body = content ?: return false
        return body.contains("net::ERR_") || body.contains("chrome-error://")
    }

    private fun recordNavigationUrl(url: String?) {
        if (url.isNullOrBlank() || isErrorPageUrl(url) || isLocalAppUrl(url)) return
        lastNavigationUrl = url
    }

    /**
     * hscangku.com 会跳到 hk234.space:8899，中转域在 Android WebView 中偶发拒绝连接；
     * 站点提示可加 www 访问，桌面端实际也能进入 www.hk234.space:8899 后再 302 到目标站。
     */
    private fun retryWithWwwProxyIfNeeded(view: WebView?, failingUrl: String?): Boolean {
        if (view == null || failingUrl.isNullOrBlank()) return false
        return try {
            val parsed = Uri.parse(failingUrl)
            if (!parsed.host.equals("hk234.space", ignoreCase = true) || parsed.port != 8899) {
                return false
            }

            val retryUrl =
                    parsed.buildUpon().encodedAuthority("www.hk234.space:8899").build().toString()
            Log.w("BackstageWebView", "Retry proxy url with www: $retryUrl")
            mHandler.post { view.loadUrl(retryUrl, desktopRequestHeaders()) }
            true
        } catch (e: Exception) {
            Log.w("BackstageWebView", "Failed to build www proxy retry url: $failingUrl", e)
            false
        }
    }

    private fun deliverUrlOnlyResult(pageUrl: String) {
        if (!resultDelivered.compareAndSet(false, true)) return
        val cookie = CookieManager.getInstance().getCookie(pageUrl)
        callback?.onResult(
                StrResponse(
                        success = true,
                        url = pageUrl,
                        content = "",
                        cookie = cookie,
                        title = null,
                        resources = org.json.JSONArray(),
                )
        )
        mHandler.post { destroy() }
    }

    private fun failLoad(message: String) {
        if (!resultDelivered.compareAndSet(false, true)) return
        callback?.onError(NoStackTraceException(message))
        mHandler.post { destroy() }
    }

    private fun maxPollRetries(): Int {
        return (timeout / 1000L + 15L).toInt().coerceAtLeast(30)
    }

    private fun deliverScrapingPayload(rawJson: String, pageUrl: String) {
        if (!resultDelivered.compareAndSet(false, true)) return
        val resolvedPageUrl = pageUrl

        Coroutine.async {
            try {
                val response = parseScrapingPayload(rawJson, resolvedPageUrl)
                callback?.onResult(response)
            } catch (e: Exception) {
                Log.e("WujiWebView", "[deliverScrapingPayload] parse failed", e)
                callback?.onError(e)
            }
            mHandler.post { destroy() }
        }
    }

    private fun parseScrapingPayload(rawJson: String, pageUrl: String): StrResponse {
        val trimmed = rawJson.trim()
        if (trimmed.isEmpty() || trimmed == "null") {
            throw NoStackTraceException("结果为空")
        }

        val jsonText = decodeScrapingJson(trimmed)
        var content: String
        var title: String? = null
        var resources: org.json.JSONArray? = null
        if (jsonText.startsWith("{") && jsonText.endsWith("}")) {
            val jsonObject = JSONObject(jsonText)
            content = jsonObject.optString("content", "")
            title = jsonObject.optString("title").takeIf { it.isNotEmpty() }
            resources = jsonObject.optJSONArray("resources")
        } else {
            content = jsonText
        }

        if (isWebViewErrorContent(title, content)) {
            content = ""
            title = title?.takeUnless { it == "网页无法打开" }
        }

        val finalUrl =
                if (isErrorPageUrl(pageUrl) || isLocalAppUrl(pageUrl)) {
                    lastNavigationUrl?.takeUnless { isErrorPageUrl(it) || isLocalAppUrl(it) }
                            ?: pageUrl
                } else {
                    pageUrl
                }
        if (isErrorPageUrl(finalUrl) || isLocalAppUrl(finalUrl)) {
            throw NoStackTraceException("网页加载失败")
        }

        val cookie = CookieManager.getInstance().getCookie(finalUrl)
        return StrResponse(
                success = true,
                url = finalUrl,
                content = content,
                cookie = cookie,
                title = title,
                resources = resources,
        )
    }

    inner class ScrapResultBridge {
        @JavascriptInterface
        fun onScrapingResult(json: String) {
            mHandler.post { fetchStateMachine?.onBridgeResult(json, mWebView) }
        }
    }

    private inner class HtmlWebViewClient : WebViewClient() {

        override fun onPageStarted(
                view: WebView?,
                url: String?,
                favicon: android.graphics.Bitmap?
        ) {
            super.onPageStarted(view, url, favicon)
            recordNavigationUrl(url)
            view?.let { fetchStateMachine?.onPageStarted(it, url) }
        }

        override fun onPageFinished(view: WebView, url: String) {
            recordNavigationUrl(url)
            if (!isErrorPageUrl(url)) {
                setCookie(url)
            }
            fetchStateMachine?.onPageFinished(view, url)
        }

        override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
        ) {
            if (request?.isForMainFrame != true) return
            val failingUrl = request.url?.toString()
            if (retryWithWwwProxyIfNeeded(view, failingUrl)) return
            recordNavigationUrl(failingUrl)
            Log.w(
                    "BackstageWebView",
                    "Main frame error: ${error?.description}, continue scrape cycle"
            )
        }

        @Suppress("DEPRECATION")
        override fun onReceivedError(
                view: WebView?,
                errorCode: Int,
                description: String?,
                failingUrl: String?
        ) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) return
            failLoad("网页加载失败: ${description ?: errorCode}")
        }

        override fun onReceivedSslError(
                view: WebView?,
                handler: SslErrorHandler?,
                error: SslError?
        ) {
            handleSslError(handler, error)
        }

        override fun shouldInterceptRequest(
                view: WebView?,
                request: WebResourceRequest?
        ): WebResourceResponse? {
            val reqUrl =
                    request?.url?.toString() ?: return super.shouldInterceptRequest(view, request)
            notifyMediaResource(view, reqUrl)
            return super.shouldInterceptRequest(view, request)
        }
    }

    private inner class SnifferWebClient : WebViewClient() {

        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            if (shouldOverrideUrlLoading(request.url.toString())) {
                return true
            }
            return super.shouldOverrideUrlLoading(view, request)
        }

        @Suppress("DEPRECATION", "OVERRIDE_DEPRECATION", "KotlinRedundantDiagnosticSuppress")
        override fun shouldOverrideUrlLoading(view: WebView, url: String): Boolean {
            if (shouldOverrideUrlLoading(url)) {
                return true
            }
            return super.shouldOverrideUrlLoading(view, url)
        }

        private fun shouldOverrideUrlLoading(requestUrl: String): Boolean {
            overrideUrlRegex?.let {
                if (requestUrl.matches(it.toRegex())) {
                    try {
                        val response =
                                StrResponse(
                                        url = url,
                                        content = requestUrl,
                                        success = true,
                                )
                        callback?.onResult(response)
                    } catch (e: Exception) {
                        callback?.onError(e)
                    }
                    destroy()
                    return true
                }
            }
            return false
        }

        //        override fun onLoadResource(view: WebView, resUrl: String) {
        //            sourceRegex?.let {
        //                if (resUrl.matches(it.toRegex())) {
        //                    try {
        //                        val response = StrResponse(success = true, url=url,
        // content=resUrl)
        //                        callback?.onResult(response)
        //                    } catch (e: Exception) {
        //                        callback?.onError(e)
        //                    }
        //                    destroy()
        //                }
        //            }
        //        }

        override fun onPageStarted(
                view: WebView?,
                url: String?,
                favicon: android.graphics.Bitmap?
        ) {
            super.onPageStarted(view, url, favicon)
            view?.let {
                if (!isErrorPageUrl(url)) {
                    injectSpoof(it)
                    injectSniffInit(it)
                }
            }
        }

        override fun onPageFinished(webView: WebView, url: String) {
            setCookie(url)
            injectSpoof(webView)
            if (!javaScript.isNullOrEmpty()) {
                val runnable = LoadJsRunnable(webView, javaScript)
                mHandler.postDelayed(runnable, 500L + delayTime)
            }
        }

        override fun onReceivedSslError(
                view: WebView?,
                handler: SslErrorHandler?,
                error: SslError?
        ) {
            handleSslError(handler, error)
        }

        override fun shouldInterceptRequest(
                view: WebView?,
                request: WebResourceRequest?
        ): WebResourceResponse? {
            val reqUrl =
                    request?.url?.toString() ?: return super.shouldInterceptRequest(view, request)
            notifyMediaResource(view, reqUrl)
            return super.shouldInterceptRequest(view, request)
        }

        private inner class LoadJsRunnable(webView: WebView, private val mJavaScript: String?) :
                Runnable {
            private val mWebView: WeakReference<WebView> = WeakReference(webView)
            override fun run() {
                mWebView.get()?.loadUrl("javascript:${mJavaScript}")
            }
        }
    }

    private fun notifyMediaResource(view: WebView?, reqUrl: String) {
        if (!isMediaUrl(reqUrl)) return
        val escapedUrl = JSONObject.quote(reqUrl)
        val mediaType = guessType(reqUrl)
        runOnUI {
            val script =
                    "if(window.addResource){window.addResource($escapedUrl,'Native (Intercept)',{type:'$mediaType'});}"
            view?.evaluateJavascript(script, null)
        }
    }

    companion object {
        private const val SCRAPING_GRACE_MS = 10_000L

        fun isErrorPageUrl(url: String?): Boolean {
            if (url.isNullOrBlank() || url == "about:blank") return true
            return url.startsWith("chrome-error://", ignoreCase = true)
        }

        fun isLocalAppUrl(url: String?): Boolean {
            if (url.isNullOrBlank()) return false
            return url.contains("tauri.localhost", ignoreCase = true)
        }
        private val quoteRegex = "^\"|\"$".toRegex()
        private val mediaRegex =
                """\.(mp4|m3u8|m4v|mkv|webm|ts|mpd|m4s|mp3|aac|ogg|flac|wav|m4a|opus)($|\?|&|%|#)""".toRegex(
                        RegexOption.IGNORE_CASE
                )

        fun isMediaUrl(url: String): Boolean {
            val u = url.lowercase()
            if (mediaRegex.find(u) != null) return true
            if (u.contains("filename") &&
                            (u.contains(".mp4") || u.contains(".m3u8") || u.contains(".ts"))
            )
                    return true
            if (u.contains("/hls/") ||
                            u.contains("/m3u8") ||
                            u.contains("playlist.m3u8") ||
                            u.contains(".isml")
            )
                    return true
            if (u.contains("video-content") || u.contains("media-source")) return true
            return false
        }

        fun guessType(url: String): String {
            val u = url.lowercase()
            if (u.contains(".mp3") ||
                            u.contains(".aac") ||
                            u.contains(".ogg") ||
                            u.contains(".flac") ||
                            u.contains(".wav") ||
                            u.contains(".m4a") ||
                            u.contains(".opus")
            )
                    return "audio"
            return "video"
        }
    }

    abstract class Callback {
        abstract fun onResult(response: StrResponse)
        abstract fun onError(error: Throwable)
    }
}
