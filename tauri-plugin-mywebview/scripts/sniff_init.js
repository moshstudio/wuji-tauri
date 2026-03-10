(function () {
    'use strict';
    if (window._mediaSnifferInjected) return;
    window._mediaSnifferInjected = true;

    // 初始化存储
    if (!window.__wuji_sniffed__) window.__wuji_sniffed__ = [];
    const sniffed = window.__wuji_sniffed__;
    const seenUrls = new Set();

    // 强制静音逻辑：锁定属性防止 JS 修改
    try {
        Object.defineProperty(HTMLMediaElement.prototype, 'muted', {
            get: function() { return true; },
            set: function() { /* 忽略网站尝试取消静音的操作 */ },
            configurable: true
        });
        Object.defineProperty(HTMLMediaElement.prototype, 'volume', {
            get: function() { return 0; },
            set: function() { /* 忽略网站尝试调节音量的操作 */ },
            configurable: true
        });
    } catch (e) {
        console.error('Failed to lock mute properties');
    }

    // 辅助静音函数 (用于处理 HTML 属性)
    function forceMute(elem) {
        try {
            elem.setAttribute('muted', 'muted');
            elem.setAttribute('autoplay', 'autoplay'); // 顺便辅助开启自动播放
        } catch (e) {}
    }

    // 工具函数：根据 URL 或 Content-Type 判断类型
    function guessType(url, ct) {
        if (ct) {
            ct = ct.toLowerCase();
            if (ct.includes('video') || ct.includes('mpegurl') || ct.includes('application/vnd.apple.mpegurl')) return 'video';
            if (ct.includes('audio')) return 'audio';
            if (ct.includes('image')) return 'image';
            if (ct.includes('json') || ct.includes('xml') || ct.includes('html') || ct.includes('text')) return 'data';
        }
        if (url) {
            const u = url.toLowerCase().split('?')[0];
            if (/\.(mp4|m3u8|m4v|mkv|webm|avi|mov|flv|ts|mpeg|mpg|wmv|rmvb|3gp|mpd)$/.test(u)) return 'video';
            if (/\.(mp3|aac|ogg|flac|wav|m4a|opus|wma)$/.test(u)) return 'audio';
            if (/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|avif|heic)$/.test(u)) return 'image';
            if (/\.(json|xml|html|txt)$/.test(u)) return 'data';
        }
        return 'other';
    }

    // 判断是否应该捕获响应体
    function shouldCaptureBody(contentType, size) {
        if (!contentType) return false;
        const ct = contentType.toLowerCase();
        const isText = ct.includes('json') || ct.includes('xml') || ct.includes('html') || ct.includes('text') || ct.includes('javascript') || ct.includes('application/x-www-form-urlencoded');
        const isSmall = size === null || size < 1 * 1024 * 1024; // 1MB 以内
        return isText && isSmall;
    }

    // 核心添加逻辑
    function addResource(url, source, details = {}) {
        if (!url || typeof url !== 'string' || url.startsWith('blob:') || url.startsWith('data:')) return;
        
        try {
            const absoluteUrl = new URL(url, window.location.href).href;
            
            // 忽略 JS 和 CSS 文件
            const u = absoluteUrl.toLowerCase().split('?')[0];
            if (u.endsWith('.js') || u.endsWith('.css')) return;

            const type = details.type || guessType(absoluteUrl, details.contentType);

            // 检查是否已经存在 (如果存在则更新详情，特别是 responseBody)
            let item = sniffed.find(r => r.url === absoluteUrl);
            
            if (!item) {
                item = {
                    url: absoluteUrl,
                    type: type,
                    source: source,
                    method: details.method || 'GET',
                    contentType: details.contentType || null,
                    size: details.size || null,
                    requestData: details.requestData || null,
                    responseBody: details.responseBody || null,
                    timestamp: Date.now()
                };
                sniffed.push(item);
                seenUrls.add(absoluteUrl);
            } else {
                // 如果已有项目但没有响应体，且现在有了，则补齐
                if (!item.responseBody && details.responseBody) {
                    item.responseBody = details.responseBody;
                }
                if (!item.requestData && details.requestData) {
                    item.requestData = details.requestData;
                }
                if (details.contentType) item.contentType = details.contentType;
            }
        } catch (e) {}
    }

    // --- 1. 拦截 XHR ---
    const OrigXHR = window.XMLHttpRequest;
    function PatchedXHR() {
        const xhr = new OrigXHR();
        let _method = 'GET', _url = '', _reqData = null;
        const origOpen = xhr.open.bind(xhr);
        xhr.open = function(method, url, ...args) {
            _method = method;
            _url = url;
            return origOpen(method, url, ...args);
        };
        const origSend = xhr.send.bind(xhr);
        xhr.send = function(...args) {
            if (args[0]) {
                if (typeof args[0] === 'string') _reqData = args[0].substring(0, 5000);
                else if (args[0] instanceof FormData) _reqData = "[FormData]";
                else if (args[0] instanceof ArrayBuffer) _reqData = "[ArrayBuffer]";
            }
            return origSend(...args);
        };
        xhr.addEventListener('load', function() {
            try {
                const ct = xhr.getResponseHeader('Content-Type');
                const cl = xhr.getResponseHeader('Content-Length');
                const size = cl ? parseInt(cl, 10) : (xhr.response ? (xhr.response.length || xhr.response.byteLength) : null);
                
                let responseBody = null;
                if (shouldCaptureBody(ct, size)) {
                    // 仅捕获文本类响应
                    responseBody = xhr.responseText;
                }

                addResource(_url, 'XHR', {
                    method: _method,
                    contentType: ct,
                    size: size,
                    requestData: _reqData,
                    responseBody: responseBody
                });
            } catch (err) {}
        });
        return xhr;
    }
    PatchedXHR.prototype = OrigXHR.prototype;
    window.XMLHttpRequest = PatchedXHR;

    // --- 2. 拦截 Fetch ---
    const origFetch = window.fetch;
    window.fetch = function(input, init) {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        const method = (init && init.method) || (input && input.method) || 'GET';
        let requestData = null;
        if (init && init.body && typeof init.body === 'string') {
            requestData = init.body.substring(0, 5000);
        }

        return origFetch.apply(this, arguments).then(async response => {
            try {
                const clonedResponse = response.clone();
                const ct = response.headers.get('Content-Type');
                const cl = response.headers.get('Content-Length');
                const size = cl ? parseInt(cl, 10) : null;

                let responseBody = null;
                if (shouldCaptureBody(ct, size)) {
                    responseBody = await clonedResponse.text().catch(() => null);
                }

                addResource(url, 'Fetch', {
                    method: method,
                    contentType: ct,
                    size: size,
                    requestData: requestData,
                    responseBody: responseBody
                });
            } catch (e) {}
            return response;
        });
    };

    // --- 3. 监听 Performance API ---
    if (window.PerformanceObserver) {
        const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach(entry => {
                // 捕获所有资源加载
                addResource(entry.name, `Network (${entry.initiatorType})`, {
                    size: entry.transferSize || entry.encodedBodySize
                });
            });
        });
        observer.observe({ entryTypes: ['resource'] });
    }

    // --- 4. 定期扫描 ---
    function scanAndMute() {
        document.querySelectorAll('video, audio').forEach(el => {
            forceMute(el);
            if (el.currentSrc || el.src) addResource(el.currentSrc || el.src, 'DOM');
            el.querySelectorAll('source').forEach(s => {
                if (s.src) addResource(s.src, 'DOM');
            });
        });
        // 补扫图片
        document.querySelectorAll('img').forEach(el => {
            if (el.currentSrc || el.src) addResource(el.currentSrc || el.src, 'DOM');
        });
    }

    new MutationObserver((mutations) => {
        mutations.forEach(m => {
            m.addedNodes.forEach(node => {
                if (node.tagName && (node.tagName === 'VIDEO' || node.tagName === 'AUDIO' || node.tagName === 'IMG')) {
                    if (node.tagName !== 'IMG') forceMute(node);
                    const src = node.currentSrc || node.src;
                    if (src) addResource(src, 'DOM');
                } else if (node.querySelectorAll) {
                    node.querySelectorAll('video, audio, img').forEach(el => {
                        if (el.tagName !== 'IMG') forceMute(el);
                        const src = el.currentSrc || el.src;
                        if (src) addResource(src, 'DOM');
                    });
                }
            });
        });
    }).observe(document.documentElement, { childList: true, subtree: true });

    setInterval(scanAndMute, 2000);

})();
