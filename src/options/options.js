// Hayakode — options page. Settings are stored in chrome.storage.local only.

const DEFAULTS = Object.freeze({
  minShortSide: 64,
  alwaysShow: false,
  buttonOpacity: 0.6,
  scanMode: "hard",
  scanLinear: false,
  expandPx: 8,
});

const FIELDS = {
  minShortSide: { type: "number", min: 32, max: 200 },
  alwaysShow: { type: "boolean" },
  buttonOpacity: { type: "number", min: 0.1, max: 1 },
  scanMode: { type: "string", allowed: ["hard", "fast"] },
  scanLinear: { type: "boolean" },
  expandPx: { type: "number", min: 0, max: 64 },
};

const $ = (id) => document.getElementById(id);

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

function applyI18n() {
  for (const el of document.querySelectorAll("[data-i18n]")) {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = t(key, undefined, el.textContent);
  }
  const title = t("optionsTitle", undefined, document.title);
  document.title = title;
  try {
    document.documentElement.lang = chrome.i18n.getUILanguage() || "en";
  } catch (_) {
    /* keep the markup default */
  }
}

function normalize(key, raw) {
  const spec = FIELDS[key];
  if (!spec) return raw;
  if (spec.type === "boolean") return !!raw;
  if (spec.type === "number") {
    let n = Number(raw);
    if (!Number.isFinite(n)) n = DEFAULTS[key];
    if (spec.min !== undefined) n = Math.max(spec.min, n);
    if (spec.max !== undefined) n = Math.min(spec.max, n);
    return key === "buttonOpacity" ? Math.round(n * 100) / 100 : Math.round(n);
  }
  if (spec.type === "string") {
    return spec.allowed.indexOf(raw) !== -1 ? raw : DEFAULTS[key];
  }
  return raw;
}

function render(values) {
  $("minShortSide").value = String(values.minShortSide);
  $("alwaysShow").checked = !!values.alwaysShow;
  $("buttonOpacity").value = String(values.buttonOpacity);
  $("buttonOpacityValue").textContent = String(values.buttonOpacity);
  $("scanMode").value = values.scanMode;
  $("scanLinear").checked = !!values.scanLinear;
  $("expandPx").value = String(values.expandPx);
}

let saveTimer = null;

function flashSaved() {
  const el = $("saveState");
  el.textContent = t("saveDone", undefined, "Saved");
  el.classList.add("is-saved");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    el.textContent = t("saveAuto", undefined, "Changes are saved automatically");
    el.classList.remove("is-saved");
  }, 1500);
}

async function save(key, value) {
  await chrome.storage.local.set({ [key]: value });
  flashSaved();
}

function bind(key, elementId, eventName) {
  const el = $(elementId);
  el.addEventListener(eventName, () => {
    const raw = el.type === "checkbox" ? el.checked : el.value;
    const value = normalize(key, raw);
    if (key === "buttonOpacity") $("buttonOpacityValue").textContent = String(value);
    save(key, value);
  });
}

async function loadEngineInfo() {
  const el = $("engineInfo");
  try {
    const resp = await chrome.runtime.sendMessage({ type: "HAYAKODE_PING" });
    if (resp && resp.ok && resp.engine) {
      el.textContent = t(
        "engineInfo",
        [resp.engine.name, String(resp.engine.version), String(resp.engine.zxingCppCommit).slice(0, 10)],
        "Engine: " + resp.engine.name + " v" + resp.engine.version
      );
    } else {
      el.textContent = t("engineNotReady", undefined, "Engine: not ready");
    }
  } catch (_) {
    el.textContent = t("engineNotReady", undefined, "Engine: not ready");
  }
}

async function init() {
  applyI18n();
  const stored = await chrome.storage.local.get(DEFAULTS);
  const values = { ...DEFAULTS, ...stored };
  for (const key of Object.keys(DEFAULTS)) values[key] = normalize(key, values[key]);
  render(values);

  bind("minShortSide", "minShortSide", "change");
  bind("alwaysShow", "alwaysShow", "change");
  bind("buttonOpacity", "buttonOpacity", "input");
  bind("scanMode", "scanMode", "change");
  bind("scanLinear", "scanLinear", "change");
  bind("expandPx", "expandPx", "change");

  loadEngineInfo();
}

init();
