(function() {
    // 防止重复执行
    if (window.__wuji_scraping_active__) {
        return null;
    }
    window.__wuji_scraping_active__ = true;
    // 清除之前的结果
    window.__wuji_scraping_result__ = null;
    window.__wuji_scraping_ready__ = false;

    var MAX_WAIT_MS = parseInt('{{timeout}}') || 20000;
    var TARGET_TYPE = '{{target_type}}';
    var DEFAULT_SETTLE_MS = 2500;
    var IMAGE_SETTLE_MS = 800;
    var POLL_MS = 300;

    var startTime = Date.now();
    var lastCheckedCount = 0;
    var foundMasterTarget = false;
    var lastMasterChangeTime = Date.now();

    var targetTypes = TARGET_TYPE
        ? TARGET_TYPE.split(',').map(function(t) { return t.trim(); }).filter(function(t) { return !!t; })
        : [];
    var wantsVideo = targetTypes.indexOf('video') !== -1;

    function tryTriggerVideoPlay(force) {
        if (!wantsVideo || typeof window.__wuji_tryClickPlayButtons__ !== 'function') return;
        window.__wuji_tryClickPlayButtons__({ force: !!force });
    }

    if (wantsVideo) {
        tryTriggerVideoPlay(true);
    }

    function checkResources() {
        var sniffed = window.__wuji_sniffed__ || [];
        var currentCount = sniffed.length;
        var elapsed = Date.now() - startTime;

        if (TARGET_TYPE) {
            var imageOnlyTarget = targetTypes.length > 0 && targetTypes.every(function(t) { return t === 'image'; });
            var settleMs = imageOnlyTarget ? IMAGE_SETTLE_MS : DEFAULT_SETTLE_MS;

            if (wantsVideo && !foundMasterTarget) {
                tryTriggerVideoPlay(false);
            }

            // 检查新增资源：只有非分片的主资源才重置稳定计时器
            if (currentCount > lastCheckedCount) {
                for (var i = lastCheckedCount; i < currentCount; i++) {
                    if (targetTypes.indexOf(sniffed[i].type) !== -1 && !sniffed[i].isSegment) {
                        foundMasterTarget = true;
                        lastMasterChangeTime = Date.now();
                    }
                }
                lastCheckedCount = currentCount;
            }

            // 已找到主资源且稳定了 SETTLE_MS，立即返回
            if (foundMasterTarget && (Date.now() - lastMasterChangeTime > settleMs)) {
                finishScraping();
                return;
            }

            if (elapsed >= MAX_WAIT_MS) {
                finishScraping();
                return;
            }
        } else {
            if ((document.readyState === 'complete' || document.readyState === 'interactive') && elapsed > DEFAULT_SETTLE_MS) {
                finishScraping();
                return;
            }
            if (elapsed >= MAX_WAIT_MS) {
                finishScraping();
                return;
            }
        }

        setTimeout(checkResources, POLL_MS);
    }

    function finishScraping() {
        window.__wuji_scraping_active__ = false;

        // 先把已收集的内容保存到局部变量，确保任何步骤失败都能返回已有数据
        var _safeResources = [];
        var _safeContent = '';
        var _safeTitle = '';

        try { if (window.stop) window.stop(); } catch(e) {}

        try {
            _safeResources = (window.__wuji_sniffed__ || []).map(function(r) {
                return {
                    url: r.url,
                    type: r.type || 'other',
                    resourceType: r.type || 'other',
                    source: r.source || '',
                    method: r.method || 'GET',
                    contentType: r.contentType || null,
                    size: r.size || null
                };
            });
        } catch(e) {}

        try {
            var seenUrls = {};
            for (var i = 0; i < _safeResources.length; i++) seenUrls[_safeResources[i].url] = true;
            var media = document.querySelectorAll('video, audio, img');
            for (var j = 0; j < media.length; j++) {
                var el = media[j];
                var src = el.currentSrc || el.src;
                if (src && src.indexOf('http') === 0 && !seenUrls[src]) {
                    var type = el.tagName.toLowerCase() === 'img' ? 'image' : el.tagName.toLowerCase();
                    _safeResources.push({ url: src, type: type, resourceType: type, source: 'FinalScan' });
                    seenUrls[src] = true;
                }
            }
        } catch(e) {}

        try { _safeContent = document.documentElement.innerHTML; } catch(e) {}
        try { _safeTitle = document.title; } catch(e) {}

        var payload;
        try {
            payload = JSON.stringify({
                content: _safeContent,
                title: _safeTitle,
                resources: _safeResources
            });
        } catch(e) {
            // 序列化失败时只保留 URL 列表
            payload = JSON.stringify({
                content: _safeContent,
                title: _safeTitle,
                resources: _safeResources.map(function(r) { return { url: r.url, type: r.type, resourceType: r.type }; })
            });
        }
        window.__wuji_scraping_result__ = payload;
        window.__wuji_scraping_ready__ = true;
        // 优先通过 Native Bridge 回传，避免 evaluateJavascript 返回值大小限制
        try {
            if (window.WujiScrapBridge && typeof window.WujiScrapBridge.onScrapingResult === 'function') {
                window.WujiScrapBridge.onScrapingResult(payload);
            }
        } catch (e) {}
    }

    checkResources();
    return null;
})();
