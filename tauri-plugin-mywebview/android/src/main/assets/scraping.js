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
    var SETTLE_MS = 2500;

    var startTime = Date.now();
    var lastResourceCount = 0;
    var lastChangeTime = Date.now();

    function checkResources() {
        var sniffed = window.__wuji_sniffed__ || [];
        var currentCount = sniffed.length; // 仅取长度，不做 filter
        var elapsed = Date.now() - startTime;

        if (TARGET_TYPE) {
            // 只有当长度增加时，才认为有新资源，并重置稳定计时器
            if (currentCount > lastResourceCount) {
                // 检查新增的资源里是否有符合 TARGET_TYPE 的
                var targetTypes = TARGET_TYPE.split(',').map(function(t) { return t.trim(); });
                var hasNewMatch = false;
                for (var i = lastResourceCount; i < currentCount; i++) {
                    if (targetTypes.indexOf(sniffed[i].type) !== -1) {
                        hasNewMatch = true;
                        break;
                    }
                }
                
                if (hasNewMatch) {
                    lastResourceCount = currentCount;
                    lastChangeTime = Date.now();
                }
            } else if (currentCount > 0 && (Date.now() - lastChangeTime > SETTLE_MS)) {
                // 资源已稳定
                finishScraping();
                return;
            }

            if (elapsed >= MAX_WAIT_MS) {
                finishScraping();
                return;
            }
        } else {
            if ((document.readyState === 'complete' || document.readyState === 'interactive') && elapsed > SETTLE_MS) {
                finishScraping();
                return;
            }
            if (elapsed >= MAX_WAIT_MS) {
                finishScraping();
                return;
            }
        }

        setTimeout(checkResources, 800); // 间隔稍微延长至 800ms，减轻后台压力
    }

    function finishScraping() {
        window.__wuji_scraping_active__ = false;

        try {
            var sniffed = (window.__wuji_sniffed__ || []).map(function(r) {
                // 只保留必要字段，绝对不传输 responseBody 等大数据
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
            var seenUrls = {};
            for (var i = 0; i < sniffed.length; i++) {
                seenUrls[sniffed[i].url] = true;
            }

            // 最后 DOM 补扫媒体
            var media = document.querySelectorAll('video, audio, img');
            for (var j = 0; j < media.length; j++) {
                var el = media[j];
                var src = el.currentSrc || el.src;
                if (src && src.indexOf('http') === 0 && !seenUrls[src]) {
                    var type = el.tagName.toLowerCase() === 'img' ? 'image' : el.tagName.toLowerCase();
                    sniffed.push({ 
                        url: src, 
                        type: type,
                        resourceType: type, 
                        source: 'FinalScan' 
                    });
                    seenUrls[src] = true;
                }
            }

            // 恢复完整抓取，不再进行截断
            var content = document.documentElement.innerHTML;
            var title = document.title;

            // 序列化结果
            window.__wuji_scraping_result__ = JSON.stringify({ 
                content: content, 
                title: title, 
                resources: sniffed 
            });
            window.__wuji_scraping_ready__ = true;

            // 停止页面继续加载
            setTimeout(function() {
                try { if (window.stop) window.stop(); } catch(e) {}
            }, 50);
        } catch (e) {
            window.__wuji_scraping_result__ = JSON.stringify({ content: "", title: "Error", resources: [] });
            window.__wuji_scraping_ready__ = true;
        }
    }

    checkResources();
    return null;
})();
