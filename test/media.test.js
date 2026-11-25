import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import { mediaFor, allImageUrls, DIR } from "../public/js/media.js";
import { S, PL, MINI } from "../public/js/data.js";
import { nextStep, stepOfExercise, steps } from "../public/js/logic.js";
import { blank } from "../public/js/store.js";

const names = [...new Set([
  ...Object.values(S).flatMap(s => s.ex.map(e => e.n)),
  ...Object.values(PL).flat().map(v => (typeof v === "string" ? v : v.n)),
  ...MINI.map(m => m.n)
])];

test("every exercise name in the plan has been looked at: a photo, or a deliberate 'no photo'", () => {
  const none = names.filter(n => !mediaFor(n)).sort();
  assert.deepEqual(none, [
    "Dead Hang", "Full-Body Mobility & Stretching", "Hollow Body Hold",
    "Nordic Hamstring Curl", "Nordic Hamstring Curl (eccentric)", "Weigh-in & Waist Measurement"
  ].sort(), "only these show the 'no photo' note");
  assert.ok(names.length - none.length >= 90, "most of the " + names.length + " names have a photo");
});

test("every photo the app refers to is in the project, both frames, and small enough", () => {
  const urls = allImageUrls();
  assert.ok(urls.length >= 40);
  for (const u of urls) { assert.ok(existsSync("public/" + u), "missing " + u); assert.ok(statSync("public/" + u).size < 150_000, u + " too big"); }
  for (const n of names) { const m = mediaFor(n); if (m) { assert.equal(m.frames.length, 2); assert.ok(m.frames.every(f => urls.includes(f) && f.startsWith(DIR))); } }
});

test("a photo that is only the closest basic exercise says so; the exact one does not", () => {
  assert.equal(mediaFor("Parallel Bar Dip").approx, false);
  assert.equal(mediaFor("Weighted Dip (8 kg)").approx, true);
  assert.equal(mediaFor("Pull-Up").approx, false);
  assert.equal(mediaFor("Archer Pull-Up").approx, true);
  assert.equal(mediaFor("Feet-Elevated Push-Up").id, "Decline_Push-Up");
  assert.equal(mediaFor("Dumbbell Hammer Curl (5 kg)").approx, false);
  assert.equal(mediaFor("Kettlebell Hammer Curl (12 kg)").approx, true);
  assert.equal(mediaFor("EMOM: Pull-Up / Dip").id, "Pullups");
  assert.equal(mediaFor("Push-Up").id, "Pushups");
  assert.equal(mediaFor("Single-Arm Kettlebell Overhead Press (12 kg)").approx, false);
  assert.equal(mediaFor("Kettlebell Push Press (12 kg)").id, "One-Arm_Kettlebell_Push_Press");
});

test("nextStep: in order, skipping what is done, wrapping to what was left behind", () => {
  const st = blank(), sp = steps(st, "lift", "push", 3);       // 5+4+4+3+4+4 steps, supersets interleaved
  const sv = {};
  assert.equal(nextStep(sp, sv, 0), 1, "nothing done yet: simply the next one");
  sv[0] = 1;                                                    // finished step 0
  assert.equal(nextStep(sp, sv, 0), 1);
  // jump straight to exercise 2, do all its sets, then carry on
  const j2 = stepOfExercise(sp, sv, 2);
  assert.equal(sp[j2].j, 2); assert.equal(sp[j2].q, 0);
  sv[2] = 4;                                                    // exercise 2 fully done out of order
  const after = nextStep(sp, sv, sp.findLastIndex(x => x.j === 2));
  assert.ok(sp[after].j !== 2 && sp[after].q >= (sv[sp[after].j] || 0), "never lands on a finished set");
  assert.equal(stepOfExercise(sp, sv, 2), -1, "a finished exercise has no step to jump to");
  // everything done -> -1
  for (const x of sp) sv[x.j] = x.n;
  assert.equal(nextStep(sp, sv, sp.length - 1), -1); assert.equal(nextStep(sp, sv, 3), -1);
  // only the current one left
  const sv2 = {}; for (const x of sp) sv2[x.j] = x.n; sv2[5] = 3;
  const last = stepOfExercise(sp, sv2, 5);
  assert.equal(nextStep(sp, sv2, last), last, "if only this one is left, it stays");
  // left behind earlier work comes back after the end
  const sv3 = {}; for (const x of sp) sv3[x.j] = x.n; sv3[1] = 0;
  assert.equal(sp[nextStep(sp, sv3, sp.length - 1)].j, 1);
});

test("nextStep: skipped steps stay skipped, so skipping can always end the session", () => {
  const st = blank(), sp = steps(st, "lift", "push", 3), sv = {};
  const skipped = new Set([0]);
  assert.equal(nextStep(sp, sv, 0, skipped), 1, "skips ahead past the skipped one");
  // skip everything one after another: must end, not loop between skipped steps
  const all = new Set(); let i = 0, guard = 0;
  while (i >= 0 && guard++ < 200) { all.add(i); i = nextStep(sp, sv, i, all); }
  assert.equal(i, -1, "every step skipped -> nothing left");
  assert.ok(guard <= sp.length + 1);
  // a skipped set is still reachable on purpose (jump from the list)
  assert.equal(stepOfExercise(sp, sv, sp[0].j), 0);
});
