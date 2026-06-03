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

    // 保存原始描述符，用于在 native 层实际设置静音
    var origMutedDesc, origVolumeDesc;
    try {
        origMutedDesc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'muted');
        origVolumeDesc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'volume');
    } catch (e) {}

    // --- 0.5 劫持 Image.src，尽早捕获图片请求 ---
    try {
        var imgSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
        if (imgSrcDescriptor) {
            Object.defineProperty(HTMLImageElement.prototype, 'src', {
                set: function(val) {
                    if (val) addResource(val, 'Property (img.src)', { type: 'image' });
                    return imgSrcDescriptor.set.apply(this, arguments);
                },
                get: function() { return imgSrcDescriptor.get.apply(this, arguments); },
                configurable: true
            });
        }
    } catch (e) {}

    function nativeMute(elem) {
        try {
            if (origMutedDesc && origMutedDesc.set) origMutedDesc.set.call(elem, true);
            if (origVolumeDesc && origVolumeDesc.set) origVolumeDesc.set.call(elem, 0);
            elem.setAttribute('muted', 'muted');
        } catch (e) {}
    }

    try {
        if (!HTMLMediaElement.prototype._mutedPatched) {
            Object.defineProperty(HTMLMediaElement.prototype, 'muted', {
                get: function() { return true; },
                set: function() { nativeMute(this); },
                configurable: true
            });
            Object.defineProperty(HTMLMediaElement.prototype, 'volume', {
                get: function() { return 0; },
                set: function() { nativeMute(this); },
                configurable: true
            });

            var origPlay = HTMLMediaElement.prototype.play;
            HTMLMediaElement.prototype.play = function() {
                nativeMute(this);
                return origPlay.apply(this, arguments);
            };

            HTMLMediaElement.prototype._mutedPatched = true;
        }
    } catch (e) {}

    function forceMute(elem) {
        try {
            nativeMute(elem);
            if (elem.getAttribute('autoplay') !== 'autoplay') elem.setAttribute('autoplay', 'autoplay');
        } catch (e) {}
    }

    // 捕获所有 play/volumechange 事件，确保始终静音
    document.addEventListener('play', function(e) {
        if (e.target && e.target.tagName && (e.target.tagName === 'VIDEO' || e.target.tagName === 'AUDIO')) nativeMute(e.target);
    }, true);
    document.addEventListener('volumechange', function(e) {
        if (e.target && e.target.tagName && (e.target.tagName === 'VIDEO' || e.target.tagName === 'AUDIO')) nativeMute(e.target);
    }, true);

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

    // 判断 URL 是否为流媒体分片（HLS .ts / DASH .m4s），而非主资源（m3u8/mpd/mp4）
    function isStreamSegment(url) {
        if (!url) return false;
        var u = url.toLowerCase().split('?')[0].split('#')[0];
        if (/\.m4s$/.test(u)) return true;
        if (/\.ts$/.test(u)) return true;
        return false;
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

            var segment = (type === 'video' || type === 'audio') && isStreamSegment(absoluteUrl);

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
                isSegment: segment,
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

    // --- 1. 劫持 XHR ---
    // 在 send() 时立即记录 URL，load 时仅补充元数据，不阻塞 URL 的发现
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
            var reqData = (data && typeof data === 'string') ? data.substring(0, 2000) : null;
            this._wuji_reqData = reqData;
            // 立即记录请求 URL，不等待响应完成
            addResource(this._wuji_url, 'XHR', {
                method: this._wuji_method,
                requestData: reqData
            });
            // 响应完成后补充 contentType / size / responseBody
            this.addEventListener('load', function() {
                try {
                    var ct = this.getResponseHeader('Content-Type');
                    var cl = this.getResponseHeader('Content-Length');
                    var size = cl ? parseInt(cl, 10) : (this.response ? (this.response.length || this.response.byteLength) : null);
                    var absUrl = this._wuji_url ? (this._wuji_url.startsWith('http') ? this._wuji_url : new URL(this._wuji_url, window.location.href).href) : null;
                    var item = absUrl ? sniffed[resourceMap.get(absUrl)] : null;
                    if (item) {
                        if (ct) item.contentType = ct;
                        if (size) item.size = size;
                        if (!item.responseBody && shouldCaptureBody(ct, size)) item.responseBody = this.responseText;
                    }
                } catch (err) {}
            });
            return origSend.apply(this, arguments);
        };
    } catch (e) {}

    // --- 2. 劫持 Fetch API ---
    // fetch() 调用时立即记录 URL，响应到达后补充元数据
    if (window.fetch) {
        var origFetch = window.fetch;
        window.fetch = function(input, init) {
            var url = typeof input === 'string' ? input : (input && input.url) || '';
            var method = (init && init.method) || (input && input.method) || 'GET';
            var requestData = (init && init.body && typeof init.body === 'string') ? init.body.substring(0, 2000) : null;
            // 立即记录请求 URL
            addResource(url, 'Fetch', { method: method, requestData: requestData });
            return origFetch.apply(this, arguments).then(function(response) {
                try {
                    var ct = response.headers.get('Content-Type');
                    var cl = response.headers.get('Content-Length');
                    var size = cl ? parseInt(cl, 10) : null;
                    var absUrl = url.startsWith('http') ? url : new URL(url, window.location.href).href;
                    var item = sniffed[resourceMap.get(absUrl)];
                    if (item) {
                        if (ct) item.contentType = ct;
                        if (size) item.size = size;
                        if (!item.responseBody && shouldCaptureBody(ct, size)) {
                            response.clone().text().then(function(text) { item.responseBody = text; }).catch(function() {});
                        }
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
    function captureImageFromNode(node, source) {
        if (!node || !node.tagName) return;
        var tag = node.tagName.toLowerCase();
        if (tag === 'img') {
            var imgSrc = node.currentSrc || node.src;
            if (imgSrc) addResource(imgSrc, source, { type: 'image' });
            var srcset = node.getAttribute && node.getAttribute('srcset');
            if (srcset) {
                srcset.split(',').forEach(function(candidate) {
                    var item = candidate.trim().split(/\s+/)[0];
                    if (item) addResource(item, source + ' (srcset)', { type: 'image' });
                });
            }
            return;
        }
        if (tag === 'source') {
            var sourceSrc = node.src || (node.getAttribute && node.getAttribute('src'));
            if (sourceSrc) addResource(sourceSrc, source, { type: guessType(sourceSrc) });
            return;
        }
        if (node.querySelectorAll) {
            node.querySelectorAll('img,source').forEach(function(child) {
                captureImageFromNode(child, source);
            });
        }
    }

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
            var images = document.querySelectorAll('img, source');
            for (var j = 0; j < images.length; j++) {
                captureImageFromNode(images[j], 'DOM');
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
                } else if (tn === 'img' || tn === 'source' || (node.querySelectorAll && node.querySelector('img,source'))) {
                    captureImageFromNode(node, 'Mutation');
                } else if (tn === 'iframe') {
                    setTimeout(injectIntoIframes, 1000);
                }
            }
        }
    });
    if (document.documentElement) {
        _mo.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['src', 'srcset']
        });
    }

})();
