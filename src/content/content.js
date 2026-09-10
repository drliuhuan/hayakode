// Hayakode — content script (page-side UI + coordinate math).
//
// Responsibilities:
//   * hover button on images / picture / CSS background elements
//   * hide our own UI and wait a frame before the capture
//   * convert recognition coordinates back to page coordinates (DPR + scroll)
//   * single-result popup, multi-code numbered selection, failure toasts
//
// This file is a classic (non-module) content script on purpose: Manifest V3
// content scripts cannot use static ESM imports and the project must stay
// build-free.

(() => {
  "use strict";

  if (window.__hayakodeContentLoaded) return;
  window.__hayakodeContentLoaded = true;

  // -------------------------------------------------------------------------
  // Constants / defaults (must stay in sync with background + options).
  // -------------------------------------------------------------------------
  const HOST_ID = "hayakode-ext-root";
  const BUTTON_SIZE = 32;
  const BUTTON_INSET = 8; // Inset 8px from the bottom-right corner of the image.
  const DEFAULTS = Object.freeze({
    minShortSide: 64,
    alwaysShow: false,
    buttonOpacity: 0.6,
    scanMode: "hard",
    scanLinear: false,
    expandPx: 8,
  });

  const BUTTON_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/>' +
    '<path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>' +
    '<rect x="7" y="7" width="4" height="4" rx="1"/><rect x="13" y="7" width="4" height="4" rx="1"/>' +
    '<rect x="7" y="13" width="4" height="4" rx="1"/><path d="M13 13h2v2h-2z"/>' +
    '<path d="M17 17h.01"/></svg>';

  const CSS = `
:host { all: initial; }
*, *::before, *::after { box-sizing: border-box; }
.btn-layer, .overlay-layer, .popup-layer, .toast-layer {
  position: fixed; inset: 0; pointer-events: none;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
    "Hiragino Sans GB", "Microsoft YaHei", Roboto, Helvetica, Arial, sans-serif;
  font-size: 13px; line-height: 1.5; color: #1f2328; text-align: left; direction: ltr;
}
.scan-btn {
  position: fixed; width: ${BUTTON_SIZE}px; height: ${BUTTON_SIZE}px;
  padding: 0; margin: 0; border: none; border-radius: 50%; cursor: pointer;
  background: rgba(20, 22, 26, 0.78); color: #fff;
  display: flex; align-items: center; justify-content: center;
  opacity: 0; pointer-events: none; -webkit-appearance: none; appearance: none;
  transition: opacity .16s ease, transform .12s ease, background-color .16s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, .35); z-index: 2147483647;
}
.scan-btn.is-visible { opacity: var(--hayakode-btn-opacity, .6); }
.scan-btn.is-visible:hover { opacity: 1; background: rgba(8, 9, 11, .95); transform: scale(1.08); }
.scan-btn:focus-visible { outline: 2px solid #4c8dff; outline-offset: 2px; }
.scan-btn[disabled] { cursor: progress; }
.scan-btn svg { width: 18px; height: 18px; display: block; }
.scan-btn.is-loading svg { visibility: hidden; }
.scan-btn.is-loading::after {
  content: ""; position: absolute; width: 15px; height: 15px;
  border: 2px solid rgba(255, 255, 255, .35); border-top-color: #fff; border-radius: 50%;
  animation: hayakode-spin .7s linear infinite;
}
@keyframes hayakode-spin { to { transform: rotate(360deg); } }

.sel-backdrop { position: fixed; inset: 0; background: rgba(10, 12, 16, .32); pointer-events: auto; }
.sel-box {
  position: fixed; border: 2px solid #4c8dff; background: rgba(76, 141, 255, .14);
  border-radius: 6px; pointer-events: auto; cursor: pointer;
  transition: background-color .12s ease, border-color .12s ease;
}
.sel-box.is-hot { background: rgba(76, 141, 255, .30); border-color: #7db0ff; }
.sel-box:focus-visible { outline: 2px solid #fff; outline-offset: 1px; }
.sel-num {
  position: absolute; top: 0; left: 0; min-width: 20px; height: 20px; padding: 0 5px;
  border-radius: 10px; background: #4c8dff; color: #fff; font-size: 12px; font-weight: 700;
  line-height: 20px; text-align: center; box-shadow: 0 1px 4px rgba(0, 0, 0, .45);
  pointer-events: none;
}

.popup {
  position: fixed; display: flex; flex-direction: column; gap: 8px;
  width: min(380px, calc(100vw - 16px)); max-height: 72vh; overflow: hidden;
  background: #fff; color: #1f2328; border: 1px solid rgba(0, 0, 0, .08);
  border-radius: 10px; box-shadow: 0 10px 34px rgba(0, 0, 0, .28);
  padding: 12px 14px; pointer-events: auto;
}
.popup-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.popup-title { font-weight: 600; font-size: 13.5px; }
.popup-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { font-size: 11px; padding: 2px 8px; border-radius: 999px; background: #eef2f6; color: #3a4553; }
.popup-text {
  max-height: 34vh; overflow: auto; word-break: break-all; white-space: pre-wrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
  font-size: 12.5px; background: #f6f8fa; border: 1px solid #e3e6ea; border-radius: 6px;
  padding: 8px 10px; margin: 0;
}
.popup-domain {
  font-size: 12.5px; word-break: break-all; background: #f0f7ff;
  border: 1px solid #cfe3ff; border-radius: 6px; padding: 6px 8px;
}
.popup-warn {
  font-size: 12.5px; word-break: break-word; color: #8a1f11; background: #fff1ee;
  border: 1px solid #ffd0c7; border-radius: 6px; padding: 6px 8px;
}
.popup-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.primary-btn, .ghost-btn {
  font: inherit; border-radius: 7px; padding: 6px 12px; cursor: pointer;
  border: 1px solid transparent; white-space: nowrap;
}
.primary-btn { background: #1f6feb; color: #fff; }
.primary-btn:hover { background: #1a5fd0; }
.ghost-btn { background: #fff; color: #1f2328; border-color: #d0d7de; }
.ghost-btn:hover { background: #f3f4f6; }
.icon-btn {
  background: transparent; border: none; cursor: pointer; color: #57606a;
  font-size: 18px; line-height: 1; padding: 2px 6px; border-radius: 6px; font-family: inherit;
}
.icon-btn:hover { background: #f3f4f6; }

.toast {
  position: fixed; left: 50%; top: 16px; transform: translateX(-50%);
  display: flex; align-items: flex-start; gap: 8px; pointer-events: auto;
  max-width: min(520px, calc(100vw - 24px)); background: rgba(24, 26, 30, .95);
  color: #fff; border-radius: 10px; padding: 10px 12px;
  box-shadow: 0 8px 26px rgba(0, 0, 0, .32);
}
.toast-msg { font-size: 13px; line-height: 1.5; word-break: break-word; }
.toast-close { color: #cfd4da; }

.copy-helper { position: fixed; left: -10000px; top: 0; opacity: 0; pointer-events: none; }
`;

  // -------------------------------------------------------------------------
  // State.
  // -------------------------------------------------------------------------
  const state = {
    settings: { ...DEFAULTS },
    candidate: null,
    contextImage: null,
    buttonVisible: false,
    scan: "idle", // idle | capturing | decoding
    selection: null,
    popup: null,
    toast: null,
    ro: null,
    mo: null,
  };

  let host = null;
  let shadow = null;
  let btnLayer = null;
  let overlayLayer = null;
  let popupLayer = null;
  let toastLayer = null;
  let btn = null;

  const isTouch = (() => {
    try {
      return window.matchMedia("(hover: none)").matches;
    } catch (_) {
      return false;
    }
  })();

  // -------------------------------------------------------------------------
  // Small helpers.
  // -------------------------------------------------------------------------
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function nextFrames(n) {
    return new Promise((resolve) => {
      let i = 0;
      const step = () => {
        if (++i >= n) resolve();
        else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  function createEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  // Localized user-facing strings via the standard Manifest V3 i18n API.
  // The language follows the browser UI language and falls back to the
  // extension's default_locale. Engineering comments/logs stay in English.
  function t(key, subs, fallback) {
    try {
      const msg = chrome.i18n.getMessage(key, subs);
      if (msg) return msg;
    } catch (_) {
      /* fall through to the built-in fallback */
    }
    return fallback === undefined ? key : fallback;
  }

  function toPageRect(viewportRect) {
    return {
      left: viewportRect.left + window.scrollX,
      top: viewportRect.top + window.scrollY,
      width: viewportRect.width,
      height: viewportRect.height,
    };
  }

  function alwaysShowActive() {
    return !!state.settings.alwaysShow || isTouch;
  }

  function formatLabel(format) {
    const map = {
      QRCode: "QR Code",
      MicroQRCode: "Micro QR Code",
      RMQRCode: "rMQR Code",
      DataMatrix: "Data Matrix",
      Aztec: "Aztec",
      PDF417: "PDF417",
      EAN13: "EAN-13",
      EAN8: "EAN-8",
      Code128: "Code 128",
      Code39: "Code 39",
    };
    return map[format] || format || t("formatUnknown", undefined, "未知格式");
  }

  function contentTypeLabel(contentType) {
    const map = {
      Text: t("contentTypeText", undefined, "文本"),
      Binary: t("contentTypeBinary", undefined, "二进制"),
      Mixed: t("contentTypeMixed", undefined, "混合"),
      GS1: "GS1",
      ISO15434: "ISO15434",
      UnknownECI: t("contentTypeUnknownECI", undefined, "未知字符集"),
    };
    return map[contentType] || contentType || t("contentTypeUnknown", undefined, "未知类型");
  }

  // URL parsing never hard-codes protocol literals; the URL parser decides the scheme.
  function analyzeText(raw) {
    const text = String(raw == null ? "" : raw);
    const trimmed = text.trim();
    let url = null;
    try {
      url = new URL(trimmed);
    } catch (_) {
      url = null;
    }
    const scheme = url ? url.protocol.toLowerCase() : null;
    const isHttp = scheme === "http:" || scheme === "https:";
    const dangerous =
      !!scheme &&
      !isHttp &&
      ["javascript:", "data:", "file:", "vbscript:", "blob:", "about:", "chrome:", "chrome-extension:"].includes(scheme);
    return { text, trimmed, url, scheme, isHttp, dangerous };
  }

  async function sendMessage(msg) {
    return await chrome.runtime.sendMessage(msg);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      /* fall through to legacy path */
    }
    try {
      const ta = document.createElement("textarea");
      ta.className = "copy-helper";
      ta.value = text;
      ta.setAttribute("readonly", "");
      (shadow || document.body).appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch (_) {
      return false;
    }
  }

  // -------------------------------------------------------------------------
  // Shadow-DOM UI construction (only the extension's own nodes are appended).
  // -------------------------------------------------------------------------
  function ensureUI() {
    if (host && host.isConnected) return;
    host = document.createElement("div");
    host.id = HOST_ID;
    const s = host.style;
    s.setProperty("position", "fixed", "important");
    s.setProperty("left", "0", "important");
    s.setProperty("top", "0", "important");
    s.setProperty("width", "0", "important");
    s.setProperty("height", "0", "important");
    s.setProperty("z-index", "2147483647", "important");
    s.setProperty("pointer-events", "none", "important");
    s.setProperty("margin", "0", "important");
    s.setProperty("padding", "0", "important");
    s.setProperty("border", "0", "important");
    s.setProperty("background", "transparent", "important");

    shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = CSS;
    shadow.appendChild(style);

    btnLayer = createEl("div", "btn-layer");
    overlayLayer = createEl("div", "overlay-layer");
    popupLayer = createEl("div", "popup-layer");
    toastLayer = createEl("div", "toast-layer");
    shadow.append(btnLayer, overlayLayer, popupLayer, toastLayer);

    btn = createEl("button", "scan-btn");
    btn.type = "button";
    btn.setAttribute("aria-label", t("scanButtonTitle", undefined, "识别此图片中的二维码"));
    btn.setAttribute("aria-hidden", "true");
    btn.title = t("scanButtonTitle", undefined, "识别此图片中的二维码");
    btn.innerHTML = BUTTON_ICON;
    for (const type of ["pointerdown", "mousedown", "mouseup", "pointerup", "dblclick", "contextmenu"]) {
      btn.addEventListener(type, (e) => e.stopPropagation());
    }
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const target = state.candidate;
      if (!target || state.scan !== "idle") return;
      startScan(target);
    });
    btnLayer.appendChild(btn);

    (document.documentElement || document.body || document).appendChild(host);
    applySettings();
  }

  function applySettings() {
    if (!btn) return;
    btn.style.setProperty("--hayakode-btn-opacity", String(state.settings.buttonOpacity));
  }

  function setButtonLoading(loading) {
    if (!btn) return;
    btn.classList.toggle("is-loading", !!loading);
    if (loading) btn.setAttribute("disabled", "");
    else btn.removeAttribute("disabled");
    btn.setAttribute("aria-busy", loading ? "true" : "false");
  }

  function hideUIForCapture() {
    if (host) host.style.setProperty("display", "none", "important");
  }

  function restoreUIAfterCapture() {
    if (host) host.style.removeProperty("display");
  }

  // -------------------------------------------------------------------------
  // Target discovery.
  // -------------------------------------------------------------------------
  function findImageCandidate(target) {
    if (!target || target.nodeType !== 1) return null;
    if (target === host) return null;
    if (target.tagName === "IMG") return target;
    let el = target;
    for (let depth = 0; el && el.nodeType === 1 && depth < 5; depth++, el = el.parentElement) {
      if (el === host || el === document.documentElement) return null;
      let cs;
      try {
        cs = getComputedStyle(el);
      } catch (_) {
        return null;
      }
      if (cs.display === "none" || cs.visibility === "hidden") return null;
      if (cs.backgroundImage && cs.backgroundImage !== "none" && cs.backgroundImage.indexOf("url(") !== -1) {
        return el;
      }
    }
    return null;
  }

  // The display threshold is judged in **device pixels**: CSS short side ×
  // 设备像素比。浏览器缩放只提升 devicePixelRatio、不改变 CSS 尺寸，按设备
  // 像素判断才能覆盖“用户放大页面后二维码已可识别、按钮应出现”的场景。
  function deviceShortSide(rect) {
    const dpr = window.devicePixelRatio || 1;
    return Math.min(rect.width, rect.height) * dpr;
  }

  function qualify(el) {
    if (!el || !el.isConnected) return null;
    let r;
    try {
      r = el.getBoundingClientRect();
    } catch (_) {
      return null;
    }
    if (r.width <= 0 || r.height <= 0) return null;
    if (deviceShortSide(r) < state.settings.minShortSide) return null;
    let cs;
    try {
      cs = getComputedStyle(el);
    } catch (_) {
      return null;
    }
    if (cs.display === "none" || cs.visibility === "hidden" || cs.visibility === "collapse") return null;
    if (parseFloat(cs.opacity) === 0) return null;
    const vx0 = Math.max(0, r.left);
    const vy0 = Math.max(0, r.top);
    const vx1 = Math.min(window.innerWidth, r.right);
    const vy1 = Math.min(window.innerHeight, r.bottom);
    if (vx1 - vx0 < 24 || vy1 - vy0 < 24) return null;
    return r;
  }

  function largestVisibleImage() {
    let best = null;
    let bestArea = 0;
    for (const img of Array.from(document.images || [])) {
      const r = qualify(img);
      if (!r) continue;
      const area = r.width * r.height;
      if (area > bestArea) {
        bestArea = area;
        best = img;
      }
    }
    return best;
  }

  // -------------------------------------------------------------------------
  // Button show/hide/position.
  // -------------------------------------------------------------------------
  function positionButton() {
    if (!btn || !state.buttonVisible || !state.candidate || !state.candidate.isConnected) return;
    const r = state.candidate.getBoundingClientRect();
    let left = r.right - BUTTON_INSET - BUTTON_SIZE;
    let top = r.bottom - BUTTON_INSET - BUTTON_SIZE;
    left = Math.min(Math.max(4, left), Math.max(4, window.innerWidth - BUTTON_SIZE - 4));
    top = Math.min(Math.max(4, top), Math.max(4, window.innerHeight - BUTTON_SIZE - 4));
    btn.style.left = Math.round(left) + "px";
    btn.style.top = Math.round(top) + "px";
  }

  function showButton(el) {
    ensureUI();
    state.candidate = el;
    state.buttonVisible = true;
    applySettings();
    btn.classList.add("is-visible");
    btn.style.pointerEvents = "auto";
    btn.removeAttribute("aria-hidden");
    positionButton();
    observeCandidate();
  }

  function hideButton() {
    state.buttonVisible = false;
    state.candidate = null;
    if (btn) {
      btn.classList.remove("is-visible");
      btn.style.pointerEvents = "none";
      btn.setAttribute("aria-hidden", "true");
    }
    disconnectObservers();
  }

  function observeCandidate() {
    disconnectObservers();
    if (!state.candidate) return;
    try {
      state.ro = new ResizeObserver(() => {
        if (!state.candidate) return;
        if (!qualify(state.candidate)) hideButton();
        else positionButton();
      });
      state.ro.observe(state.candidate);
    } catch (_) {
      state.ro = null;
    }
    try {
      // Only alive while the button is visible, so SPA/route swaps clean up.
      state.mo = new MutationObserver(() => {
        if (!state.candidate || !state.candidate.isConnected) hideButton();
      });
      state.mo.observe(document.documentElement, { childList: true, subtree: true });
    } catch (_) {
      state.mo = null;
    }
  }

  function disconnectObservers() {
    if (state.ro) {
      try {
        state.ro.disconnect();
      } catch (_) {}
      state.ro = null;
    }
    if (state.mo) {
      try {
        state.mo.disconnect();
      } catch (_) {}
      state.mo = null;
    }
  }

  // -------------------------------------------------------------------------
  // Pointer tracking (event-driven, rAF-throttled; no polling).
  // -------------------------------------------------------------------------
  let pendingPoint = null;
  let pointRaf = false;

  function onMouseMove(e) {
    pendingPoint = { target: e.target };
    if (pointRaf) return;
    pointRaf = true;
    requestAnimationFrame(processPoint);
  }

  function processPoint() {
    pointRaf = false;
    const p = pendingPoint;
    pendingPoint = null;
    if (!p || state.scan !== "idle") return;
    if (p.target === host) return; // pointer is over our own UI
    const found = findImageCandidate(p.target);
    if (found) {
      const r = qualify(found);
      if (r) {
        if (found !== state.candidate) showButton(found);
        else positionButton();
        return;
      }
    }
    if (!alwaysShowActive() && state.buttonVisible) hideButton();
  }

  // -------------------------------------------------------------------------
  // Right-click menu entry.
  //
  // The native context menu is registered for images only, and the menu click
  // in the background carries no DOM element. Record the right-clicked image
  // here (at contextmenu time) so the later menu command can reuse the exact
  // same rendered-pixel capture flow. Never use the menu's srcUrl to reload
  // the image.
  // -------------------------------------------------------------------------
  function onContextMenu(e) {
    const target = e && e.target && e.target.nodeType === 1 ? e.target : null;
    const found = target ? findImageCandidate(target) : null;
    if (found && found.isConnected) {
      state.contextImage = found;
      if (host) host.dataset.hayakodeContextTarget = found.id || found.tagName.toLowerCase();
    } else {
      state.contextImage = null;
      if (host) host.dataset.hayakodeContextTarget = "";
    }
  }

  // -------------------------------------------------------------------------
  // Viewport changes: reposition everything; no layout thrash on idle.
  // -------------------------------------------------------------------------
  let viewportRaf = false;

  function onViewportChange() {
    if (viewportRaf) return;
    viewportRaf = true;
    requestAnimationFrame(() => {
      viewportRaf = false;
      if (state.buttonVisible) {
        if (!state.candidate || !state.candidate.isConnected || !qualify(state.candidate)) hideButton();
        else positionButton();
      }
      if (state.selection) positionSelection();
      if (state.popup) positionPopup();
    });
  }

  // -------------------------------------------------------------------------
  // Scan flow.
  // -------------------------------------------------------------------------
  class ScanError extends Error {
    constructor(userMessage, cause) {
      super(userMessage);
      this.userMessage = userMessage;
      this.cause = cause;
    }
  }

  function clampToViewport(r) {
    const x0 = Math.max(0, r.left);
    const y0 = Math.max(0, r.top);
    const x1 = Math.min(window.innerWidth, r.right);
    const y1 = Math.min(window.innerHeight, r.bottom);
    if (x1 - x0 < 8 || y1 - y0 < 8) return null;
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  async function bringIntoView(el) {
    let r = el.getBoundingClientRect();
    const fully = r.top >= 0 && r.left >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight;
    if (!fully) {
      try {
        // "nearest" reveals as much of the element as possible: it fully shows
        // small images and aligns the top edge of images taller than the
        // viewport.
        el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
      } catch (_) {
        try {
          el.scrollIntoView();
        } catch (__) {}
      }
      await nextFrames(2);
      await sleep(70);
      r = el.getBoundingClientRect();
    }
    return { tall: r.height > window.innerHeight - 4 };
  }

  function mapResult(r, cap, scroll) {
    const toPage = (p) => ({
      x: cap.origin.x + p.x / cap.scaleX + scroll.x,
      y: cap.origin.y + p.y / cap.scaleY + scroll.y,
    });
    const pos = r.position;
    return {
      text: r.text,
      format: r.format,
      contentType: r.contentType,
      isInverted: r.isInverted,
      corners: {
        tl: toPage(pos.topLeft),
        tr: toPage(pos.topRight),
        br: toPage(pos.bottomRight),
        bl: toPage(pos.bottomLeft),
      },
    };
  }

  async function startScan(target) {
    if (state.scan !== "idle") return;
    if (!target || !target.isConnected) {
      showToast(t("toastTargetGone", undefined, "目标图片已不可见，请重新悬停后再试"));
      return;
    }
    state.scan = "capturing";
    clearSelection();
    clearPopup();
    ensureUI();
    setButtonLoading(true);
    try {
      const bringInfo = await bringIntoView(target);

      // Hide the extension UI and wait a frame before capturing.
      hideUIForCapture();
      await nextFrames(2);

      const rect = clampToViewport(target.getBoundingClientRect());
      if (!rect) throw new ScanError(t("toastImageTooSmall", undefined, "图片太小，请放大后重试"));

      const scroll = { x: window.scrollX, y: window.scrollY };
      const viewport = { width: window.innerWidth, height: window.innerHeight };

      const cap = await sendMessage({
        type: "HAYAKODE_CAPTURE",
        rect,
        viewport,
        expand: state.settings.expandPx,
      });

      restoreUIAfterCapture();
      setButtonLoading(true);

      if (!cap || !cap.ok) throw new ScanError(t("toastScanFailed", undefined, "识别失败"), cap && cap.error);

      state.scan = "decoding";
      const dec = await sendMessage({
        type: "HAYAKODE_DECODE",
        token: cap.token,
        options: { scanMode: state.settings.scanMode, scanLinear: state.settings.scanLinear },
      });

      if (!dec || !dec.ok) throw new ScanError(t("toastScanFailed", undefined, "识别失败"), dec && dec.error);

      if (!dec.results || dec.results.length === 0) {
        if (bringInfo.tall) {
          showToast(
            t("toastNotFoundTall", undefined, "未识别到二维码。图片未能完整显示，请将图片完整滚动到可见区域后重试")
          );
        } else if (dec.tooSmall) {
          showToast(t("toastImageTooSmall", undefined, "图片太小，请放大后重试"));
        } else {
          showToast(t("toastNotFound", undefined, "未识别到二维码。若二维码较小，请先放大图片后再识别"));
        }
        return;
      }

      const mapped = sortSpatially(dec.results.map((r) => mapResult(r, cap, scroll)));
      if (mapped.length === 1) showPopup(mapped[0], target);
      else showSelection(mapped, target);
    } catch (err) {
      restoreUIAfterCapture();
      if (host && (err.cause || !(err instanceof ScanError))) {
        host.dataset.hayakodeLastError = String(err.cause || (err && (err.stack || err.message)) || err);
      }
      const msg = err && err.userMessage ? err.userMessage : t("toastScanFailed", undefined, "识别失败");
      showToast(msg);
    } finally {
      setButtonLoading(false);
      state.scan = "idle";
      if (state.candidate && state.candidate.isConnected) positionButton();
    }
  }

  // -------------------------------------------------------------------------
  // Multi-code selection.
  // -------------------------------------------------------------------------
  function cornersToPageBBox(corners) {
    const xs = [corners.tl.x, corners.tr.x, corners.br.x, corners.bl.x];
    const ys = [corners.tl.y, corners.tr.y, corners.br.y, corners.bl.y];
    const left = Math.min.apply(null, xs);
    const top = Math.min.apply(null, ys);
    const right = Math.max.apply(null, xs);
    const bottom = Math.max.apply(null, ys);
    return { left, top, width: Math.max(12, right - left), height: Math.max(12, bottom - top) };
  }

  function cornersCenter(corners) {
    return {
      x: (corners.tl.x + corners.tr.x + corners.br.x + corners.bl.x) / 4,
      y: (corners.tl.y + corners.tr.y + corners.br.y + corners.bl.y) / 4,
    };
  }

  // 编号按视觉顺序（先行后列）排列，使“第 2 个编号框”就是第二个码。
  function sortSpatially(items) {
    if (items.length < 2) return items;
    const heights = items
      .map((it) => cornersToPageBBox(it.corners).height)
      .sort((a, b) => a - b);
    const medH = heights[Math.floor(heights.length / 2)] || 1;
    const tol = Math.max(8, medH * 0.6);
    return items.slice().sort((a, b) => {
      const ca = cornersCenter(a.corners);
      const cb = cornersCenter(b.corners);
      if (Math.abs(ca.y - cb.y) > tol) return ca.y - cb.y;
      return ca.x - cb.x;
    });
  }

  function findBadgeOffset(box, placed) {
    let ox = 0;
    let oy = 0;
    for (let guard = 0; guard < 8; guard++) {
      const cand = { left: box.left + ox, top: box.top + oy, right: box.left + ox + 20, bottom: box.top + oy + 20 };
      const hit = placed.some(
        (p) =>
          p.badgeX < cand.right &&
          p.badgeX + 20 > cand.left &&
          p.badgeY < cand.bottom &&
          p.badgeY + 20 > cand.top
      );
      if (!hit) break;
      ox += 22;
      if (ox > 66) {
        ox = 0;
        oy -= 22;
      }
    }
    return { x: ox, y: oy };
  }

  function showSelection(results, anchorEl) {
    ensureUI();
    clearSelection();
    const anchorPageRect = anchorEl && anchorEl.isConnected ? toPageRect(anchorEl.getBoundingClientRect()) : null;

    const backdrop = createEl("div", "sel-backdrop");
    backdrop.addEventListener("click", (e) => {
      e.stopPropagation();
      clearSelection();
    });
    overlayLayer.appendChild(backdrop);

    const items = [];
    const placed = [];
    results.forEach((r, i) => {
      const pageBBox = cornersToPageBBox(r.corners);
      const box = createEl("div", "sel-box");
      box.tabIndex = 0;
      box.setAttribute("role", "button");
      box.setAttribute("aria-label", t("selectionItemAria", [String(i + 1)], "第 " + (i + 1) + " 个二维码"));
      const badgeOffset = findBadgeOffset(pageBBox, placed);
      placed.push({ badgeX: pageBBox.left + badgeOffset.x, badgeY: pageBBox.top + badgeOffset.y });
      const num = createEl("span", "sel-num", String(i + 1));
      box.appendChild(num);
      const activate = (e) => {
        e.stopPropagation();
        clearSelection();
        showPopup(r, anchorEl);
      };
      box.addEventListener("click", activate);
      box.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate(e);
        }
      });
      box.addEventListener("mouseenter", () => box.classList.add("is-hot"));
      box.addEventListener("mouseleave", () => box.classList.remove("is-hot"));
      overlayLayer.appendChild(box);
      items.push({ result: r, boxEl: box, pageBBox, badgeOffset });
    });

    state.selection = { items, anchorPageRect };
    positionSelection();
    const first = items[0] && items[0].boxEl;
    if (first) {
      try {
        first.focus({ preventScroll: true });
      } catch (_) {}
    }
  }

  function positionSelection() {
    if (!state.selection) return;
    const sx = window.scrollX;
    const sy = window.scrollY;
    for (const item of state.selection.items) {
      const b = item.pageBBox;
      const el = item.boxEl;
      el.style.left = Math.round(b.left - sx) + "px";
      el.style.top = Math.round(b.top - sy) + "px";
      el.style.width = Math.round(b.width) + "px";
      el.style.height = Math.round(b.height) + "px";
      const badge = el.firstChild;
      if (badge) {
        badge.style.transform =
          "translate(calc(-50% + " + item.badgeOffset.x + "px), calc(-50% + " + item.badgeOffset.y + "px))";
      }
    }
  }

  function clearSelection() {
    if (!state.selection) return;
    for (const item of state.selection.items) {
      try {
        item.boxEl.remove();
      } catch (_) {}
    }
    const backdrop = overlayLayer && overlayLayer.querySelector(".sel-backdrop");
    if (backdrop) backdrop.remove();
    state.selection = null;
  }

  // -------------------------------------------------------------------------
  // Result popup.
  // -------------------------------------------------------------------------
  function tagChip(text) {
    return createEl("span", "chip", text);
  }

  function actionButton(kind, label, onClick) {
    const b = createEl("button", kind === "primary" ? "primary-btn" : "ghost-btn", label);
    b.type = "button";
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      onClick(b);
    });
    return b;
  }

  function showPopup(result, anchorEl) {
    ensureUI();
    clearPopup();
    const info = analyzeText(result.text);
    const anchorPageRect = anchorEl && anchorEl.isConnected ? toPageRect(anchorEl.getBoundingClientRect()) : null;

    const popup = createEl("div", "popup");
    popup.setAttribute("role", "dialog");
    popup.setAttribute("aria-label", t("popupAria", undefined, "二维码识别结果"));
    popup.tabIndex = -1;

    const header = createEl("div", "popup-header");
    header.appendChild(createEl("div", "popup-title", t("popupTitle", undefined, "识别结果")));
    const close = createEl("button", "icon-btn", "×");
    close.type = "button";
    close.setAttribute("aria-label", t("close", undefined, "关闭"));
    close.addEventListener("click", (e) => {
      e.stopPropagation();
      clearPopup();
    });
    header.appendChild(close);

    const tags = createEl("div", "popup-tags");
    tags.appendChild(tagChip(formatLabel(result.format)));
    tags.appendChild(tagChip(contentTypeLabel(result.contentType)));
    if (result.isInverted) tags.appendChild(tagChip(t("chipInverted", undefined, "反色")));

    const body = createEl("pre", "popup-text", result.text);

    popup.append(header, tags, body);

    const actions = createEl("div", "popup-actions");

    if (info.isHttp && info.url) {
      // Show the full domain plus open + copy actions.
      popup.appendChild(createEl("div", "popup-domain", t("popupDomainLabel", undefined, "域名：") + info.url.host));
      actions.appendChild(
        actionButton("primary", t("openInNewTab", undefined, "在新标签页打开"), async () => {
          const resp = await sendMessage({ type: "HAYAKODE_OPEN_URL", url: info.trimmed });
          if (!resp || !resp.ok) showToast(t("toastOpenFailed", undefined, "打开失败"));
          else clearPopup();
        })
      );
      actions.appendChild(
        actionButton("ghost", t("copyLink", undefined, "复制链接"), async (b) => {
          const ok = await copyText(info.text);
          b.textContent = ok ? t("copied", undefined, "已复制") : t("copyFailed", undefined, "复制失败");
          setTimeout(() => {
            if (b.isConnected) b.textContent = t("copyLink", undefined, "复制链接");
          }, 1500);
        })
      );
    } else if (info.dangerous) {
      // Dangerous protocols are only displayed, never given an open action.
      popup.appendChild(
        createEl(
          "div",
          "popup-warn",
          t("dangerousWarning", [String(info.scheme)], "⚠ 该内容使用了危险协议（" + info.scheme + "），已禁止打开。")
        )
      );
      actions.appendChild(
        actionButton("ghost", t("copy", undefined, "复制"), async (b) => {
          const ok = await copyText(info.text);
          b.textContent = ok ? t("copied", undefined, "已复制") : t("copyFailed", undefined, "复制失败");
          setTimeout(() => {
            if (b.isConnected) b.textContent = t("copy", undefined, "复制");
          }, 1500);
        })
      );
    } else {
      actions.appendChild(
        actionButton("ghost", t("copy", undefined, "复制"), async (b) => {
          const ok = await copyText(info.text);
          b.textContent = ok ? t("copied", undefined, "已复制") : t("copyFailed", undefined, "复制失败");
          setTimeout(() => {
            if (b.isConnected) b.textContent = t("copy", undefined, "复制");
          }, 1500);
        })
      );
    }

    popup.appendChild(actions);
    popupLayer.appendChild(popup);

    state.popup = { el: popup, result, anchorPageRect, info };
    positionPopup();
    requestAnimationFrame(() => {
      try {
        popup.focus({ preventScroll: true });
      } catch (_) {}
    });
  }

  function positionPopup() {
    if (!state.popup) return;
    const popup = state.popup.el;
    let rect;
    try {
      rect = popup.getBoundingClientRect();
    } catch (_) {
      return;
    }
    const pw = rect.width || 340;
    const ph = rect.height || 180;
    const margin = 8;
    const gap = 8;
    let left;
    let top;
    const anchor = state.popup.anchorPageRect;
    if (anchor) {
      const ar = {
        left: anchor.left - window.scrollX,
        top: anchor.top - window.scrollY,
        width: anchor.width,
        height: anchor.height,
      };
      left = Math.min(Math.max(margin, ar.left), Math.max(margin, window.innerWidth - pw - margin));
      top = ar.top + ar.height + gap;
      if (top + ph > window.innerHeight - margin) {
        const above = ar.top - ph - gap;
        top = above >= margin ? above : Math.max(margin, Math.min(window.innerHeight - ph - margin, top));
      }
    } else {
      left = Math.max(margin, (window.innerWidth - pw) / 2);
      top = Math.max(margin, (window.innerHeight - ph) / 3);
    }
    popup.style.left = Math.round(left) + "px";
    popup.style.top = Math.round(top) + "px";
  }

  function clearPopup() {
    if (!state.popup) return;
    try {
      state.popup.el.remove();
    } catch (_) {}
    state.popup = null;
  }

  // -------------------------------------------------------------------------
  // Failure / feedback toast.
  // -------------------------------------------------------------------------
  function showToast(message) {
    ensureUI();
    clearToast();
    const t = createEl("div", "toast");
    t.setAttribute("role", "status");
    t.appendChild(createEl("div", "toast-msg", message));
    const close = createEl("button", "icon-btn toast-close", "×");
    close.type = "button";
    close.setAttribute("aria-label", t("closeToast", undefined, "关闭提示"));
    close.addEventListener("click", (e) => {
      e.stopPropagation();
      clearToast();
    });
    t.appendChild(close);
    toastLayer.appendChild(t);
    const timer = setTimeout(() => {
      if (state.toast && state.toast.el === t) clearToast();
    }, 3000);
    state.toast = { el: t, timer };
  }

  function clearToast() {
    if (!state.toast) return;
    clearTimeout(state.toast.timer);
    try {
      state.toast.el.remove();
    } catch (_) {}
    state.toast = null;
  }

  function clearAllUI() {
    clearSelection();
    clearPopup();
    clearToast();
    hideButton();
  }

  // -------------------------------------------------------------------------
  // Global listeners.
  // -------------------------------------------------------------------------
  function onKeyDown(e) {
    if (e.key !== "Escape") return;
    if (state.selection) {
      clearSelection();
      e.stopPropagation();
    } else if (state.popup) {
      clearPopup();
      e.stopPropagation();
    } else if (state.toast) {
      clearToast();
    }
  }

  function onDocMouseDown(e) {
    if (!state.popup) return;
    const path = typeof e.composedPath === "function" ? e.composedPath() : [];
    if (path.indexOf(host) === -1) clearPopup();
  }

  function onNavigate() {
    clearAllUI();
  }

  function onStorageChanged(changes, area) {
    if (area !== "local") return;
    let touched = false;
    for (const key of Object.keys(DEFAULTS)) {
      if (changes[key]) {
        state.settings[key] = changes[key].newValue;
        touched = true;
      }
    }
    if (!touched) return;
    applySettings();
    if (state.buttonVisible) {
      if (!alwaysShowActive() && !state.candidate) hideButton();
      else positionButton();
    }
  }

  // Shared entry resolver: right-click prefers the recorded image; the
  // toolbar icon entry keeps its original "hovered candidate, else largest
  // visible image" behaviour.
  function runEntryPoint(source) {
    const preferContext = source === "context-menu";
    let target = null;
    if (preferContext && state.contextImage && state.contextImage.isConnected) {
      target = state.contextImage;
    } else if (state.candidate && state.candidate.isConnected) {
      target = state.candidate;
    } else {
      target = largestVisibleImage();
    }
    if (!target) {
      showToast(
        preferContext
          ? t("toastNoImageContext", undefined, "未找到可识别的图片，请在图片上右键后重试")
          : t("toastNoImageToolbar", undefined, "未找到可识别的图片，请先将鼠标悬停在图片上再点击扩展图标")
      );
      return false;
    }
    if (state.scan !== "idle") return true;
    startScan(target);
    return true;
  }

  function onRuntimeMessage(msg, sender, sendResponse) {
    if (msg && msg.type === "HAYAKODE_CONTEXT_MENU") {
      sendResponse({ ok: runEntryPoint("context-menu") });
      return true;
    }
    if (msg && msg.type === "HAYAKODE_TOOLBAR_ENTRY") {
      sendResponse({ ok: runEntryPoint("toolbar") });
      return true;
    }
    return false;
  }

  function installListeners() {
    // Diagnostics surface for the self-test harness.
    window.addEventListener("error", (e) => {
      try {
        if (host) host.dataset.hayakodeLastError = String((e && e.message) || (e && e.error) || e);
      } catch (_) {}
    });
    window.addEventListener("unhandledrejection", (e) => {
      try {
        if (host) {
          host.dataset.hayakodeLastError =
            "unhandledrejection: " + String((e && e.reason && e.reason.message) || (e && e.reason) || e);
        }
      } catch (_) {}
    });
    document.addEventListener("mousemove", onMouseMove, { capture: true, passive: true });
    document.addEventListener("contextmenu", onContextMenu, { capture: true, passive: true });
    window.addEventListener("scroll", onViewportChange, { capture: true, passive: true });
    window.addEventListener("resize", onViewportChange, { passive: true });
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("mousedown", onDocMouseDown, true);
    window.addEventListener("popstate", onNavigate);
    window.addEventListener("hashchange", onNavigate);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) clearAllUI();
    });
    window.addEventListener(
      "mouseout",
      (e) => {
        if (!e.relatedTarget && !alwaysShowActive()) hideButton();
      },
      true
    );
    chrome.runtime.onMessage.addListener(onRuntimeMessage);
    chrome.storage.onChanged.addListener(onStorageChanged);
  }

  // -------------------------------------------------------------------------
  // Boot.
  // -------------------------------------------------------------------------
  async function loadSettings() {
    try {
      const stored = await chrome.storage.local.get(DEFAULTS);
      state.settings = { ...DEFAULTS, ...stored };
    } catch (_) {
      state.settings = { ...DEFAULTS };
    }
  }

  async function boot() {
    await loadSettings();
    ensureUI();
    installListeners();
  }

  boot();
})();
