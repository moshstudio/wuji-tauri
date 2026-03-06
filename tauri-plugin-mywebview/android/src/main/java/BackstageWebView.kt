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
                onError(TimeoutException("Request timeout after 60000ms"))
            }
        }
        timeoutHandler.postDelayed(timeoutRunnable, 60000L)

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
        javaScript?.let {
            if (it.isNotEmpty()) {
                return it
            }
        }
        return JS
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
    try {
        if (window.stop) window.stop();

        const sniffed = window.__wuji_sniffed__ || [];
        const seenUrls = new Set(sniffed.map(function(r) { return r.url; }));
        function addIfNew(url, type) {
            if (!url || !url.startsWith('http') || seenUrls.has(url)) return;
            seenUrls.add(url);
            sniffed.push({ url: url, type: type, method: null, contentType: null, size: null });
        }
        document.querySelectorAll('video').forEach(function(el) {
            if (el.src) addIfNew(el.src, 'video');
            el.querySelectorAll('source').forEach(function(s) { if (s.src) addIfNew(s.src, 'video'); });
        });
        document.querySelectorAll('audio').forEach(function(el) {
            if (el.src) addIfNew(el.src, 'audio');
            el.querySelectorAll('source').forEach(function(s) { if (s.src) addIfNew(s.src, 'audio'); });
        });
        document.querySelectorAll('img').forEach(function(el) {
            if (el.src) addIfNew(el.src, 'image');
        });
        
        const content = btoa(encodeURIComponent(document.documentElement.innerHTML));
        const title = document.title;
        return JSON.stringify({ content: content, title: title, resources: sniffed });
    } catch (e) {
        return JSON.stringify({ content: "", title: "Error", resources: [] });
    }
})();
"""
        val SNIFF_INIT_SCRIPT = """
