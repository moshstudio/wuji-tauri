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

    function shouldCaptureBody(contentType, size) {
        if (!contentType) return false;
        const ct = contentType.toLowerCase();
        const isText = ct.includes('json') || ct.includes('xml') || ct.includes('html') || ct.includes('text') || ct.includes('javascript') || ct.includes('application/x-www-form-urlencoded');
        const isSmall = size === null || size < 1 * 1024 * 1024;
        return isText && isSmall;
    }

    function addResource(url, source, details) {
        if (!url || typeof url !== 'string' || url.startsWith('blob:') || url.startsWith('data:')) return;
        details = details || {};
        try {
            const absoluteUrl = new URL(url, window.location.href).href;

            // 忽略 JS 和 CSS 文件
            const u = absoluteUrl.toLowerCase().split('?')[0];
            if (u.endsWith('.js') || u.endsWith('.css')) return;

            const type = details.type || guessType(absoluteUrl, details.contentType);

            let item = sniffed.find(function(r) { return r.url === absoluteUrl; });
            
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
                if (!item.responseBody && details.responseBody) item.responseBody = details.responseBody;
                if (!item.requestData && details.requestData) item.requestData = details.requestData;
                if (details.contentType) item.contentType = details.contentType;
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
            if (data) {
                if (typeof data === 'string') _reqData = data.substring(0, 5000);
                else _reqData = "[Binary/Form Data]";
            }
            return origSend.apply(xhr, arguments);
        };
        xhr.addEventListener('load', function() {
            try {
                const ct = xhr.getResponseHeader('Content-Type');
                const cl = xhr.getResponseHeader('Content-Length');
                const size = cl ? parseInt(cl, 10) : (xhr.response ? (xhr.response.length || xhr.response.byteLength) : null);
                
                let responseBody = null;
                if (shouldCaptureBody(ct, size)) {
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

    const origFetch = window.fetch;
    window.fetch = function(input, init) {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        const method = (init && init.method) || (input && input.method) || 'GET';
        let requestData = null;
        if (init && init.body && typeof init.body === 'string') {
            requestData = init.body.substring(0, 5000);
        }

        return origFetch.apply(this, arguments).then(function(response) {
            try {
                const clonedResponse = response.clone();
                const ct = response.headers.get('Content-Type');
                const cl = response.headers.get('Content-Length');
                const size = cl ? parseInt(cl, 10) : null;

                if (shouldCaptureBody(ct, size)) {
                    clonedResponse.text().then(function(text) {
                        addResource(url, 'Fetch', {
                            method: method,
                            contentType: ct,
                            size: size,
                            requestData: requestData,
                            responseBody: text
                        });
                    }).catch(function() {});
                } else {
                    addResource(url, 'Fetch', {
                        method: method,
                        contentType: ct,
                        size: size,
                        requestData: requestData
                    });
                }
            } catch (e) {}
            return response;
        });
    };

    if (window.PerformanceObserver) {
        const observer = new PerformanceObserver(function(list) {
            list.getEntries().forEach(function(entry) {
                addResource(entry.name, 'Network (' + entry.initiatorType + ')', {
                    size: entry.transferSize || entry.encodedBodySize
                });
            });
        });
        observer.observe({ entryTypes: ['resource'] });
    }

    function scanAndMute() {
        document.querySelectorAll('video, audio').forEach(function(el) {
            forceMute(el);
            if (el.currentSrc || el.src) addResource(el.currentSrc || el.src, 'DOM');
            el.querySelectorAll('source').forEach(function(s) {
                if (s.src) addResource(s.src, 'DOM');
            });
        });
        document.querySelectorAll('img').forEach(function(el) {
            if (el.currentSrc || el.src) addResource(el.currentSrc || el.src, 'DOM');
        });
    }

    new MutationObserver(function(mutations) {
        mutations.forEach(function(m) {
            m.addedNodes.forEach(function(node) {
                if (node.tagName && (node.tagName === 'VIDEO' || node.tagName === 'AUDIO' || node.tagName === 'IMG')) {
                    if (node.tagName !== 'IMG') forceMute(node);
                    var src = node.currentSrc || node.src;
                    if (src) addResource(src, 'DOM');
                } else if (node.querySelectorAll) {
                    node.querySelectorAll('video, audio, img').forEach(function(el) {
                        if (el.tagName !== 'IMG') forceMute(el);
                        var src = el.currentSrc || el.src;
                        if (src) addResource(src, 'DOM');
                    });
                }
            });
        });
    }).observe(document.documentElement, { childList: true, subtree: true });

    setInterval(scanAndMute, 2000);
})();
