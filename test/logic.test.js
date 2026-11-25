import { test } from "node:test";
import assert from "node:assert/strict";
import * as L from "../public/js/logic.js";
import { blank, normalize, exportJSON, importJSON, isEmpty } from "../public/js/store.js";
import { PL, S, WEEK } from "../public/js/data.js";

const D = (y, m, d) => new Date(y, m - 1, d);

test("program position: week and weekday from the calendar", () => {
  assert.deepEqual(pick(L.position(D(2026, 11, 23))), { curW: 1, wNow: 1, dNow: 0, inProg: true });   // Monday, day 1
  assert.deepEqual(pick(L.position(D(2026, 11, 29))), { curW: 1, wNow: 1, dNow: 6, inProg: true });   // Sunday week 1
  assert.deepEqual(pick(L.position(D(2026, 11, 30))), { curW: 2, wNow: 2, dNow: 0, inProg: true });
  assert.deepEqual(pick(L.position(D(2027, 2, 14))), { curW: 12, wNow: 12, dNow: 6, inProg: true });  // last day
  assert.deepEqual(pick(L.position(D(2027, 2, 15))), { curW: 13, wNow: 12, dNow: 0, inProg: false });
  assert.deepEqual(pick(L.position(D(2026, 11, 22))), { curW: 0, wNow: 1, dNow: 6, inProg: false });
  assert.equal(L.iso(L.dateOf(5, 0)), "2026-12-21");
  assert.equal(L.iso(L.dateOf(12, 6)), "2027-02-14");
});

test("effective sets: deload halves, weeks 1–2 trim the 5-set main lift", () => {
  assert.equal(L.effS(5, 1, 0), 4);
  assert.equal(L.effS(5, 2, 0), 4);
  assert.equal(L.effS(5, 1, 3), 5);     // Kettlebell Swing is not the main lift
  assert.equal(L.effS(5, 3, 0), 5);
  assert.equal(L.effS(5, 5, 0), 3);
  assert.equal(L.effS(4, 10, 1), 2);
  assert.equal(L.effS(3, 5, 2), 2);
  assert.equal(L.effS(1, 5, 0), 1);
});

test("walk targets and incline match the plan's weekly table", () => {
  //        week: rest, after strength, Sunday, weekly total, incline
  const table = { 1: [25, 10, 20, 100, "8%"], 2: [25, 10, 20, 100, "8%"], 3: [35, 15, 20, 135, "10%"], 4: [35, 15, 20, 135, "10%"],
    5: [20, 10, 15, 85, "5–6%"], 6: [40, 20, 20, 160, "10–12%"], 9: [40, 20, 20, 160, "10–12%"], 10: [20, 10, 15, 85, "5–6%"],
    11: [45, 20, 20, 170, "10–12%"], 12: [45, 20, 20, 170, "10–12%"] };
  for (const [w, [rest, after, sun, total, inc]] of Object.entries(table)) {
    assert.equal(L.walkT(+w, "rest"), rest, `rest w${w}`);
    for (const k of ["push", "pull", "upper"]) assert.equal(L.walkT(+w, k), after, `${k} w${w}`);
    assert.equal(L.walkT(+w, "stretch"), sun, `sunday w${w}`);
    assert.equal(L.walkT(+w, "legs"), 0);
    assert.equal(WEEK.reduce((a, [, k]) => a + L.walkT(+w, k), 0), total, `total w${w}`);
    assert.equal(L.incl(+w), inc);
  }
});

test("steps: supersets interleave and rest only after the second exercise", () => {
  const st = blank(), sp = L.steps(st, "lift", "push", 3);
  assert.equal(sp.length, 5 + 4 + 4 + 3 + 4 + 4);
  assert.deepEqual(sp.slice(0, 5).map(x => [x.j, x.rest]), Array(5).fill([0, 120]));
  // SS1: press (j=1, no rest) → push-up (j=2, 90s) × 4
  assert.deepEqual(sp.slice(5, 13).map(x => [x.j, x.q, x.rest]), [[1, 0, 0], [2, 0, 90], [1, 1, 0], [2, 1, 90], [1, 2, 0], [2, 2, 90], [1, 3, 0], [2, 3, 90]]);
  assert.equal(sp.at(-1).rest, 0, "no rest after the very last set");
  assert.equal(L.steps(st, "lift", "push", 1).length, 23);  // main lift 4 sets
  assert.equal(L.steps(st, "lift", "push", 5).length, 3 + 2 + 2 + 2 + 2 + 2);
  // uneven superset on Pull day: Face Pull 3 sets, Biceps Curl 4 sets
  const tail = L.steps(st, "lift", "pull", 3).slice(-7).map(x => x.j);
  assert.deepEqual(tail, [4, 5, 4, 5, 4, 5, 5]);
  assert.equal(L.steps(st, "lift", "rest", 3).length, 0);
});

test("mini circuit: 3 rounds, push-up dropped on Push and Upper days", () => {
  const st = blank();
  const full = L.steps(st, "mini", "rest", 1), core = L.steps(st, "mini", "push", 1);
  assert.equal(full.length, 9);
  assert.equal(core.length, 6);
  assert.equal(L.steps(st, "mini", "upper", 1).length, 6);
  assert.deepEqual(full.map(x => x.rest), [0, 0, 60, 0, 0, 60, 0, 0, 0]);
});

