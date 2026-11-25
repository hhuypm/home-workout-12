/* Multi-device merge. Pure functions: no DOM, no storage, no network.
 *
 * The app state is flattened into "cells" (one per set count, walk day, level, …). Each cell carries the time it
 * was last changed on some device. Merging two devices = per cell, the newer change wins; a deleted cell is kept as
 * a tombstone (v: null) so the deletion spreads instead of the old value coming back. */

export const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** state -> {cellKey: value}. Empty values (0, "", missing) are not cells. */
export function flatten(st) {
  const c = {};
  for (const kind of ["sets", "mini"]) for (const [d, o] of Object.entries(st[kind] || {})) for (const [j, n] of Object.entries(o || {})) if (+n > 0) c[`${kind}/${d}/${j}`] = +n;
  for (const [d, m] of Object.entries(st.walk || {})) if (+m > 0) c[`walk/${d}`] = +m;
  for (const [d, o] of Object.entries(st.time || {})) for (const [k, n] of Object.entries(o || {})) if (+n > 0) c[`time/${d}/${k}`] = +n;
  for (const [id, t] of Object.entries(st.tests || {})) for (const s of ["a", "b"]) { const v = t && t[s]; if (v !== undefined && v !== null && v !== "" && Number.isFinite(+v)) c[`tests/${id}/${s}`] = +v; }
  for (const r of st.body || []) if (r && r.d) c[`body/${r.d}`] = { kg: r.kg ?? null, w: r.w ?? null };
  for (const [k, n] of Object.entries(st.lvl || {})) if (+n > 0) c[`lvl/${k}`] = +n;
  for (const [k, d] of Object.entries(st.lvlD || {})) if (d) c[`lvlD/${k}`] = d;
  for (const [k, a] of Object.entries(st.hit || {})) for (const d of a || []) c[`hit/${k}/${d}`] = 1;
  for (const [k, a] of Object.entries(st.lvlH || {})) for (const h of a || []) if (h && h.d) c[`lvlH/${k}/${h.d}/${h.to}`] = 1;
  return c;
}

/** meta ({key: {t, v}}) -> state, skipping tombstones. */
export function unflatten(meta) {
  const st = { sets: {}, mini: {}, walk: {}, tests: {}, body: [], lvl: {}, hit: {}, lvlD: {}, lvlH: {}, time: {} };
  for (const [key, m] of Object.entries(meta || {})) {
    if (!m || m.v === null || m.v === undefined) continue;
    const [kind, a, b, c] = key.split("/"), v = m.v;
    if (kind === "sets" || kind === "mini") (st[kind][a] = st[kind][a] || {})[b] = v;
    else if (kind === "walk") st.walk[a] = v;
    else if (kind === "time") (st.time[a] = st.time[a] || {})[b] = v;
    else if (kind === "tests") (st.tests[a] = st.tests[a] || {})[b] = v;
    else if (kind === "body") st.body.push({ d: a, kg: v.kg ?? null, w: v.w ?? null });
    else if (kind === "lvl") st.lvl[a] = v;
    else if (kind === "lvlD") st.lvlD[a] = v;
    else if (kind === "hit") (st.hit[a] = st.hit[a] || []).push(b);
    else if (kind === "lvlH") (st.lvlH[a] = st.lvlH[a] || []).push({ d: b, to: +c });
  }
  for (const a of Object.values(st.hit)) a.sort();
  for (const a of Object.values(st.lvlH)) a.sort((x, y) => (x.d < y.d ? -1 : x.d > y.d ? 1 : x.to - y.to));
  st.body.sort((x, y) => (x.d < y.d ? -1 : 1));
  return st;
}

/** First-ever meta for data that existed before change tracking: t = 0, so any real edit anywhere beats it. */
export const initMeta = st => Object.fromEntries(Object.entries(flatten(st)).map(([k, v]) => [k, { t: 0, v }]));

/** Stamp whatever changed since `meta` was written. Returns the same object when nothing changed. */
export function updateMeta(meta, st, now) {
  const cur = flatten(st);
  let out = null;
  const put = (k, v) => { out = out || { ...meta }; out[k] = { t: Math.max(now, ((meta[k] && meta[k].t) || 0) + 1), v }; };
  for (const [k, v] of Object.entries(cur)) { const m = meta[k]; if (!m || m.v === null || !same(m.v, v)) put(k, v); }
  for (const [k, m] of Object.entries(meta)) if (m.v !== null && !(k in cur)) put(k, null);
  return out || meta;
}

/** Total order on versions of one cell: newer time, then a value over a deletion, then the larger value. */
export function cmpCell(x, y) {
  if (x.t !== y.t) return x.t - y.t;
  const nx = x.v === null ? 0 : 1, ny = y.v === null ? 0 : 1;
  if (nx !== ny) return nx - ny;
  if (nx === 0) return 0;
  if (typeof x.v === "number" && typeof y.v === "number") return x.v - y.v;
  const a = JSON.stringify(x.v), b = JSON.stringify(y.v);
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Commutative, associative, idempotent: devices can sync in any order and end identical. */
export function mergeMeta(a, b) {
  const out = { ...a };
  for (const [k, m] of Object.entries(b || {})) {
    if (!m || !Number.isFinite(m.t)) continue;
    const y = { t: m.t, v: m.v === undefined ? null : m.v }, x = out[k];
    out[k] = x && cmpCell(x, y) >= 0 ? x : y;
  }
  return out;
}

export const metaEqual = (a, b) => { const ka = Object.keys(a), kb = Object.keys(b); return ka.length === kb.length && ka.every(k => b[k] && a[k].t === b[k].t && same(a[k].v, b[k].v)); };

/* ---------- sync code ---------- */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";   // 32 symbols, no I L O U
/** 26 symbols = 130 bits. */
export function genCode(random = n => crypto.getRandomValues(new Uint8Array(n))) {
  return Array.from(random(26), b => ALPHABET[b % 32]).join("");
}
export const fmtCode = c => (c.match(/.{1,4}/g) || []).join("-");
/** User input -> canonical code, or null when it can't be one. */
export function parseCode(s) {
  const c = String(s || "").toUpperCase().replace(/[\s-]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
  return /^[0-9A-HJKMNP-TV-Z]{26}$/.test(c) ? c : null;
}
export const genDevice = (random = n => crypto.getRandomValues(new Uint8Array(n))) => Array.from(random(8), b => b.toString(16).padStart(2, "0")).join("");
