// Hayakode — background service worker (MV3, module).
//
// Responsibilities:
//   * capture the visible viewport (rendered pixels, NOT the image file/URL)
//   * crop the target rectangle using the real device-pixel scale
//   * run the bundled local WASM recognizer in the extension context
//   * hand results (with per-code corner coordinates) back to the content script
//
// The service worker never uses an offscreen document (that would need the
// "offscreen" permission); OffscreenCanvas + createImageBitmap are available
// in service workers, so `permissions` stays at just storage + contextMenus.

import { engineReady, decodeImageData, ENGINE_INFO } from "./engine.js";

const DEFAULTS = Object.freeze({
  minShortSide: 64,
  alwaysShow: false,
  buttonOpacity: 0.6,
  scanMode: "hard",
  scanLinear: false,
  expandPx: 8,
});

// Native right-click menu entry. The menu item is
// registered for the "image" context only, so it never appears on plain text,
// links or empty page areas.
const CONTEXT_MENU_ID = "hayakode-recognize-image";
// Localized via the standard MV3 i18n API; falls back to the default_locale
// string if the message is somehow missing.
const CONTEXT_MENU_TITLE = chrome.i18n.getMessage("contextMenuTitle") || "Scan QR code here";
const CONTEXT_MENU_CONTEXTS = Object.freeze(["image"]);

const CROP_TTL_MS = 30000;
const MAX_CAPTURES_PER_SECOND = 2;

// Diagnostics surface for the self-test harness (and useful in production).
const swErrors = [];
self.addEventListener("error", (e) => {
  swErrors.push(String((e && e.message) || (e && e.error) || e));
});
self.addEventListener("unhandledrejection", (e) => {
  swErrors.push("unhandledrejection: " + String((e && e.reason && e.reason.message) || (e && e.reason) || e));
});
self.__hayakodeSWErrors = swErrors;
// Exposed for the self-test harness (Playwright evaluates inside the SW scope).
self.__hayakodeEngineInfo = ENGINE_INFO;
self.__hayakodeEngineReady = engineReady;
self.__hayakodeLastCapture = lastCaptureDataUrl;
// Diagnostics: what the context menu was registered as (self-test only).
self.__hayakodeContextMenu = Object.freeze({
  id: CONTEXT_MENU_ID,
  title: CONTEXT_MENU_TITLE,
  contexts: CONTEXT_MENU_CONTEXTS.slice(),
});
self.__hayakodeContextMenuRegistered = false;

/** @type {Map<string, {imageData: ImageData, origin: {x:number,y:number}, scaleX:number, scaleY:number, cssW:number, cssH:number, deviceW:number, deviceH:number, tooSmall:boolean, createdAt:number}>} */
const crops = new Map();

