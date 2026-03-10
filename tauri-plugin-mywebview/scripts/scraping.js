(function() {
    async function startScraping() {
        const MAX_WAIT_MS = parseInt('{{timeout}}') || 20000;
        const TARGET_TYPE = '{{target_type}}'; // 如 'video'
        const SETTLE_MS = 2500; // 稳定期 2.5s
        
        const startTime = Date.now();
        let lastResourceCount = 0;
        let lastChangeTime = Date.now();

        // 观察逻辑
        while (Date.now() - startTime < MAX_WAIT_MS) {
            const sniffed = window.__wuji_sniffed__ || [];
            let matchedResources = [];
            if (TARGET_TYPE) {
                const targetTypes = TARGET_TYPE.split(',').map(t => t.trim());
                matchedResources = sniffed.filter(r => targetTypes.includes(r.type));
            } else {
                if (document.readyState === 'complete' && Date.now() - startTime > 2000) break;
            }

            if (TARGET_TYPE && matchedResources.length > 0) {
                // 如果发现了目标类型资源：
                if (matchedResources.length > lastResourceCount) {
                    lastResourceCount = matchedResources.length;
                    lastChangeTime = Date.now();
                } else if (Date.now() - lastChangeTime > SETTLE_MS) {
                    // 已稳定，可以返回
                    console.log(`[Scraping] Target type "${TARGET_TYPE}" found and settled.`);
                    break;
                }
            } else if (!TARGET_TYPE && document.readyState === 'complete') {
                 if (Date.now() - startTime > 2000) break;
            }

            // 心跳检查
            await new Promise(r => setTimeout(r, 400));
        }

        try {
            if (window.stop) window.stop();

            const sniffed = (window.__wuji_sniffed__ || []).map(r => ({
                ...r,
                // 确保 resourceType 字段存在（兼容部分旧逻辑），同时保留 type
                resourceType: r.type || 'other'
            }));
            const seenUrls = new Set(sniffed.map(r => r.url));


            // 最后 DOM 补扫
            document.querySelectorAll('video, audio, img').forEach(el => {
                const src = el.currentSrc || el.src;
                if (src && src.startsWith('http') && !seenUrls.has(src)) {
                    sniffed.push({ 
                        url: src, 
                        resourceType: el.tagName.toLowerCase(), 
                        source: 'FinalScan' 
                    });
                }
            });

            // 构造返回
            const content = btoa(encodeURIComponent(document.documentElement.innerHTML));
            const title = document.title;
            const data = JSON.stringify({ content, title, resources: sniffed });

            window.__TAURI__.event.emit("wuji_event_scrap_{{window_id}}", data);
        } catch (e) {
            console.error('[Scraping Error]', e);
            const errorData = JSON.stringify({ content: "", title: "Error", resources: [] });
            window.__TAURI__.event.emit("wuji_event_scrap_{{window_id}}", errorData);
        }
    }

    startScraping();
})();
