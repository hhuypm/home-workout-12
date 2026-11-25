/* Multi-device sync, browser side. The merge rules live in sync-model.js; this file keeps the change log,
 * talks to /api/sync and applies what other devices sent.
 *
 * localStorage keys:  player12-sync (code + device id)   player12-meta (cells with change times)
 *                     player12-presync (copy of the data from just before the last time another device changed it) */
import * as M from "./sync-model.js";

const CFG = "player12-sync", META = "player12-meta", PRE = "player12-presync";
const read = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };

export const config = () => { const c = read(CFG); return c && c.code ? c : null; };
export const enabled = () => !!config();
export const hasUndo = () => !!read(PRE);
export const status = { state: "off", last: 0, error: "" };   // off | idle | syncing | offline | error

let hooks = { getState: () => ({}), applyState: () => {}, restore: () => {}, busy: () => false, onStatus: () => {} };
let timer = null, inflight = null, again = false;

const setStatus = (state, error = "") => { status.state = state; status.error = error; if (state === "idle") status.last = Date.now(); hooks.onStatus(status); };

/** Call once at start-up, after the saved data is loaded. `saveHook` receives every save. */
export function init(h, setSaveHook) {
  hooks = Object.assign(hooks, h);
  if (!read(META)) write(META, M.initMeta(hooks.getState()));
  setSaveHook(record);
  status.state = enabled() ? "idle" : "off";
}

/** After every save: stamp what changed, and push soon if sync is on. */
function record(st) {
  const meta = read(META) || {};
  const next = M.updateMeta(meta, st, Date.now());
  if (next !== meta) write(META, next);
  if (enabled() && next !== meta) schedule();
}

export function schedule(ms = 4000) { clearTimeout(timer); timer = setTimeout(() => syncNow(), ms); }

const MSG = { 401: "Mã đồng bộ không hợp lệ.", 404: "Không tìm thấy nhóm đồng bộ với mã này.", 409: "Nhóm đồng bộ đã đủ 8 thiết bị.", 413: "Dữ liệu quá lớn để đồng bộ.", 429: "Gửi quá nhanh, thử lại sau một phút." };
class SyncError extends Error { constructor(status) { super(MSG[status] || "Máy chủ đồng bộ chưa phản hồi đúng."); this.status = status; } }

async function call(cfg, method, body) {
  let res;
  try {
    res = await fetch("/api/sync", { method, headers: { "x-sync-code": cfg.code, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000) });
  } catch (e) { const err = new Error("Không có mạng."); err.offline = true; throw err; }
  if (!res.ok) throw new SyncError(res.status);
  try { return await res.json(); } catch (e) { throw new SyncError(0); }
}

/** Push this device's data, take the others' data, merge. Returns {ok, error?}. */
export function syncNow({ join = false } = {}) {
  const cfg = config();
  if (!cfg) return Promise.resolve({ ok: false, error: "off" });
  if (inflight) { again = true; return inflight; }
  inflight = (async () => {
    setStatus("syncing");
    try {
      const mine = read(META) || {};
      const { docs } = await call(cfg, "POST", { device: cfg.device, join, cells: mine });
      if (hooks.busy()) { setStatus("idle"); again = true; return { ok: true, deferred: true }; }   // don't change data under an open workout
      const cur = read(META) || mine;                                  // may include edits made while we waited
      let merged = cur;
      for (const d of docs) merged = M.mergeMeta(merged, d.cells);
      if (!M.metaEqual(merged, cur)) {
        write(PRE, { t: Date.now(), state: hooks.getState() });         // safety copy for "Hoàn tác"
        write(META, merged);
        hooks.applyState(M.unflatten(merged));
      }
      setStatus("idle");
      return { ok: true, changed: !M.metaEqual(merged, cur), devices: docs.length + 1 };
    } catch (e) {
      setStatus(e.offline ? "offline" : "error", e.message);
      return { ok: false, error: e.message, status: e.status };
    } finally {
      inflight = null;
      if (again) { again = false; schedule(1500); }
    }
  })();
  return inflight;
}

/** Start a new group on this device. Returns the code. */
export async function start() {
  const cfg = { code: M.genCode(), device: M.genDevice() };
  write(CFG, cfg);
  const r = await syncNow();
  if (!r.ok && r.error !== "Không có mạng.") { localStorage.removeItem(CFG); status.state = "off"; return { ok: false, error: r.error }; }
  return { ok: true, code: cfg.code };
}

/** Join an existing group with a code the user typed. */
export async function join(input) {
  const code = M.parseCode(input);
  if (!code) return { ok: false, error: "Mã chưa đúng: cần 26 ký tự gồm chữ và số." };
  const prev = read(CFG);
  write(CFG, { code, device: (prev && prev.device) || M.genDevice() });
  const r = await syncNow({ join: true });
  if (!r.ok) { if (prev) write(CFG, prev); else localStorage.removeItem(CFG); status.state = prev ? "idle" : "off"; hooks.onStatus(status); return { ok: false, error: r.error }; }
  return { ok: true };
}

/** Stop syncing on this device. Data stays here and in the cloud. */
export function disconnect() { clearTimeout(timer); localStorage.removeItem(CFG); setStatus("off"); }

/** Delete the group from the cloud for every device, then disconnect. */
export async function wipeCloud() {
  const cfg = config(); if (!cfg) return { ok: true };
  try { await call(cfg, "DELETE"); } catch (e) { return { ok: false, error: e.message }; }
  disconnect(); return { ok: true };
}

/** The copy taken just before another device last changed this one. */
export const undoState = () => { const p = read(PRE); return p ? p.state : null; };
export const clearUndo = () => localStorage.removeItem(PRE);
