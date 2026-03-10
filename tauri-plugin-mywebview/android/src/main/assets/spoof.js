try {
    Object.defineProperty(navigator, 'platform', { get: function() { return 'Win32'; } });
    Object.defineProperty(navigator, 'maxTouchPoints', { get: function() { return 0; } });
} catch(e) {}
