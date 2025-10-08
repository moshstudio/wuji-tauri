/**
 * @file plugin.js
 * https://github.com/SaifAqqad/videojs-mpegts
 */

import videojs from 'video.js';
import mpegtsjs from 'mpegts.js';

function toTitleCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const Html5 = videojs.getTech('Html5')! as any;
const mergeOptions = videojs.mergeOptions;
const defaults = {
  mediaDataSource: {},
  config: {},
};

let mpegtsPlayer: mpegtsjs.Player | undefined;
/**
 * Mpegts tech that simply wires up mpegts.js to a Video.js tech
 *
 * @see {@link https://github.com/xqq/mpegts.js|mpegts.js}
 */
class Mpegts extends Html5 {
  /**
   * Create an instance of this Tech.
   *
   * @param {Object} [options]
   *        The key/value store of player options.
   *
   * @param {Component~ReadyCallback} ready
   *        Callback function to call when the `Mpegts` Tech is ready.
   */
  constructor(options: any, ready: any) {
    options = mergeOptions(defaults, options);
    super(options, ready);
  }

  /**
   * Setter for the `Mpegts` Tech's source object.
   *
   * @param {Tech~SourceObject} [src]
   *        The source object to set on the `Mpegts` techs.
   */
  setSrc(src?: string) {
    if (mpegtsPlayer) {
      // Is this necessary to change source?
      mpegtsPlayer.detachMediaElement();
      mpegtsPlayer.destroy();
      mpegtsPlayer = undefined;
    }

    const mediaDataSource = this.options_.mediaDataSource;
    const config: mpegtsjs.Config = {
      autoCleanupSourceBuffer: true,
    };

    mediaDataSource.type =
      mediaDataSource.type === undefined ? 'mpegts' : mediaDataSource.type;
    mediaDataSource.url = src;
    mpegtsPlayer = mpegtsjs.createPlayer(mediaDataSource, config);

    mpegtsPlayer.attachMediaElement(this.el_);
    mpegtsPlayer.load();
    mpegtsPlayer.pause();
  }

  play() {
    if (mpegtsPlayer) {
      mpegtsPlayer.play();
    }
    this.el_.play();
  }

  pause() {
    if (mpegtsPlayer) {
      mpegtsPlayer.pause();
    }
    this.el_.pause();
  }

  reset() {
    if (mpegtsPlayer) {
      mpegtsPlayer.detachMediaElement();
      mpegtsPlayer.destroy();
      mpegtsPlayer = undefined;
    }
    Mpegts.resetMediaElement(this.el_);
  }

  /**
   * Dispose of mpegts.
   */
  dispose() {
    if (mpegtsPlayer) {
      mpegtsPlayer.detachMediaElement();
      mpegtsPlayer.destroy();
      mpegtsPlayer = undefined;
    }
    super.dispose();
  }
}

/**
 * Check if the Mpegts tech is currently supported.
 *
 * @return {boolean}
 *          - True if the Mpegts tech is supported.
 *          - False otherwise.
 */
Mpegts.isSupported = function () {
  return mpegtsjs.isSupported();
};

/**
 * Mpegts supported mime types.
 *
 * @constant {Object}
 */
Mpegts.formats = {
  'video/flv': 'FLV',
  'video/x-flv': 'FLV',
  'video/mp2t': 'MPEGTS',
};

/**
 * Check if the tech can support the given type
 *
 * @param {string} type
 *        The mimetype to check
 * @return {string} 'probably', 'maybe', or '' (empty string)
 */
Mpegts.canPlayType = function (type: any) {
  if (Mpegts.isSupported() && type in Mpegts.formats) {
    return 'maybe';
  }

  return '';
};

/**
 * Check if the tech can support the given source
 *
 * @param {Object} srcObj
 *        The source object
 * @param {Object} options
 *        The options passed to the tech
 * @return {string} 'probably', 'maybe', or '' (empty string)
 */
Mpegts.canPlaySource = function (srcObj: any, options: any) {
  return Mpegts.canPlayType(srcObj.type);
};

