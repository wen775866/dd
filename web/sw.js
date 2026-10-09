/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-7e5eb42b'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "pwa-maskable-512x512.png",
    "revision": "7d285df0b0e71e89ebc1384c0e5fc745"
  }, {
    "url": "pwa-512x512.png",
    "revision": "498dcdf14f330fb688d550b2b7d02723"
  }, {
    "url": "pwa-192x192.png",
    "revision": "f28eaf259dabace091e3edaf48eb75d4"
  }, {
    "url": "index.html",
    "revision": "5753919c7876dbbed6e868a6e0ee691d"
  }, {
    "url": "icon.svg",
    "revision": "50af1c7d317816cbca869e67a7c25682"
  }, {
    "url": "favicon.ico",
    "revision": "d19bdaa05c8a10c03a6cf0020d3bc075"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "dcfa0fe489a3d0241a6c7e46d9d706d8"
  }, {
    "url": "cards/red_joker.svg",
    "revision": "3ee6c6a7ff1db8c8bc737e6813c32e40"
  }, {
    "url": "cards/queen_of_spades.svg",
    "revision": "dbe6e8aa18e929cabce8d1ea14991b5e"
  }, {
    "url": "cards/queen_of_hearts.svg",
    "revision": "14595ee29767eb638d4e7b836681b948"
  }, {
    "url": "cards/queen_of_diamonds.svg",
    "revision": "54ce677065900593e1dcc5d1a8c291ee"
  }, {
    "url": "cards/queen_of_clubs.svg",
    "revision": "e536940b6738980957b1a8994ae0bfa5"
  }, {
    "url": "cards/king_of_spades.svg",
    "revision": "1b71647633ab0139ed653a9d2853a2fe"
  }, {
    "url": "cards/king_of_hearts.svg",
    "revision": "6c117cafa753027495d6c17255a83f62"
  }, {
    "url": "cards/king_of_diamonds.svg",
    "revision": "fcddf8286cfef2cf38e10b58302574f9"
  }, {
    "url": "cards/king_of_clubs.svg",
    "revision": "7ddec7c90c31e982243062fb18bb89b1"
  }, {
    "url": "cards/jack_of_spades.svg",
    "revision": "e1ac814a5e2fc1167c1e59a9f0500205"
  }, {
    "url": "cards/jack_of_hearts.svg",
    "revision": "507c5a30b6a71d72abdc07b3243d1cb9"
  }, {
    "url": "cards/jack_of_diamonds.svg",
    "revision": "64cead41f0e1988d27aae36eb8621d6a"
  }, {
    "url": "cards/jack_of_clubs.svg",
    "revision": "5cf608a6649234ec05e172d84b256511"
  }, {
    "url": "cards/black_joker.svg",
    "revision": "9f224202fb92040644627b936573d5bf"
  }, {
    "url": "cards/back.svg",
    "revision": "f956b6d85f78462ab4adc75933f408cb"
  }, {
    "url": "cards/ace_of_spades.svg",
    "revision": "24447775981392a036394118fb6df6b2"
  }, {
    "url": "cards/ace_of_hearts.svg",
    "revision": "dc28ffbe3326193db30f2cfe8c81c667"
  }, {
    "url": "cards/ace_of_diamonds.svg",
    "revision": "60af6f9ef954dcf1a4a7bb998d6d4b9c"
  }, {
    "url": "cards/ace_of_clubs.svg",
    "revision": "94cbff98be0caf7046b3dffb91908164"
  }, {
    "url": "cards/9_of_spades.svg",
    "revision": "46304258451a3d2c69fdfaa1ac51d00e"
  }, {
    "url": "cards/9_of_hearts.svg",
    "revision": "71f253368c37179079e9ebfa66604bb3"
  }, {
    "url": "cards/9_of_diamonds.svg",
    "revision": "a578d7b2d3c0912a5296ec854fdec2b1"
  }, {
    "url": "cards/9_of_clubs.svg",
    "revision": "cf6317bc33f1c6db87c7f41b05e0276a"
  }, {
    "url": "cards/8_of_spades.svg",
    "revision": "4ff481d5b35c16c2777c8338cbbe4757"
  }, {
    "url": "cards/8_of_hearts.svg",
    "revision": "f63258336d8695aaade082ed26d0b17c"
  }, {
    "url": "cards/8_of_diamonds.svg",
    "revision": "5f81e3253ead056953d4eb2006a1543f"
  }, {
    "url": "cards/8_of_clubs.svg",
    "revision": "55a0952df2d2ac118fe526cc4cd234e4"
  }, {
    "url": "cards/7_of_spades.svg",
    "revision": "00b5eed0e617c1754f2a002d8d000504"
  }, {
    "url": "cards/7_of_hearts.svg",
    "revision": "51aa35bf8fa6e3aa60e8215d642e4f83"
  }, {
    "url": "cards/7_of_diamonds.svg",
    "revision": "d00ed5bcb5b70ef0aee9566bedea6077"
  }, {
    "url": "cards/7_of_clubs.svg",
    "revision": "768d16acc808234b01ab27b85e8129c2"
  }, {
    "url": "cards/6_of_spades.svg",
    "revision": "dd29ca5aa8ac92ff0c506fc350b52f57"
  }, {
    "url": "cards/6_of_hearts.svg",
    "revision": "13bea5a1b85d4f6fcff7f22da3fe9c7f"
  }, {
    "url": "cards/6_of_diamonds.svg",
    "revision": "a8aabd2da27a433782343dbbe7f4e0f4"
  }, {
    "url": "cards/6_of_clubs.svg",
    "revision": "3708c7e5593573328d639c71e58d7090"
  }, {
    "url": "cards/5_of_spades.svg",
    "revision": "8f300fb5cd9845334b705d3dbdb9e86a"
  }, {
    "url": "cards/5_of_hearts.svg",
    "revision": "3a5059d0b4687cf3b0442ace92e47e88"
  }, {
    "url": "cards/5_of_diamonds.svg",
    "revision": "eda011102b5e3ed00502425e250a6e14"
  }, {
    "url": "cards/5_of_clubs.svg",
    "revision": "12408f645f540e569f639eec07b24140"
  }, {
    "url": "cards/4_of_spades.svg",
    "revision": "e1ae315267bebee9e8b70bb2e1ec27d8"
  }, {
    "url": "cards/4_of_hearts.svg",
    "revision": "6369d1c9530222380e3755d3dff0cd92"
  }, {
    "url": "cards/4_of_diamonds.svg",
    "revision": "72d20001e3f712d041f5c98c0e36d73d"
  }, {
    "url": "cards/4_of_clubs.svg",
    "revision": "037d8c2373b81694a9519c060d0951a3"
  }, {
    "url": "cards/3_of_spades.svg",
    "revision": "471f3e5977ae8e34350702a5354b4dd3"
  }, {
    "url": "cards/3_of_hearts.svg",
    "revision": "dfb7b9c5da090e753693a0648e230423"
  }, {
    "url": "cards/3_of_diamonds.svg",
    "revision": "b9d5e12f600e3e441e26a2f460ace236"
  }, {
    "url": "cards/3_of_clubs.svg",
    "revision": "4281c3d1982ca4e277ae289a56f7fda1"
  }, {
    "url": "cards/2_of_spades.svg",
    "revision": "b821dcd9a79616c0f95f935af2d623eb"
  }, {
    "url": "cards/2_of_hearts.svg",
    "revision": "1b2188a05b3339ac8f1c043c803d5d9a"
  }, {
    "url": "cards/2_of_diamonds.svg",
    "revision": "eaef1133f7cafc9f07a5dd8002d58f67"
  }, {
    "url": "cards/2_of_clubs.svg",
    "revision": "94b4a5b0b35e4db0d7587815dcdcdb91"
  }, {
    "url": "cards/10_of_spades.svg",
    "revision": "3963b09b32d71eaf3904864d36a7e9f6"
  }, {
    "url": "cards/10_of_hearts.svg",
    "revision": "c63394108a986db8e02c9d2226007af8"
  }, {
    "url": "cards/10_of_diamonds.svg",
    "revision": "dbb3850c770e43af9bc90d0cce873dbb"
  }, {
    "url": "cards/10_of_clubs.svg",
    "revision": "669c20fcb83ddabc3bda3e8162af6569"
  }, {
    "url": "assets/workbox-window.prod.es5-Bd17z0YL.js",
    "revision": null
  }, {
    "url": "assets/index-C0lhWULo.js",
    "revision": null
  }, {
    "url": "assets/index-B_7XW32k.css",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "dcfa0fe489a3d0241a6c7e46d9d706d8"
  }, {
    "url": "favicon.ico",
    "revision": "d19bdaa05c8a10c03a6cf0020d3bc075"
  }, {
    "url": "icon.svg",
    "revision": "50af1c7d317816cbca869e67a7c25682"
  }, {
    "url": "pwa-192x192.png",
    "revision": "f28eaf259dabace091e3edaf48eb75d4"
  }, {
    "url": "pwa-512x512.png",
    "revision": "498dcdf14f330fb688d550b2b7d02723"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "7d285df0b0e71e89ebc1384c0e5fc745"
  }, {
    "url": "manifest.webmanifest",
    "revision": "11ec12e568505de16c6fb90ffb1915e6"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));

}));
