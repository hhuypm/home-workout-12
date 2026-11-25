/* Schedule + progress rules. Pure functions: no DOM, no storage. `st` is the saved state object. */
import { START, WEEKS, S, MINI, WEEK, PH, PL, LIFT, GOALS } from "./data.js";

/* ---------- dates ---------- */
export const pad = n => String(n).padStart(2, "0");
export const fmt = d => pad(d.getDate()) + "/" + pad(d.getMonth() + 1);
export const iso = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
export const addD = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const dateOf = (w, i) => addD(START, (w - 1) * 7 + i);
export const mmss = s => Math.floor(s / 60) + ":" + pad(Math.max(0, s) % 60);
export const dayStart = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Where a calendar date falls in the program. curW may be <1 or >12; wNow is clamped. */
export function position(date) {
  const today = dayStart(date);
  const curW = Math.floor(Math.round((today - START) / 864e5) / 7) + 1;
  return { today, curW, wNow: Math.min(WEEKS, Math.max(1, curW)), dNow: (today.getDay() + 6) % 7, inProg: curW >= 1 && curW <= WEEKS };
}

/* ---------- weekly prescription ---------- */
export const isDeload = w => w === 5 || w === 10;
export const phaseOf = w => PH.find(p => w >= p.w[0] && w <= p.w[1]);

/** Incline-walk target in minutes for session kind k in week w. */
export const walkT = (w, k) =>
  k === "rest" ? (isDeload(w) ? 20 : w <= 2 ? 25 : w <= 4 ? 35 : w <= 9 ? 40 : 45)
  : ["push", "pull", "upper"].includes(k) ? (w <= 2 || isDeload(w) ? 10 : w <= 4 ? 15 : 20)
  : k === "stretch" ? (isDeload(w) ? 15 : 20)
  : 0;

export const incl = w => isDeload(w) ? "5–6%" : w <= 2 ? "8%" : w <= 4 ? "10%" : "10–12%";

/** Sets actually done: deload = half (rounded up); weeks 1–2 the 5-set main lift drops to 4. */
export const effS = (s, w, i) => isDeload(w) ? Math.max(1, Math.ceil(s / 2)) : (w <= 2 && s === 5 && i === 0) ? 4 : s;

/* ---------- progression levels ---------- */
export const lvOf = (st, pk) => Math.min(+(st.lvl[pk] || 0), PL[pk].length - 1);
export const lvName = (pk, i) => { const v = PL[pk][i]; return typeof v === "string" ? v : v.n; };

/** Exercises of lift session k with the user's current level applied. */
export function liftEx(st, k) {
  return S[k].ex.map((e, j) => {
    const pk = k + "-" + j, L = PL[pk];
    if (!L) return e;
    const i = lvOf(st, pk), v = L[i];
    const o = Object.assign({}, e, { n: typeof v === "string" ? v : v.n, pk, lv: i, lvN: L.length });
    if (v.emom) { o.emom = v.emom; o.r = v.emom + " phút · mỗi phút ~50% max reps"; }
    if (i > 0 && e.n.startsWith("Kettlebell Swing Finisher") && /reps/.test(o.n)) o.r = o.n.match(/\d+ reps/)[0] + ", ít rest nhất";
    return o;
  });
}

/** Days the user hit top reps on every set since the last level change. */
export const hitsSince = (st, pk) => { const a = st.hit[pk] || [], from = (st.lvlD || {})[pk] || ""; return a.filter(d => d > from); };
/** Ready to level up: 2+ top-rep days since the last change, and not at the last level. */
export const ready = (st, pk) => !!PL[pk] && lvOf(st, pk) < PL[pk].length - 1 && hitsSince(st, pk).length >= 2;

/* ---------- sessions ---------- */
export function exFor(st, kind, k) {
  return kind === "mini" ? MINI.filter(m => !(m.push && (k === "push" || k === "upper"))) : liftEx(st, k);
}

