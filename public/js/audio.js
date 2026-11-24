/* Alarm sound.
 *
 * Why this is more than a beep():
 *  - Phones suspend the audio engine when the screen locks or the app is switched away, and a page
 *    can only wake it from a tap. So we wake it on every tap (listen()), and when the alarm fires we
 *    wait for it to be running before playing.
 *  - If the engine still won't start, we fall back to a plain <audio> element that was unlocked by an
 *    earlier tap. One of the two almost always works.
 *  - The chime is a loud, bright waveform (phone speakers are weak below ~800 Hz) rendered once as
 *    samples, so all notes keep exact timing instead of relying on setTimeout.
 */

export const SR = 44100;

/** Chime samples (mono, -1..1): `bursts` groups of three rising notes. Pure function, no browser APIs. */
export function chimeSamples({ sr = SR, notes = [1319, 1568, 1976], noteMs = 170, lastMs = 420, gapMs = 30, bursts = 2, burstGapMs = 220, peak = 0.95 } = {}) {
  const ms = x => Math.round(sr * x / 1000);
  const plan = [];                                  // [freq, startSample, lengthSamples]
  let at = 0;
  for (let b = 0; b < bursts; b++) {
    notes.forEach((f, i) => {
      const len = ms(i === notes.length - 1 ? lastMs : noteMs);
      plan.push([f, at, len]);
      at += len + (i < notes.length - 1 ? ms(gapMs) : 0);
    });
    if (b < bursts - 1) at += ms(burstGapMs);
  }
  const out = new Float32Array(at);
  const atk = ms(4), rel = ms(40);
  for (const [f, start, len] of plan) {
    for (let i = 0; i < len; i++) {
      const t = i / sr, w = 2 * Math.PI * f * t;
      // fundamental + odd harmonics: a bright, square-ish bell that cuts through a small speaker
      const v = Math.sin(w) + 0.45 * Math.sin(3 * w) + 0.25 * Math.sin(5 * w);
      const env = Math.min(1, i / atk, (len - i) / rel) * Math.exp(-3 * i / len * 0.35);
      out[start + i] += v * Math.max(0, env);
    }
  }
  let max = 0;
  for (let i = 0; i < out.length; i++) max = Math.max(max, Math.abs(out[i]));
  const k = max ? peak / max : 1;
  for (let i = 0; i < out.length; i++) out[i] *= k;
  return out;
}

/** 16-bit PCM WAV file bytes for a sample array. */
export function wavBytes(samples, sr = SR) {
  const n = samples.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const str = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); str(8, "WAVE"); str(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, "data"); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), true);
  return new Uint8Array(buf);
}

/* ---------- runtime (browser only) ---------- */
let ctx = null, buf = null, el = null, unlocked = false;
const samples = () => samples.v || (samples.v = chimeSamples());

function engine() {
  if (ctx) return ctx;
  try {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    const s = samples();
    buf = ctx.createBuffer(1, s.length, SR);
    buf.copyToChannel(s, 0);
  } catch (e) { ctx = null; }
  return ctx;
}

function element() {
  if (el) return el;
  try {
    el = new Audio(URL.createObjectURL(new Blob([wavBytes(samples())], { type: "audio/wav" })));
    el.preload = "auto";
  } catch (e) { el = null; }
  return el;
}

/** Call from a tap: wakes the engine and unlocks the fallback element. Cheap to call repeatedly. */
export function wake() {
  const c = engine();
  if (c && c.state !== "running") { try { c.resume(); } catch (e) {} }
  const a = element();
  if (a && !unlocked) {
    unlocked = true;
    try { a.muted = true; const p = a.play(); (p && p.then ? p : Promise.resolve()).then(() => { a.pause(); a.currentTime = 0; a.muted = false; }).catch(() => { unlocked = false; a.muted = false; }); } catch (e) { unlocked = false; a.muted = false; }
  }
}

/** Wake the engine on every tap, and when the app comes back to the screen. Call once at start-up. */
export function listen() {
  document.addEventListener("pointerdown", wake, { capture: true, passive: true });
  document.addEventListener("keydown", wake, { capture: true, passive: true });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && ctx && ctx.state !== "running") { try { ctx.resume(); } catch (e) {} } });
}

const running = async c => {
  if (c.state === "running") return true;
  try { await Promise.race([c.resume(), new Promise(r => setTimeout(r, 400))]); } catch (e) {}
  return c.state === "running";
};

/** Play the chime. Resolves to "webaudio", "element" or "none". */
export async function chime(volume = 1) {
  const c = engine();
  if (c && await running(c)) {
    const src = c.createBufferSource(), g = c.createGain();
    src.buffer = buf; g.gain.value = volume;
    src.connect(g); g.connect(c.destination); src.start();
    return "webaudio";
  }
  const a = element();
  if (a) { try { a.currentTime = 0; a.volume = volume; await a.play(); return "element"; } catch (e) {} }
  return "none";
}

/** A short tone (countdown ticks, set done). Louder and longer than a bare sine blip; skipped if the engine is asleep. */
export function tone(freq, dur = 0.12, volume = 0.6) {
  const c = engine();
  if (!c || c.state !== "running") { if (c) { try { c.resume(); } catch (e) {} } return; }
  const o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
  o.type = "triangle"; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(volume, t + 0.01);
  g.gain.setValueAtTime(volume, t + Math.max(0.01, dur - 0.04)); g.gain.linearRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
}
