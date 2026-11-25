import { test } from "node:test";
import assert from "node:assert/strict";
import { flatten, unflatten, initMeta, updateMeta, mergeMeta, metaEqual, cmpCell, genCode, fmtCode, parseCode, genDevice } from "../public/js/sync-model.js";
import { blank, normalize } from "../public/js/store.js";

const sample = () => normalize({
  sets: { "2026-11-24": { 0: 4, 1: 4, 2: 1 } }, mini: { "2026-11-24": { 0: 3 } }, walk: { "2026-11-24": 12 },
  tests: { pu: { a: 8, b: "" }, dp: { a: 10, b: 14 } }, body: [{ d: "2026-11-29", kg: 70.5, w: null }],
  lvl: { "pull-0": 1 }, hit: { "push-0": ["2026-11-24", "2026-11-25"] }, lvlD: { "pull-0": "2026-11-26" }, lvlH: { "pull-0": [{ d: "2026-11-26", to: 1 }] }
});
const norm = st => JSON.stringify(flatten(st), Object.keys(flatten(st)).sort());

test("flatten → unflatten round-trips the app state", () => {
  const st = sample();
  const back = unflatten(initMeta(st));
  assert.equal(norm(back), norm(st));
  assert.deepEqual(back.sets, st.sets); assert.deepEqual(back.hit, st.hit); assert.deepEqual(back.lvlH, st.lvlH);
  assert.deepEqual(back.tests, { pu: { a: 8 }, dp: { a: 10, b: 14 } }, "empty test cells are dropped");
  assert.deepEqual(unflatten(initMeta(blank())), blank());
});

test("updateMeta stamps only what changed, deletions become tombstones", () => {
  const st = sample(), m0 = initMeta(st);
  assert.equal(updateMeta(m0, st, 1000), m0, "no change → same object");
  st.sets["2026-11-24"][2] = 2; st.walk["2026-11-24"] = 0; st.hit["push-0"].pop();
  const m1 = updateMeta(m0, st, 1000);
  assert.deepEqual(m1["sets/2026-11-24/2"], { t: 1000, v: 2 });
  assert.deepEqual(m1["walk/2026-11-24"], { t: 1000, v: null });
  assert.deepEqual(m1["hit/push-0/2026-11-25"], { t: 1000, v: null });
  assert.equal(m1["sets/2026-11-24/0"].t, 0, "untouched cell keeps its time");
  st.sets["2026-11-24"] = {};                               // "Làm lại buổi"
  const m2 = updateMeta(m1, st, 2000);
  assert.deepEqual(Object.keys(unflatten(m2).sets), []);
  st.sets["2026-11-24"] = { 0: 1 };                         // redo, even with an old value
  assert.deepEqual(updateMeta(m2, st, 3000)["sets/2026-11-24/0"], { t: 3000, v: 1 });
  assert.ok(updateMeta(m2, st, 1)["sets/2026-11-24/0"].t > m2["sets/2026-11-24/0"].t, "a clock that went backwards still wins over the previous local version");
});

test("merge: newer edit wins, deletion spreads, legacy data (t=0) loses to any real edit", () => {
  const a = { x: { t: 5, v: 1 }, y: { t: 9, v: null }, z: { t: 0, v: 7 } };
  const b = { x: { t: 8, v: 2 }, y: { t: 3, v: 4 }, z: { t: 4, v: 1 } };
  const m = mergeMeta(a, b);
  assert.deepEqual(m, { x: { t: 8, v: 2 }, y: { t: 9, v: null }, z: { t: 4, v: 1 } });
});

test("merge ties are deterministic and prefer data over deletion, larger count over smaller", () => {
  const x = { t: 5, v: 3 }, y = { t: 5, v: 4 }, d = { t: 5, v: null };
  assert.equal(cmpCell(x, y) < 0, true); assert.equal(cmpCell(x, d) > 0, true); assert.equal(cmpCell(d, d), 0);
  assert.deepEqual(mergeMeta({ k: x }, { k: y }), mergeMeta({ k: y }, { k: x }));
  assert.deepEqual(mergeMeta({ k: d }, { k: x }).k, x);
  assert.deepEqual(mergeMeta({ b: { t: 1, v: { kg: 1, w: 2 } } }, { b: { t: 1, v: { kg: 1, w: 3 } } }), mergeMeta({ b: { t: 1, v: { kg: 1, w: 3 } } }, { b: { t: 1, v: { kg: 1, w: 2 } } }));
});

