//#region src/bindings/barcodeFormat.ts
var e = [
	[
		"All",
		"*",
		"*",
		"     ",
		0,
		"All"
	],
	[
		"AllReadable",
		"*",
		"r",
		"     ",
		0,
		"All Readable"
	],
	[
		"AllCreatable",
		"*",
		"w",
		"     ",
		0,
		"All Creatable"
	],
	[
		"AllLinear",
		"*",
		"l",
		"     ",
		0,
		"All Linear"
	],
	[
		"AllMatrix",
		"*",
		"m",
		"     ",
		0,
		"All Matrix"
	],
	[
		"AllGS1",
		"*",
		"G",
		"     ",
		0,
		"All GS1"
	],
	[
		"AllRetail",
		"*",
		"R",
		"     ",
		0,
		"All Retail"
	],
	[
		"AllIndustrial",
		"*",
		"I",
		"     ",
		0,
		"All Industrial"
	],
	[
		"Codabar",
		"F",
		" ",
		"lrw  ",
		18,
		"Codabar"
	],
	[
		"Code39",
		"A",
		" ",
		"lrw I",
		8,
		"Code 39"
	],
	[
		"Code39Std",
		"A",
		"s",
		"lrw I",
		8,
		"Code 39 Standard"
	],
	[
		"Code39Ext",
		"A",
		"e",
		"lr  I",
		9,
		"Code 39 Extended"
	],
	[
		"Code32",
		"A",
		"2",
		"lr  I",
		129,
		"Code 32"
	],
	[
		"PZN",
		"A",
		"p",
		"lr  I",
		52,
		"Pharmazentralnummer"
	],
	[
		"Code93",
		"G",
		" ",
		"lrw I",
		25,
		"Code 93"
	],
	[
		"Code128",
		"C",
		" ",
		"lrwGI",
		20,
		"Code 128"
	],
	[
		"ITF",
		"I",
		" ",
		"lrw I",
		3,
		"ITF"
	],
	[
		"ITF14",
		"I",
		"4",
		"lr  I",
		89,
		"ITF-14"
	],
	[
		"DataBar",
		"e",
		" ",
		"lr GR",
		29,
		"DataBar"
	],
	[
		"DataBarOmni",
		"e",
		"o",
		"lr GR",
		29,
		"DataBar Omni"
	],
	[
		"DataBarStk",
		"e",
		"s",
		"lr GR",
		79,
		"DataBar Stacked"
	],
	[
		"DataBarStkOmni",
		"e",
		"O",
		"lr GR",
		80,
		"DataBar Stacked Omni"
	],
	[
		"DataBarLtd",
		"e",
		"l",
		"lr GR",
		30,
		"DataBar Limited"
	],
	[
		"DataBarExp",
		"e",
		"e",
		"lr GR",
		31,
		"DataBar Expanded"
	],
	[
		"DataBarExpStk",
		"e",
		"E",
		"lr GR",
		81,
		"DataBar Expanded Stacked"
	],
	[
		"EANUPC",
		"E",
		" ",
		"lr  R",
		15,
		"EAN/UPC"
	],
	[
		"EAN13",
		"E",
		"1",
		"lrw R",
		15,
		"EAN-13"
	],
	[
		"EAN8",
		"E",
		"8",
		"lrw R",
		10,
		"EAN-8"
	],
	[
		"EAN5",
		"E",
		"5",
		"l   R",
		12,
		"EAN-5"
	],
	[
		"EAN2",
		"E",
		"2",
		"l   R",
		11,
		"EAN-2"
	],
	[
		"ISBN",
		"E",
		"i",
		"lr  R",
		69,
		"ISBN"
	],
	[
		"UPCA",
		"E",
		"a",
		"lrw R",
		34,
		"UPC-A"
	],
	[
		"UPCE",
		"E",
		"e",
		"lrw R",
		37,
		"UPC-E"
	],
	[
		"Telepen",
		"B",
		" ",
		"lr  I",
		32,
		"Telepen"
	],
	[
		"TelepenAlpha",
		"B",
		"0",
		"lr  I",
		32,
		"Telepen Alpha"
	],
	[
		"TelepenNumeric",
		"B",
		"1",
		"lr  I",
		87,
		"Telepen Numeric"
	],
	[
		"OtherBarcode",
		"X",
		" ",
		" r   ",
		0,
		"Other barcode"
	],
	[
		"DXFilmEdge",
		"X",
		"x",
		"lr   ",
		147,
		"DX Film Edge"
	],
	[
		"PDF417",
		"L",
		" ",
		"mrw  ",
		55,
		"PDF417"
	],
	[
		"CompactPDF417",
		"L",
		"c",
		"mr   ",
		56,
		"Compact PDF417"
	],
	[
		"MicroPDF417",
		"L",
		"m",
		"mr   ",
		84,
		"MicroPDF417"
	],
	[
		"Aztec",
		"z",
		" ",
		"mr G ",
		92,
		"Aztec"
	],
	[
		"AztecCode",
		"z",
		"c",
		"mrwG ",
		92,
		"Aztec Code"
	],
	[
		"AztecRune",
		"z",
		"r",
		"mr   ",
		128,
		"Aztec Rune"
	],
	[
		"QRCode",
		"Q",
		" ",
		"mrwG ",
		58,
		"QR Code"
	],
	[
		"QRCodeModel1",
		"Q",
		"1",
		"mr   ",
		0,
		"QR Code Model 1"
	],
	[
		"QRCodeModel2",
		"Q",
		"2",
		"mr   ",
		58,
		"QR Code Model 2"
	],
	[
		"MicroQRCode",
		"Q",
		"m",
		"mr   ",
		97,
		"Micro QR Code"
	],
	[
		"RMQRCode",
		"Q",
		"r",
		"mr G ",
		145,
		"rMQR Code"
	],
	[
		"DataMatrix",
		"d",
		" ",
		"mrwG ",
		71,
		"Data Matrix"
	],
	[
		"MaxiCode",
		"U",
		" ",
		"mr   ",
		57,
		"MaxiCode"
	]
], t = {
	DataBarExpanded: "DataBarExp",
	DataBarLimited: "DataBarLtd",
	"Linear-Codes": "AllLinear",
	"Matrix-Codes": "AllMatrix",
	Any: "All",
	rMQRCode: "RMQRCode"
}, n = e.map((e) => e[5]), r = e.filter((e) => e[1] === "*").map((e) => e[0]), i = e.filter((e) => e[1] !== "*").map((e) => e[0]), a = i, o = e.filter((e) => e[2] === " ").map((e) => e[0]), s = e.filter((e) => e[3][0] === "l").map((e) => e[0]), c = s, l = e.filter((e) => e[3][0] === "m").map((e) => e[0]), u = l, d = e.filter((e) => e[3][1] === "r").map((e) => e[0]), f = e.filter((e) => e[3][2] === "w" || e[4] !== 0).map((e) => e[0]), p = e.filter((e) => e[3][3] === "G").map((e) => e[0]), m = e.filter((e) => e[3][4] === "R").map((e) => e[0]), h = e.filter((e) => e[3][4] === "I").map((e) => e[0]);
function g(t) {
	let n = [], r;
	for (let i of e) if (i[1] !== "*") {
		if (!r) i[0] === t && (n.push(i[0]), r = i[1]);
		else if (i[1] === r) n.push(i[0]);
		else break;
	}
	return n;
}
function _(t) {
	let n;
	for (let r of e) if (r[1] !== "*" && (r[2] === " " && (n = r[0]), r[0] === t)) return n;
}
function v(n) {
	var r;
	let i = (r = t[n]) == null ? n : r;
	for (let t of e) if (t[0] === i || t[5] === i) return t[5];
}
function y(e) {
	var n;
	return (n = t[e]) == null ? e : n;
}
function b(e) {
	return e.map(y).join(",");
}
//#endregion
//#region src/bindings/binarizer.ts
var x = [
	"LocalAverage",
	"GlobalHistogram",
	"FixedThreshold",
	"BoolCast"
], S = x;
function C(e) {
	return x.indexOf(e);
}
//#endregion
//#region src/bindings/characterSet.ts
var w = /* @__PURE__ */ "Unknown.ASCII.ISO8859_1.ISO8859_2.ISO8859_3.ISO8859_4.ISO8859_5.ISO8859_6.ISO8859_7.ISO8859_8.ISO8859_9.ISO8859_10.ISO8859_11.ISO8859_13.ISO8859_14.ISO8859_15.ISO8859_16.Cp437.Cp1250.Cp1251.Cp1252.Cp1256.Shift_JIS.Big5.GB2312.GB18030.EUC_JP.EUC_KR.UTF16BE.UTF8.UTF16LE.UTF32BE.UTF32LE.BINARY".split("."), T = w;
function E(e) {
	return e === "UnicodeBig" ? w.indexOf("UTF16BE") : w.indexOf(e);
}
//#endregion
//#region src/bindings/contentType.ts
var D = [
	"Text",
	"Binary",
	"Mixed",
	"GS1",
	"ISO15434",
	"UnknownECI"
], O = D;
function k(e) {
	return D[e];
}
//#endregion
//#region src/bindings/eanAddOnSymbol.ts
var A = [
	"Ignore",
	"Read",
	"Require"
], j = A;
function M(e) {
	return A.indexOf(e);
}
//#endregion
//#region src/bindings/textMode.ts
var N = [
	"Plain",
	"ECI",
	"HRI",
	"Escaped",
	"Hex",
	"HexECI"
], P = N;
function F(e) {
	return N.indexOf(e);
}
//#endregion
//#region src/bindings/readerOptions.ts
var I = {
	formats: [],
	tryHarder: !0,
	tryRotate: !0,
	tryInvert: !0,
	tryDownscale: !0,
	tryDenoise: !1,
	binarizer: "LocalAverage",
	isPure: !1,
	downscaleFactor: 3,
	downscaleThreshold: 500,
	minLineCount: 2,
	maxNumberOfSymbols: 255,
	validateOptionalChecksum: !1,
	returnErrors: !1,
	eanAddOnSymbol: "Ignore",
	textMode: "HRI",
	characterSet: "Unknown",
	tryCode39ExtendedMode: !0
};
function L(e) {
	var t;
	return {
		...e,
		formats: b(e.formats),
		binarizer: C(e.binarizer),
		eanAddOnSymbol: M(e.eanAddOnSymbol),
		textMode: F(e.textMode),
		characterSet: E(e.characterSet),
		tryCode39ExtendedMode: (t = e.tryCode39ExtendedMode) == null || t
	};
}
//#endregion
//#region src/bindings/readResult.ts
function R(e) {
	return {
		...e,
		format: e.format,
		symbology: e.symbology,
		contentType: k(e.contentType)
	};
}
//#endregion
//#region src/bindings/writeResult.ts
function z(e) {
	var t;
	return {
		...e,
		image: (t = e.image && new Blob([e.image], { type: "image/png" })) == null ? null : t
	};
}
//#endregion
//#region src/bindings/writerOptions.ts
var B = {
	format: "QRCode",
	readerInit: !1,
	forceSquareDataMatrix: !1,
	ecLevel: "",
	scale: 1,
	sizeHint: 0,
	rotate: 0,
	invert: !1,
	withHRT: !1,
	withQuietZones: !0,
	addHRT: !1,
	addQuietZones: !0,
	options: ""
};
function V(e = B) {
	var t, n;
	let { format: r = B.format, sizeHint: i = B.sizeHint, readerInit: a = B.readerInit, forceSquareDataMatrix: o = B.forceSquareDataMatrix, ecLevel: s = B.ecLevel, withHRT: c, withQuietZones: l, addHRT: u, addQuietZones: d, options: f = B.options, scale: p, rotate: m = B.rotate, invert: h = B.invert } = e, g = f.split(",").map((e) => e.trim()).filter(Boolean), _ = (e) => {
		let t = e.split("=")[0];
		g.some((e) => e.split("=")[0] === t) || g.push(e);
	};
	a && _("readerInit"), o && _("forceSquare"), s && _(`ecLevel=${s}`);
	let v = p == null ? i > 0 ? -Math.trunc(Math.abs(i)) : B.scale : p;
	return {
		format: y(r),
		options: g.join(","),
		scale: v,
		rotate: m,
		invert: h,
		addHRT: (t = u == null ? c : u) == null ? B.addHRT : t,
		addQuietZones: (n = d == null ? l : d) == null ? B.addQuietZones : n
	};
}
//#endregion
//#region src/share.ts
// [Hayakode patch] Upstream defaults to a remote URL here. Patched for the
// zero-network constraint: never resolve to a remote URL.
// The extension always supplies a local `locateFile`/`wasmBinary` override anyway.
var H = "3.1.3", U = "a17fd9dc65d6aa0dd2f660fdfca7a6a6613d938f", W = { locateFile: (e, t) => t + e }, G = /* @__PURE__ */ new WeakMap();
function K(e, t) {
	return Object.is(e, t) || Object.keys(e).length === Object.keys(t).length && Object.keys(e).every((n) => Object.hasOwn(t, n) && e[n] === t[n]);
}
function q(e, { overrides: t, equalityFn: n = K, fireImmediately: r = !1 } = {}) {
	var i, a;
	let [o, s] = (i = G.get(e)) == null ? [W] : i, c = t == null ? o : t, l;
	if (r) {
		if (s && (l = n(o, c))) return s;
		let t = e({ ...c });
		return G.set(e, [c, t]), t;
	}
	((a = l) == null ? n(o, c) : a) || G.set(e, [c]);
}
function J(e) {
	G.delete(e);
}
function Y(e) {
	let t = e.byteLength >> 2, n = new Uint8Array(t);
	for (let r = 0; r < t; r++) {
		let t = r << 2;
		n[r] = 306 * e[t] + 601 * e[t + 1] + 117 * e[t + 2] + 512 >> 10;
	}
	return n;
}
async function X(e, t, n = I) {
	let r = {
		...I,
		...n
	}, i = await q(e, { fireImmediately: !0 }), a, o;
	if ("width" in t && "height" in t && "data" in t) {
		let { data: e, width: n, height: s } = t, c = Y(e), l = c.byteLength;
		if (o = i._malloc(l), !o) throw Error(`Failed to allocate ${l} bytes in WASM memory`);
		try {
			i.HEAPU8.set(c, o), a = i.readBarcodesFromPixmap(o, n, s, L(r));
		} finally {
			i._free(o);
		}
	} else {
		let e, n;
		if ("buffer" in t) [e, n] = [t.byteLength, t];
		else if ("byteLength" in t) [e, n] = [t.byteLength, new Uint8Array(t)];
		else if ("size" in t) [e, n] = [t.size, new Uint8Array(await t.arrayBuffer())];
		else throw TypeError("Invalid input type");
		if (o = i._malloc(e), !o) throw Error(`Failed to allocate ${e} bytes in WASM memory`);
		try {
			i.HEAPU8.set(n, o), a = i.readBarcodesFromImage(o, e, L(r));
		} finally {
			i._free(o);
		}
	}
	let s = [];
	for (let e = 0; e < a.size(); ++e) s.push(R(a.get(e)));
	return s;
}
async function Z(e, t, n = B) {
	let r = V(n), i = await q(e, { fireImmediately: !0 });
	if (typeof t == "string") return z(i.writeBarcodeFromText(t, r));
	let { byteLength: a } = t, o = i._malloc(a);
	if (!o) throw Error(`Failed to allocate ${a} bytes in WASM memory`);
	try {
		return i.HEAPU8.set(t, o), z(i.writeBarcodeFromBytes(o, a, r));
	} finally {
		i._free(o);
	}
}
//#endregion
//#region src/bindings/exposedReaderBindings.ts
var Q = {
	...I,
	formats: [...I.formats]
}, $ = { ...B };
//#endregion
export { a as A, f as C, l as D, s as E, c as F, u as I, g as L, b as M, v as N, d as O, _ as P, o as S, h as T, x as _, q as a, n as b, Z as c, A as d, j as f, T as g, w as h, H as i, y as j, m as k, N as l, O as m, Q as n, J as o, D as p, U as r, X as s, $ as t, P as u, S as v, p as w, r as x, i as y };
