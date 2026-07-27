(function () {
    'use strict';
    if (window.__wuji_desktop_spoof_installed__) return;
    window.__wuji_desktop_spoof_installed__ = true;

    var DESKTOP_UA = __WUJI_DESKTOP_UA__;
    var DESKTOP_WIDTH = __WUJI_DESKTOP_WIDTH__;
    var DESKTOP_HEIGHT = __WUJI_DESKTOP_HEIGHT__;

    function defineRO(obj, key, value) {
        try {
            Object.defineProperty(obj, key, {
                get: function () { return value; },
                configurable: true
            });
        } catch (e) {}
    }

    defineRO(navigator, 'userAgent', DESKTOP_UA);
    defineRO(navigator, 'appVersion', DESKTOP_UA.replace(/^Mozilla\//, ''));
    defineRO(navigator, 'platform', 'Win32');
    defineRO(navigator, 'vendor', 'Google Inc.');
    defineRO(navigator, 'maxTouchPoints', 0);
    defineRO(navigator, 'hardwareConcurrency', 8);
    defineRO(navigator, 'deviceMemory', 8);
    defineRO(navigator, 'webdriver', false);

    try {
        if ('userAgentData' in navigator) {
            var brands = [
                { brand: 'Chromium', version: '141' },
                { brand: 'Google Chrome', version: '141' },
                { brand: 'Not;A=Brand', version: '99' }
            ];
            var uaData = {
                brands: brands,
                mobile: false,
                platform: 'Windows',
                getHighEntropyValues: function () {
                    return Promise.resolve({
                        architecture: 'x86',
                        bitness: '64',
                        brands: brands,
                        mobile: false,
                        model: '',
                        platform: 'Windows',
                        platformVersion: '10.0.0',
                        uaFullVersion: '141.0.0.0'
                    });
                },
                toJSON: function () {
                    return { brands: brands, mobile: false, platform: 'Windows' };
                }
            };
            defineRO(navigator, 'userAgentData', uaData);
        }
    } catch (e) {}

    defineRO(screen, 'width', DESKTOP_WIDTH);
    defineRO(screen, 'height', DESKTOP_HEIGHT);
    defineRO(screen, 'availWidth', DESKTOP_WIDTH);
    defineRO(screen, 'availHeight', DESKTOP_HEIGHT - 40);
    defineRO(window, 'devicePixelRatio', 1);

    try {
        var docEl = document.documentElement;
        if (docEl) {
            defineRO(docEl, 'clientWidth', DESKTOP_WIDTH);
            defineRO(docEl, 'clientHeight', DESKTOP_HEIGHT);
        }
    } catch (e) {}
})();
