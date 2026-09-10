# Hayakode极速二维码识别

**[English](README.md) | 简体中文**

一个 **Manifest V3** 浏览器扩展（Chrome / Edge 通用，同一份代码零改动）：在任意网页图片的右下角显示悬浮扫码按钮，点击后识别**点击时刻该图片在屏幕上的渲染像素**（截图），而不是图片原文件。

- 识别 **100% 本地完成**：内置 ZXing-C++ 的 WebAssembly 引擎（`vendor/`），扩展**不发起任何网络请求**。
- 支持**形变二维码**：透视畸变、旋转、非等比拉伸、反色、低对比度 / 轻微模糊、带 logo 遮挡。
- **一图多码**：在图片上绘制编号框，由用户点选具体要哪一个。
- 结果为链接时提供**在新标签页打开**（仅 `http` / `https`；危险协议不提供打开入口）。

---

## 特性

- **识别渲染像素** —— 识别页面实际显示的内容（包含浏览器缩放与非等比 CSS 拉伸），而非远程图片文件。
- **支持形变二维码** —— 默认「尽力」模式下可容忍旋转、透视、拉伸、反色、低对比度、模糊与 logo 遮挡。
- **一图多码点选** —— 一张图包含多个码时，通过编号框点选目标。
- **完全离线、保护隐私** —— 无 CDN、不上传、无遥测、无统计；引擎随扩展包分发。
- **Chrome 与 Edge 通用** —— 同一份解压目录可直接在两种浏览器中加载。
- **右键菜单与工具栏入口** —— 可在图片上右键，或先悬停图片再点击工具栏图标。
- **无构建步骤** —— 纯 HTML/CSS/JS，解压即可加载。

---

## 安装步骤（加载已解压扩展）

1. 打开扩展管理页：
   - **Chrome**：地址栏输入 `chrome://extensions`
   - **Edge**：地址栏输入 `edge://extensions`
2. 打开右上角的 **开发者模式 / 开发人员模式**。
3. 点击 **加载已解压的扩展程序 / 加载解压缩的扩展**，选择**包含 `manifest.json` 的那一层目录**（即本扩展根目录）。
4. 安装后建议打开扩展的**设置页**确认参数（扩展卡片 → 详情 → 扩展程序选项）。
5. 若需要在本地 `file://` 页面上使用，请在扩展详情页打开 **“允许访问文件网址”**。

> 无需 npm、无需构建、无 CDN：目录解压即可加载。

---

## 使用方法

1. 把鼠标移到网页中的图片上（`<img>` / `<picture>` / CSS 背景图元素），图片右下角出现 32×32 的悬浮扫码按钮。
2. 点击按钮，扩展会：
   - 先把插件自身 UI 隐藏并等待一帧，再截取可视区域（避免把按钮/遮罩截进画面）；
   - 按设备像素比换算，裁出目标图片对应的渲染像素；
   - 在扩展后台上下文中用本地 WASM 引擎识别。
3. 结果：
   - **识别到 1 个码** → 弹出结果弹窗（内容、条码格式、内容类型；链接显示完整域名并提供「在新标签页打开」/「复制链接」；纯文本提供「复制」；危险协议只展示并警示）。
   - **识别到 ≥2 个码** → 图片上叠加遮罩与编号框（按视觉顺序编号），点击任意编号框查看该码结果；按 `ESC` 或点击遮罩空白处取消。
   - **未识别到** → 顶部提示：`未识别到二维码。若二维码较小，请先放大图片后再识别`；图片太小提示 `图片太小，请放大后重试`；图片高于视口时提示把图片完整滚动到可见区域。
4. **右键菜单入口**：在网页图片上点右键 → **「识别此处二维码」**。该菜单项只在图片上出现，点击后走与悬浮按钮**完全相同**的识别流程（截取当前渲染像素 → 本地识别 → 单码弹窗 / 多码点选），**不会**重新加载图片 URL。
5. **工具栏图标入口**：若右键菜单也不可用，可先把鼠标悬停在目标图片上，再点击浏览器工具栏中的 Hayakode 图标。

---

## 设置项（扩展选项页）

设置保存在 `chrome.storage.local`，修改即生效。

