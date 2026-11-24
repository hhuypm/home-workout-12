import { test } from "node:test";
import assert from "node:assert/strict";
import { chimeSamples, wavBytes, SR } from "../public/js/audio.js";

const peak = a => a.reduce((m, x) => Math.max(m, Math.abs(x)), 0);
const rms = (a, from, to) => Math.sqrt(a.slice(from, to).reduce((s, x) => s + x * x, 0) / (to - from));

test("chime is loud: peak near full scale, strong body", () => {
  const s = chimeSamples();
  assert.ok(peak(s) >= 0.94 && peak(s) <= 1, "peak " + peak(s));
  // the first note's body should be well above a tenth of full scale (the old beep sat around 0.3 × a fast decay)
  assert.ok(rms(s, Math.round(SR * 0.02), Math.round(SR * 0.15)) > 0.35, "rms " + rms(s, 882, 6615));
});

test("chime length: two bursts of three notes, ~2 seconds, no clicks at the edges", () => {
  const s = chimeSamples();
  const sec = s.length / SR;
  assert.ok(sec > 1.6 && sec < 3, "duration " + sec);
  assert.ok(Math.abs(s[0]) < 0.02, "starts silent");
  assert.ok(Math.abs(s[s.length - 1]) < 0.02, "ends silent");
  assert.ok(chimeSamples({ bursts: 1 }).length < s.length * 0.6);
});

test("chime notes rise: the last note of a burst is higher than the first", () => {
  const f = (s, from, to) => { let z = 0; for (let i = from + 1; i < to; i++) if (s[i - 1] <= 0 && s[i] > 0) z++; return z / ((to - from) / SR); };
  const s = chimeSamples({ bursts: 1 });
  const first = f(s, Math.round(SR * 0.03), Math.round(SR * 0.15));
  const last = f(s, s.length - Math.round(SR * 0.3), s.length - Math.round(SR * 0.08));
  assert.ok(last > first * 1.3, `first ${first.toFixed(0)} Hz, last ${last.toFixed(0)} Hz`);
});

test("wav file is a valid 16-bit mono PCM file", () => {
  const w = wavBytes(chimeSamples({ bursts: 1 }));
  const txt = (o, n) => String.fromCharCode(...w.slice(o, o + n));
  assert.equal(txt(0, 4), "RIFF"); assert.equal(txt(8, 4), "WAVE"); assert.equal(txt(36, 4), "data");
  const dv = new DataView(w.buffer);
  assert.equal(dv.getUint16(22, true), 1, "mono"); assert.equal(dv.getUint32(24, true), SR); assert.equal(dv.getUint16(34, true), 16);
  assert.equal(dv.getUint32(40, true), w.length - 44);
  let max = 0; for (let i = 44; i < w.length; i += 2) max = Math.max(max, Math.abs(dv.getInt16(i, true)));
  assert.ok(max > 30000, "uses nearly the full 16-bit range: " + max);
});
