# Hayakode QR Scanner

**English | [简体中文](README.zh-CN.md)**

A **Manifest V3** browser extension (one codebase for both Chrome and Edge) that shows a floating scan button on the bottom-right corner of any web page image. Clicking it recognizes the **exact pixels the image is rendered with on screen at that moment** (a screenshot of the rendered image), not the original image file.

- **100% local recognition**: the ZXing-C++ WebAssembly engine is bundled under `vendor/`, and the extension **makes no network request at all**.
- **Distorted QR codes supported**: perspective skew, rotation, non-uniform stretching, inverted colors, low contrast / slight blur, and logo occlusion.
- **Multiple codes per image**: numbered boxes are drawn on the image so you can pick the one you want.
- **Link results** offer **Open in new tab** (only for `http` / `https`; dangerous protocols are never given an open action).

Current version: **1.1.1**.

---

## Features

- **Rendered-pixel recognition** — scans what the page actually displays (including browser zoom and non-uniform CSS scaling), not the remote image file.
- **Distorted QR codes** — rotation, perspective, stretch, inversion, low contrast, blur and logo occlusion are tolerated in the default "Thorough" mode.
- **Multi-code selection** — when an image contains several codes, numbered selection boxes let you choose.
- **Fully offline & private** — no CDN, no upload, no telemetry, no analytics; the engine ships inside the package.
- **Chrome and Edge** — a single unpacked folder works in both browsers.
- **Context-menu and toolbar entry points** — right-click an image, or hover it and click the toolbar icon.
- **No build step** — plain HTML/CSS/JS; unpack and load.

---

## Installation (load unpacked)

1. Open the extensions page:
   - **Chrome**: type `chrome://extensions` in the address bar.
   - **Edge**: type `edge://extensions` in the address bar.
2. Turn on **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select **the folder that contains `manifest.json`** (the extension root).
4. After installing, open the extension's **Options** page (extension card → Details → Extension options) to review the settings.
5. To use it on local `file://` pages, enable **Allow access to file URLs** on the extension details page.

> No npm, no build, no CDN: unpack the folder and load it.

---

## Usage

1. Move the mouse over an image on a web page (`<img>` / `<picture>` / elements with a CSS background image). A 32×32 floating scan button appears at the image's bottom-right corner.
2. Click the button. The extension will:
   - hide its own UI and wait a frame, then capture the visible viewport (so the button and overlay never end up in the picture);
   - convert by device pixel ratio and crop the rendered pixels that correspond to the target image;
   - recognize them in the background context with the local WASM engine.
3. Result:
   - **One code found** → a result dialog appears (content, barcode format, content type; links show the full domain and offer **Open in new tab** / **Copy link**; plain text offers **Copy**; dangerous protocols are only displayed with a warning).
   - **Two or more codes found** → an overlay with numbered boxes (numbered in visual order) appears; click any box to see that code's result, or press `ESC` / click the empty overlay to cancel.
   - **Nothing found** → a toast is shown: `No QR code recognized. If the code is small, zoom in on the image and try again`. Images that are too small show `The image is too small. Zoom in and try again.` Images taller than the viewport ask you to scroll the whole image into view.
4. **Context-menu entry**: right-click an image → **"Scan QR code here"**. The item appears only on images and runs the **exact same** flow as the floating button (capture rendered pixels → local recognition → single-code dialog / multi-code selection); it **never** reloads the image URL.
5. **Toolbar icon entry**: if the context menu is unavailable, hover the target image first and then click the Hayakode icon in the toolbar.

---

## Settings (extension options page)

Settings are stored in `chrome.storage.local` and apply immediately.

| Setting | Default | Description |
| --- | --- | --- |
| Floating button threshold (visual size, CSS pixels) | `64` | The button appears only when the image's rendered short side in **CSS pixels** is at least this value. It is a **visual-size** check, so it is independent of screen zoom and device pixel ratio. Adjustable from 32 to 200. |
| Always show button | Off | When on, the button does not depend on hovering and stays on the most recently hovered image; touch devices always show it. |
| Button opacity | `0.6` | Opacity of the floating button when it is not hovered. |
| Recognition effort | Thorough | `Thorough` = `tryHarder` + rotation + inversion + downscale; `Fast` = quicker but less tolerant. |
| Scan 1D barcodes | Off | By default only QR codes are scanned to avoid false positives. |
| Recognition area padding | `8` | Extra pixels added around the image to preserve the QR code quiet zone. |

