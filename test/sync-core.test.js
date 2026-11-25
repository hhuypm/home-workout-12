import { test } from "node:test";
import assert from "node:assert/strict";
import { handleSync, normCode, MAX_DEVICES } from "../netlify/lib/sync-core.mjs";
import { genCode } from "../public/js/sync-model.js";

function memStore() {
  const m = new Map();
  return { m, async list({ prefix }) { return { blobs: [...m.keys()].filter(k => k.startsWith(prefix)).map(key => ({ key })) }; },
    async get(k) { return m.has(k) ? JSON.parse(m.get(k)) : null; }, async setJSON(k, v) { m.set(k, JSON.stringify(v)); }, async delete(k) { m.delete(k); } };
}
const post = (store, code, body) => handleSync({ method: "POST", code, bodyText: JSON.stringify(body) }, store);
const cells = n => ({ "walk/2026-11-24": { t: n, v: n } });

test("two devices see each other's data, never their own", async () => {
  const store = memStore(), code = genCode();
  let r = await post(store, code, { device: "a".repeat(16), cells: cells(1) });
  assert.equal(r.status, 200); assert.deepEqual(r.json.docs, []);
  r = await post(store, code, { device: "b".repeat(16), join: true, cells: cells(2) });
  assert.equal(r.status, 200); assert.equal(r.json.docs.length, 1);
  assert.deepEqual(r.json.docs[0].cells, cells(1)); assert.equal(r.json.docs[0].device, "a".repeat(16));
  r = await post(store, code, { device: "a".repeat(16), cells: cells(3) });
  assert.deepEqual(r.json.docs[0].cells, cells(2));
  assert.equal(store.m.size, 2, "one file per device");
});

test("the code itself is never stored; groups are isolated", async () => {
  const store = memStore(), c1 = genCode(), c2 = genCode();
  await post(store, c1, { device: "a".repeat(16), cells: cells(1) });
  assert.ok([...store.m.keys()].every(k => !k.includes(c1)));
  const r = await post(store, c2, { device: "b".repeat(16), cells: cells(2) });
  assert.deepEqual(r.json.docs, [], "another code sees nothing");
});

test("joining a code nobody used is refused (typo protection)", async () => {
  const store = memStore();
  const r = await post(store, genCode(), { device: "a".repeat(16), join: true });
  assert.equal(r.status, 404); assert.equal(store.m.size, 0);
});

test("typing differences in the code do not matter", async () => {
  const store = memStore(), code = genCode();
  await post(store, code, { device: "a".repeat(16), cells: cells(1) });
  const messy = code.slice(0, 4) + "-" + code.slice(4).toLowerCase().replace(/0/g, "o");
  assert.equal(normCode(messy), code);
  const r = await post(store, messy, { device: "b".repeat(16), join: true });
  assert.equal(r.status, 200); assert.equal(r.json.docs.length, 1);
});

test("rejects bad codes, devices, bodies and oversize data", async () => {
  const store = memStore(), code = genCode();
  assert.equal((await post(store, "nope", { device: "a".repeat(16) })).status, 401);
  assert.equal((await handleSync({ method: "POST", code: null, bodyText: "{}" }, store)).status, 401);
  assert.equal((await post(store, code, { device: "xyz" })).status, 400);
  assert.equal((await handleSync({ method: "POST", code, bodyText: "{not json" }, store)).status, 400);
  assert.equal((await post(store, code, { device: "a".repeat(16), cells: [1] })).status, 400);
  assert.equal((await post(store, code, { device: "a".repeat(16), cells: { x: { v: 1 } } })).status, 400);
  assert.equal((await handleSync({ method: "POST", code, bodyText: JSON.stringify({ device: "a".repeat(16), cells: cells(1), pad: "x".repeat(700_000) }) }, store)).status, 413);
  assert.equal((await handleSync({ method: "GET", code }, store)).status, 405);
  assert.equal(store.m.size, 0, "nothing stored from rejected requests");
});

test("a group is capped at the device limit, but known devices can always sync", async () => {
  const store = memStore(), code = genCode(), id = i => i.toString(16).padStart(16, "0");
  for (let i = 0; i < MAX_DEVICES; i++) assert.equal((await post(store, code, { device: id(i), cells: cells(i) })).status, 200);
  assert.equal((await post(store, code, { device: id(99), cells: cells(1) })).status, 409);
  assert.equal((await post(store, code, { device: id(3), cells: cells(50) })).status, 200);
});

test("DELETE removes the whole group", async () => {
  const store = memStore(), code = genCode(), other = genCode();
  await post(store, code, { device: "a".repeat(16), cells: cells(1) }); await post(store, code, { device: "b".repeat(16), cells: cells(2) });
  await post(store, other, { device: "c".repeat(16), cells: cells(3) });
  const r = await handleSync({ method: "DELETE", code }, store);
  assert.deepEqual(r.json, { deleted: 2 }); assert.equal(store.m.size, 1);
});