| 设置项 | 默认值 | 说明 |
| --- | --- | --- |
| 悬浮按钮显示阈值（视觉尺寸，CSS 像素） | `64` | 图片渲染短边（**CSS 像素**）≥ 该值才显示按钮。这是**视觉尺寸**判定，与屏幕缩放、设备像素比无关；可调范围 32–200 |
| 常显按钮 | 关 | 开启后按钮不依赖悬停，停留在最近一次悬停的图片上；触摸设备自动常显 |
| 按钮透明度 | `0.6` | 未悬停时的不透明度 |
| 识别强度 | 尽力 | `尽力` = `tryHarder` + 旋转 + 反色 + 降采样；`快速` = 更快、容错更弱 |
| 识别一维码 | 关 | 默认只识别二维码，避免误报 |
| 识别区域外扩像素 | `8` | 识别区域向四周外扩的像素数，保留二维码静默区 |

> **为什么按 CSS 像素（视觉尺寸）判断？** 该阈值只决定**是否显示悬浮按钮**，口径与用户实际看到的视觉尺寸一致：图片渲染短边（CSS 像素）。高分辨率屏幕不再变相放宽门槛——40px 的小图标在任意设备像素比下都低于默认 64px 阈值，因此不会在小图标（不可能含二维码）上冒出按钮。明确的取舍：用户“放大网页（Ctrl +）”不会让过小的图片出现按钮；这类图片仍可通过**右键菜单入口**识别，该入口不受显示门槛限制。设备像素仍只用于截图、裁剪与解码这条线，识别流程本身不变。

---

## 权限说明

| 权限 | 用途 |
| --- | --- |
| `host_permissions: <all_urls>` | 在任意网页注入悬浮按钮；调用可视区域截图接口。点击页面内按钮**不会**授予 `activeTab`，因此必须使用 `<all_urls>`。 |
| `permissions: storage` | 保存上述设置。 |
| `permissions: contextMenus` | 注册右键菜单入口「识别此处二维码」（仅在图片上出现）。 |

未申请 `tabs`、`webRequest`、`cookies`、`history`、`clipboardRead`、`offscreen` 等任何多余权限。

`manifest.json` 中显式声明 CSP 以启用 WebAssembly：

```json
"content_security_policy": {
  "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
}
```

---

## 隐私声明

- 识别引擎（JS + `.wasm`，约 1.1 MB）随包内置在 `vendor/zxing-wasm/`，**不加载任何 CDN**。
- 扩展不发起任何网络请求：不上传图片、不上传识别结果、无遥测、无统计。
- 截图与裁剪在后台 Service Worker 中用 `OffscreenCanvas` 完成（不依赖 `offscreen` 权限）。
- 引擎默认的远程 `locateFile` 已被改写为本地资源，并额外做了“仅允许 `chrome-extension:` / `file:` / `data:` / `blob:` 协议”的本地资源白名单校验；WASM 以 `wasmBinary` 方式直接注入，正常路径下不会发起任何取用。
- 只向页面追加插件自己的节点（统一 `hayakode-ext-*` 命名空间 + Shadow DOM 隔离），不改动页面原有结构。

---

## 技术说明

| 项目 | 内容 |
| --- | --- |
| 扩展平台 | Manifest V3，Chrome / Edge，最低 Chrome 96 |
| 后台 | module service worker（`src/background/service-worker.js`） |
| 引擎 | `zxing-wasm`（ZXing-C++ 编译为 WebAssembly，reader 构建），版本 `3.1.3`，ZXing-C++ commit `a17fd9dc65d6aa0dd2f660fdfca7a6a6613d938f` |
| 引擎许可 | MIT（见 `vendor/zxing-wasm/LICENSE`）；ZXing-C++ 为 Apache-2.0 |
| 截图 | `chrome.tabs.captureVisibleTab` + `OffscreenCanvas` 按真实设备像素比例裁剪 |
| MV3 下的 WASM | 需要在 `content_security_policy.extension_pages` 中声明 `'wasm-unsafe-eval'`；wasm 字节以 `wasmBinary` 方式从包内文件注入 |
| 双语 | Chrome 标准 i18n（`_locales/en`、`_locales/zh_CN`；`default_locale` 为 `en`） |

### 目录结构

```
扩展根目录/
├── manifest.json                 # MV3 清单（权限 / CSP / 内容脚本 / 后台 / 设置页 / 图标）
├── _locales/
│   ├── en/messages.json          # default_locale 英文文案
│   └── zh_CN/messages.json       # 简体中文文案
├── src/
│   ├── content/content.js        # 页面内 UI 与坐标计算（悬浮按钮、遮罩、编号框、结果弹窗、提示）
│   ├── background/
│   │   ├── service-worker.js     # 截图调度、按 DPR 裁剪、消息路由、安全打开链接
│   │   └── engine.js             # 本地 WASM 引擎封装（多码 + 四角坐标）
│   └── options/                  # 设置页（六项设置）
├── vendor/zxing-wasm/            # 内置识别引擎（JS + WASM + LICENSE，随包分发）
├── icons/                        # 扩展图标 16/32/48/128
├── assets/donate/                # 收款码（作者自愿公开）
├── README.md
└── README.zh-CN.md
```

