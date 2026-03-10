(function() {
    async function startScraping() {
        const MAX_WAIT_MS = parseInt('{{timeout}}') || 20000;
        const TARGET_TYPE = '{{target_type}}';
        const SETTLE_MS = 2500;
        
        const startTime = Date.now();
        let lastResourceCount = 0;
        let lastChangeTime = Date.now();

        while (Date.now() - startTime < MAX_WAIT_MS) {
            const sniffed = window.__wuji_sniffed__ || [];
            let matchedResources = [];
            if (TARGET_TYPE) {
                const targetTypes = TARGET_TYPE.split(',').map(function(t) { return t.trim(); });
                matchedResources = sniffed.filter(function(r) { return targetTypes.includes(r.type); });
            } else {
                if (document.readyState === 'complete' && Date.now() - startTime > 2000) break;
            }

            if (TARGET_TYPE && matchedResources.length > 0) {
                if (matchedResources.length > lastResourceCount) {
                    lastResourceCount = matchedResources.length;
                    lastChangeTime = Date.now();
                } else if (Date.now() - lastChangeTime > SETTLE_MS) {
                    break;
                }
            } else if (!TARGET_TYPE && document.readyState === 'complete') {
                 if (Date.now() - startTime > 2000) break;
            }
            await new Promise(function(r) { setTimeout(r, 400); });
        }

        try {
            if (window.stop) window.stop();
            const sniffed = (window.__wuji_sniffed__ || []).map(function(r) { 
                return Object.assign({}, r, { resourceType: r.type || 'other' });
            });
            const seenUrls = new Set(sniffed.map(function(r) { return r.url; }));
            document.querySelectorAll('video, audio, img').forEach(function(el) {
                const src = el.currentSrc || el.src;
                if (src && src.startsWith('http') && !seenUrls.has(src)) {
                    sniffed.push({ url: src, resourceType: el.tagName.toLowerCase(), source: 'FinalScan' });
                }
            });
            const content = btoa(encodeURIComponent(document.documentElement.innerHTML));
            const title = document.title;
            return JSON.stringify({ content: content, title: title, resources: sniffed });
        } catch (e) {
            return JSON.stringify({ content: "", title: "Error", resources: [] });
        }
    }
    return startScraping();
})();