(function() {
    if (!window.__wuji_sniffed__) {
        window.__wuji_sniffed__ = [];
    }

    const sniffed = window.__wuji_sniffed__;

    function addResource(url, type, method, contentType, size, requestData, responseBody) {
        if (!url || typeof url !== 'string') return;
        if (!url.startsWith('http://') && !url.startsWith('https://')) return;
        
        const existing = sniffed.find(function(r) { return r.url === url; });
        if (existing) {
            existing.type = type || existing.type;
            existing.method = method || existing.method;
            existing.contentType = contentType || existing.contentType;
            existing.size = size || existing.size;
            if (requestData) existing.requestData = requestData;
            if (responseBody) existing.responseBody = responseBody;
        } else {
            sniffed.push({
                url: url,
                type: type || 'other',
                method: method || null,
                contentType: contentType || null,
                size: size || null,
                requestData: requestData || null,
                responseBody: responseBody || null,
            });
        }
    }

    function mute(elem) {
        elem.muted = true;
        elem.volume = 0;
        if (elem.pause) elem.pause();
    }

    const OrigXHR = window.XMLHttpRequest;
    function PatchedXHR() {
        const xhr = new OrigXHR();
        let _method = 'GET';
        let _url = '';
        let _requestData = null;

        const origOpen = xhr.open.bind(xhr);
        xhr.open = function(method, url) {
            _method = method;
            _url = typeof url === 'string' ? url : String(url);
            const args = Array.prototype.slice.call(arguments);
            return origOpen.apply(xhr, args);
        };

        xhr.addEventListener('load', function() {
            const ct = xhr.getResponseHeader('Content-Type') || undefined;
            const cl = xhr.getResponseHeader('Content-Length');
            const size = cl ? parseInt(cl, 10) : undefined;
            const type = guessTypeFromContentType(ct) || guessTypeFromUrl(_url) || 'xhr';
            
            let _responseBody = null;
            if (ct && (ct.includes('json') || ct.includes('text') || ct.includes('xml') || ct.includes('protobuf') || ct.includes('urlencoded'))) {
                try {
                    if (xhr.responseType === '' || xhr.responseType === 'text') {
                        _responseBody = (xhr.responseText || '').substring(0, 500000);
                    }
                } catch(e) {}
            }
            addResource(_url, type, _method, ct, size, _requestData, _responseBody);
        });

        const origSend = xhr.send.bind(xhr);
        xhr.send = function() {
            const args = Array.prototype.slice.call(arguments);
            if (args[0] && typeof args[0] === 'string') {
                _requestData = args[0].substring(0, 500000);
            }
            addResource(_url, guessTypeFromUrl(_url) || 'xhr', _method, null, null, _requestData, null);
            return origSend.apply(xhr, args);
        };

        return xhr;
    }
    PatchedXHR.prototype = OrigXHR.prototype;
    window.XMLHttpRequest = PatchedXHR;

    const origFetch = window.fetch;
    window.fetch = function(input, init) {
        let url = typeof input === 'string' ? input : (input && input.url) || '';
        let method = (init && init.method) || (input && input.method) || 'GET';
        let requestData = null;
        
        if (init && init.body && typeof init.body === 'string') {
            requestData = init.body.substring(0, 500000);
        }
        addResource(url, guessTypeFromUrl(url) || 'fetch', method, null, null, requestData, null);

        const args = Array.prototype.slice.call(arguments);
        return origFetch.apply(this, args).then(function(response) {
            try {
                const ct = response.headers.get('Content-Type') || undefined;
                const cl = response.headers.get('Content-Length');
                const size = cl ? parseInt(cl, 10) : undefined;
                const type = guessTypeFromContentType(ct) || guessTypeFromUrl(url) || 'fetch';
                
                addResource(url, type, method, ct, size, requestData, null);

                if (ct && (ct.includes('json') || ct.includes('text') || ct.includes('xml') || ct.includes('protobuf') || ct.includes('urlencoded'))) {
                    const clone = response.clone();
                    clone.text().then(function(text) {
                        addResource(url, type, method, ct, size, requestData, text.substring(0, 500000));
                    }).catch(function(e) {});
                }
            } catch(e) {}
            return response;
        });
    };

    function scanElement(el) {
        if (!el || el.nodeType !== 1) return;
        const tag = el.tagName && el.tagName.toUpperCase();
        if (tag === 'VIDEO' || tag === 'AUDIO') {
            if (el.src) addResource(el.src, tag === 'VIDEO' ? 'video' : 'audio', null, null, null);
            const sources = el.querySelectorAll('source');
            for(let i=0; i<sources.length; i++) {
                if (sources[i].src) addResource(sources[i].src, tag === 'VIDEO' ? 'video' : 'audio', null, null, null);
            }
            mute(el);
        } else if (tag === 'IMG') {
            if (el.src) addResource(el.src, 'image', null, null, null);
            if (el.srcset) {
                const parts = el.srcset.split(',');
                for(let i=0; i<parts.length; i++) {
                    const u = parts[i].trim().split(/\s+/)[0];
                    if (u) addResource(u, 'image', null, null, null);
                }
            }
        } else if (tag === 'SOURCE') {
            if (el.src) {
                const parentTag = el.parentElement && el.parentElement.tagName && el.parentElement.tagName.toUpperCase();
                const t = parentTag === 'VIDEO' ? 'video' : parentTag === 'AUDIO' ? 'audio' : 'other';
                addResource(el.src, t, null, null, null);
            }
        } else if (tag === 'LINK') {
            if (el.rel === 'preload' && el.href) {
                const as_ = el.getAttribute('as') || '';
                const t = as_ === 'video' ? 'video' : as_ === 'audio' ? 'audio' : as_ === 'image' ? 'image' : 'other';
                addResource(el.href, t, null, null, null);
            }
        }
    }

    function scanAll(root) {
        const els = root.querySelectorAll('video, audio, img, source, link[rel="preload"]');
        for(let i=0; i<els.length; i++) {
            scanElement(els[i]);
        }
    }

    if (document.readyState !== 'loading') {
        scanAll(document);
    } else {
        document.addEventListener('DOMContentLoaded', function() { scanAll(document); });
    }

    new MutationObserver(function(mutations) {
        mutations.forEach(function(m) {
            m.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) {
                    scanElement(node);
                    if (node.querySelectorAll) {
                        const els = node.querySelectorAll('video, audio, img, source, link[rel="preload"]');
                        for(let i=0; i<els.length; i++) {
                            scanElement(els[i]);
                        }
                    }
                }
            });
        });
    }).observe(document.documentElement, { childList: true, subtree: true });

    const origPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function() {
        this.muted = true;
        const args = Array.prototype.slice.call(arguments);
        return origPlay.apply(this, args);
    };

    function guessTypeFromContentType(ct) {
        if (!ct) return null;
        ct = ct.toLowerCase();
        if (ct.includes('video')) return 'video';
        if (ct.includes('audio')) return 'audio';
        if (ct.includes('image')) return 'image';
        return null;
    }

    function guessTypeFromUrl(url) {
        if (!url) return null;
        const u = url.toLowerCase().split('?')[0];
        if (/\.(mp4|m3u8|m4v|mkv|webm|avi|mov|flv|ts|mpeg|mpg|wmv|rmvb|3gp)$/.test(u)) return 'video';
        if (/\.(mp3|aac|ogg|flac|wav|m4a|opus|wma)$/.test(u)) return 'audio';
        if (/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|avif|heic)$/.test(u)) return 'image';
        return null;
    }
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