---

## 开发与构建

**没有构建步骤**。扩展是纯 HTML/CSS/JavaScript，直接从源码目录运行：

1. 修改 `src/`（或 `manifest.json` / `_locales/`）下的文件。
2. 打开 `chrome://extensions`（或 `edge://extensions`），在扩展卡片上点击 **重新加载**。
3. 刷新正在测试的网页。

若要验证打包后的 WASM 在声明的 CSP 下仍能加载，请加载解压目录并检查 Service Worker 控制台是否存在 CSP 或 WebAssembly 报错。

---

## 已知限制

- 不支持 Firefox / Safari（manifest 与 API 体系不同）。
- 不支持移动端 Chrome（不支持扩展）。
- 跨域 iframe 内的图片本期不注入（`all_frames: false`）。
- 识别输入是“渲染像素”，因此极小的原图在 1 倍显示下可能识别失败——请先放大图片再识别；低于阈值的图仍可通过右键菜单入口识别。
- 显示阈值按**视觉尺寸（CSS 像素）**判断：与屏幕缩放、设备像素比无关，因此极小的图片在高分辨率屏幕上或放大后都不会显示悬浮按钮；低于阈值的图请用右键菜单入口识别。
- 一维码默认关闭，可在设置中开启。

---

## 致谢

本项目建立在众多优秀开源项目之上，完整名单见 [THANKS](THANKS)。

- **zxing-wasm**（[Sec-ant/zxing-wasm](https://github.com/Sec-ant/zxing-wasm)）— ZXing-C++ 的 WebAssembly 封装（MIT，作者 Ze-Zheng Wu）；许可证原文随包在 `vendor/zxing-wasm/LICENSE`。
- **ZXing-C++**（[zxing-cpp/zxing-cpp](https://github.com/zxing-cpp/zxing-cpp)）— 条码识别核心库（Apache-2.0）。

---

## 捐赠与赞助 / Donations

**Buy me some tokens. ⚡**

Hayakode QR Scanner 完全免费开源。如果你觉得它有用，欢迎扫码支持作者继续开发——每一份心意都会变成更多的 token，变成更好的功能。
Hayakode QR Scanner is completely free and open source. If you find it useful, feel free to scan and support the author — every token counts, and it all goes back into making this project better.

| 微信支付 / WeChat Pay | 支付宝 / Alipay |
|---|---|
| ![微信支付](assets/donate/wechat.png) | ![支付宝](assets/donate/alipay.jpg) |

> **重要声明 / Important Notice**：捐赠是对开发的支持，**不代表商业授权**。任何商业使用仍须通过 [GitHub Issues](https://github.com/drliuhuan/hayakode/issues) 联系作者签署书面授权协议。
> Donations are a gesture of support and **do NOT constitute a commercial license**. Any commercial use still requires a written license agreement from the author via [GitHub Issues](https://github.com/drliuhuan/hayakode/issues).

---

## 贡献者 / Contributors

- **DeepSeek** — 推理模型 / LLM inference model
- **DeepSeek Harness** — 代码实现 / code implementation
- **drliuhuan** — 项目发起人、产品设计、需求定义、测试验证 / project initiator, product design, requirements, testing
- **Hermes** — 需求文档、架构方案、独立验收（浏览器实测）、打包与发布 / requirements, architecture, independent acceptance (browser testing), packaging & release

完整名单亦见 [AUTHORS](AUTHORS)。

---

## 许可 / License

代码与仓库内容遵循 **PolyForm Noncommercial License 1.0.0**（见 [LICENSE](LICENSE)）：

- **非商业用途完全免费**：个人 / 教育 / 慈善 / 公共机构可自由使用、复制、修改与分发。
- **商业使用须获得作者书面许可**。
- 中文摘要见 [LICENSE](LICENSE) 头部。

**随包第三方组件遵循其各自许可**：`vendor/zxing-wasm/` 为 **MIT**（见 `vendor/zxing-wasm/LICENSE`），其上游 ZXing-C++ 为 **Apache-2.0**。使用与再分发须保留上游版权声明。
