package wuji.plugin.mywebview

import android.annotation.SuppressLint
import android.content.Context
import android.net.http.SslError
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.AndroidRuntimeException
import android.util.Log
import android.webkit.CookieManager
import android.webkit.SslErrorHandler
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import java.io.ByteArrayInputStream
import org.json.JSONObject
import wuji.plugin.mywebview.exception.NoStackTraceException
import wuji.plugin.mywebview.coroutine.Coroutine
import kotlinx.coroutines.Dispatchers.IO
import kotlinx.coroutines.Runnable
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeout
import org.apache.commons.text.StringEscapeUtils
import java.lang.ref.WeakReference
import java.util.concurrent.TimeoutException
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

data class StrResponse(
    val success: Boolean,
    val error: String? = null,
    val content: String? = null,
    val cookie: String? = null,
    val url: String? = null,
    val title: String? = null,
    val resources: org.json.JSONArray? = null
)

/**
 * 后台webView
 */
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
    private val timeout: Long = 20000L,
    private val waitForResources: String? = null
) {

    private val mHandler = Handler(Looper.getMainLooper())
    private var callback: Callback? = null
    private var mWebView: WebView? = null

    fun getStrResponse(
        onResult: (StrResponse) -> Unit,
        onError: (Throwable) -> Unit
    ) {
        val timeoutHandler = Handler(Looper.getMainLooper())
        var isCompleted = false
        var timeoutRunnable: Runnable? = null

        // 设置超时
        timeoutRunnable = Runnable {
            if (!isCompleted) {
                isCompleted = true
                runOnUI {
                    destroy()
                }
                onError(TimeoutException("Request timeout after ${timeout + 10000}ms"))
            }
        }
        timeoutHandler.postDelayed(timeoutRunnable, timeout + 10000L)

        callback = object : Callback() {
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

    @Throws(AndroidRuntimeException::class)
    private fun load() {
        val webView = createWebView()
        mWebView = webView
        try {
            when {
                !html.isNullOrEmpty() -> if (url.isNullOrEmpty()) {
                    webView.loadData(html, "text/html", getEncoding())
                } else {
                    webView.loadDataWithBaseURL(url, html, "text/html", getEncoding(), url)
                }

                else -> if (headerMap == null) {
                    webView.loadUrl(url!!)
                } else {
                    webView.loadUrl(url!!, headerMap)
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
        // 桌面模式视口适配
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.mediaPlaybackRequiresUserGesture = true

        setInitialCookie(webView)

        if (sourceRegex.isNullOrBlank() && overrideUrlRegex.isNullOrBlank()) {
            Log.e("createWebView", "HtmlWebViewClient")
            webView.webViewClient = HtmlWebViewClient()
        } else {
            Log.e("createWebView", "SnifferWebClient")
            webView.webViewClient = SnifferWebClient()
        }
        return webView
    }

    /**
     * 注入 CSS 来禁用所有视觉渲染，减轻主线程压力。
     * 隐藏所有可见元素、禁用动画/过渡/滚动。
     */
    private fun injectMinimalRenderingCss(webView: WebView) {
        val css = """
            (function() {
                var style = document.createElement('style');
                style.textContent = '*, *::before, *::after { animation: none !important; transition: none !important; } body { overflow: hidden !important; }';
                (document.head || document.documentElement).appendChild(style);
            })();
        """.trimIndent()
        webView.evaluateJavascript(css, null)
    }

    private fun setInitialCookie(webView: WebView) {
        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)
        url?.let { cookieManager.setCookie(it, CookieStore.getCookieByUrl(context, it)) }
    }

    private fun destroy() {
        mHandler.removeCallbacksAndMessages(null)
        mWebView?.stopLoading()
        mWebView?.destroy()
        mWebView = null
    }

    private fun getJs(): String {
        val rawJs = (javaScript?.takeIf { it.isNotEmpty() } ?: readAsset("scraping.js"))
        return rawJs
            .replace("{{timeout}}", timeout.toString())
            .replace("{{target_type}}", waitForResources ?: "")
    }

    private fun readAsset(fileName: String): String {
        return try {
            context.assets.open(fileName).bufferedReader().use { it.readText() }
        } catch (e: Exception) {
            Log.e("BackstageWebView", "Failed to read asset: $fileName", e)
            ""
        }
    }

    private fun setCookie(url: String) {
        CookieStore.saveCookie(context, url)
    }

    private inner class HtmlWebViewClient : WebViewClient() {

        private var runnable: EvalJsRunnable? = null

        override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
            super.onPageStarted(view, url, favicon)
            view?.let {
                injectMinimalRenderingCss(it)
                it.evaluateJavascript(readAsset("sniff_init.js"), null)
            }
        }

        override fun onPageFinished(view: WebView, url: String) {
            setCookie(url)
            view.evaluateJavascript(readAsset("spoof.js"), null)
            runnable?.let { mHandler.removeCallbacks(it) }
            runnable = EvalJsRunnable(view, url, getJs())
            mHandler.postDelayed(runnable!!, 1000 + delayTime)
        }

        @SuppressLint("WebViewClientOnReceivedSslError")
        override fun onReceivedSslError(
            view: WebView?,
            handler: SslErrorHandler?,
            error: SslError?
        ) {
            handler?.proceed()
        }

        override fun shouldInterceptRequest(
            view: WebView?,
            request: WebResourceRequest?
        ): WebResourceResponse? {
            val reqUrl = request?.url?.toString() ?: return super.shouldInterceptRequest(view, request)
            if (isMediaUrl(reqUrl)) {
                runOnUI {
                    val script = "if(window.addResource){window.addResource('${reqUrl}', 'Native (Intercept)', {type: '${guessType(reqUrl)}'});}"
                    view?.evaluateJavascript(script, null)
                }
            }
            return super.shouldInterceptRequest(view, request)
        }

        private inner class EvalJsRunnable(
            webView: WebView,
            private val url: String,
            private val mJavaScript: String
        ) : Runnable {
            var retry = 0
            private var jsStarted = false
            private val mWebView: WeakReference<WebView> = WeakReference(webView)

            override fun run() {
                val wv = mWebView.get()
                if (wv == null) {
                    callback?.onError(NoStackTraceException("WebView已被回收"))
                    return
                }

                if (!jsStarted) {
                    // 第一次执行：启动 scraping.js（它会在 JS 端异步轮询资源）
                    Log.e("WujiWebView", "[EvalJsRunnable] Starting scraping.js")
                    wv.evaluateJavascript(mJavaScript, null)
                    jsStarted = true
                    // 1秒后开始轮询结果
                    mHandler.postDelayed(this, 1000)
                    return
                }

                // 阶段一：只检查轻量标志位（几字节），不传输大数据
                wv.evaluateJavascript("window.__wuji_scraping_ready__ === true") { readyResult ->
                    val isReady = readyResult?.trim()?.removeSurrounding("\"") == "true"
                    Log.e("WujiWebView", "[EvalJsRunnable] Polling ready=$isReady, retry=$retry")

                    if (isReady) {
                        // 阶段二：确认就绪后，才读取完整结果
                        wv.evaluateJavascript("window.__wuji_scraping_result__") { rawResult ->
                            handleResult(rawResult)
                        }
                    } else {
                        // 结果还没准备好，继续轮询
                        if (retry > 30) {
                            callback?.onError(NoStackTraceException("js执行超时"))
                            mHandler.post { destroy() }
                            return@evaluateJavascript
                        }
                        retry++
                        mHandler.postDelayed(this@EvalJsRunnable, 1000)
                    }
                }
            }

            private fun handleResult(result: String) = Coroutine.async {
                Log.e("WujiWebView", "[handleResult] raw result length=${result.length}, first200=${result.take(200)}")
                if (result.isNotEmpty() && result != "null") {
                    var content = StringEscapeUtils.unescapeJson(result)
                        .replace(quoteRegex, "")
                    Log.e("WujiWebView", "[handleResult] after unescape length=${content.length}, startsWithBrace=${content.startsWith("{")}, endsWithBrace=${content.endsWith("}")}")
                    var title: String? = null
                    try {
                        if (content.startsWith("{") && content.endsWith("}")) {
                            val jsonObject = JSONObject(content)
                            if (jsonObject.has("content")) {
                                content = jsonObject.getString("content")
                                title = jsonObject.optString("title")
                                val resourcesArr = jsonObject.optJSONArray("resources")
                                Log.e("WujiWebView", "[handleResult] parsed JSON - content length=${content.length}, title=$title, resources count=${resourcesArr?.length() ?: 0}")
                                Log.e("WujiWebView", "[handleResult] content first200=${content.take(200)}")
                                if (resourcesArr != null && resourcesArr.length() > 0) {
                                    Log.e("WujiWebView", "[handleResult] first resource=${resourcesArr.optJSONObject(0)}")
                                }
                                
                                try {
                                    val response = buildStrResponse(content, title, resourcesArr)
                                    callback?.onResult(response)
                                } catch (e: Exception) {
                                    callback?.onError(e)
                                }
                                mHandler.post {
                                    destroy()
                                }
                                return@async
                            }
                        }
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }

                    try {
                        val response = buildStrResponse(content, title, null)
                        callback?.onResult(response)
                    } catch (e: Exception) {
                        e.printStackTrace()
                        callback?.onError(e)
                    }
                    mHandler.post {
                        destroy()
                    }
                    return@async
                }
                // 异常情况：ready 标志为 true 但结果为空
                Log.e("WujiWebView", "[handleResult] unexpected empty result after ready=true")
                callback?.onError(NoStackTraceException("结果为空"))
                mHandler.post { destroy() }
            }

            private fun buildStrResponse(content: String, title: String?, resources: org.json.JSONArray?): StrResponse {
                val cookie = CookieManager.getInstance().getCookie(url)
                return StrResponse(
                    success = true,
                    url = url,
                    content = content,
                    cookie = cookie,
                    title = title,
                    resources = resources
                )
            }
        }

    }

    private inner class SnifferWebClient : WebViewClient() {

        override fun shouldOverrideUrlLoading(
            view: WebView,
            request: WebResourceRequest
        ): Boolean {
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
                        val response = StrResponse(
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
//                        val response = StrResponse(success = true, url=url, content=resUrl)
//                        callback?.onResult(response)
//                    } catch (e: Exception) {
//                        callback?.onError(e)
//                    }
//                    destroy()
//                }
//            }
//        }

        override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
            super.onPageStarted(view, url, favicon)
            view?.let {
                injectMinimalRenderingCss(it)
                it.evaluateJavascript(readAsset("sniff_init.js"), null)
            }
        }

        override fun onPageFinished(webView: WebView, url: String) {
            setCookie(url)
            webView.evaluateJavascript(readAsset("spoof.js"), null)
            if (!javaScript.isNullOrEmpty()) {
                val runnable = LoadJsRunnable(webView, javaScript)
                mHandler.postDelayed(runnable, 500L + delayTime)
            }
        }

        @SuppressLint("WebViewClientOnReceivedSslError")
        override fun onReceivedSslError(
            view: WebView?,
            handler: SslErrorHandler?,
            error: SslError?
        ) {
            handler?.proceed()
        }

        override fun shouldInterceptRequest(
            view: WebView?,
            request: WebResourceRequest?
        ): WebResourceResponse? {
            val reqUrl = request?.url?.toString() ?: return super.shouldInterceptRequest(view, request)
            if (isMediaUrl(reqUrl)) {
                runOnUI {
                    val script = "if(window.addResource){window.addResource('${reqUrl}', 'Native (Intercept)', {type: '${guessType(reqUrl)}'});}"
                    view?.evaluateJavascript(script, null)
                }
            }
            return super.shouldInterceptRequest(view, request)
        }

        private inner class LoadJsRunnable(
            webView: WebView,
            private val mJavaScript: String?
        ) : Runnable {
            private val mWebView: WeakReference<WebView> = WeakReference(webView)
            override fun run() {
                mWebView.get()?.loadUrl("javascript:${mJavaScript}")
            }
        }
    }

    companion object {
        private val quoteRegex = "^\"|\"$".toRegex()
        private val mediaRegex = """\.(mp4|m3u8|m4v|mkv|webm|ts|mpd|m4s|mp3|aac|ogg|flac|wav|m4a|opus)($|\?|&|%|#)""".toRegex(RegexOption.IGNORE_CASE)

        fun isMediaUrl(url: String): Boolean {
            val u = url.lowercase()
            if (mediaRegex.find(u) != null) return true
            if (u.contains("filename") && (u.contains(".mp4") || u.contains(".m3u8") || u.contains(".ts"))) return true
            if (u.contains("/hls/") || u.contains("/m3u8") || u.contains("playlist.m3u8") || u.contains(".isml")) return true
            if (u.contains("video-content") || u.contains("media-source")) return true
            return false
        }

        fun guessType(url: String): String {
            val u = url.lowercase()
            if (u.contains(".mp3") || u.contains(".aac") || u.contains(".ogg") || u.contains(".flac") || u.contains(".wav") || u.contains(".m4a") || u.contains(".opus")) return "audio"
            return "video"
        }
    }

    abstract class Callback {
        abstract fun onResult(response: StrResponse)
        abstract fun onError(error: Throwable)
    }
}
