// Hayakode — local recognition engine wrapper.
//
// Engine: zxing-wasm (ZXing-C++ compiled to WebAssembly), reader build.
//   - returns four corner coordinates for every symbol (multi-code selection)
//   - supports multiple symbols per image (maxNumberOfSymbols)
//   - supports tryHarder / tryRotate / tryInvert / downscale (thorough mode)
//   - fully bundled: JS + .wasm live under vendor/, no CDN
//
// The vendored `share.js` was patched to remove the upstream remote-CDN default
// `locateFile`; the WASM bytes are read from the extension package and passed
// in as `wasmBinary`, so no remote URL can ever be resolved.

import {
  readBarcodes,
  prepareZXingModule,
  purgeZXingModule,
  ZXING_WASM_VERSION,
  ZXING_CPP_COMMIT,
} from "../../vendor/zxing-wasm/reader/index.js";

export const ENGINE_INFO = Object.freeze({
  name: "zxing-wasm (ZXing-C++ WebAssembly, reader build)",
  version: ZXING_WASM_VERSION,
  zxingCppCommit: ZXING_CPP_COMMIT,
});

const WASM_URL = chrome.runtime.getURL("vendor/zxing-wasm/reader/zxing_reader.wasm");

let enginePromise = null;
let wasmBinaryPromise = null;

function loadWasmBinary() {
  if (!wasmBinaryPromise) {
    // chrome-extension:// URL -> a packaged local resource, not a network request.
    wasmBinaryPromise = fetch(WASM_URL)
      .then((resp) => {
        if (!resp.ok) throw new Error("local wasm load failed: " + resp.status);
        return resp.arrayBuffer();
      })
      .then((buf) => new Uint8Array(buf))
      .catch((err) => {
        wasmBinaryPromise = null;
        throw err;
      });
  }
  return wasmBinaryPromise;
}

/**
 * Instantiate the WASM module once. Safe to call repeatedly.
 * @returns {Promise<object>} the instantiated ZXing reader module
 */
export function engineReady() {
  if (!enginePromise) {
    enginePromise = (async () => {
      const wasmBinary = await loadWasmBinary();
      return prepareZXingModule({
        overrides: {
          wasmBinary,
          // Belt-and-braces local override (upstream default pointed at a CDN).
          locateFile: () => WASM_URL,
          print: () => {},
          printErr: () => {},
        },
        fireImmediately: true,
      });
    })().catch((err) => {
      // Do not cache a rejected engine forever; allow a later retry.
      enginePromise = null;
      try {
        purgeZXingModule();
      } catch (_) {
        /* ignore */
      }
      throw err;
    });
  }
  return enginePromise;
}

const QR_FORMATS = ["QRCode", "MicroQRCode", "RMQRCode"];

/**
 * Decode an ImageData crop entirely locally.
 *
 * @param {ImageData} imageData rendered pixels (not the original image file)
 * @param {{scanMode?: "fast"|"hard", scanLinear?: boolean, maxSymbols?: number}} options
 * @returns {Promise<Array<object>>} zxing-wasm ReadResult objects
 */
export async function decodeImageData(imageData, options = {}) {
  await engineReady();
  const hard = options.scanMode !== "fast";
  const formats = options.scanLinear ? ["All"] : QR_FORMATS.slice();
  const results = await readBarcodes(imageData, {
    formats,
    tryHarder: hard,
    tryRotate: true,
    tryInvert: hard,
    tryDownscale: hard,
    tryDenoise: false,
    maxNumberOfSymbols: Math.max(1, Math.min(255, options.maxSymbols || 16)),
    textMode: "Plain",
    returnErrors: false,
  });
  return Array.isArray(results) ? results : [];
}
