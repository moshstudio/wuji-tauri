(function () {
    'use strict';
    if (window._mediaSnifferInjected) return;
    window._mediaSnifferInjected = true;

    var isTop = (window === window.top);

    if (!window.__wuji_sniffed__) window.__wuji_sniffed__ = [];
    var sniffed = window.__wuji_sniffed__;
    
    // 桌面端优化：使用 Map 实现 O(1) 查重
    var resourceMap = new Map();
    sniffed.forEach(function(item, index) {
        if (item && item.url) resourceMap.set(item.url, index);
    });

    // 强制静音优化
    try {
        if (!HTMLMediaElement.prototype._mutedPatched) {
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
            HTMLMediaElement.prototype._mutedPatched = true;
        }
    } catch (e) {}

    function forceMute(elem) {
        try {
            if (elem.getAttribute('muted') !== 'muted') elem.setAttribute('muted', 'muted');
            if (elem.getAttribute('autoplay') !== 'autoplay') elem.setAttribute('autoplay', 'autoplay');
            if (!elem.muted) elem.muted = true;
            if (elem.volume !== 0) elem.volume = 0;
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
            var u = url.toLowerCase();
            var mediaRegex = /\.(mp4|m3u8|m4v|mkv|webm|ts|mpd|m4s|mp3|aac|ogg|flac|wav|m4a|opus)($|\?|&|%|#)/;
            if (mediaRegex.test(u)) return /\.(mp3|aac|ogg|flac|wav|m4a|opus)/.test(u) ? 'audio' : 'video';
        }
        return 'other';
    }

    function isStaticAsset(url, ct) {
        if (ct && (ct.includes('javascript') || ct.includes('css') || ct.includes('font'))) return true;
        if (url) {
            var uLow = url.toLowerCase().split('?')[0].split('#')[0];
            var filterExtensions = ['.js', '.css', '.woff', '.woff2', '.ttf', '.otf', '.eot', '.svg', '.ico'];
            for (var i = 0; i < filterExtensions.length; i++) {
                if (uLow.endsWith(filterExtensions[i])) return true;
            }
        }
        return false;
    }

    function shouldCaptureBody(contentType, size) {
        if (!contentType) return false;
        var ct = contentType.toLowerCase();
        var isTarget = ct.includes('json') || ct.includes('xml') || ct.includes('html') || ct.includes('text');
        return isTarget && (size === null || size < 1024 * 1024);
    }

    function addResource(url, source, details) {
        if (!url || typeof url !== 'string' || url.length > 2048 || url.startsWith('data:') || url.startsWith('blob:')) return;
        details = details || {};
        try {
            var absoluteUrl = new URL(url, window.location.href).href;
            
            if (resourceMap.has(absoluteUrl)) {
                var item = sniffed[resourceMap.get(absoluteUrl)];
                if (item) {
                    if (!item.responseBody && details.responseBody) item.responseBody = details.responseBody;
                    if (details.contentType) item.contentType = details.contentType;
                }
                return;
            }

            var type = details.type || guessType(absoluteUrl, details.contentType);
            if (isStaticAsset(absoluteUrl, details.contentType) && type !== 'video' && type !== 'audio') return;

            var newItem = {
                url: absoluteUrl,
                type: type,
                resourceType: type,
                source: source + (isTop ? '' : ' (Frame)'),
                method: details.method || 'GET',
                contentType: details.contentType || null,
                size: details.size || null,
                requestData: details.requestData || null,
                responseBody: details.responseBody || null,
                timestamp: Date.now()
            };

            sniffed.push(newItem);
            resourceMap.set(absoluteUrl, sniffed.length - 1);

            if (!isTop) window.top.postMessage({ type: 'WUJI_RESOURCE_SNIFFED', resource: newItem }, '*');
        } catch (e) {}
    }

    if (isTop) {
        window.addEventListener('message', function(event) {
            var data = event.data;
            if (data && data.type === 'WUJI_RESOURCE_SNIFFED' && data.resource) {
                var res = data.resource;
                if (!resourceMap.has(res.url)) {
                    sniffed.push(res);
                    resourceMap.set(res.url, sniffed.length - 1);
                }
            }
        });
    }

    // --- 0. 劫持 HTMLMediaElement ---
    try {
        var origSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
        if (origSrcDescriptor) {
            Object.defineProperty(HTMLMediaElement.prototype, 'src', {
                set: function(val) {
                    if (val) addResource(val, 'Property (src)', { type: this.tagName.toLowerCase() });
                    return origSrcDescriptor.set.apply(this, arguments);
                },
                get: function() { return origSrcDescriptor.get.apply(this, arguments); },
                configurable: true
            });
        }
    } catch(e) {}

    // --- 1. 劫持 XHR ---
    try {
        var XHRProto = XMLHttpRequest.prototype;
        var origOpen = XHRProto.open;
        var origSend = XHRProto.send;

        XHRProto.open = function(method, url) {
            this._wuji_method = method;
            this._wuji_url = url;
            return origOpen.apply(this, arguments);
        };

        XHRProto.send = function(data) {
            if (data && typeof data === 'string') this._wuji_reqData = data.substring(0, 2000);
            this.addEventListener('load', function() {
                try {
                    var ct = this.getResponseHeader('Content-Type');
                    var cl = this.getResponseHeader('Content-Length');
                    var size = cl ? parseInt(cl, 10) : (this.response ? (this.response.length || this.response.byteLength) : null);
                    var responseBody = null;
                    if (shouldCaptureBody(ct, size)) responseBody = this.responseText;
                    
                    addResource(this._wuji_url, 'XHR', {
                        method: this._wuji_method,
                        contentType: ct,
                        size: size,
                        requestData: this._wuji_reqData,
                        responseBody: responseBody
                    });
                } catch (err) {}
            });
            return origSend.apply(this, arguments);
        };
    } catch (e) {}

    // --- 2. 劫持 Fetch API ---
    if (window.fetch) {
        var origFetch = window.fetch;
        window.fetch = function(input, init) {
            var url = typeof input === 'string' ? input : (input && input.url) || '';
            var method = (init && init.method) || (input && input.method) || 'GET';
            var requestData = (init && init.body && typeof init.body === 'string') ? init.body.substring(0, 2000) : null;

            return origFetch.apply(this, arguments).then(function(response) {
                try {
                    var ct = response.headers.get('Content-Type');
                    var cl = response.headers.get('Content-Length');
                    var size = cl ? parseInt(cl, 10) : null;

                    if (shouldCaptureBody(ct, size)) {
                        response.clone().text().then(function(text) {
                            addResource(url, 'Fetch', { method: method, contentType: ct, size: size, requestData: requestData, responseBody: text });
                        }).catch(function() {});
                    } else {
                        addResource(url, 'Fetch', { method: method, contentType: ct, size: size, requestData: requestData });
                    }
                } catch (e) {}
                return response;
            });
        };
    }

    // --- 3. PerformanceObserver ---
    if (window.PerformanceObserver) {
        try {
            var observer = new PerformanceObserver(function(list) {
                var entries = list.getEntries();
                for (var i = 0; i < entries.length; i++) {
                    var entry = entries[i];
                    var type = guessType(entry.name);
                    if (entry.initiatorType === 'video' || entry.initiatorType === 'audio') type = entry.initiatorType;
                    addResource(entry.name, 'Network (' + entry.initiatorType + ')', {
                        size: entry.transferSize || entry.encodedBodySize,
                        type: type
                    });
                }
            });
            observer.observe({ entryTypes: ['resource'] });
        } catch (e) {}
    }

    var _scanProcessing = false;
    function scanAndMute() {
        if (_scanProcessing) return;
        _scanProcessing = true;
        try {
            var media = document.querySelectorAll('video, audio');
            for (var i = 0; i < media.length; i++) {
                var el = media[i];
                forceMute(el);
                var src = el.currentSrc || el.src;
                if (src) addResource(src, 'DOM', { type: el.tagName.toLowerCase() });
            }
        } finally {
            _scanProcessing = false;
            setTimeout(scanAndMute, 5000);
        }
    }

    var _mo = new MutationObserver(function(mutations) {
        for (var i = 0; i < mutations.length; i++) {
            var added = mutations[i].addedNodes;
            for (var j = 0; j < added.length; j++) {
                var node = added[j];
                if (!node.tagName) continue;
                var tn = node.tagName.toLowerCase();
                if (tn === 'video' || tn === 'audio') {
                    forceMute(node);
                    var src = node.currentSrc || node.src;
                    if (src) addResource(src, 'Mutation');
                }
            }
        }
    });
    if (document.documentElement) _mo.observe(document.documentElement, { childList: true, subtree: true });

    setTimeout(scanAndMute, 1000);
})();