> **Why CSS pixels (visual size)?** The threshold decides only **whether the floating button appears**, and it follows what the user actually sees: the image's rendered short side in CSS pixels. A high-DPI screen no longer lowers the bar — a 40px icon stays below the default 64px threshold at any device pixel ratio, so the button does not clutter small icons that cannot contain a QR code. The deliberate trade-off is that zooming the page (Ctrl +) no longer makes a too-small image show the button; such images can still be scanned through the **right-click menu entry**, which is not gated by this threshold. Device pixels are still what the capture/crop/decode path uses, so recognition itself is unchanged.

---

## Permissions

| Permission | Why it is needed |
| --- | --- |
| `host_permissions: <all_urls>` | Inject the floating button into any web page and call the visible-viewport capture API. Clicking an in-page button does **not** grant `activeTab`, so `<all_urls>` is required. |
| `permissions: storage` | Save the settings above. |
| `permissions: contextMenus` | Register the right-click entry "Scan QR code here" (only shown on images). |

No `tabs`, `webRequest`, `cookies`, `history`, `clipboardRead`, `offscreen`, or any other redundant permission is requested.

`manifest.json` explicitly declares a CSP to enable WebAssembly:

```json
"content_security_policy": {
  "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
}
```

---

## Privacy

- The recognition engine (JS + `.wasm`, about 1.1 MB) is bundled in `vendor/zxing-wasm/` — **no CDN is loaded**.
- The extension makes no network requests: it does not upload images or results, and has no telemetry or analytics.
- Screenshots and cropping happen in the background service worker with `OffscreenCanvas` (no `offscreen` permission required).
- The engine's default remote `locateFile` has been rewritten to a local resource, with an additional local-resource allow-list (only `chrome-extension:` / `file:` / `data:` / `blob:`); the WASM is injected directly as `wasmBinary`, so under normal paths no fetch ever happens.
- Only the extension's own nodes are appended to the page (a single `hayakode-ext-*` namespace isolated with Shadow DOM); the page's existing structure is never modified.

---

## Technical notes

| Item | Details |
| --- | --- |
| Extension platform | Manifest V3, Chrome / Edge, minimum Chrome 96 |
| Background | module service worker (`src/background/service-worker.js`) |
| Engine | `zxing-wasm` (ZXing-C++ compiled to WebAssembly, reader build), version `3.1.3`, ZXing-C++ commit `a17fd9dc65d6aa0dd2f660fdfca7a6a6613d938f` |
| Engine license | MIT (see `vendor/zxing-wasm/LICENSE`); ZXing-C++ is Apache-2.0 |
| Capture | `chrome.tabs.captureVisibleTab` + `OffscreenCanvas` cropping at the real device-pixel scale |
| WASM under MV3 | requires `'wasm-unsafe-eval'` in `content_security_policy.extension_pages`; the wasm bytes are passed in as `wasmBinary` from the packaged file |
| Localization | Chrome standard i18n (`_locales/en`, `_locales/zh_CN`; `default_locale` is `en`) |

### Project structure

```
extension-root/
├── manifest.json                 # MV3 manifest (permissions / CSP / content script / background / options / icons)
├── _locales/
│   ├── en/messages.json          # default_locale strings (English)
│   └── zh_CN/messages.json       # Simplified Chinese strings
├── src/
│   ├── content/content.js        # in-page UI and coordinate math (button, overlay, numbered boxes, result dialog, toasts)
│   ├── background/
│   │   ├── service-worker.js     # capture dispatch, DPR-aware cropping, message routing, safe link opening
│   │   └── engine.js             # local WASM engine wrapper (multi-code + corner coordinates)
│   └── options/                  # options page (the six settings)
├── vendor/zxing-wasm/            # bundled recognition engine (JS + WASM + LICENSE)
├── icons/                        # extension icons 16/32/48/128
├── assets/donate/                # donation QR codes (voluntarily published by the author)
├── README.md
└── README.zh-CN.md
```