/**
 * Ordered set-by-set steps of a session: {j: exercise index, q: set index, n: sets of that exercise, rest: seconds after}.
 * Supersets interleave A1 → B1 → rest → A2 → B2. Mini circuit = 3 rounds, 60s between rounds.
 */
export function steps(st, kind, k, w) {
  const ex = exFor(st, kind, k), out = [];
  let i = 0;
  if (kind === "mini") {
    for (let q = 0; q < 3; q++) ex.forEach((e, j) => out.push({ j, q, n: 3, rest: j === ex.length - 1 && q < 2 ? 60 : 0 }));
    return out;
  }
  while (i < ex.length) {
    const e = ex[i], f = ex[i + 1];
    if (e.ss && f && f.ss === e.ss) {
      const n1 = effS(e.s, w, i), n2 = effS(f.s, w, i + 1), m = Math.max(n1, n2);
      for (let q = 0; q < m; q++) {
        if (q < n1) out.push({ j: i, q, n: n1, rest: 0 });
        if (q < n2) out.push({ j: i + 1, q, n: n2, rest: f.sec });
      }
      i += 2;
    } else {
      const n = effS(e.s, w, i);
      for (let q = 0; q < n; q++) out.push({ j: i, q, n, rest: e.sec });
      i++;
    }
  }
  if (out.length) out[out.length - 1].rest = 0;
  return out;
}

/** Sets done / total for one session on the day stored under `key` (ISO date). */
export function prog(st, kind, k, w, key) {
  const sp = steps(st, kind, k, w), s = (kind === "mini" ? st.mini : st.sets)[key] || {};
  return { dn: sp.filter(x => x.q < (s[x.j] || 0)).length, tot: sp.length };
}

/** Everything about day i (0 = Monday) of week w. */
export function dayInfo(st, w, i) {
  const k = WEEK[i][1], key = iso(dateOf(w, i));
  return { k, key, L: prog(st, "lift", k, w, key), M: prog(st, "mini", k, w, key), wt: walkT(w, k), wm: +(st.walk[key] || 0) };
}

/** Week totals + the three weekly goals (4 strength sessions, ≥90% walk minutes, ≥5 mini days). */
export function weekSummary(st, w) {
  const lifts = [];
  let walk = 0, walkTarget = 0, mini = 0;
  for (let i = 0; i < 7; i++) {
    const d = dayInfo(st, w, i);
    if (LIFT.includes(d.k)) lifts.push(d.L.dn >= d.L.tot);
    walk += d.wm; walkTarget += d.wt;
    if (d.M.dn >= d.M.tot) mini++;
  }
  const liftsDone = lifts.filter(Boolean).length;
  const walkNeed = Math.ceil(walkTarget * GOALS.walkPct);
  const ok = { lifts: liftsDone >= GOALS.lifts, walk: walk >= walkNeed, mini: mini >= GOALS.miniDays };
  return { lifts, liftsDone, walk, walkTarget, walkNeed, mini, ok, met: Object.values(ok).filter(Boolean).length };
}

/* ---------- moving around inside a session ---------- */
const todo = (sv, x) => x.q >= (sv[x.j] || 0);

/** Next step still to do after step `from`; wraps to anything left behind; -1 when everything is done.
 *  Steps in `skipped` (indices the user chose to skip) are left alone. If only `from` itself is left, that comes back. */
export function nextStep(sp, sv, from, skipped = new Set()) {
  const open = i => todo(sv, sp[i]) && !skipped.has(i);
  for (let i = from + 1; i < sp.length; i++) if (open(i)) return i;
  for (let i = 0; i <= from && i < sp.length; i++) if (open(i)) return i;
  return -1;
}

/** First step still to do for exercise `j`, or -1 when that exercise is finished. */
export const stepOfExercise = (sp, sv, j) => sp.findIndex(x => x.j === j && todo(sv, x));
