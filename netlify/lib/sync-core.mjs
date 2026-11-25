/* Sync server logic, independent of Netlify so it can be tested and run by the local dev server.
 *
 * One "group" = one sync code. Each device writes ONLY its own file (g/<hash>/<device>) and reads the others,
 * so no two devices ever write the same key. Merging happens in the app (see public/js/sync-model.js).
 * The code is never stored: files live under a SHA-256 of it. */
import { createHash } from "node:crypto";

export const MAX_BODY = 600_000;     // bytes of request body
export const MAX_CELLS = 20_000;
export const MAX_DEVICES = 8;

const CODE_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/;
const DEVICE_RE = /^[0-9a-f]{16}$/;

/** Crockford-style normalisation: case, dashes, spaces, and the look-alikes O/I/L. */
export const normCode = s => String(s || "").toUpperCase().replace(/[\s-]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");

const reply = (status, json) => ({ status, json });

/** store: { list({prefix}) -> {blobs:[{key}]}, get(key,{type:"json"}), setJSON(key,value), delete(key) } */
export async function handleSync({ method, code, bodyText = "" }, store) {
  const c = normCode(code);
  if (!CODE_RE.test(c)) return reply(401, { error: "bad_code" });
  const prefix = `g/${createHash("sha256").update("wk12:" + c).digest("hex")}/`;
  const keys = async () => (await store.list({ prefix })).blobs.map(b => b.key);

  if (method === "DELETE") {
    const all = await keys();
    await Promise.all(all.map(k => store.delete(k)));
    return reply(200, { deleted: all.length });
  }
  if (method !== "POST") return reply(405, { error: "method" });
  if (Buffer.byteLength(bodyText) > MAX_BODY) return reply(413, { error: "too_big" });

  let body;
  try { body = JSON.parse(bodyText); } catch (e) { return reply(400, { error: "bad_json" }); }
  if (!body || typeof body !== "object" || !DEVICE_RE.test(body.device || "")) return reply(400, { error: "bad_device" });
  const own = prefix + body.device;

  if (body.join && !(await keys()).length) return reply(404, { error: "no_group" });

  if (body.cells !== undefined) {
    const cells = body.cells;
    if (!cells || typeof cells !== "object" || Array.isArray(cells)) return reply(400, { error: "bad_cells" });
    const entries = Object.entries(cells);
    if (entries.length > MAX_CELLS) return reply(413, { error: "too_many_cells" });
    if (!entries.every(([k, m]) => k.length < 200 && m && typeof m === "object" && Number.isFinite(m.t))) return reply(400, { error: "bad_cells" });
    const have = await keys();
    if (!have.includes(own) && have.length >= MAX_DEVICES) return reply(409, { error: "too_many_devices" });
    await store.setJSON(own, { v: 1, updated: Date.now(), cells });
  }

  const all = await keys();
  const docs = (await Promise.all(all.filter(k => k !== own).map(async k => {
    const d = await store.get(k, { type: "json" });
    return d && d.cells ? { device: k.slice(prefix.length), updated: d.updated, cells: d.cells } : null;
  }))).filter(Boolean);
  return reply(200, { docs, devices: all.length });
}
