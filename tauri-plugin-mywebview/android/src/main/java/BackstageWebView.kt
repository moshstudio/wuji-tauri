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
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
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
        }
    }

    @SuppressLint("SetJavaScriptEnabled", "JavascriptInterface")
    private fun createWebView(): WebView {
        val webView = WebView(context)
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.blockNetworkImage = true
        settings.userAgentString = AppConst.UA
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW

        // 桌面模式设置
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.setSupportZoom(true)
        settings.builtInZoomControls = true
        settings.displayZoomControls = false

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

    private fun setInitialCookie(webView: WebView) {
        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)
        url?.let { cookieManager.setCookie(it, CookieStore.getCookieByUrl(context, it)) }
    }

    private fun destroy() {
        mWebView?.destroy()
        mWebView = null
    }

    private fun getJs(): String {
        val finalJs = (javaScript?.takeIf { it.isNotEmpty() } ?: JS)
        return finalJs
            .replace("{{timeout}}", timeout.toString())
            .replace("{{target_type}}", waitForResources ?: "")
    }

    private fun setCookie(url: String) {
        CookieStore.saveCookie(context, url)
    }

    private inner class HtmlWebViewClient : WebViewClient() {

        private var runnable: EvalJsRunnable? = null

        override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
            super.onPageStarted(view, url, favicon)
            view?.evaluateJavascript(SNIFF_INIT_SCRIPT, null)
        }

        override fun onPageFinished(view: WebView, url: String) {
            setCookie(url)
            view.evaluateJavascript(SPOOF_JS, null)
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

        private inner class EvalJsRunnable(
            webView: WebView,
            private val url: String,
            private val mJavaScript: String
        ) : Runnable {
            var retry = 0
            private val mWebView: WeakReference<WebView> = WeakReference(webView)
            override fun run() {
                mWebView.get()?.evaluateJavascript(mJavaScript) {
                    handleResult(it)
                }
            }

            private fun handleResult(result: String) = Coroutine.async {
                if (result.isNotEmpty() && result != "null") {
                    var content = StringEscapeUtils.unescapeJson(result)
                        .replace(quoteRegex, "")
                    var title: String? = null
                    try {
                        if (content.startsWith("{") && content.endsWith("}")) {
                            val jsonObject = JSONObject(content)
                            if (jsonObject.has("content")) {
                                content = jsonObject.getString("content")
                                title = jsonObject.optString("title")
                                val resourcesArr = jsonObject.optJSONArray("resources")
                                
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
                if (retry > 30) {
                    callback?.onError(NoStackTraceException("js执行超时"))
                    mHandler.post {
                        destroy()
                    }
                    return@async
                }
                retry++
                mHandler.postDelayed(this@EvalJsRunnable, 1000)
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
            view?.evaluateJavascript(SNIFF_INIT_SCRIPT, null)
        }

        override fun onPageFinished(webView: WebView, url: String) {
            setCookie(url)
            webView.evaluateJavascript(SPOOF_JS, null)
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
        const val JS = """
(function() {
    async function startScraping() {
        const MAX_WAIT_MS = parseInt('{{timeout}}') || 20000;
        const TARGET_TYPE = '{{target_type}}';
        const SETTLE_MS = 2500;
        
        const startTime = Date.now();
        let lastResourceCount = 0;
        let lastChangeTime = Date.now();

        while (Date.now() - startTime < MAX_WAIT_MS) {
            const sniffed = window.__wuji_sniffed__ || [];
            let matchedResources = [];
            if (TARGET_TYPE) {
                const targetTypes = TARGET_TYPE.split(',').map(t => t.trim());
                matchedResources = sniffed.filter(function(r) { return targetTypes.includes(r.type); });
            } else {
                if (document.readyState === 'complete' && Date.now() - startTime > 2000) break;
            }

            if (TARGET_TYPE && matchedResources.length > 0) {
                if (matchedResources.length > lastResourceCount) {
                    lastResourceCount = matchedResources.length;
                    lastChangeTime = Date.now();
                } else if (Date.now() - lastChangeTime > SETTLE_MS) {
                    break;
                }
            } else if (!TARGET_TYPE && document.readyState === 'complete') {
                 if (Date.now() - startTime > 2000) break;
            }
            await new Promise(function(r) { setTimeout(r, 400); });
        }

        try {
            if (window.stop) window.stop();
            const sniffed = (window.__wuji_sniffed__ || []).map(function(r) { 
                return Object.assign({}, r, { resourceType: r.type || 'other' });
            });
            const seenUrls = new Set(sniffed.map(function(r) { return r.url; }));
            document.querySelectorAll('video, audio, img').forEach(function(el) {
                const src = el.currentSrc || el.src;
                if (src && src.startsWith('http') && !seenUrls.has(src)) {
                    sniffed.push({ url: src, resourceType: el.tagName.toLowerCase(), source: 'FinalScan' });
                }
            });
            const content = btoa(encodeURIComponent(document.documentElement.innerHTML));
            const title = document.title;
            return JSON.stringify({ content: content, title: title, resources: sniffed });
        } catch (e) {
            return JSON.stringify({ content: "", title: "Error", resources: [] });
        }
    }
    return startScraping();
})();
"""
        const val SNIFF_INIT_SCRIPT = """
(function () {
    'use strict';
    if (window._mediaSnifferInjected) return;
    window._mediaSnifferInjected = true;

    if (!window.__wuji_sniffed__) window.__wuji_sniffed__ = [];
    const sniffed = window.__wuji_sniffed__;
    const seenUrls = new Set();

    try {
        Object.defineProperty(HTMLMediaElement.prototype, 'muted', {
            get: function() { return true; },
            set: function() { },
            configurable: true
        });
        Object.defineProperty(HTMLMediaElement.prototype, 'volume', {
            get: function() { return 0; },
            set: function() { },
            configurable: true
        });
    } catch (e) {}

    function forceMute(elem) {
        try {
            elem.setAttribute('muted', 'muted');
            elem.setAttribute('autoplay', 'autoplay');
        } catch (e) {}
    }

    function guessType(url, ct) {
        if (ct) {
            ct = ct.toLowerCase();
            if (ct.includes('video') || ct.includes('mpegurl') || ct.includes('application/vnd.apple.mpegurl')) return 'video';
            if (ct.includes('audio')) return 'audio';
            if (ct.includes('image')) return 'image';
        }
        if (url) {
            const u = url.toLowerCase().split('?')[0];
            if (/\.(mp4|m3u8|m4v|mkv|webm|avi|mov|flv|ts|mpeg|mpg|wmv|rmvb|3gp|mpd)$/.test(u)) return 'video';
            if (/\.(mp3|aac|ogg|flac|wav|m4a|opus|wma)$/.test(u)) return 'audio';
            if (/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|avif|heic)$/.test(u)) return 'image';
        }
        return 'other';
    }

    function addResource(url, source, details) {
        if (!url || typeof url !== 'string' || url.startsWith('blob:') || url.startsWith('data:')) return;
        details = details || {};
        try {
            const absoluteUrl = new URL(url, window.location.href).href;
            const type = details.type || guessType(absoluteUrl, details.contentType);
            const isMedia = type === 'video' || type === 'audio' || /m3u8|mpd/i.test(absoluteUrl);
            if (!isMedia) return;

            if (!seenUrls.has(absoluteUrl)) {
                seenUrls.add(absoluteUrl);
                sniffed.push({
                    url: absoluteUrl,
                    type: type,
                    source: source,
                    method: details.method || 'GET',
                    contentType: details.contentType || null,
                    size: details.size || null,
                    requestData: details.requestData || null,
                    responseBody: details.responseBody || null
                });
            }
        } catch (e) {}
    }

    const OrigXHR = window.XMLHttpRequest;
    function PatchedXHR() {
        const xhr = new OrigXHR();
        let _method = 'GET', _url = '', _reqData = null;
        const origOpen = xhr.open.bind(xhr);
        xhr.open = function(method, url) {
            _method = method;
            _url = url;
            return origOpen.apply(xhr, arguments);
        };
        const origSend = xhr.send.bind(xhr);
        xhr.send = function(data) {
            _reqData = (data && typeof data === 'string') ? data.substring(0, 1000) : null;
            return origSend.apply(xhr, arguments);
        };
        xhr.addEventListener('load', function() {
            const ct = xhr.getResponseHeader('Content-Type');
            const cl = xhr.getResponseHeader('Content-Length');
            addResource(_url, 'XHR', {
                method: _method,
                contentType: ct,
                size: cl ? parseInt(cl, 10) : null,
                requestData: _reqData
            });
        });
        return xhr;
    }
    PatchedXHR.prototype = OrigXHR.prototype;
    window.XMLHttpRequest = PatchedXHR;

    const origFetch = window.fetch;
    window.fetch = function(input, init) {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        const method = (init && init.method) || (input && input.method) || 'GET';
        return origFetch.apply(this, arguments).then(function(response) {
            const ct = response.headers.get('Content-Type');
            const cl = response.headers.get('Content-Length');
            addResource(url, 'Fetch', {
                method: method,
                contentType: ct,
                size: cl ? parseInt(cl, 10) : null
            });
            return response;
        });
    };

    if (window.PerformanceObserver) {
        const observer = new PerformanceObserver(function(list) {
            list.getEntries().forEach(function(entry) {
                if (['video', 'audio', 'resource', 'fetch', 'xmlhttprequest'].includes(entry.initiatorType)) {
                    addResource(entry.name, 'Network (' + entry.initiatorType + ')', {
                        size: entry.transferSize || entry.encodedBodySize
                    });
                }
            });
        });
        observer.observe({ entryTypes: ['resource'] });
    }

    function scanAndMute() {
        document.querySelectorAll('video, audio').forEach(function(el) {
            forceMute(el);
            if (el.src) addResource(el.src, 'DOM');
            el.querySelectorAll('source').forEach(function(s) {
                if (s.src) addResource(s.src, 'DOM');
            });
        });
    }

    new MutationObserver(function(mutations) {
        mutations.forEach(function(m) {
            m.addedNodes.forEach(function(node) {
                if (node.tagName && (node.tagName === 'VIDEO' || node.tagName === 'AUDIO')) {
                    forceMute(node);
                    if (node.src) addResource(node.src, 'DOM');
                } else if (node.querySelectorAll) {
                    node.querySelectorAll('video, audio').forEach(function(el) {
                        forceMute(el);
                        if (el.src) addResource(el.src, 'DOM');
                    });
                }
            });
        });
    }).observe(document.documentElement, { childList: true, subtree: true });

    setInterval(scanAndMute, 2000);
})();
"""
        
        // 伪装桌面环境的 JS (平台标识、触控点)
        val SPOOF_JS = """
            try {
                Object.defineProperty(navigator, 'platform', { get: function() { return 'Win32'; } });
                Object.defineProperty(navigator, 'maxTouchPoints', { get: function() { return 0; } });
            } catch(e) {}
        """.trimIndent()

        private val quoteRegex = "^\"|\"$".toRegex()
    }

    abstract class Callback {
        abstract fun onResult(response: StrResponse)
        abstract fun onError(error: Throwable)
    }
}