test("progress counts finished sets per day", () => {
  const st = blank(), key = L.iso(L.dateOf(1, 1));   // Tuesday week 1 = Push
  assert.deepEqual(L.prog(st, "lift", "push", 1, key), { dn: 0, tot: 23 });
  st.sets[key] = { 0: 4, 1: 2, 2: 1 };
  assert.deepEqual(L.prog(st, "lift", "push", 1, key), { dn: 7, tot: 23 });
  const d = L.dayInfo(st, 1, 1);
  assert.equal(d.k, "push"); assert.equal(d.key, "2026-11-24"); assert.equal(d.wt, 10); assert.equal(d.M.tot, 6);
});

test("levels: ready after two top-rep days since the last change", () => {
  const st = blank(), pk = "pull-0";
  assert.equal(L.ready(st, pk), false);
  st.hit[pk] = ["2026-11-25"];
  assert.equal(L.ready(st, pk), false);
  st.hit[pk].push("2026-12-02");
  assert.equal(L.ready(st, pk), true);
  st.lvl[pk] = 1; st.lvlD[pk] = "2026-12-02";      // levelled up: count restarts
  assert.equal(L.hitsSince(st, pk).length, 0);
  assert.equal(L.ready(st, pk), false);
  assert.equal(L.liftEx(st, "pull")[0].n, "Weighted Pull-Up (8 kg)");
  st.lvl[pk] = 99;                                   // clamped to the last level, never "ready"
  st.hit[pk].push("2026-12-09", "2026-12-16");
  assert.equal(L.lvOf(st, pk), PL[pk].length - 1);
  assert.equal(L.ready(st, pk), false);
});

test("levels: EMOM and finisher prescriptions follow the level", () => {
  const st = blank();
  st.lvl["upper-0"] = 1; st.lvl["upper-5"] = 2;
  const ex = L.liftEx(st, "upper");
  assert.equal(ex[0].emom, 15);
  assert.match(ex[0].r, /^15 phút/);
  assert.match(ex[5].r, /^100 reps/);
  for (const k of ["push", "pull", "legs", "upper"]) S[k].ex.forEach((e, j) => assert.equal(L.lvName(k + "-" + j, 0).replace(/\*$/, ""), e.n, "level 1 is the base exercise"));
});

test("weekly goals: 4 sessions, ≥90% walk minutes, ≥5 mini days", () => {
  const st = blank(), w = 1;
  let g = L.weekSummary(st, w);
  assert.equal(g.walkTarget, 100); assert.equal(g.walkNeed, 90); assert.equal(g.met, 0);
  WEEK.forEach(([, k], i) => {
    const key = L.iso(L.dateOf(w, i));
    if (["push", "pull", "legs", "upper"].includes(k)) { st.sets[key] = {}; L.steps(st, "lift", k, w).forEach(x => { st.sets[key][x.j] = x.n; }); }
    if (i < 5) st.mini[key] = { 0: 3, 1: 3, 2: 3 };
  });
  st.walk["2026-11-23"] = 89;
  g = L.weekSummary(st, w);
  assert.deepEqual(g.ok, { lifts: true, walk: false, mini: true });
  assert.equal(g.liftsDone, 4); assert.equal(g.mini, 5);
  st.walk["2026-11-24"] = 1;
  assert.equal(L.weekSummary(st, w).met, 3);
});

test("backup round-trips and rejects foreign files", () => {
  const st = blank();
  st.sets["2026-11-24"] = { 0: 4 }; st.body.push({ d: "2026-11-29", kg: 70.5, w: 82 }); st.lvl["push-0"] = 1;
  assert.deepEqual(importJSON(exportJSON(st)), st);
  assert.deepEqual(importJSON(JSON.stringify(st)), st, "raw state object also accepted");
  assert.throws(() => importJSON("not json"));
  assert.throws(() => importJSON('{"hello":1}'));
  assert.throws(() => importJSON("[1,2]"));
  assert.deepEqual(normalize({ sets: "x", body: [null, { d: "2026-11-29" }] }), { ...blank(), body: [{ d: "2026-11-29" }] });
  assert.equal(isEmpty(blank()), true); assert.equal(isEmpty(st), false);
  assert.equal(isEmpty({ ...blank(), sets: { "2026-11-24": {} }, walk: { "2026-11-24": 0 }, tests: { pu: { a: "" } } }), true, "empty entries are not data");
  assert.equal(isEmpty({ ...blank(), lvl: { "push-0": 1 } }), false);
});

function pick({ curW, wNow, dNow, inProg }) { return { curW, wNow, dNow, inProg }; }

test("saved data from before the clock existed still loads, with an empty time log", () => {
  const old = { sets: { "2026-11-24": { 0: 4 } }, mini: {}, walk: {}, tests: {}, body: [], lvl: {}, hit: {}, lvlD: {}, lvlH: {} };   // no `time`
  const st = normalize(old);
  assert.deepEqual(st.time, {});
  assert.deepEqual(importJSON(JSON.stringify(old)).time, {});
  assert.equal(isEmpty(normalize({ time: { "2026-11-24": { lift: 0 } } })), true, "an empty entry is not data");
  assert.equal(isEmpty(normalize({ time: { "2026-11-24": { lift: 60 } } })), false);
});
