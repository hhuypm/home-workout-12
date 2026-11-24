/* "Hết giờ" notifications for the countdown timers.
 * Two paths, both ending in the same notification (same tag, so it never shows twice):
 *  - the page shows it itself if the timer ends while the app is in the background;
 *  - for timers up to ~4.5 min (rest) the page also asks the service worker to fire it,
 *    in case the OS has frozen the page. See sw.js.
 * Notifications are never shown while the app is on screen. */

const PREF = "player12-notify";
export const SW_MAX_MS = 285000;

/* Sound and vibration switches. They apply to the in-app chime and to the notification. */
export const RING = [300, 120, 300, 120, 500];
const flag = key => { try { return localStorage.getItem(key) !== "off"; } catch (e) { return true; } };
const setFlag = (key, on) => { try { localStorage.setItem(key, on ? "on" : "off"); } catch (e) {} };
export const soundOn = () => flag("player12-sound");
export const vibOn = () => flag("player12-vibrate");
export const setSound = on => setFlag("player12-sound", on);
export const setVib = on => setFlag("player12-vibrate", on);
export const canVibrate = () => typeof navigator !== "undefined" && typeof navigator.vibrate === "function";

/** What a notification should do. `silent` mutes both sound and vibration, so it is only set when both are off,
    and browsers reject a silent notification that also names a vibration pattern. */
export const fx = (sound = soundOn(), vib = vibOn()) => !sound && !vib ? { silent: true } : { silent: false, vibrate: vib ? RING : [] };

export const supported = () => "Notification" in window && "serviceWorker" in navigator;
export const permission = () => supported() ? Notification.permission : "unsupported";

/** The user's own on/off switch (kept apart from workout data so a backup restore can't flip it). */
export const wanted = () => { try { return localStorage.getItem(PREF) !== "off"; } catch (e) { return true; } };
export const setWanted = on => { try { localStorage.setItem(PREF, on ? "on" : "off"); } catch (e) {} };
export const enabled = () => permission() === "granted" && wanted();

/** Must be called from a tap. Resolves to the resulting permission. */
export async function ask() {
  if (!supported()) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  try { return await Notification.requestPermission(); } catch (e) { return Notification.permission; }
}

/** Notification text for a timer: kind = rest | hold | emom | walk. */
export function textFor(kind, o = {}) {
  switch (kind) {
    case "rest": return { title: "Hết giờ rest", body: o.next ? `Tiếp theo: ${o.next}${o.n > 1 ? ` · set ${o.q + 1}/${o.n}` : ""}` : "Vào set tiếp theo" };
    case "hold": return { title: "Hết giờ", body: o.name ? `${o.name}: xong. Đổi bên hoặc bấm tiếp.` : "Xong." };
    case "emom": return { title: "EMOM xong", body: "Hết thời gian. Nghỉ rồi qua bài tiếp theo." };
    case "walk": return { title: "Incline Walk xong", body: `Đủ ${o.target} phút. Hạ tốc độ đi chậm vài phút để hồi.` };
    default: return { title: "Hết giờ", body: "" };
  }
}

const options = note => ({ body: note.body, tag: "timer", renotify: true, ...fx(), icon: "icons/icon-192.png", badge: "icons/icon-192.png", data: { url: "./" } });

const reg = () => navigator.serviceWorker.ready;

/** Show a notification right now through the service worker registration. */
export async function show(note) {
  try { const r = await reg(); await r.showNotification(note.title, options(note)); return true; } catch (e) { return false; }
}

/** Ask the service worker to show `note` at wall-clock time `at` (ms), if it is close enough. */
export function schedule(at, note) {
  if (at - Date.now() > SW_MAX_MS) return;
  reg().then(r => r.active && r.active.postMessage({ type: "schedule", id: "timer", at, note, fx: fx() })).catch(() => {});
}
export function cancel() {
  reg().then(r => r.active && r.active.postMessage({ type: "cancel", id: "timer" })).catch(() => {});
}

/** Remove a shown timer notification (when the user is back in the app). */
export async function clear() {
  try { const r = await reg(); (await r.getNotifications({ tag: "timer" })).forEach(n => n.close()); } catch (e) {}
}
