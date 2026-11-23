/* Inline SVG icon set (24px grid, stroked). */
const IP = {
  play: '<path d="M8 5.6v12.8a1 1 0 0 0 1.52.85l10.2-6.4a1 1 0 0 0 0-1.7L9.52 4.75A1 1 0 0 0 8 5.6z" fill="currentColor" stroke="none"/>',
  pause: '<rect x="6.5" y="5" width="3.6" height="14" rx="1.2" fill="currentColor" stroke="none"/><rect x="13.9" y="5" width="3.6" height="14" rx="1.2" fill="currentColor" stroke="none"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  cl: '<path d="M14.5 5.5L8 12l6.5 6.5"/>',
  cr: '<path d="M9.5 5.5L16 12l-6.5 6.5"/>',
  skip: '<path d="M5.5 6l6 6-6 6M12.5 6l6 6-6 6"/>',
  back: '<path d="M9 14.5L4.5 10 9 5.5"/><path d="M4.5 10H15a4.5 4.5 0 0 1 0 9h-3"/>',
  timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 10v3.5l2.2 2.2M9.5 2.5h5"/>',
  dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
  legs: '<path d="M9 3v7l-2.5 5.5L8 21M15 3v7l2.5 5.5L16 21M9 9h6"/>',
  walk: '<circle cx="13.5" cy="4.2" r="1.7" fill="currentColor" stroke="none"/><path d="M10.2 21l2.1-5.6 2.7 2.4V21M7.8 12.4l1.6-3.8 3.6-1 2.2 3.3 2.6 1.1M12.3 15.4l1-6.6"/>',
  stretch: '<circle cx="12" cy="4.3" r="1.7" fill="currentColor" stroke="none"/><path d="M4.5 7.5l7.5 2.5 7.5-2.5M12 10v5M12 15l-3.5 6M12 15l3.5 6"/>',
  bolt: '<path d="M13.2 2.8L5.5 13.4h5.9l-1 7.8 7.7-10.6h-5.9l1-7.8z"/>',
  rings: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5a4.5 4.5 0 1 1-4.5 4.5"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="3.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  route: '<circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8.2 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.8"/>',
  chart: '<path d="M5 20v-6M10 20V9M15 20v-9M20 20V5"/>',
  trash: '<path d="M4.5 7h15M10 11v6M14 11v6M6.5 7l.8 12.2A1.8 1.8 0 0 0 9.1 21h5.8a1.8 1.8 0 0 0 1.8-1.8L17.5 7M9.5 7V4.5h5V7"/>',
  bulb: '<path d="M9.5 18h5M10.5 21h3M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  down: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14"/>',
  up: '<path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M5 19.5h14"/>'
};

export const ic = (n, c = "") => `<svg viewBox="0 0 24 24" class="ic ${c}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IP[n]}</svg>`;

const trackCol = c => `color-mix(in srgb,${c} 18%,transparent)`;

/** Progress ring pieces (track + arc) for an SVG rotated −90°. */
export function arc(cx, r, sw, pct, col, extra = "") {
  const C = 2 * Math.PI * r, p = Math.max(0, Math.min(1, pct));
  return `<circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke-width="${sw}" style="stroke:${trackCol(col)}"/>` +
    (p > 0 ? `<circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${(C * (1 - p)).toFixed(2)}" style="stroke:${col}" ${extra}/>` : "");
}

export const miniRing = (pct, col, label, sw = 6) => `<div class="mring"><svg viewBox="0 0 52 52">${arc(26, 22, sw, pct, col)}</svg>${label != null ? `<b>${label}</b>` : ""}</div>`;
