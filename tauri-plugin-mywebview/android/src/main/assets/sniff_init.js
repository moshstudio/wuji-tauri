(function () {
    'use strict';
    if (window._mediaSnifferInjected) return;
    window._mediaSnifferInjected = true;

    var isTop = (window === window.top);

    if (!window.__wuji_sniffed__) window.__wuji_sniffed__ = [];
    var sniffed = window.__wuji_sniffed__;
    
    // 使用 Map 实现 O(1) 查重
    var resourceMap = new Map();
    // 如果已有数据，初始化 Map
    sniffed.forEach(function(item, index) {
        if (item && item.url) resourceMap.set(item.url, index);
    });

    // 强制静音媒体元素（优化：只定义一次，避免循环重定义）
    try {
        if (!HTMLMediaElement.prototype._mutedPatched) {
            var origMutedDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'muted');
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
            // 优化：检查属性值，避免重复触发样式重算
            if (elem.getAttribute('muted') !== 'muted') elem.setAttribute('muted', 'muted');
            if (elem.getAttribute('autoplay') !== 'autoplay') elem.setAttribute('autoplay', 'autoplay');
            if (!elem.muted) elem.muted = true;
            if (elem.volume !== 0) elem.volume = 0;
        } catch (e) {}
    }

    // 工具：推断类型
    function guessType(url, ct) {
        if (ct) {
            ct = ct.toLowerCase();
            if (ct.includes('video') || ct.includes('mpegurl') || ct.includes('application/vnd.apple.mpegurl') || ct.includes('ms-sstr+xml')) return 'video';
            if (ct.includes('audio')) return 'audio';
            if (ct.includes('image')) return 'image';
        }
        if (url) {
            var u = url.toLowerCase();
            var mediaRegex = /\.(mp4|m3u8|m4v|mkv|webm|ts|mpd|m4s|mp3|aac|ogg|flac|wav|m4a|opus)($|\?|&|%|#)/;
            if (mediaRegex.test(u)) return /\.(mp3|aac|ogg|flac|wav|m4a|opus)/.test(u) ? 'audio' : 'video';
            if (u.includes('filename') && (u.includes('.mp4') || u.includes('.m3u8') || u.includes('.m4s') || u.includes('.ts'))) return 'video';
            if (u.includes('/hls/') || u.includes('/m3u8') || u.includes('playlist.m3u8') || u.includes('.isml')) return 'video';
            if (u.includes('video-content') || u.includes('media-source')) return 'video';
        }
        return 'other';
    }

    function isStaticAsset(url, ct) {
        if (ct) {
            var lowCt = ct.toLowerCase();
            if (lowCt.includes('javascript') || lowCt.includes('css') || lowCt.includes('font')) return true;
        }
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
        // 缩小捕获范围，只捕获关键的结构化数据
        var isTarget = ct.includes('json') || ct.includes('xml') || ct.includes('html') || ct.includes('application/x-www-form-urlencoded');
        var isSmall = size === null || size < 512 * 1024; // 降至 512KB 减少内存压力
        return isTarget && isSmall;
    }

    function addResource(url, source, details) {
        if (!url || typeof url !== 'string' || url.length > 2048 || url.startsWith('data:') || url.startsWith('blob:')) return;
        
        details = details || {};
        try {
            var absoluteUrl = url.startsWith('http') ? url : new URL(url, window.location.href).href;
            
            if (resourceMap.has(absoluteUrl)) {
                var idx = resourceMap.get(absoluteUrl);
                var item = sniffed[idx];
                if (item) {
                    if (!item.responseBody && details.responseBody) item.responseBody = details.responseBody;
                    if (!item.requestData && details.requestData) item.requestData = details.requestData;
                    if (details.contentType) item.contentType = details.contentType;
                }
                return;
            }

            var type = details.type || guessType(absoluteUrl, details.contentType);
            if (isStaticAsset(absoluteUrl, details.contentType) && type !== 'video' && type !== 'audio') {
                return;
            }

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

            if (!isTop) {
                window.top.postMessage({ type: 'WUJI_RESOURCE_SNIFFED', resource: newItem }, '*');
            }
        } catch (e) {}
    }
    // 暴露给 Native 层调用
    window.addResource = addResource;

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

    // --- 0. 劫持 HTMLMediaElement 和 MediaSource ---
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

        var origLoad = HTMLMediaElement.prototype.load;
        HTMLMediaElement.prototype.load = function() {
            if (this.src) addResource(this.src, 'Method (load)', { type: this.tagName.toLowerCase() });
            return origLoad.apply(this, arguments);
        };

        // 劫持 MediaSource (MSE)
        if (window.MediaSource) {
            var origURLCreate = URL.createObjectURL;
            URL.createObjectURL = function(obj) {
                var url = origURLCreate.apply(this, arguments);
                if (obj instanceof MediaSource) {
                    // 记录 MediaSource 产生的 blob URL
                    addResource(url, 'MediaSource', { type: 'video' });
                }
                return url;
            };
        }
    } catch(e) {}

    // --- 1. 劫持 XHR (使用原型拦截，性能更好) ---
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

    // --- 3. PerformanceObserver (捕获静态资源) ---
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

    // --- 4. DOM 监控优化 ---
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
            if (isTop) injectIntoIframes();
        } finally {
            _scanProcessing = false;
            setTimeout(scanAndMute, 5000);
        }
    }

    var injectedFrames = new WeakSet();
    function injectIntoIframes() {
        var iframes = document.querySelectorAll('iframe');
        for (var i = 0; i < iframes.length; i++) {
            var iframe = iframes[i];
            if (injectedFrames.has(iframe)) continue;
            try {
                var frameWin = iframe.contentWindow;
                if (frameWin && frameWin.document) {
                    injectedFrames.add(iframe);
                    // 仅在同源时尝试简单监控
                    hookFrame(frameWin);
                }
            } catch (e) {
                injectedFrames.add(iframe); // 跨域 iframe 标记为已处理
            }
        }
    }

    function hookFrame(fWin) {
        try {
            if (fWin._mediaSnifferInjected) return;
            fWin._mediaSnifferInjected = true;
            // 子窗口通过 postMessage 向顶层上报
            var origFOpen = fWin.XMLHttpRequest.prototype.open;
            fWin.XMLHttpRequest.prototype.open = function(m, u) {
                this.addEventListener('load', function() {
                    try {
                        window.top.postMessage({
                            type: 'WUJI_RESOURCE_SNIFFED',
                            resource: { url: new URL(u, fWin.location.href).href, type: guessType(u), source: 'Frame XHR', timestamp: Date.now() }
                        }, '*');
                    } catch(e) {}
                });
                return origFOpen.apply(this, arguments);
            };
        } catch(e) {}
    }

    // 初始和低频扫描
    setTimeout(scanAndMute, 1000);

    var _mo = new MutationObserver(function(mutations) {
        for (var i = 0; i < mutations.length; i++) {
            var added = mutations[i].addedNodes;
            for (var j = 0; j < added.length; j++) {
                var node = added[j];
                if (!node.tagName) continue;
                var tn = node.tagName.toLowerCase();
                if (tn === 'video' || tn === 'audio') {
                    forceMute(node);
                    if (node.src) addResource(node.src, 'Mutation');
                } else if (tn === 'iframe') {
                    setTimeout(injectIntoIframes, 1000);
                }
            }
        }
    });
    if (document.documentElement) _mo.observe(document.documentElement, { childList: true, subtree: true });

})();
