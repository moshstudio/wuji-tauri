(function () {
    'use strict';
    if (window.__wuji_play_trigger_installed__) return;
    window.__wuji_play_trigger_installed__ = true;

    var STRONG_PLAY_KEYWORDS = [
        '立即播放', '点击播放', '开始播放', '播放视频', '免费播放', '在线播放',
        'play now', 'click to play', 'play video', 'tap to play'
    ];
    var EXACT_PLAY_KEYWORDS = ['播放', 'play', '▶', '►', '▷'];
    var CLICK_INTERVAL_MS = 1500;
    var MAX_CLICKS_PER_ROUND = 6;
    var clickedElements = new WeakSet();
    var lastClickRound = 0;

    function normalizeText(text) {
        return (text || '').replace(/\s+/g, ' ').trim().toLowerCase();
    }

    function elementLabel(el) {
        if (!el) return '';
        return (
            (el.innerText || el.textContent || '') +
            ' ' +
            (el.getAttribute && (el.getAttribute('aria-label') || el.getAttribute('title') || '') || '')
        ).trim();
    }

    function matchesPlayKeyword(text) {
        var norm = normalizeText(text);
        if (!norm || norm.length > 40) return false;

        for (var i = 0; i < STRONG_PLAY_KEYWORDS.length; i++) {
            if (norm.indexOf(STRONG_PLAY_KEYWORDS[i].toLowerCase()) !== -1) {
                return true;
            }
        }

        for (var j = 0; j < EXACT_PLAY_KEYWORDS.length; j++) {
            var kw = EXACT_PLAY_KEYWORDS[j].toLowerCase();
            if (norm === kw) return true;
        }

        return false;
    }

    function isVisible(el) {
        try {
            if (!el || el.disabled) return false;
            var style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) {
                return false;
            }
            var rect = el.getBoundingClientRect();
            return rect.width >= 2 && rect.height >= 2;
        } catch (e) {
            return false;
        }
    }

    function scoreElement(el, text) {
        var score = 0;
        var norm = normalizeText(text);
        var tag = (el.tagName || '').toLowerCase();

        if (tag === 'button' || tag === 'a') score += 3;
        if (el.getAttribute && el.getAttribute('role') === 'button') score += 2;
        if (el.onclick || (el.getAttribute && el.getAttribute('onclick'))) score += 1;

        for (var i = 0; i < STRONG_PLAY_KEYWORDS.length; i++) {
            if (norm.indexOf(STRONG_PLAY_KEYWORDS[i].toLowerCase()) !== -1) score += 5;
        }
        if (norm === '播放' || norm === 'play') score += 4;
        if (norm.length > 24) score -= 3;

        return score;
    }

    function clickElement(el) {
        if (!el || clickedElements.has(el) || !isVisible(el)) return false;
        try {
            clickedElements.add(el);
            ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(function (type) {
                el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
            });
            if (typeof el.click === 'function') el.click();
            return true;
        } catch (e) {
            return false;
        }
    }

    function collectCandidates(root) {
        var candidates = [];
        var selector =
            'button, a, [role="button"], input[type="button"], input[type="submit"], ' +
            'div[onclick], span[onclick], .play-btn, .btn-play, .vjs-big-play-button, ' +
            '.dplayer-mobile-play, .plyr__control--overlaid, .jw-icon-display, .artplayer-play-icon';

        try {
            root.querySelectorAll(selector).forEach(function (el) {
                var text = elementLabel(el);
                if (matchesPlayKeyword(text)) {
                    candidates.push({ el: el, score: scoreElement(el, text) });
                }
            });
        } catch (e) {}

        try {
            root.querySelectorAll('video').forEach(function (video) {
                if (video.paused) {
                    try {
                        video.muted = true;
                        var playPromise = video.play();
                        if (playPromise && typeof playPromise.catch === 'function') {
                            playPromise.catch(function () {});
                        }
                    } catch (e) {}
                }

                var container = video.parentElement;
                if (!container) return;
                container.querySelectorAll('button, a, [role="button"], div, span').forEach(function (el) {
                    if (el === video || el.contains(video)) return;
                    var text = elementLabel(el);
                    if (matchesPlayKeyword(text) && isVisible(el)) {
                        candidates.push({ el: el, score: scoreElement(el, text) + 2 });
                    }
                });
            });
        } catch (e) {}

        return candidates;
    }

    function tryClickInDocument(doc) {
        if (!doc || !doc.querySelectorAll) return 0;

        var clicked = 0;
        var candidates = collectCandidates(doc);
        candidates.sort(function (a, b) {
            return b.score - a.score;
        });

        for (var i = 0; i < candidates.length && clicked < MAX_CLICKS_PER_ROUND; i++) {
            if (clickElement(candidates[i].el)) clicked++;
        }
        return clicked;
    }

    window.__wuji_tryClickPlayButtons__ = function (options) {
        options = options || {};
        var now = Date.now();
        if (!options.force && now - lastClickRound < CLICK_INTERVAL_MS) {
            return 0;
        }
        lastClickRound = now;

        var total = tryClickInDocument(document);

        try {
            document.querySelectorAll('iframe').forEach(function (iframe) {
                try {
                    var frameDoc = iframe.contentDocument;
                    if (frameDoc) {
                        total += tryClickInDocument(frameDoc);
                    }
                } catch (e) {}
            });
        } catch (e) {}

        return total;
    };
})();