Mpegts.canOverrideAttributes = function () {
  // if we cannot overwrite the src/innerHTML property, there is no support
  // iOS 7 safari for instance cannot do this.
  try {
    const noop = () => {};

    Object.defineProperty(document.createElement('video'), 'src', {
      get: noop,
      set: noop,
    });
    Object.defineProperty(document.createElement('audio'), 'src', {
      get: noop,
      set: noop,
    });
    Object.defineProperty(document.createElement('video'), 'innerHTML', {
      get: noop,
      set: noop,
    });
    Object.defineProperty(document.createElement('audio'), 'innerHTML', {
      get: noop,
      set: noop,
    });
  } catch (e) {
    return false;
  }

  return true;
};

Mpegts.disposeMediaElement = function (el: HTMLMediaElement) {
  if (!el) {
    return;
  }

  if (el.parentNode) {
    el.parentNode.removeChild(el);
  }

  // remove any child track or source nodes to prevent their loading
  while (el.hasChildNodes()) {
    el.removeChild(el.firstChild!);
  }

  // remove any src reference. not setting `src=''` because that causes a warning
  // in firefox
  el.removeAttribute('src');

  // force the media element to update its loading state by calling load()
  // however IE on Windows 7N has a bug that throws an error so need a try/catch (#793)
  if (typeof el.load === 'function') {
    // wrapping in an iife so it's not deoptimized (#1060#discussion_r10324473)
    (function () {
      try {
        el.load();
      } catch (e) {
        // not supported
      }
    })();
  }
};

Mpegts.resetMediaElement = function (el: HTMLMediaElement) {
  if (!el) {
    return;
  }
  mpegtsPlayer?.detachMediaElement();
  mpegtsPlayer?.destroy();
  mpegtsPlayer = undefined;

  const sources = el.querySelectorAll('source');
  let i = sources.length;

  while (i--) {
    el.removeChild(sources[i]);
  }

  // remove any src reference.
  // not setting `src=''` because that throws an error
  el.removeAttribute('src');

  if (typeof el.load === 'function') {
    // wrapping in an iife so it's not deoptimized (#1060#discussion_r10324473)
    (function () {
      try {
        el.load();
      } catch (e) {
        // satisfy linter
      }
    })();
  }
};

// [
//   'muted',

//   'defaultMuted',

//   'autoplay',

//   'controls',

//   'loop',

//   'playsinline',
// ].forEach(function (prop) {
//   Mpegts.prototype[prop] = function () {
//     return this.el_[prop] || this.el_.hasAttribute(prop);
//   };
// });

// ['muted', 'defaultMuted', 'autoplay', 'loop', 'playsinline'].forEach(
//   function (prop) {
//     Mpegts.prototype['set' + toTitleCase(prop)] = function (v: any) {
//       this.el_[prop] = v;

//       if (v) {
//         this.el_.setAttribute(prop, prop);
//       } else {
//         this.el_.removeAttribute(prop);
//       }
//     };
//   },
// );

// [
//   'paused',

//   'currentTime',

//   'buffered',

//   'volume',

//   'poster',

//   'preload',

//   'error',

//   'seeking',

//   'seekable',

//   'ended',

//   'playbackRate',

//   'defaultPlaybackRate',

//   'disablePictureInPicture',

//   'played',

//   'networkState',

//   'readyState',

//   'videoWidth',

//   'videoHeight',

//   'crossOrigin',
// ].forEach(function (prop) {
//   Mpegts.prototype[prop] = function () {
//     return this.el_[prop];
//   };
// });

// [
//   'volume',

//   'src',

//   'poster',

//   'preload',

//   'playbackRate',

//   'defaultPlaybackRate',

//   'disablePictureInPicture',

//   'crossOrigin',
// ].forEach(function (prop) {
//   Mpegts.prototype['set' + toTitleCase(prop)] = function (v: any) {
//     this.el_[prop] = v;
//   };
// });

// ['pause', 'load', 'play'].forEach(function (prop) {
//   Mpegts.prototype[prop] = function () {
//     return this.el_[prop]();
//   };
// });

// Tech.withSourceHandlers(Mpegts);
// Include the version number.
Mpegts.VERSION = '__VERSION__';

videojs.registerTech('Mpegts', Mpegts);

export default Mpegts;
