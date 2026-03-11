(function() {
    async function startScraping() {
        const MAX_WAIT_MS = parseInt('{{timeout}}') || 20000;
        const TARGET_TYPE = '{{target_type}}';
        const SETTLE_MS = 2500;
        
        // 关键：防止脚本任务重复运行和提前返回
        if (window.__wuji_scraping_active__) {
            return;
        }
        window.__wuji_scraping_active__ = true;

        const startTime = Date.now();
        let lastResourceCount = 0;
        let lastChangeTime = Date.now();

        while (Date.now() - startTime < MAX_WAIT_MS) {
            const sniffedCount = (window.__wuji_sniffed__ || []).length;
            
            if (TARGET_TYPE) {
                if (sniffedCount > lastResourceCount) {
                    const sniffed = window.__wuji_sniffed__ || [];
                    const targetTypes = TARGET_TYPE.split(',').map(t => t.trim());
                    let hasMatch = false;
                    for (let i = lastResourceCount; i < sniffedCount; i++) {
                        if (targetTypes.includes(sniffed[i].type)) {
                            hasMatch = true;
                            break;
                        }
                    }
                    if (hasMatch) {
                        lastResourceCount = sniffedCount;
                        lastChangeTime = Date.now();
                    }
                } else if (lastResourceCount > 0 && Date.now() - lastChangeTime > SETTLE_MS) {
                    break;
                }
            } else {
                if ((document.readyState === 'complete' || document.readyState === 'interactive') && Date.now() - startTime > SETTLE_MS) {
                    break;
                }
            }
            await new Promise(r => setTimeout(r, 800));
        }

        window.__wuji_scraping_active__ = false;

        try {
            if (window.stop) window.stop();
            const sniffed = (window.__wuji_sniffed__ || []).map(r => ({
                url: r.url,
                type: r.type || 'other',
                resourceType: r.type || 'other',
                source: r.source || '',
                method: r.method || 'GET',
                contentType: r.contentType || null,
                size: r.size || null
            }));
            const seenUrls = new Set();
            for (let i = 0; i < sniffed.length; i++) seenUrls.add(sniffed[i].url);

            // 最后 DOM 补扫
            document.querySelectorAll('video, audio, img').forEach(el => {
                const src = el.currentSrc || el.src;
                if (src && src.startsWith('http') && !seenUrls.has(src)) {
                    const type = el.tagName.toLowerCase() === 'img' ? 'image' : el.tagName.toLowerCase();
                    sniffed.push({ 
                        url: src, 
                        type: type,
                        resourceType: type, 
                        source: 'FinalScan' 
                    });
                    seenUrls.add(src);
                }
            });

            // 恢复完整获取 HTML
            const content = document.documentElement.innerHTML;
            const title = document.title;
            const data = JSON.stringify({ content, title, resources: sniffed });

            window.__TAURI__.event.emit("wuji_event_scrap_{{window_id}}", data);
        } catch (e) {
            const errorData = JSON.stringify({ content: "", title: "Error", resources: [] });
            window.__TAURI__.event.emit("wuji_event_scrap_{{window_id}}", errorData);
        }
    }

    startScraping();
})();