---

## Development & build

There is **no build step**. The extension is plain HTML/CSS/JavaScript and runs directly from the source tree:

1. Edit files under `src/` (or `manifest.json` / `_locales/`).
2. Open `chrome://extensions` (or `edge://extensions`) and click **Reload** on the extension card.
3. Reload the web page you are testing.

To verify that the packaged WASM still loads under the declared CSP, load the unpacked folder and check the service worker console for CSP or WebAssembly errors.

---

## Known limitations

- Firefox / Safari are not supported (different manifest and API surface).
- Mobile Chrome is not supported (it has no extensions).
- Images inside cross-origin iframes are not injected in this release (`all_frames: false`).
- Recognition input is "rendered pixels", so a very small original image may fail at 1× — zoom in first; images below the threshold can still be scanned through the context-menu entry.
- The display threshold uses **visual size (CSS pixels)**: it is independent of screen zoom and device pixel ratio, so a very small image shows no floating button even on a high-DPI screen or after zooming. Use the context-menu entry to scan images below the threshold.
- 1D barcodes are off by default and can be enabled in the settings.

---

## Acknowledgements

This project is built on the work of upstream open-source projects. See [THANKS](THANKS) for the full list.

- **zxing-wasm** ([Sec-ant/zxing-wasm](https://github.com/Sec-ant/zxing-wasm)) — WebAssembly bindings for ZXing-C++ (MIT, by Ze-Zheng Wu); license bundled at `vendor/zxing-wasm/LICENSE`.
- **ZXing-C++** ([zxing-cpp/zxing-cpp](https://github.com/zxing-cpp/zxing-cpp)) — the barcode recognition core (Apache-2.0).

---

## Donations / 捐赠与赞助

**Buy me some tokens. ⚡**

Hayakode QR Scanner is completely free and open source. If you find it useful, feel free to scan and support the author — every token counts, and it all goes back into making this project better.
Hayakode QR Scanner 完全免费开源。如果你觉得它有用，欢迎扫码支持作者继续开发——每一份心意都会变成更多的 token，变成更好的功能。

| WeChat Pay / 微信支付 | Alipay / 支付宝 |
|---|---|
| ![WeChat Pay](assets/donate/wechat.png) | ![Alipay](assets/donate/alipay.jpg) |

> **Important Notice / 重要声明**: Donations are a gesture of support and **do NOT constitute a commercial license**. Any commercial use still requires a written license agreement from the author via [GitHub Issues](https://github.com/drliuhuan/hayakode/issues).
> 捐赠是对开发的支持，**不代表商业授权**。任何商业使用仍须通过 [GitHub Issues](https://github.com/drliuhuan/hayakode/issues) 联系作者签署书面授权协议。

---

## Contributors / 贡献者

- **DeepSeek** — LLM inference model / 推理模型
- **DeepSeek Harness** — code implementation / 代码实现
- **drliuhuan** — project initiator, product design, requirements, testing / 项目发起人、产品设计、需求定义、测试验证
- **Hermes** — requirements, architecture, independent acceptance (browser testing), packaging & release / 需求文档、架构方案、独立验收（浏览器实测）、打包与发布

See also [AUTHORS](AUTHORS).

---

## License

Code and repository content are governed by the **PolyForm Noncommercial License 1.0.0** (see [LICENSE](LICENSE)):

- **Non-commercial use is completely free**: personal, educational, charitable and public institutions may freely use, copy, modify and redistribute.
- **Commercial use requires the author's prior written permission.**
- A Chinese summary is at the top of [LICENSE](LICENSE).

**Bundled third-party components keep their own licenses**: `vendor/zxing-wasm/` is **MIT** (see `vendor/zxing-wasm/LICENSE`), and its upstream ZXing-C++ is **Apache-2.0**. Upstream copyright notices must be retained.
