/* Saved state: one JSON object in localStorage, plus backup export / import. */

export const KEY = "player12";
const OBJ = ["sets", "mini", "walk", "tests", "lvl", "hit", "lvlD", "lvlH", "time"];

/**
 * Shape:
 *  sets  {isoDate: {exIndex: setsDone}}   strength sets done per day
 *  mini  {isoDate: {exIndex: roundsDone}} mini-circuit rounds per day
 *  walk  {isoDate: minutes}               incline-walk minutes per day
 *  tests {id: {a, b}}                     max test, week 1 (a) and week 12 (b)
 *  body  [{d, kg, w}]                     weigh-ins (date, weight kg, waist cm)
 *  lvl   {slot: levelIndex}               current progression level (0 = level 1)
 *  hit   {slot: [isoDate]}                days every set hit top reps
 *  lvlD  {slot: isoDate}                  date of the last level change
 *  lvlH  {slot: [{d, to}]}                level-up history
 *  time  {isoDate: {lift, mini}}          seconds spent in the strength / mini-circuit player that day
 */
export const blank = () => ({ sets: {}, mini: {}, walk: {}, tests: {}, body: [], lvl: {}, hit: {}, lvlD: {}, lvlH: {}, time: {} });

/** Coerce anything into a valid state object (bad or missing parts become empty). */
export function normalize(raw) {
  const st = Object.assign(blank(), raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {});
  OBJ.forEach(k => { if (!st[k] || typeof st[k] !== "object" || Array.isArray(st[k])) st[k] = {}; });
  st.body = Array.isArray(st.body) ? st.body.filter(r => r && typeof r.d === "string") : [];
  return st;
}

export function load() {
  try { const r = localStorage.getItem(KEY); if (r) return normalize(JSON.parse(r)); } catch (e) {}
  return blank();
}

let saveHook = null;
/** Something (the sync log) that wants to see every save. */
export const setSaveHook = f => { saveHook = f; };

/** Returns false when the browser refused the write (private mode, quota). */
export function save(st) {
  try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { return false; }
  if (saveHook) { try { saveHook(st); } catch (e) {} }
  return true;
}

/** Write without telling the sync log (used when the data just came from another device). */
export function saveQuiet(st) {
  try { localStorage.setItem(KEY, JSON.stringify(st)); return true; } catch (e) { return false; }
}

/** Backup file contents. */
export const exportJSON = st => JSON.stringify({ app: "home-workout-12", version: 1, exported: new Date().toISOString(), data: st }, null, 2);

/** Parse a backup file (or a raw state object). Throws on anything that isn't one. */
export function importJSON(text) {
  const o = JSON.parse(text);
  const data = o && o.app === "home-workout-12" ? o.data : o;
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("not a backup");
  if (![...OBJ, "body"].some(k => k in data)) throw new Error("not a backup");
  return normalize(data);
}

/** Has the user recorded anything yet? Empty per-day entries don't count. */
const hasData = v => v !== null && v !== "" && v !== 0 && (typeof v !== "object" || Object.values(v).some(hasData));
export const isEmpty = st => !OBJ.some(k => hasData(st[k])) && !st.body.length;