// Most recent crop, kept only for diagnostics/self-test (e.g. to prove the
// extension's own button/mask was not captured).
let lastCrop = null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function makeToken() {
  const a = new Uint8Array(12);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

function pruneCrops() {
  const now = Date.now();
  for (const [token, crop] of crops) {
    if (now - crop.createdAt > CROP_TTL_MS) crops.delete(token);
  }
}

// ---------------------------------------------------------------------------
// captureVisibleTab throttling (Chrome allows at most 2 calls per second).
// ---------------------------------------------------------------------------
let captureChain = Promise.resolve();
let captureTimes = [];

function captureVisibleTabThrottled(windowId) {
  const run = async () => {
    // Chrome enforces MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND = 2. Wait in a
    // loop until the rolling one-second window has a free slot.
    for (;;) {
      const now = Date.now();
      captureTimes = captureTimes.filter((t) => now - t < 1000);
      if (captureTimes.length < MAX_CAPTURES_PER_SECOND) break;
      await sleep(Math.max(60, 1000 - (now - captureTimes[0]) + 60));
    }
    captureTimes.push(Date.now());
    return chrome.tabs.captureVisibleTab(windowId, { format: "png" });
  };
  captureChain = captureChain.then(run, run);
  return captureChain;
}

async function captureWithRetry(windowId) {
  try {
    return await captureVisibleTabThrottled(windowId);
  } catch (err) {
    const msg = String((err && err.message) || err);
    if (/quota|MAX_CAPTURE|capture/i.test(msg)) {
      await sleep(650);
      return captureVisibleTabThrottled(windowId);
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// PNG data URL -> ImageBitmap (no network involved).
// ---------------------------------------------------------------------------
async function dataUrlToBitmap(dataUrl) {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) throw new Error("unexpected capture payload");
  const binary = atob(dataUrl.slice(comma + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: "image/png" });
  return createImageBitmap(blob);
}

// ---------------------------------------------------------------------------
// Capture + crop.
//   rect / viewport are CSS pixels (content script coordinate space).
//   The bitmap is device pixels; scaleX/scaleY convert between them, which
//   covers devicePixelRatio AND browser zoom.
// ---------------------------------------------------------------------------
async function captureAndCrop(windowId, { rect, viewport, expand }) {
  const expandPx = Number.isFinite(expand) ? Math.max(0, Math.min(64, expand)) : 8;
  const vw = Math.max(1, viewport && viewport.width ? viewport.width : 1);
  const vh = Math.max(1, viewport && viewport.height ? viewport.height : 1);

  const dataUrl = await captureWithRetry(windowId);
  const bitmap = await dataUrlToBitmap(dataUrl);
  try {
    const scaleX = bitmap.width / vw;
    const scaleY = bitmap.height / vh;

    // Expanded target rect, clamped to the viewport (quiet zone).
    const x0 = Math.max(0, Math.min(vw, rect.x - expandPx));
    const y0 = Math.max(0, Math.min(vh, rect.y - expandPx));
    const x1 = Math.max(0, Math.min(vw, rect.x + rect.w + expandPx));
    const y1 = Math.max(0, Math.min(vh, rect.y + rect.h + expandPx));

    let sx = Math.round(x0 * scaleX);
    let sy = Math.round(y0 * scaleY);
    let sw = Math.round((x1 - x0) * scaleX);
    let sh = Math.round((y1 - y0) * scaleY);

    sx = Math.max(0, Math.min(bitmap.width - 1, sx));
    sy = Math.max(0, Math.min(bitmap.height - 1, sy));
    sw = Math.max(1, Math.min(bitmap.width - sx, sw));
    sh = Math.max(1, Math.min(bitmap.height - sy, sh));

    const canvas = new OffscreenCanvas(sw, sh);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);
    const imageData = ctx.getImageData(0, 0, sw, sh);

    const cssW = sw / scaleX;
    const cssH = sh / scaleY;
    const token = makeToken();
    const crop = {
      imageData,
      origin: { x: x0, y: y0 },
      scaleX,
      scaleY,
      cssW,
      cssH,
      deviceW: sw,
      deviceH: sh,
      tooSmall: Math.min(cssW, cssH) < 24,
      createdAt: Date.now(),
    };
    crops.set(token, crop);
    lastCrop = crop;
    pruneCrops();
    return {
      ok: true,
      token,
      origin: { x: x0, y: y0 },
      scaleX,
      scaleY,
      cssW,
      cssH,
      deviceW: sw,
      deviceH: sh,
      tooSmall: Math.min(cssW, cssH) < 24,
      capture: { bitmapW: bitmap.width, bitmapH: bitmap.height, viewportW: vw, viewportH: vh },
    };
  } finally {
    if (bitmap && typeof bitmap.close === "function") bitmap.close();
  }
}

// ---------------------------------------------------------------------------
// Decode a stored crop.
// ---------------------------------------------------------------------------
async function decodeToken(token, options) {
  const crop = crops.get(token);
  if (!crop) return { ok: false, error: "crop-expired" };
  crops.delete(token);
  const results = await decodeImageData(crop.imageData, {
    scanMode: options && options.scanMode,
    scanLinear: !!(options && options.scanLinear),
  });
  const normalized = results.map((r) => ({
    text: r.text,
    format: r.format,
    symbology: r.symbology,
    contentType: r.contentType,
    isInverted: !!r.isInverted,
    isMirrored: !!r.isMirrored,
    orientation: r.orientation,
    position: {
      topLeft: r.position.topLeft,
      topRight: r.position.topRight,
      bottomRight: r.position.bottomRight,
      bottomLeft: r.position.bottomLeft,
    },
  }));
  return {
    ok: true,
    results: normalized,
    tooSmall: crop.tooSmall,
    crop: {
      origin: crop.origin,
      scaleX: crop.scaleX,
      scaleY: crop.scaleY,
      cssW: crop.cssW,
      cssH: crop.cssH,
      deviceW: crop.deviceW,
      deviceH: crop.deviceH,
    },
    engine: ENGINE_INFO,
  };
}

// ---------------------------------------------------------------------------
// Diagnostics: return the most recent crop as a PNG data URL (self-test only).
// ---------------------------------------------------------------------------
async function lastCaptureDataUrl() {
  if (!lastCrop) return { ok: false, error: "no-capture" };
  const canvas = new OffscreenCanvas(lastCrop.deviceW, lastCrop.deviceH);
  canvas.getContext("2d").putImageData(lastCrop.imageData, 0, 0);
  const blob = await canvas.convertToBlob({ type: "image/png" });
  const dataUrl = await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
  return {
    ok: true,
    dataUrl,
    width: lastCrop.deviceW,
    height: lastCrop.deviceH,
    origin: lastCrop.origin,
    scaleX: lastCrop.scaleX,
    scaleY: lastCrop.scaleY,
    cssW: lastCrop.cssW,
    cssH: lastCrop.cssH,
  };
}

// ---------------------------------------------------------------------------
// Safe open: only http/https ever reaches chrome.tabs.
// ---------------------------------------------------------------------------
function isHttpUrl(raw) {
  try {
    const u = new URL(String(raw).trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch (_) {
    return false;
  }
}

async function openUrl(raw) {
  const trimmed = String(raw).trim();
  if (!isHttpUrl(trimmed)) return { ok: false, error: "blocked-protocol" };
  await chrome.tabs.create({ url: trimmed, active: true });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Message plumbing.
// ---------------------------------------------------------------------------
async function handleMessage(msg, sender) {
  switch (msg && msg.type) {
    case "HAYAKODE_PING":
      return { ok: true, engine: ENGINE_INFO, version: chrome.runtime.getManifest().version };
    case "HAYAKODE_ENGINE_STATUS": {
      try {
        await engineReady();
        return { ok: true, ready: true, engine: ENGINE_INFO };
      } catch (err) {
        return { ok: false, ready: false, error: String((err && err.message) || err) };
      }
    }
    case "HAYAKODE_SW_ERRORS":
      return { ok: true, errors: swErrors.slice() };
    case "HAYAKODE_LAST_CAPTURE":
      try {
        return await lastCaptureDataUrl();
      } catch (err) {
        return { ok: false, error: String((err && err.message) || err) };
      }
    case "HAYAKODE_CAPTURE": {
      const windowId = sender && sender.tab ? sender.tab.windowId : undefined;
      if (windowId === undefined) return { ok: false, error: "no-window" };
      try {
        return await captureAndCrop(windowId, msg);
      } catch (err) {
        return { ok: false, error: String((err && err.message) || err) };
      }
    }
    case "HAYAKODE_DECODE": {
      try {
        return await decodeToken(msg.token, msg.options);
      } catch (err) {
        return { ok: false, error: String((err && err.message) || err) };
      }
    }
    case "HAYAKODE_OPEN_URL":
      try {
        return await openUrl(msg.url);
      } catch (err) {
        return { ok: false, error: String((err && err.message) || err) };
      }
    default:
      return undefined;
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const result = handleMessage(msg, sender);
  if (!result || typeof result.then !== "function") return false;
  result.then(sendResponse, (err) =>
    sendResponse({ ok: false, error: String((err && err.message) || err) })
  );
  return true; // async response
});

// ---------------------------------------------------------------------------
// Native entry points.
//
//   * native right-click "Scan QR code here" — registered for the image context
//     only; the clicked image element is recorded by the content script at
//     contextmenu time, so recognition still runs on the rendered pixels and
//     never reloads info.srcUrl.
//   * toolbar icon entry — permission-free secondary entry.
// ---------------------------------------------------------------------------
function sendToTab(tabId, type) {
  if (tabId === undefined || tabId === null) return;
  chrome.tabs.sendMessage(tabId, { type }).catch(() => {});
}

function registerContextMenus() {
  if (!chrome.contextMenus) return;
  // removeAll first so a reload/update never collides with an existing item.
  chrome.contextMenus.removeAll(() => {
    void chrome.runtime.lastError;
    chrome.contextMenus.create(
      {
        id: CONTEXT_MENU_ID,
        title: CONTEXT_MENU_TITLE,
        contexts: CONTEXT_MENU_CONTEXTS.slice(),
      },
      () => {
        self.__hayakodeContextMenuRegistered = !chrome.runtime.lastError;
      }
    );
  });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!info || info.menuItemId !== CONTEXT_MENU_ID) return;
  // Deliberately ignore info.srcUrl: recognition must reuse the content
  // script's rendered-pixel capture, not reload the image URL.
  sendToTab(tab && tab.id, "HAYAKODE_CONTEXT_MENU");
});

chrome.action.onClicked.addListener((tab) => {
  sendToTab(tab && tab.id, "HAYAKODE_TOOLBAR_ENTRY");
});

// Seed default settings and the context menu so options/content agree.
chrome.runtime.onInstalled.addListener(() => {
  registerContextMenus();
  chrome.storage.local.get(DEFAULTS).then((stored) => {
    const patch = {};
    for (const [key, value] of Object.entries(DEFAULTS)) {
      if (stored[key] === undefined) patch[key] = value;
    }
    if (Object.keys(patch).length) chrome.storage.local.set(patch);
  });
});