test("merge is commutative, associative and idempotent (random)", () => {
  let s = 7; const rnd = n => (s = (s * 1103515245 + 12345) & 0x7fffffff) % n;
  const mk = () => { const m = {}; for (let i = 0; i < 25; i++) m["k" + rnd(12)] = { t: rnd(6), v: rnd(4) === 0 ? null : rnd(5) }; return m; };
  for (let i = 0; i < 300; i++) {
    const a = mk(), b = mk(), c = mk();
    assert.ok(metaEqual(mergeMeta(a, b), mergeMeta(b, a)), "commutative");
    assert.ok(metaEqual(mergeMeta(mergeMeta(a, b), c), mergeMeta(a, mergeMeta(b, c))), "associative");
    assert.ok(metaEqual(mergeMeta(a, a), a), "idempotent");
  }
});

/* two devices doing random things */
function simulate(seed, { syncEvery }) {
  let s = seed; const rnd = n => (s = (s * 1103515245 + 12345) & 0x7fffffff) % n;
  const dev = () => ({ st: blank(), meta: {} });
  const A = dev(), B = dev(), ref = dev();      // ref = one device that did every edit, in order
  let clock = 1000;
  const days = ["2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27"];
  const edit = (d, op) => {
    const st = d.st, day = days[op.day];
    if (op.k === 0) (st.sets[day] = st.sets[day] || {})[op.j] = op.n;
    if (op.k === 1) st.walk[day] = op.n;
    if (op.k === 2) st.sets[day] = {};
    if (op.k === 3) { st.body = st.body.filter(r => r.d !== day); if (op.n) st.body.push({ d: day, kg: 60 + op.n, w: null }); }
    if (op.k === 4) { const a = st.hit["push-0"] = st.hit["push-0"] || []; const i = a.indexOf(day); if (i < 0) a.push(day); else a.splice(i, 1); }
    if (op.k === 5) { st.lvl["pull-0"] = op.n % 3; st.lvlD["pull-0"] = day; }
    d.meta = updateMeta(d.meta, st, clock);
  };
  const sync = () => { const m = mergeMeta(A.meta, B.meta); for (const d of [A, B]) { d.meta = m; d.st = unflatten(m); } };
  for (let i = 0; i < 60; i++) {
    clock += 1 + rnd(5);
    const op = { k: rnd(6), day: rnd(4), j: rnd(3), n: rnd(5) };
    edit(rnd(2) ? A : B, op); edit(ref, op);
    if (syncEvery && i % syncEvery === syncEvery - 1) sync();
  }
  sync();
  return { A, B, ref };
}
test("two devices converge to the same data after syncing", () => {
  for (let seed = 1; seed <= 60; seed++) { const { A, B } = simulate(seed, { syncEvery: 0 }); assert.equal(norm(A.st), norm(B.st), "seed " + seed); }
});
test("syncing after every edit equals one device that did everything", () => {
  for (let seed = 1; seed <= 60; seed++) { const { A, ref } = simulate(seed, { syncEvery: 1 }); assert.equal(norm(A.st), norm(ref.st), "seed " + seed); }
});
test("joining an empty device copies everything; legacy data on the joiner never beats the group", () => {
  const owner = initMeta(sample());
  const empty = mergeMeta({}, owner);
  assert.equal(norm(unflatten(empty)), norm(sample()));
  const joiner = sample(); joiner.walk["2026-11-24"] = 99;           // old local value, t=0
  const edited = updateMeta(owner, (() => { const s = sample(); s.walk["2026-11-24"] = 15; return s; })(), 500);
  const merged = mergeMeta(initMeta(joiner), edited);
  assert.equal(unflatten(merged).walk["2026-11-24"], 15);
});

test("sync codes: 26 symbols, readable, tolerant of typing mistakes", () => {
  const c = genCode(); assert.match(c, /^[0-9A-HJKMNP-TV-Z]{26}$/);
  assert.notEqual(genCode(), genCode());
  assert.equal(parseCode(fmtCode(c).toLowerCase()), c);
  assert.equal(parseCode("  " + fmtCode(c) + " "), c);
  assert.equal(parseCode(c.replace(/1/g, "l").replace(/0/g, "o")), c, "O/0 and I/L/1 are interchangeable");
  assert.equal(parseCode("short"), null); assert.equal(parseCode(""), null); assert.equal(parseCode(c + "A"), null);
  assert.match(genDevice(), /^[0-9a-f]{16}$/);
  assert.match(fmtCode(c), /^(\w{4}-){6}\w{2}$/);
});
