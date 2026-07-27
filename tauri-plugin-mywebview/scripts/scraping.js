(function() {
    async function startScraping() {
        const MAX_WAIT_MS = parseInt('{{timeout}}') || 20000;
        const TARGET_TYPE = '{{target_type}}';
        const DEFAULT_SETTLE_MS = 2500;
        const IMAGE_SETTLE_MS = 800;
        const POLL_MS = 300;
        
        // 防止重复执行（与 Android scraping.android.js 一致）
        if (window.__wuji_scraping_active__) {
            return;
        }
        window.__wuji_scraping_active__ = true;

        const startTime = Date.now();
        let lastCheckedCount = 0;
        let foundMasterTarget = false;
        let lastMasterChangeTime = Date.now();

        const targetTypes = TARGET_TYPE
            ? TARGET_TYPE.split(',').map(t => t.trim()).filter(Boolean)
            : [];
        const wantsVideo = targetTypes.includes('video');

        function tryTriggerVideoPlay(force) {
            if (!wantsVideo || typeof window.__wuji_tryClickPlayButtons__ !== 'function') return;
            window.__wuji_tryClickPlayButtons__({ force: !!force });
        }

        if (wantsVideo) {
            tryTriggerVideoPlay(true);
        }

        while (Date.now() - startTime < MAX_WAIT_MS) {
            const sniffed = window.__wuji_sniffed__ || [];
            const sniffedCount = sniffed.length;
            
            if (TARGET_TYPE) {
                const imageOnlyTarget = targetTypes.length > 0 && targetTypes.every(t => t === 'image');
                const settleMs = imageOnlyTarget ? IMAGE_SETTLE_MS : DEFAULT_SETTLE_MS;

                if (wantsVideo && !foundMasterTarget) {
                    tryTriggerVideoPlay(false);
                }

                if (sniffedCount > lastCheckedCount) {
                    for (let i = lastCheckedCount; i < sniffedCount; i++) {
                        if (targetTypes.includes(sniffed[i].type) && !sniffed[i].isSegment) {
                            foundMasterTarget = true;
                            lastMasterChangeTime = Date.now();
                        }
                    }
                    lastCheckedCount = sniffedCount;
                }

                if (foundMasterTarget && Date.now() - lastMasterChangeTime > settleMs) {
                    break;
                }

                if (Date.now() - startTime >= MAX_WAIT_MS) {
                    break;
                }
            } else {
                const waitSelector = window.__wuji_wait_selector__;
                if (waitSelector) {
                    if (document.querySelector(waitSelector)
                        && Date.now() - startTime > DEFAULT_SETTLE_MS) {
                        break;
                    }
                } else if ((document.readyState === 'complete' || document.readyState === 'interactive') && Date.now() - startTime > DEFAULT_SETTLE_MS) {
                    break;
                }
            }
            await new Promise(r => setTimeout(r, POLL_MS));
        }

        window.__wuji_scraping_active__ = false;

        // 先把已收集的资源和页面内容保存到局部变量，确保 catch 时也能返回
        let _safeResources = [];
        let _safeContent = '';
        let _safeTitle = '';
        try {
            if (window.stop) window.stop();
        } catch (e) {}
        try {
            _safeResources = (window.__wuji_sniffed__ || []).map(r => ({
                url: r.url,
                type: r.type || 'other',
                resourceType: r.type || 'other',
                source: r.source || '',
                method: r.method || 'GET',
                contentType: r.contentType || null,
                size: r.size || null
            }));
        } catch (e) {}
        try {
            const seenUrls = new Set(_safeResources.map(r => r.url));
            document.querySelectorAll('video, audio, img').forEach(el => {
                const src = el.currentSrc || el.src;
                if (src && src.startsWith('http') && !seenUrls.has(src)) {
                    const type = el.tagName.toLowerCase() === 'img' ? 'image' : el.tagName.toLowerCase();
                    _safeResources.push({ url: src, type, resourceType: type, source: 'FinalScan' });
                    seenUrls.add(src);
                }
            });
        } catch (e) {}
        try { _safeContent = document.documentElement.innerHTML; } catch (e) {}
        try { _safeTitle = document.title; } catch (e) {}

        try {
            const data = JSON.stringify({ content: _safeContent, title: _safeTitle, resources: _safeResources });
            window.__TAURI__.event.emit("wuji_event_scrap_{{window_id}}", data);
        } catch (e) {
            // 序列化失败时（极端情况）返回空内容，但不丢失已有资源 URL 列表
            const fallback = JSON.stringify({
                content: _safeContent,
                title: _safeTitle,
                resources: _safeResources.map(r => ({ url: r.url, type: r.type, resourceType: r.type }))
            });
            try { window.__TAURI__.event.emit("wuji_event_scrap_{{window_id}}", fallback); } catch (_) {}
        }
    }

    startScraping();
})();
