/* UI: four tabs + the full-screen player. All numbers come from the schedule (logic.js) and the saved state (store.js). */
import { S, WEEK, DAYN, LIFT, PH, PL, TESTS, GOALS, WEEKS } from "./data.js";
import * as L from "./logic.js";
import { fmt, iso, addD, dateOf, mmss, incl, effS, phaseOf, lvName } from "./logic.js";
import * as store from "./store.js";
import { ic, arc, miniRing } from "./icons.js";
import * as N from "./notify.js";
import * as A from "./audio.js";
import * as Sync from "./sync.js";
import { fmtCode } from "./sync-model.js";

let st = store.load();
const save = () => store.save(st);
const $ = id => document.getElementById(id);

/* state-bound shorthands */
const liftEx = k => L.liftEx(st, k);
const exFor = (kind, k) => L.exFor(st, kind, k);
const steps = (kind, k, w) => L.steps(st, kind, k, w);
const dayInfo = (w, i) => L.dayInfo(st, w, i);
const lvOf = pk => L.lvOf(st, pk);
const hitsSince = pk => L.hitsSince(st, pk);
const ready = pk => L.ready(st, pk);
const dl = L.isDeload;
function setsOf(kind, key) { const o = kind === "mini" ? st.mini : st.sets; return o[key] = o[key] || {}; }

let { today, curW, wNow, dNow, inProg } = L.position(new Date());
let selW = wNow, selI = inProg ? dNow : 0;

const RM = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const dmy = d => d.split("-").reverse().join("/");
const num = n => String(n).replace(".", ",");

const qName = n => n.replace(/\s*\([^)]*\)/g, "").replace(/^EMOM( \d+')?:\s*/, "").replace(" / ", " and ").trim();
const howLinks = n => {
  const q = encodeURIComponent(qName(n)), nm = n.replace(/"/g, "&quot;");
  return `<div class="how"><a href="https://www.google.com/search?tbm=isch&q=${q}%20exercise" target="_blank" rel="noopener" aria-label="Xem hình: ${nm}">${ic("target")}Xem hình</a><a href="https://www.youtube.com/results?search_query=${q}%20proper%20form" target="_blank" rel="noopener" aria-label="Video mẫu: ${nm}">${ic("play")}Video mẫu</a></div>`;
};
const cap = t => t.charAt(0).toUpperCase() + t.slice(1);

/* ================= Hôm nay ================= */
function renderToday() {
  const d = dayInfo(selW, selI), s = S[d.k], ph = phaseOf(selW), dt = dateOf(selW, selI), isT = iso(dt) === iso(today);
  const isLift = d.L.tot > 0;
  const h = `<header class="vhead"><div><div class="dl">${isT ? DAYN[selI] + ", " + dt.getDate() + " tháng " + (dt.getMonth() + 1) : dt.getDate() + " tháng " + (dt.getMonth() + 1) + " · Tuần " + selW}</div><h1>${isT ? "Hôm nay" : DAYN[selI]}</h1></div>${!isT && inProg ? `<button class="pill press" data-today="1">${ic("cl")}Hôm nay</button>` : `<span class="pill">Tuần ${selW}/${WEEKS}</span>`}</header>`;

  /* three rings */
  const rows = [
    ["Strength", isLift ? d.L.dn / d.L.tot : 0, isLift ? `${d.L.dn}<small>/${d.L.tot} set</small>` : `Rest`, isLift ? s.c : "var(--ink3)", !isLift],
    ["Incline Walk", d.wt ? d.wm / d.wt : (d.wm ? 1 : 0), d.wt ? `${d.wm}<small>/${d.wt} phút</small>` : (d.wm ? `${d.wm}<small> phút</small>` : "Rest"), "var(--walk)", !d.wt && !d.wm],
    ["Mini", d.M.tot ? d.M.dn / d.M.tot : 0, `${d.M.dn}<small>/${d.M.tot} set</small>`, "var(--mini)", false]];
  const ringCols = [isLift ? s.c : "var(--ink3)", "var(--walk)", "var(--mini)"];
  const sum = `<div class="card sum"><svg viewBox="0 0 128 128" aria-hidden="true">${arc(64, 56, 14, rows[0][1], ringCols[0])}${arc(64, 39, 14, rows[1][1], ringCols[1])}${arc(64, 22, 14, rows[2][1], ringCols[2])}</svg>
  <div class="legend">${rows.map(r => `<div class="lg${r[4] ? " off" : ""}" style="--c:${r[3]}"><i></i><span>${r[0]}</span><b>${r[2]}</b></div>`).join("")}</div></div>`;

  /* week strip */
  const strip = `<div class="card wk"><div class="wkh"><div><b>Tuần ${selW} · ${ph.t}</b><span>${fmt(dateOf(selW, 0))} – ${fmt(dateOf(selW, 6))}</span></div><button class="ar press" id="pw" aria-label="Tuần trước" ${selW <= 1 ? "disabled" : ""}>${ic("cl")}</button><button class="ar press" id="nw" aria-label="Tuần sau" ${selW >= WEEKS ? "disabled" : ""}>${ic("cr")}</button></div>
  <div class="days7">${WEEK.map(([n, k], i) => {
    const x = dayInfo(selW, i), pc = x.L.tot ? x.L.dn / x.L.tot : x.wt ? x.wm / x.wt : 0, ok = pc >= 1;
    const t = iso(dateOf(selW, i)) === iso(today), c = S[k].c;
    return `<button class="dbtn${i === selI ? " sel" : ""}${t ? " today" : ""}" style="--c:${c}" data-d="${i}" aria-pressed="${i === selI}" ${t ? ' aria-current="date"' : ""}><span class="wd">${n}</span><span class="dr"><svg viewBox="0 0 38 38">${arc(19, 16, 4, ok ? 1 : pc, c)}</svg><b>${ok ? ic("check") : dateOf(selW, i).getDate()}</b></span><span class="vh">, ${DAYN[i]} ${fmt(dateOf(selW, i))}, ${S[k].name}${ok ? ", đã xong" : ""}</span></button>`;
  }).join("")}</div></div>`;

  /* walk card (hero on rest days, small card otherwise) */
  const walkBlock = main => {
    const pct = d.wt ? Math.min(1, d.wm / d.wt) : 0;
    const ctx = ["push", "pull", "upper"].includes(d.k) ? "sau strength session" : d.k === "stretch" ? "nhẹ nhàng" : d.k === "rest" ? "buổi chính hôm nay" : "";
    const btnTxt = `${d.wm >= d.wt ? "Walk thêm" : d.wm ? "Tiếp tục walk" : "Start walk"} · ${Math.max(5, d.wt - d.wm)}'`;
    const manual = `<label class="manual"><input type="number" id="wMin" name="walk-minutes" min="0" max="600" autocomplete="off" inputmode="numeric" value="${d.wm || ""}" placeholder="0" aria-label="Phút đã đi"><span>phút đã đi, sửa tay nếu cần</span></label>`;
    const trio = c => `<div class="${c}"><div><small>Target</small><b>${d.wt}<em>phút</em></b></div><div><small>Incline</small><b>${incl(selW)}</b></div><div><small>Speed</small><b>4,5–5,5<em>km/h</em></b></div></div>`;
    if (main) return `<div class="hero" style="--g:${S.rest.g};--c:#0B8F88;--cdeep:${S.rest.deep}"><div class="htop"><span class="itile">${ic("walk")}</span><span>Rest day · ${d.wt} phút</span></div><h2>Incline Walk</h2>
   ${trio("htrio")}
   <div class="hprog"><div class="hbar"><i style="width:${pct * 100}%"></i></div><div class="hrow"><span>${d.wm}/${d.wt} phút</span><span>không vịn tay vào máy</span></div></div>
   <button class="cta press" data-walk="1">${ic("play")}${btnTxt}</button>${manual}</div>`;
    return `<div class="card" style="--c:var(--walk)"><div class="ch"><span class="itile">${ic("walk")}</span><div><h3>Incline Walk</h3><p>${d.wt ? d.wt + " phút " + ctx : "Leg day: không walk"}</p></div>${d.wt ? miniRing(pct, "var(--walk)", d.wm + "'") : ""}</div>
   ${d.wt ? `${trio("trio")}
   <button class="btn press" data-walk="1">${ic("play")}${btnTxt}</button>` : `<p class="sub" style="margin:12px 0 0;line-height:1.5">Không walk, hoặc cool-down 10 phút incline thấp.</p>`}${manual}</div>`;
  };

  let colA = sum + strip, colB = "";
  if (isLift) {
    const pct = d.L.dn / d.L.tot, done = d.L.dn >= d.L.tot, ex = liftEx(d.k), sv = st.sets[d.key] || {};
    const note = dl(selW) ? "Deload week: đã giảm ½ số set" : selW <= 2 ? "Adaptation: RPE 7, còn 3 reps in reserve" : "";
    colA += `<div class="hero" style="--g:${s.g};--c:${s.deep};--cdeep:${s.deep}"><div class="htop"><span class="itile">${ic(s.ic)}</span><span>Strength · ${s.dur}</span></div><h2>${s.full}</h2>
   <div class="chips"><span>${ex.length} bài</span><span>${d.L.tot} set</span>${ex.some(e => e.ss) ? `<span>Superset</span>` : ""}</div>${note ? `<p class="hnote">${note}</p>` : ""}
   <div class="hprog"><div class="hbar"><i style="width:${pct * 100}%"></i></div><div class="hrow"><span>${d.L.dn}/${d.L.tot} set</span><span>${Math.round(pct * 100)}%</span></div></div>
   <button class="cta press" data-play="lift">${done ? ic("check") + "Đã xong · xem lại" : ic("play") + (d.L.dn ? `Tiếp tục · set ${d.L.dn + 1}/${d.L.tot}` : "Bắt đầu tập")}</button>${d.L.dn ? `<button class="ghost press" data-reset="lift">Làm lại từ đầu</button>` : ""}</div>`;
    const row = (e, j) => {
      const n = effS(e.s, selW, j), dn = (sv[j] || 0) >= n;
      const sub = [e.r, e.sec ? "rest " + mmss(e.sec) : ""].filter(Boolean).join(" · ");
      const lv = e.pk ? `<span class="lvb${ready(e.pk) ? " rd" : ""}">Level ${e.lv + 1}/${e.lvN}${ready(e.pk) ? " · sẵn sàng lên level" : hitsSince(e.pk).length ? " · đạt top reps " + hitsSince(e.pk).length + "/2" : ""}</span>` : "";
      return `<li class="ex${dn ? " done" : ""}"><span class="num">${dn ? ic("check") : j + 1}</span><div class="exm"><b>${e.n}</b><small>${sub}</small>${lv}</div><div class="sets"><b>${n}</b><span>set</span></div></li>`;
    };
    let li = "", j = 0;
    while (j < ex.length) {
      const e = ex[j], f = ex[j + 1];
      if (e.ss && f && f.ss === e.ss) { li += `<li class="ssg"><div class="ssl">${ic("link")}Superset · làm 2 bài liên tiếp, không rest ở giữa</div><ul>${row(e, j)}${row(f, j + 1)}</ul></li>`; j += 2; }
      else { li += row(e, j); j++; }
    }
    colB += `<div class="sh"><h2>Bài tập</h2><span class="sub">${ex.length} bài · ${s.dur}</span></div><div class="card" style="--c:${s.c};padding:0"><ul class="exl">${li}</ul></div>`;
    colB += `<div class="sh"><h2>Thêm hôm nay</h2></div>` + walkBlock(false);
  } else {
    colA += walkBlock(true);
    colB += `<div class="sh"><h2>Thêm hôm nay</h2></div>`;
  }
  const mx = exFor("mini", d.k), mp = d.M.tot ? d.M.dn / d.M.tot : 0;
  colB += `<div class="card" style="--c:var(--mini)"><div class="ch"><span class="itile">${ic("bolt")}</span><div><h3>Mini Circuit · 10 phút</h3><p>3 rounds${d.k === "push" || d.k === "upper" ? ", chỉ core" : ", Push-Up + core"}</p></div>${miniRing(mp, "var(--mini)", d.M.dn + "/" + d.M.tot)}</div>
  <ul class="mini-l">${mx.map(m => `<li><span>${m.n}</span><b>3 × ${m.r}</b></li>`).join("")}</ul>
  <button class="btn dark press" data-play="mini">${d.M.dn >= d.M.tot ? ic("check") + "Đã xong · làm lại" : ic("play") + (d.M.dn ? "Làm tiếp" : "Start Mini Circuit")}</button></div>
  <div class="card note" style="--c:${ph.c}"><span class="itile">${ic("route")}</span><div><b>Chặng ${PH.indexOf(ph) + 1} · ${ph.t}</b><p>${ph.p}</p></div></div>`;
  $("v-today").innerHTML = h + `<div class="tgrid"><div class="col">${colA}</div><div class="col">${colB}</div></div>`;
}

/* ================= Lịch ================= */
function renderWeek() {
  $("weekSub").textContent = `Tuần ${wNow} · ${fmt(dateOf(wNow, 0))} – ${fmt(dateOf(wNow, 6))}`;
  $("days").innerHTML = WEEK.map(([n, k], i) => {
    const s = S[k], wt = L.walkT(wNow, k), isT = inProg && i === dNow;
    return `<details class="day${isT ? " today" : ""}" style="--c:${s.c}"${isT ? " open" : ""}><summary><span class="itile">${ic(s.ic)}</span><div><span class="dn">${DAYN[i]}${isT ? " · hôm nay" : ""}</span><span class="dt">${s.full}</span><span class="dm">${cap([s.dur, wt ? "walk " + wt + "'" : ""].filter(Boolean).join(" · ") || "rest")}</span></div><span class="chev">${ic("cr")}</span></summary><ul class="dlist">${liftEx(k).map((e, j) => `<li><span>${e.ss ? `<span class="ssb">${e.ss}</span>` : ""}${e.n}</span><span class="r">${effS(e.s, wNow, j) > 1 ? effS(e.s, wNow, j) + " × " : ""}${e.r}</span>${e.tip ? `<small>${e.tip}</small>` : ""}${e.n.startsWith("Weigh-in") ? "" : `<small class="hw">${howLinks(e.n)}</small>`}</li>`).join("")}<li><span>Incline Walk</span><span class="r">${wt ? wt + "' · " + incl(wNow) : "rest"}</span></li><li><span>Mini Circuit</span><span class="r">${k === "push" || k === "upper" ? "chỉ core" : "Push-Up + core"}</span></li></ul></details>`;
  }).join("") + `<p class="foot">Số set và phút walk theo tuần ${wNow}.</p>`;
}

/* ================= Lộ trình ================= */
function renderRoad() {
  $("roadSub").textContent = `${fmt(dateOf(1, 0))}/${dateOf(1, 0).getFullYear()} – ${fmt(dateOf(WEEKS, 6))}/${dateOf(WEEKS, 6).getFullYear()}`;
  $("phases").innerHTML = PH.map(p => {
    const now = curW >= p.w[0] && curW <= p.w[1], past = curW > p.w[1];
    return `<li class="ph${now ? " now" : ""}${past ? " past" : ""}" style="--c:${p.c}"><span class="node"><i></i></span><div class="phc"><div class="phh"><b>${p.t}</b><span>Tuần ${p.w[0]}${p.w[1] > p.w[0] ? "–" + p.w[1] : ""}</span></div><div class="phd">${fmt(dateOf(p.w[0], 0))} – ${fmt(dateOf(p.w[1], 6))}</div><p>${p.p}</p>${now ? `<span class="now-chip">Bạn đang ở chặng này</span>` : ""}</div></li>`;
  }).join("");
}

/* ================= Tiến độ ================= */
function renderGoals() {
  const w = wNow, g = L.weekSummary(st, w), need = g.walkNeed;
  const rows = [
    ["dumbbell", "var(--push)", "Strength", `Đủ ${GOALS.lifts} buổi trong tuần`, g.liftsDone / GOALS.lifts, `${g.liftsDone}<small>/${GOALS.lifts} buổi</small>`, g.ok.lifts],
    ["walk", "var(--walk)", "Incline Walk", `Ít nhất 90% của ${g.walkTarget} phút`, need ? g.walk / need : 0, `${g.walk}<small>/${need} phút</small>`, g.ok.walk],
    ["bolt", "var(--mini)", "Mini Circuit", `Ít nhất ${GOALS.miniDays} ngày trong tuần`, g.mini / GOALS.miniDays, `${g.mini}<small>/${GOALS.miniDays} ngày</small>`, g.ok.mini]];
  $("goals").innerHTML = `<div class="cth"><h2 class="ct">Mục tiêu tuần ${w}</h2><span class="gsum${g.met === 3 ? " all" : ""}">${g.met === 3 ? ic("check") + "Đạt cả 3" : `Đạt ${g.met}/3`}</span></div><p class="cs">${fmt(dateOf(w, 0))} – ${fmt(dateOf(w, 6))} · ${phaseOf(w).t}</p>
  <div class="goals">${rows.map(r => `<div class="goal${r[6] ? " ok" : ""}" style="--c:${r[1]}"><span class="itile">${ic(r[6] ? "check" : r[0])}</span><div class="gm"><b>${r[2]}</b><span>${r[3]}</span><div class="bar"><i style="width:${Math.min(100, r[4] * 100)}%"></i></div></div><div class="gv">${r[5]}</div></div>`).join("")}</div>`;
}

function renderLv() {
  const groups = LIFT.map(k => ({ k, items: S[k].ex.map((_, j) => k + "-" + j).filter(pk => PL[pk]) }));
  const rc = Object.keys(PL).filter(ready).length;
  $("lvCard").innerHTML = `<h2 class="ct">Progression</h2><p class="cs">Mỗi bài có các level từ dễ đến khó. Bấm "đạt top reps" ở set cuối trong lúc tập; đạt 2 buổi là lên level. ${rc ? `<b class="rdt">${rc} bài sẵn sàng lên level.</b>` : ""}</p>
 ${groups.map(g => `<div class="lvg"><div class="lvgh" style="--c:${S[g.k].c}"><i></i>${S[g.k].full}</div>${g.items.map(pk => {
    const i = lvOf(pk), Lv = PL[pk], h = hitsSince(pk).length, r = ready(pk), last = i >= Lv.length - 1, hist = (st.lvlH[pk] || []);
    return `<div class="lvi-w" style="--c:${S[g.k].c}"><details class="lvi${r ? " rd" : ""}"><summary><div class="lvm"><b>${lvName(pk, i)}</b><span>Level ${i + 1}/${Lv.length}${last ? " · level cao nhất" : r ? " · sẵn sàng!" : ` · top reps ${Math.min(h, 2)}/2`}</span><span class="lvd">${Lv.map((_, q) => `<i class="${q < i ? "p" : q === i ? "c" : ""}"></i>`).join("")}</span></div></summary>
  <ol class="lvl">${Lv.map((_, q) => `<li class="${q < i ? "p" : q === i ? "c" : ""}"><span>${q + 1}</span>${lvName(pk, q)}</li>`).join("")}</ol>
  <div class="lvf">${i > 0 ? `<button class="lvdn press" data-down="${pk}">Về level trước</button>` : ""}${hist.length ? `<span>Lên level gần nhất: ${dmy(hist[hist.length - 1].d)}</span>` : ""}</div></details>${last ? "" : `<button class="lvup press${r ? " rd" : ""}" data-up="${pk}" aria-label="Lên level: ${lvName(pk, i)}">Lên level</button>`}</div>`;
  }).join("")}</div>`).join("")}
 <p class="cs" style="margin-top:10px">* cần mua thêm kettlebell nặng hơn. "+1 đĩa" = thêm một đĩa tạ vào ròng rọc.</p>`;
}

function renderProg() {
  renderGoals(); renderLv();
  let Ls = 0, M = 0, W = 0, WT = 0, rows = "";
  for (let w = 1; w <= WEEKS; w++) {
    const g = L.weekSummary(st, w);
    Ls += g.liftsDone; W += g.walk; WT += g.walkTarget; M += g.mini;
    rows += `<div class="wr${w === curW ? " now" : ""}"><span class="w">T${w}</span><span class="ld">${g.lifts.map(v => `<i class="${v ? "on" : ""}"></i>`).join("")}</span><div class="bar" style="--c:var(--walk)"><i style="width:${g.walkTarget ? Math.min(100, g.walk / g.walkTarget * 100) : 0}%"></i></div><span class="m">${g.walk}/${g.walkTarget}'</span><span class="mn${g.ok.mini ? " ok" : ""}" title="Ngày làm Mini Circuit">${g.mini}</span></div>`;
  }
  $("wrows").innerHTML = rows;
  $("progSub").textContent = inProg ? `Tuần ${curW}/${WEEKS} · ${phaseOf(curW).t}` : curW < 1 ? `Bắt đầu ${fmt(dateOf(1, 0))}/${dateOf(1, 0).getFullYear()}` : `Đã xong ${WEEKS} tuần`;
  $("stats").innerHTML = [[Ls, WEEKS * 4, "buổi tạ", "var(--push)", "", "dumbbell"], [+(W / 60).toFixed(1), WT / 60, "giờ walk", "var(--walk)", "h", "walk"], [M, WEEKS * 7, "ngày mini", "var(--mini)", "", "bolt"]]
    .map(a => `<div class="card stat" style="--c:${a[3]}"><div class="mring"><svg viewBox="0 0 52 52">${arc(26, 22, 6, a[1] ? a[0] / a[1] : 0, a[3])}</svg><i>${ic(a[5])}</i></div><b>${num(a[0])}<small>/${Math.round(a[1])}${a[4]}</small></b><span>${a[2]}</span></div>`).join("");
  $("tests").innerHTML = TESTS.map(([id, l]) => {
    const t = st.tests[id] || {}, has = v => v !== undefined && v !== "" && v !== null, ok = has(t.a) && has(t.b), df = ok ? t.b - t.a : null;
    return `<tr><td>${l}</td><td class="n"><input type="number" name="test-${id}-a" min="0" max="999" autocomplete="off" inputmode="numeric" data-t="${id}" data-s="a" value="${t.a ?? ""}" placeholder="–" aria-label="${l} tuần 1"></td><td class="n"><input type="number" name="test-${id}-b" min="0" max="999" autocomplete="off" inputmode="numeric" data-t="${id}" data-s="b" value="${t.b ?? ""}" placeholder="–" aria-label="${l} tuần 12"></td><td class="n df${df > 0 ? " up" : df < 0 ? " dn" : ""}">${df == null ? "–" : (df > 0 ? "+" : "") + df}</td></tr>`;
  }).join("");
  const br = [...st.body].sort((a, b) => a.d < b.d ? 1 : -1);
  $("bodyRows").innerHTML = br.length
    ? br.map(r => `<tr><td>${dmy(r.d)}</td><td class="n">${r.kg != null ? num(r.kg) + " kg" : "–"}</td><td class="n">${r.w != null ? num(r.w) + " cm" : "–"}</td><td class="n" style="width:44px"><button class="del" data-del="${r.d}" aria-label="Xoá lần đo ${dmy(r.d)}">${ic("trash")}</button></td></tr>`).join("")
    : `<tr><td class="sub" style="text-align:center;padding:10px 0 2px">Chưa có lần đo nào. Lần đầu: Chủ nhật ${fmt(dateOf(1, 6))}.</td></tr>`;
  drawChart();
}

function drawChart() {
  const s = $("chart"), W = s.clientWidth, H = s.clientHeight;
  if (!W) return;
  const p = [...st.body].filter(r => r.kg != null).sort((a, b) => a.d < b.d ? -1 : 1);
  s.setAttribute("role", "img");
  s.setAttribute("aria-label", p.length < 2 ? "Biểu đồ cân nặng: cần ít nhất 2 lần đo" : `Biểu đồ cân nặng: ${num(p[0].kg)} kg ngày ${dmy(p[0].d)}, ${num(p[p.length - 1].kg)} kg ngày ${dmy(p[p.length - 1].d)}`);
  if (p.length < 2) { s.innerHTML = `<rect x="0" y="0" width="${W}" height="${H}" rx="16" style="fill:var(--surface2)"/><text x="${W / 2}" y="${H / 2 + 5}" text-anchor="middle" style="fill:var(--ink3);font:500 14px var(--font)">Cần ít nhất 2 lần đo để vẽ biểu đồ</text>`; return; }
  const v = p.map(r => +r.kg), mn = Math.min(...v) - .5, mx = Math.max(...v) + .5, x = i => 6 + i * (W - 72) / (p.length - 1), y = n => 14 + (mx - n) / (mx - mn) * (H - 42), dd = r => r.d.slice(8) + "/" + r.d.slice(5, 7);
  const line = v.map((n, i) => (i ? "L" : "M") + x(i).toFixed(1) + "," + y(n).toFixed(1)).join("");
  s.innerHTML = `<defs><linearGradient id="cg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" style="stop-color:var(--walk);stop-opacity:.28"/><stop offset="1" style="stop-color:var(--walk);stop-opacity:0"/></linearGradient></defs>
 ${[0, .5, 1].map(f => `<line x1="0" x2="${W}" y1="${14 + f * (H - 42)}" y2="${14 + f * (H - 42)}" style="stroke:var(--line)" stroke-dasharray="3 5"/>`).join("")}
 <path d="${line}L${x(v.length - 1)},${H - 28}L${x(0)},${H - 28}Z" fill="url(#cg)"/><path d="${line}" fill="none" style="stroke:var(--walk)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>${v.map((n, i) => `<circle cx="${x(i)}" cy="${y(n)}" r="${i === v.length - 1 ? 5.5 : 3.5}" style="fill:${i === v.length - 1 ? "var(--walk)" : "var(--surface)"};stroke:var(--walk)" stroke-width="2.5"/>`).join("")}
 <text x="${x(v.length - 1) + 10}" y="${y(v[v.length - 1]) + 5}" style="fill:var(--ink);font:700 14px var(--font)">${num(v[v.length - 1])} kg</text><text x="2" y="${H - 6}" style="fill:var(--ink3);font:500 12.5px var(--font)">${dd(p[0])}</text><text x="${x(v.length - 1)}" y="${H - 6}" text-anchor="end" style="fill:var(--ink3);font:500 12.5px var(--font)">${dd(p[p.length - 1])}</text>`;
}

const renderAll = () => { renderToday(); renderWeek(); renderRoad(); renderProg(); };

/* ================= sound + timer ================= */
/* Short tones (countdown ticks, set done). The loud time-is-up chime is A.chime(). */
function beep(f, d, v) { if (N.soundOn()) A.tone(f, d, Math.min(1, (v ?? .3) * 2)); }
const buzz = p => { if (!N.vibOn()) return; try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
/* Timer finished: loud rising chime (twice), long buzz, and a screen flash that works even with the sound off. */
function chime() {
  if (N.soundOn()) A.chime();
  buzz(N.RING);
  pl.classList.remove("flash"); void pl.offsetWidth; pl.classList.add("flash");
}

/* One countdown at a time, driven by wall-clock so it stays right when the tab sleeps. */
let T = null;
function startT(sec, onEnd, onTick, note) { T = { dur: sec, end: Date.now() + sec * 1000, paused: false, left: sec, onEnd, onTick, lb: null, note: note || null }; onTick && onTick(sec); syncNotify(); }

/* Keep the service worker's "time is up" alarm in step with the running timer (start, pause, ±15s, stop). */
let armed = null;
function syncNotify() {
  const want = T && !T.paused && T.note && N.enabled() ? T.end : null;
  if (want === armed) return;
  armed = want;
  if (want) N.schedule(want, T.note); else N.cancel();
}
setInterval(() => {
  syncNotify();
  if (!T || T.paused) return;
  const left = Math.ceil((T.end - Date.now()) / 1000);
  if (left <= 3 && left > 0 && left !== T.lb) { T.lb = left; beep(700, .09); }
  if (left <= 0) {
    const f = T.onEnd, note = T.note; T = null; chime();
    if (note && document.hidden && N.enabled()) N.show(note);   /* app in the background: tell the user */
    f && f(); return;
  }
  if (left !== T.left) { T.left = left; T.onTick && T.onTick(left); }
}, 150);
const togglePause = () => { if (!T.paused) { T.paused = true; T.rem = T.end - Date.now(); } else { T.paused = false; T.end = Date.now() + T.rem; } return T.paused; };

const RC = 2 * Math.PI * 104;
const ringHTML = (cls = "") => `<div class="ring ${cls}"><svg viewBox="0 0 240 240"><defs><linearGradient id="rgG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:color-mix(in srgb,var(--c) 55%,#fff)"/><stop offset="1" style="stop-color:var(--c)"/></linearGradient></defs><circle cx="120" cy="120" r="104" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="16"/><circle id="rg" class="pg jump" cx="120" cy="120" r="104" fill="none" stroke="url(#rgG)" stroke-width="16" stroke-linecap="round" stroke-dasharray="${RC.toFixed(1)}" stroke-dashoffset="0"/></svg><div class="in"><div class="rt" id="rt">0:00</div><div class="lb" id="rl"></div></div></div>`;
function setRing(left, dur, jump) {
  const r = $("rg"), t = $("rt");
  if (t) t.textContent = mmss(left);
  if (r) { r.classList.toggle("jump", !!jump); r.setAttribute("stroke-dashoffset", (RC * (1 - left / Math.max(1, dur))).toFixed(1)); }
}

/* ================= player ================= */
let P = null, clockId = null, wake = null;
const pl = $("pl");
async function keepAwake(on) {
  try {
    if (on && navigator.wakeLock) wake = await navigator.wakeLock.request("screen");
    else if (wake) { wake.release(); wake = null; }
  } catch (e) {}
}
const dayIdx = key => WEEK.findIndex((_, i) => iso(dateOf(P.w, i)) === key);

/* First time the user starts a workout (a tap): offer notifications for the timers. Later: Tiến độ → Thông báo. */
function offerNotify() {
  try {
    if (N.permission() !== "default" || !N.wanted() || localStorage.getItem("player12-asked")) return;
    localStorage.setItem("player12-asked", "1");
  } catch (e) { return; }
  N.ask().then(renderNotify);
}
function openPlay(kind) {
  offerNotify();
  const d = dayInfo(selW, selI), sp = steps(kind, d.k, selW), sv = setsOf(kind, d.key);
  let idx = sp.findIndex(x => x.q >= (sv[x.j] || 0));
  if (idx < 0) { Object.keys(sv).forEach(k => delete sv[k]); idx = 0; save(); }
  P = { kind, k: d.k, w: selW, key: d.key, sp, idx, ex: exFor(kind, d.k), c: kind === "mini" ? "var(--mini)" : S[d.k].c, t0: Date.now(), title: kind === "mini" ? "Mini Circuit" : S[d.k].full };
  A.wake(); openShell(); showWork();
}
function openWalk() {
  offerNotify();
  const d = dayInfo(selW, selI), target = Math.max(5, d.wt - d.wm);
  P = { kind: "walk", key: d.key, c: "var(--walk)", t0: Date.now(), title: "Incline Walk", target, w: selW };
  A.wake(); openShell(); showWalk();
}
const setInert = on => [document.querySelector(".skip"), document.querySelector(".app"), document.querySelector(".tabs")].forEach(el => { if (el) el.inert = on; });
const openerSel = el => { const d = (el && el.dataset) || {}; return d.play ? `[data-play="${d.play}"]` : d.walk ? "[data-walk]" : null; };
const focusSel = sel => { const el = sel && document.querySelector(sel); if (el) el.focus({ preventScroll: true }); };
function openShell() {
  P.openerSel = openerSel(document.activeElement); setInert(true);
  pl.style.setProperty("--c", P.c); pl.classList.add("on"); document.body.style.overflow = "hidden"; keepAwake(true);
  clearInterval(clockId);
  clockId = setInterval(() => { const c = $("pclock"); if (c && P) c.textContent = mmss(Math.floor((Date.now() - P.t0) / 1000)); }, 500);
}
function closePlay() {
  const back = P && P.openerSel;
  T = null; P = null; pl.classList.remove("on", "rest"); pl.innerHTML = ""; document.body.style.overflow = ""; keepAwake(false); clearInterval(clockId);
  setInert(false);
  renderToday(); renderProg();
  focusSel(back);
  if (Sync.enabled()) Sync.syncNow();
}
const top = () => {
  const x = P.sp ? P.sp[Math.min(P.idx, P.sp.length - 1)] : null;
  const sub = P.kind === "walk" ? `Target ${P.target} phút` : x && P.idx < P.sp.length ? `Bài ${x.j + 1}/${P.ex.length} · set ${Math.min(P.idx + 1, P.sp.length)}/${P.sp.length}` : `${P.sp.length}/${P.sp.length} set`;
  return `<div class="ptop"><button class="gx press" data-pa="close" aria-label="Đóng">${ic("x")}</button><div class="t"><b>${P.title}</b><span>${sub}</span></div><div class="clock" id="pclockw">${ic("timer")}<span id="pclock">${mmss(Math.floor((Date.now() - P.t0) / 1000))}</span></div></div>${P.sp ? `<div class="segs">${P.sp.map((x, i) => `<i class="${i < P.idx ? "on" : i === P.idx ? "cur" : ""}"></i>`).join("")}</div>` : ""}`;
};
const say = text => { const l = $("live"); if (!l) return; l.textContent = ""; setTimeout(() => { l.textContent = text; }, 60); };
const anim = () => { pl.scrollTop = 0; const f = pl.querySelector(".pbig") || pl.querySelector('[data-pa="close"]'); if (f) f.focus({ preventScroll: true }); };
function nextCard(i, rest) {
  const x = P.sp[i];
  if (!x) return `<div class="next an"><div><small>Tiếp theo</small><b>Hết buổi · bài cuối</b></div></div>`;
  const e = P.ex[x.j];
  return `<div class="next an"><div><small>Tiếp theo · set ${x.q + 1}/${x.n}</small><b>${e.n}</b></div>${rest ? `<span class="rb">${ic("timer")}Rest ${mmss(rest)}</span>` : rest === 0 ? `<span class="rb">No rest</span>` : ""}</div>`;
}
function showWork() {
  pl.classList.remove("rest"); P.busy = false;
  const x = P.sp[P.idx], e = P.ex[x.j], exNo = x.j + 1;
  const ssTxt = e.ss ? (e.ss === P.ex[x.j + 1]?.ss ? "superset với bài sau" : "superset với bài trước") : "";
  let mid = "";
  if (e.emom) mid = `<div class="an" style="margin-top:22px">${ringHTML("sm")}</div>`;
  else if (e.dur) mid = `<div class="dtimer an"><b id="wt">${mmss(e.dur)}</b><button class="press" data-pa="wtime">${ic("play")}Đếm ${e.dur}s</button></div>`;
  const dots = x.n > 1 ? `<div class="dots">${Array.from({ length: x.n }, (_, i) => `<i class="${i < x.q ? "on" : i === x.q ? "cur" : ""}"></i>`).join("")}</div>` : "";
  const nav = `<div class="prow an"><button class="gbtn press" data-pa="back" ${P.idx ? "" : "disabled"}>${ic("back")}Set trước</button><button class="gbtn press" data-pa="skip">Bỏ qua${ic("skip")}</button></div>`;
  pl.innerHTML = top() + `<div class="pbody"><div class="pk an"><span class="tag">Bài ${exNo}/${P.ex.length}</span>${e.ss ? `<span class="tag c">${ic("link")}${e.ss} · ${ssTxt}</span>` : ""}${e.emom ? `<span class="tag c">${ic("timer")}EMOM ${e.emom}'</span>` : ""}${e.pk ? `<span class="tag">Level ${e.lv + 1}/${e.lvN}</span>` : ""}</div>
 <div class="pname an">${e.n}</div>
 ${e.emom ? "" : `<div class="setbox an"><div class="setn"><b>${x.q + 1}</b><span>/${x.n}</span></div><div class="setl"><small>Set</small>${dots}</div></div>`}
 <div class="reps an"><div class="rv">${ic("target")}<div><span>${e.r.split(" · ")[0]}</span>${e.r.includes(" · ") ? `<small>${e.r.split(" · ").slice(1).join(" · ")}</small>` : ""}</div></div>${e.tip ? `<div class="tip">${ic("bulb")}<span>${e.tip}</span></div>` : ""}${e.n.startsWith("Weigh-in") ? "" : howLinks(e.n)}</div>${e.pk && x.q === x.n - 1 ? `<button class="hitb press an${(st.hit[e.pk] || []).includes(P.key) ? " on" : ""}" data-pa="hit">${ic("check")}<span>Mọi set đều đạt top reps<small>Bấm khi bạn làm được mức reps cao nhất ở tất cả các set hôm nay. Đạt 2 buổi là lên level.</small></span></button>` : ""}${mid}</div>
 <div class="pfoot">${nextCard(P.idx + 1, x.rest)}
 ${e.emom ? `<button class="pbig press an" data-pa="emom" id="emb">${ic("play")}Bắt đầu EMOM ${e.emom}'</button>` : `<button class="pbig press an" data-pa="done">${ic("check")}Xong set</button>`}${nav}</div>`;
  if (e.emom) { $("rl").textContent = "Minute 1 · Pull-Up"; setRing(60, 60, true); }
  say(`${e.n}, set ${x.q + 1} trên ${x.n}`);
  anim();
}
function markDone() { const x = P.sp[P.idx], sv = setsOf(P.kind, P.key); sv[x.j] = Math.max(sv[x.j] || 0, x.q + 1); save(); }
function advance(withRest) {
  const x = P.sp[P.idx]; P.idx++; T = null;
  if (P.idx >= P.sp.length) return showDone();
  if (withRest && x.rest) showRest(x.rest, x); else showWork();
}
function showRest(sec, prev) {
  pl.classList.add("rest");
  const pe = prev ? P.ex[prev.j] : null;
  pl.innerHTML = top() + `<div class="pbody" style="text-align:center">${pe ? `<div class="rest-h an"><span class="tag c">${ic("check")}Xong set ${prev.q + 1}/${prev.n} · ${pe.n.length > 22 ? pe.n.slice(0, 21) + "…" : pe.n}</span></div>` : ""}<div class="an" id="ringw">${ringHTML()}</div>
 <div class="ctrl an"><button class="cb press" data-pa="m15" aria-label="Bớt 15 giây">−15</button><div class="cbl"><button class="cb main press" data-pa="pause" id="pz" aria-label="Tạm dừng">${ic("pause")}</button><span id="pzl">Tạm dừng</span></div><button class="cb press" data-pa="p15" aria-label="Thêm 15 giây">+15</button></div></div>
 <div class="pfoot">${nextCard(P.idx)}<button class="pbig press an" data-pa="go">Vào set luôn${ic("skip")}</button></div>`;
  say("Nghỉ " + mmss(sec)); $("rl").textContent = "rest";
  const nx = P.sp[P.idx], nxe = nx && P.ex[nx.j];
  startT(sec, () => showWork(), l => setRing(l, T ? T.dur : sec, l === sec), N.textFor("rest", { next: nxe && nxe.n, q: nx && nx.q, n: nx && nx.n }));
  anim();
}
function showDone() {
  T = null; pl.classList.remove("rest");
  const mins = Math.max(1, Math.round((Date.now() - P.t0) / 60000)), d = dayInfo(P.w, dayIdx(P.key)), wl = d.wt - d.wm, exN = P.ex.length;
  const toWalk = P.kind === "lift" && wl > 0;
  pl.innerHTML = top() + `<div class="pbody"><div class="badge an" id="badge"><i>${ic("check")}</i></div><div class="done-t an"><h2>Xong ${P.kind === "mini" ? "mini" : "buổi"}!</h2><p>${P.title} · tuần ${P.w}</p></div>
 <div class="dstats an"><div><b>${P.sp.length}</b><span>set</span></div><div><b>${mins}</b><span>phút</span></div><div><b>${exN}</b><span>bài</span></div></div>
 ${toWalk ? `<div class="wsug an">${ic("walk")}<span>Tiếp theo: incline walk <b>${wl} phút</b>, incline ${incl(P.w)}, 4,5–5,5 km/h.</span></div>` : ""}</div>
 <div class="pfoot">${toWalk ? `<button class="pbig walkbtn press an" data-pa="towalk">${ic("walk")}Incline Walk ${wl}' ngay</button>` : ""}<div class="prow one an"><button class="gbtn press" data-pa="close">Về trang chính</button></div></div>`;
  say("Xong buổi tập"); beep(660, .15); setTimeout(() => beep(990, .3), 180); buzz([60, 40, 60]); anim();
}
function showWalk() {
  pl.classList.remove("rest"); P.walked = P.walked || 0;
  pl.innerHTML = top() + `<div class="pbody" style="text-align:center"><div class="winfo an"><span class="tag c">${ic("walk")}Incline ${incl(P.w)}</span><span class="tag">4,5–5,5 km/h</span><span class="tag">Không vịn tay (no handrails)</span></div><div class="an">${ringHTML()}</div>
 <p class="an" style="color:var(--ink2);font-size:15px;line-height:1.45;margin:22px auto 0;max-width:30ch">Zone 2: hơi hụt hơi nhưng vẫn nói chuyện được.</p></div>
 <div class="pfoot"><button class="pbig press an" data-pa="wstart" id="ws">${ic("play")}Bắt đầu</button><div class="prow one an"><button class="gbtn press" data-pa="wend">Kết thúc &amp; lưu</button></div></div>`;
  $("rl").textContent = "còn lại"; setRing(P.target * 60, P.target * 60, true); anim();
}
/* Save the whole minutes walked so far when the walk is ended early. */
function logWalk() {
  if (!P || P.kind !== "walk") return;
  const leftSec = T ? Math.max(0, Math.ceil((T.paused ? T.rem : T.end - Date.now()) / 1000)) : (P.left ?? P.target * 60);
  const m = Math.floor((P.target * 60 - leftSec) / 60);
  if (m > 0) { st.walk[P.key] = (+st.walk[P.key] || 0) + m; save(); }
}
const setPauseUI = (b, paused, lblId) => {
  b.innerHTML = paused ? ic("play") + (lblId ? "" : "Tiếp tục") : ic("pause") + (lblId ? "" : "Tạm dừng");
  b.setAttribute("aria-label", paused ? "Tiếp tục" : "Tạm dừng");
  if (lblId) { const l = $(lblId); if (l) l.textContent = paused ? "Tiếp tục" : "Tạm dừng"; }
};

document.addEventListener("keydown", e => {
  if (e.key !== "Escape" || !P || $("sheet").classList.contains("on")) return;
  e.preventDefault(); if (P.kind === "walk" && P.started) logWalk(); closePlay();
});
pl.addEventListener("click", e => {
  const b = e.target.closest("[data-pa]");
  if (!b || !P || b.disabled) return;
  const a = b.dataset.pa;
  if (a === "close") { if (P.kind === "walk" && P.started) logWalk(); return closePlay(); }
  if (a === "done") {
    if (P.busy) return;
    P.busy = true; markDone(); beep(520, .08); buzz(30);
    if (RM()) return advance(true);
    b.classList.add("pop");
    const cur = pl.querySelector(".dots i.cur"); if (cur) cur.className = "on";
    const sg = pl.querySelector(".segs i.cur"); if (sg) sg.className = "on";
    return setTimeout(() => { if (P && P.busy) advance(true); }, 240);
  }
  if (a === "hit") {
    const pk = P.ex[P.sp[P.idx].j].pk, arr = st.hit[pk] = st.hit[pk] || [], i = arr.indexOf(P.key);
    if (i < 0) arr.push(P.key); else arr.splice(i, 1);
    save(); b.classList.toggle("on", i < 0);
    if (i < 0 && ready(pk)) { beep(880, .12); setTimeout(() => beep(1175, .2), 130); }
    return;
  }
  if (a === "skip") return advance(false);
  if (a === "back") { P.idx = Math.max(0, P.idx - 1); const x = P.sp[P.idx], sv = setsOf(P.kind, P.key); sv[x.j] = Math.min(sv[x.j] || 0, x.q); save(); T = null; return showWork(); }
  if (a === "go") { T = null; return showWork(); }
  if (a === "m15" && T) { T.end = Math.max(Date.now() + 1000, T.end - 15000); if (T.paused) T.rem = Math.max(1000, T.rem - 15000); T.left = -1; if (T.paused) setRing(Math.ceil(T.rem / 1000), T.dur); return; }
  if (a === "p15" && T) { T.end += 15000; T.dur += 15; if (T.paused) { T.rem += 15000; setRing(Math.ceil(T.rem / 1000), T.dur); } T.left = -1; return; }
  if (a === "pause" && T) return setPauseUI(b, togglePause(), "pzl");
  if (a === "wtime") {
    const e2 = P.ex[P.sp[P.idx].j];
    b.innerHTML = ic("timer") + "Đang đếm";
    startT(e2.dur, () => { const w = $("wt"); if (w) w.textContent = "Xong!"; b.innerHTML = ic("play") + "Đếm lại"; }, l => { const w = $("wt"); if (w) w.textContent = mmss(l); }, N.textFor("hold", { name: e2.n }));
    return;
  }
  if (a === "emom") {
    const e2 = P.ex[P.sp[P.idx].j], tot = e2.emom * 60; let lastMin = 1;
    b.disabled = true; b.innerHTML = ic("timer") + "Đang EMOM…"; b.style.opacity = ".55";
    startT(tot, () => { markDone(); advance(true); }, l => {
      const el = tot - l, mi = Math.floor(el / 60) + 1, inMin = 60 - el % 60;
      if (mi !== lastMin) { lastMin = mi; beep(880, .25); buzz(150); }
      setRing(inMin, 60, inMin === 60);
      const lb = $("rl"); if (lb) lb.textContent = `Minute ${Math.min(mi, e2.emom)}/${e2.emom} · ${mi % 2 ? "Pull-Up" : "Dip"}`;
    }, N.textFor("emom"));
    return;
  }
  if (a === "towalk") {
    const d = dayInfo(P.w, dayIdx(P.key)), t = Math.max(5, d.wt - d.wm);
    P = { kind: "walk", key: P.key, c: "var(--walk)", t0: Date.now(), title: "Incline Walk", target: t, w: P.w, openerSel: P.openerSel };
    pl.style.setProperty("--c", P.c); return showWalk();
  }
  if (a === "wstart") {
    if (!P.started) {
      P.started = true;
      startT(P.target * 60, () => {
        P.left = 0; st.walk[P.key] = (+st.walk[P.key] || 0) + P.target; save(); P.started = false;
        $("rl").textContent = "Đủ mục tiêu!";
        const w = $("ws"); if (w) { w.innerHTML = ic("check") + "Xong"; w.dataset.pa = "close"; }
      }, l => setRing(l, P.target * 60, l === P.target * 60), N.textFor("walk", { target: P.target }));
      setPauseUI(b, false);
    } else if (T) setPauseUI(b, togglePause());
    return;
  }
  if (a === "wend") { if (P.started) logWalk(); return closePlay(); }
});

/* ================= home events ================= */
const stampLevel = pk => { st.lvlD[pk] = [iso(new Date()), ...(st.hit[pk] || [])].sort().pop(); };
document.querySelector(".app").addEventListener("click", e => {
  const t = e.target;
  const db = t.closest("[data-d]"); if (db) { selI = +db.dataset.d; return renderToday(); }
  if (t.closest("#pw") && selW > 1) { selW--; return renderToday(); }
  if (t.closest("#nw") && selW < WEEKS) { selW++; return renderToday(); }
  if (t.closest("[data-today]")) { selW = wNow; selI = dNow; return renderToday(); }
  const pb = t.closest("[data-play]"); if (pb) return openPlay(pb.dataset.play);
  if (t.closest("[data-walk]")) return openWalk();
  const rb = t.closest("[data-reset]"); if (rb) { const d = dayInfo(selW, selI); return void confirmSheet(`Làm lại ${S[d.k].full} từ đầu?`, "Các set đã đánh dấu trong buổi này sẽ bị xoá.", "Làm lại").then(ok => { if (!ok) return; st.sets[d.key] = {}; save(); renderToday(); focusSel('[data-play="lift"]'); }); }
  const up = t.closest("[data-up]");
  if (up) {
    e.preventDefault();
    const pk = up.dataset.up, i = lvOf(pk);
    if (i < PL[pk].length - 1) {
      st.lvl[pk] = i + 1; stampLevel(pk); (st.lvlH[pk] = st.lvlH[pk] || []).push({ d: iso(new Date()), to: i + 1 }); save();
      beep(880, .12); setTimeout(() => beep(1175, .25), 130);
      renderProg(); renderToday(); renderWeek();
    }
    return;
  }
  const dn = t.closest("[data-down]");
  if (dn) { const pk = dn.dataset.down, i = lvOf(pk); if (i > 0) { st.lvl[pk] = i - 1; stampLevel(pk); save(); renderProg(); renderToday(); renderWeek(); } return; }
  const del = t.closest("[data-del]"); if (del) { const day = del.dataset.del; return void confirmSheet(`Xoá lần đo ngày ${dmy(day)}?`, "Cân nặng và vòng eo của ngày này sẽ bị xoá khỏi biểu đồ.", "Xoá").then(ok => { if (!ok) return; st.body = st.body.filter(r => r.d !== day); save(); renderProg(); focusSel("#bKg"); }); }
  const da = t.closest("[data-data]"); if (da) return dataAction(da.dataset.data);
});
document.addEventListener("change", e => {
  const t = e.target;
  if (t.id === "wMin") { const d = dayInfo(selW, selI); st.walk[d.key] = t.value === "" ? 0 : Math.min(600, Math.max(0, Math.round(+t.value) || 0)); save(); renderToday(); renderProg(); }
  if (t.dataset.t) { const o = st.tests[t.dataset.t] = st.tests[t.dataset.t] || {}; o[t.dataset.s] = t.value === "" ? "" : +t.value; save(); renderProg(); }
  if (t.id === "impFile" && t.files[0]) importFile(t.files[0]);
});
const bodyErr = (field, text) => {
  const err = $("bErr"); err.textContent = text; err.hidden = false;
  ["bDate", "bKg", "bWaist"].forEach(id => { const el = $(id); if (el === field) { el.setAttribute("aria-invalid", "true"); el.setAttribute("aria-describedby", "bErr"); } else { el.removeAttribute("aria-invalid"); el.removeAttribute("aria-describedby"); } });
  field.focus();
};
const clearBodyErr = () => { $("bErr").hidden = true; ["bDate", "bKg", "bWaist"].forEach(id => { $(id).removeAttribute("aria-invalid"); $(id).removeAttribute("aria-describedby"); }); };
$("bodyForm").addEventListener("input", clearBodyErr);
$("bodyForm").addEventListener("submit", e => {
  e.preventDefault();
  const d = $("bDate").value, kg = $("bKg").value, w = $("bWaist").value;
  if (!d) return bodyErr($("bDate"), "Chọn ngày đo.");
  if (kg === "" && w === "") return bodyErr($("bKg"), "Nhập cân nặng hoặc vòng eo (hoặc cả hai).");
  if (kg !== "" && !(+kg >= 20 && +kg <= 300)) return bodyErr($("bKg"), "Cân nặng cần nằm trong khoảng 20–300 kg.");
  if (w !== "" && !(+w >= 30 && +w <= 250)) return bodyErr($("bWaist"), "Vòng eo cần nằm trong khoảng 30–250 cm.");
  clearBodyErr();
  st.body = st.body.filter(r => r.d !== d); st.body.push({ d, kg: kg === "" ? null : +kg, w: w === "" ? null : +w }); save();
  $("bKg").value = ""; $("bWaist").value = ""; renderProg();
});

/* ================= backup / restore ================= */
const msg = (text, cls = "") => { const m = $("dmsg"); m.textContent = text; m.className = "dmsg " + cls; };
function confirmSheet(title, text, go) {
  const sh = $("sheet"), back = document.activeElement;
  sh.innerHTML = `<div role="alertdialog" aria-modal="true" aria-labelledby="shT" aria-describedby="shD"><h2 id="shT">${title}</h2><p id="shD">${text}</p><div class="row"><button type="button" data-sh="no">Huỷ</button><button type="button" class="go" data-sh="yes">${go}</button></div></div>`;
  sh.classList.add("on"); setInert(true);
  const btns = [...sh.querySelectorAll("button")]; btns[0].focus();   /* safe choice first */
  return new Promise(res => {
    const done = ok => { sh.classList.remove("on"); sh.innerHTML = ""; sh.onclick = null; sh.onkeydown = null; setInert(false); res(ok); };
    sh.onclick = e => { const b = e.target.closest("[data-sh]"); if (!b && e.target !== sh) return; done(!!b && b.dataset.sh === "yes"); };
    sh.onkeydown = e => {
      if (e.key === "Escape") { e.preventDefault(); done(false); }
      else if (e.key === "Tab") { e.preventDefault(); const i = btns.indexOf(document.activeElement); btns[e.shiftKey ? (i <= 0 ? btns.length - 1 : i - 1) : (i + 1) % btns.length].focus(); }
    };
  }).then(ok => { if (!ok && back && back.focus && document.contains(back)) back.focus(); return ok; });
}
function dataAction(a) {
  if (a === "export") {
    const url = URL.createObjectURL(new Blob([store.exportJSON(st)], { type: "application/json" }));
    const l = document.createElement("a"); l.href = url; l.download = `home-workout-${iso(new Date())}.json`;
    document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
    return msg("Đã xuất file sao lưu. Giữ file này ở nơi an toàn (Drive, Zalo, email…).", "ok");
  }
  if (a === "import") return $("impFile").click();
  if (a === "snd") { N.setSound(!N.soundOn()); armed = null; renderNotify(); if (N.soundOn()) chime(); return; }
  if (a === "vib") { N.setVib(!N.vibOn()); armed = null; renderNotify(); if (N.vibOn()) buzz(N.RING); return; }
  if (a.startsWith("sync-")) return syncAction(a);
  if (a === "notif-ask") return N.ask().then(renderNotify);
  if (a === "notif-toggle") { N.setWanted(!N.wanted()); N.cancel(); return renderNotify(); }
  if (a === "notif-test") return N.show({ title: "Thông báo hoạt động", body: "Khi hết giờ rest, bạn sẽ thấy thông báo như thế này." }).then(ok => msg(ok ? "Đã gửi thông báo thử." : "Không gửi được thông báo thử. Kiểm tra quyền thông báo của app.", ok ? "ok" : "err"));
  if (a === "wipe") return confirmSheet("Xoá toàn bộ dữ liệu?", Sync.enabled() ? "Dữ liệu sẽ bị xoá trên máy này VÀ trên mọi thiết bị đang đồng bộ. Nên xuất file sao lưu trước." : "Mọi set, phút walk, level, Max Test và lần đo trên máy này sẽ mất. Nên xuất file sao lưu trước.", "Xoá hết").then(ok => { if (!ok) return; st = store.blank(); save(); renderAll(); msg("Đã xoá toàn bộ dữ liệu.", "ok"); });
}
async function importFile(f) {
  let next;
  try { next = store.importJSON(await f.text()); } catch (e) { $("impFile").value = ""; return msg("File này không phải file sao lưu của app.", "err"); }
  $("impFile").value = "";
  if (!store.isEmpty(st) && !await confirmSheet("Thay dữ liệu hiện tại?", "Dữ liệu đang có trên máy này sẽ được thay bằng nội dung file sao lưu.", "Thay thế")) return;
  st = next; save(); renderAll(); msg("Đã khôi phục dữ liệu từ file.", "ok");
}

/* ================= multi-device sync ================= */
const syncUI = { join: false, msg: "", err: false };
const hhmm = t => new Date(t).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
const syncMsg = (text, err = false) => { syncUI.msg = text; syncUI.err = err; renderSync(); };
function renderSync() {
  const el = $("sync"), cfg = Sync.config(), s = Sync.status;
  const msgHtml = `<p class="dmsg${syncUI.msg ? (syncUI.err ? " err" : " ok") : ""}" id="syncMsg" role="status">${syncUI.msg}</p>`;
  const joinForm = `<form class="syncjoin" id="syncJoin" novalidate><label>Mã đồng bộ<input id="syncCode" name="sync-code" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Dán hoặc gõ mã từ thiết bị kia"></label><button class="dbtn2 press" type="submit">Kết nối</button></form>`;
  let body;
  if (!cfg) body = `<p class="hint">Dùng chung dữ liệu giữa điện thoại, máy tính bảng và máy tính. Không cần tài khoản, chỉ cần một mã. Vẫn chạy offline, có mạng thì tự đồng bộ.</p><div class="dbtns"><button class="dbtn2 press" data-data="sync-start" type="button">Bật đồng bộ</button><button class="dbtn2 press" data-data="sync-joinform" type="button" aria-expanded="${syncUI.join}">Đã có mã</button></div>${syncUI.join ? joinForm : ""}`;
  else {
    const line = s.state === "syncing" ? "Đang đồng bộ…" : s.state === "offline" ? "Không có mạng, sẽ tự thử lại." : s.state === "error" ? "Lỗi: " + s.error : s.last ? "Đã đồng bộ lúc " + hhmm(s.last) + "." : "Đã bật.";
    body = `<p class="hint" id="syncLine">${line}</p><p class="synccode" translate="no" aria-label="Mã đồng bộ">${fmtCode(cfg.code)}</p><p class="hint">Ai có mã này đều xem và sửa được dữ liệu của bạn. Giữ kín, và nhập mã trên thiết bị mới để kết nối.</p>
      <div class="dbtns"><button class="dbtn2 press" data-data="sync-now" type="button">Đồng bộ ngay</button><button class="dbtn2 press" data-data="sync-copy" type="button">Sao chép mã</button><button class="dbtn2 press" data-data="sync-link" type="button" style="grid-column:1/-1">${navigator.share ? "Chia sẻ liên kết cho máy khác" : "Sao chép liên kết cho máy khác"}</button>${Sync.hasUndo() ? `<button class="dbtn2 press" data-data="sync-undo" type="button" style="grid-column:1/-1">Hoàn tác lần đồng bộ gần nhất</button>` : ""}<button class="dbtn2 press" data-data="sync-off" type="button">Ngắt kết nối máy này</button><button class="dbtn2 danger press" data-data="sync-wipe" type="button">Xoá dữ liệu trên mạng</button></div>`;
  }
  const keepFocus = document.activeElement && document.activeElement.id === "syncCode";
  const typed = keepFocus ? document.activeElement.value : "";
  el.innerHTML = `<h3 class="nh">Đồng bộ nhiều thiết bị</h3>${body}${msgHtml}`;
  if (keepFocus) { const i = $("syncCode"); if (i) { i.value = typed; i.focus(); } }
}
const copy = async (text, ok) => { try { await navigator.clipboard.writeText(text); syncMsg(ok); } catch (e) { syncMsg("Không sao chép tự động được. Chọn mã ở trên rồi sao chép.", true); } };
const joinLink = () => `${location.origin}${location.pathname}#join=${Sync.config().code}`;
async function syncAction(a) {
  const cfg = Sync.config();
  if (a === "sync-start") { syncMsg("Đang bật…"); const r = await Sync.start(); return syncMsg(r.ok ? "Đã bật. Nhập mã này (hoặc mở liên kết kết nối) trên thiết bị khác." : r.error, !r.ok); }
  if (a === "sync-joinform") { syncUI.join = !syncUI.join; syncUI.msg = ""; renderSync(); return syncUI.join && $("syncCode").focus(); }
  if (a === "sync-now") { const r = await Sync.syncNow(); return syncMsg(r.ok ? (r.deferred ? "Sẽ đồng bộ sau khi bạn tập xong." : r.changed ? "Đã lấy dữ liệu mới từ thiết bị khác." : "Đã đồng bộ, không có gì mới.") : r.error, !r.ok); }
  if (a === "sync-copy" && cfg) return copy(fmtCode(cfg.code), "Đã sao chép mã.");
  if (a === "sync-link" && cfg) { if (navigator.share) { try { await navigator.share({ title: "Home Workout 12", text: "Mở liên kết này để kết nối đồng bộ", url: joinLink() }); } catch (e) {} return; } return copy(joinLink(), "Đã sao chép liên kết. Mở nó trên thiết bị kia."); }
  if (a === "sync-off") { Sync.disconnect(); syncUI.join = false; return syncMsg("Đã ngắt kết nối. Dữ liệu vẫn còn trên máy này và trên mạng."); }
  if (a === "sync-undo") { const prev = Sync.undoState(); if (!prev) return; if (!await confirmSheet("Hoàn tác lần đồng bộ gần nhất?", "Dữ liệu trên máy này quay về như trước lúc nhận dữ liệu từ thiết bị khác, và các thiết bị khác sẽ nhận bản này.", "Hoàn tác")) return; st = store.normalize(prev); save(); Sync.clearUndo(); renderAll(); return syncMsg("Đã hoàn tác."); }
  if (a === "sync-wipe") { if (!await confirmSheet("Xoá dữ liệu trên mạng?", "Bản lưu trên mạng bị xoá và máy này ngắt kết nối. Dữ liệu trên máy này giữ nguyên. Thiết bị khác vẫn dùng mã này sẽ tạo lại bản trên mạng, nên hãy ngắt kết nối cả chúng.", "Xoá bản trên mạng")) return; const r = await Sync.wipeCloud(); return syncMsg(r.ok ? "Đã xoá bản trên mạng." : r.error, !r.ok); }
}
document.addEventListener("submit", async e => {
  if (e.target.id !== "syncJoin") return;
  e.preventDefault();
  const typed = $("syncCode").value;          // read first: showing the message redraws the form
  syncMsg("Đang kết nối…");
  const r = await Sync.join(typed);
  if (r.ok) syncUI.join = false;
  syncMsg(r.ok ? "Đã kết nối. Dữ liệu từ nhóm đã được gộp vào máy này." : r.error, !r.ok);
});

/* ================= notifications setting ================= */
function renderNotify() {
  const el = $("notify"), perm = N.permission();
  const snd = N.soundOn(), vib = N.vibOn(), canV = N.canVibrate();
  const fxRow = `<div class="dbtns"><button class="dbtn2 press${snd ? " on" : ""}" data-data="snd" type="button" aria-pressed="${snd}">Chuông: ${snd ? "bật" : "tắt"}</button><button class="dbtn2 press${vib && canV ? " on" : ""}" data-data="vib" type="button" aria-pressed="${vib && canV}" ${canV ? "" : "disabled"}>Rung: ${canV ? (vib ? "bật" : "tắt") : "không hỗ trợ"}</button></div><p class="hint">Chuông và rung dùng cho cả lúc app đang mở và lúc có thông báo.${canV ? "" : " iPhone không cho web app rung; thông báo vẫn có âm."}</p>`;
  const head = `<h3 class="nh">Chuông, rung &amp; thông báo hết giờ</h3>` + fxRow;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  let body;
  if (perm === "unsupported") body = `<p class="hint">${ios ? "Trên iPhone, thông báo chỉ hoạt động khi app đã cài lên màn hình chính: mở bằng Safari, bấm Chia sẻ, chọn “Thêm vào MH chính”, rồi mở app từ icon vừa tạo." : "Trình duyệt này không hỗ trợ thông báo."}</p>`;
  else if (perm === "denied") body = `<p class="hint">Thông báo đang bị chặn cho trang này. Bật lại trong cài đặt của trình duyệt hoặc của điện thoại (mục Thông báo), rồi mở lại app.</p>`;
  else if (perm === "default") body = `<p class="hint">Nhắc bằng thông báo khi rest, đếm giây, EMOM hoặc walk kết thúc mà bạn đang ở app khác hoặc khoá màn hình.</p><div class="dbtns"><button class="dbtn2 press" data-data="notif-ask" type="button" style="grid-column:1/-1">Bật thông báo</button></div>`;
  else {
    const on = N.wanted();
    body = `<p class="hint">${on ? "Đang bật. Khi hết giờ mà app không hiện trên màn hình, bạn sẽ nhận thông báo." : "Đang tắt."} Rest được hẹn giờ cả khi máy tạm dừng app. Walk và EMOM dài thì nên giữ app mở: màn hình tự sáng khi đang tập.</p><div class="dbtns"><button class="dbtn2 press${on ? " on" : ""}" data-data="notif-toggle" type="button" aria-pressed="${on}">${on ? "Đang bật" : "Đang tắt"}</button><button class="dbtn2 press" data-data="notif-test" type="button">Gửi thử</button></div>`;
  }
  el.innerHTML = head + body;
}

/* ================= tabs ================= */
const TABS = { today: ["rings", "Hôm nay"], week: ["cal", "Lịch"], road: ["route", "Lộ trình"], prog: ["chart", "Tiến độ"] };
const VIEWS = Object.keys(TABS);
document.querySelectorAll(".tabs button").forEach(b => { const t = TABS[b.dataset.v]; b.innerHTML = ic(t[0]) + "<span>" + t[1] + "</span>"; });
document.querySelector(".tabs").addEventListener("click", e => { const b = e.target.closest("button[data-v]"); if (b) show(b.dataset.v); });
function show(v) {
  document.querySelectorAll(".tabs button").forEach(b => { if (b.dataset.v === v) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
  document.querySelectorAll(".view").forEach(s => s.classList.toggle("on", s.id === "v-" + v));
  if (v === "prog") drawChart();
  scrollTo(0, 0);
  try { history.replaceState(null, "", "#" + v); } catch (e) {}
}

/* ================= app shell: install, offline, new day ================= */
const toast = (text, btn, fn) => {
  const t = $("toast");
  t.innerHTML = `<span>${text}</span>${btn ? `<button>${btn}</button>` : ""}`; t.classList.add("on");
  const b = t.querySelector("button"); if (b) b.onclick = () => { t.classList.remove("on"); fn && fn(); };
  if (!btn) setTimeout(() => t.classList.remove("on"), 4000);
};
const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
let installEvt = null;
function renderInstall() {
  const el = $("install");
  if (standalone) { el.innerHTML = ""; return; }
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  el.innerHTML = installEvt
    ? `<div class="dbtns" style="margin-top:12px"><button class="dbtn2 press" id="instBtn" style="grid-column:1/-1">${ic("down")}Cài app lên màn hình chính</button></div>`
    : `<p class="hint">${ios ? "Cài lên iPhone: mở bằng Safari, bấm Chia sẻ rồi chọn “Thêm vào MH chính”." : "Cài lên điện thoại: mở menu trình duyệt rồi chọn “Cài đặt ứng dụng” / “Thêm vào màn hình chính”."} App chạy được cả khi không có mạng.</p>`;
  const b = $("instBtn");
  if (b) b.onclick = async () => { installEvt.prompt(); await installEvt.userChoice; installEvt = null; renderInstall(); };
}
addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; renderInstall(); });
addEventListener("appinstalled", () => { installEvt = null; $("install").innerHTML = ""; });

const swOk = "serviceWorker" in navigator && (location.protocol === "https:" || ["localhost", "127.0.0.1"].includes(location.hostname));
if (swOk) {
  navigator.serviceWorker.register("sw.js").then(reg => {
    reg.addEventListener("updatefound", () => {
      const nw = reg.installing;
      nw && nw.addEventListener("statechange", () => {
        if (nw.state === "installed" && navigator.serviceWorker.controller) toast("Có bản cập nhật mới.", "Tải lại", () => location.reload());
      });
    });
  }).catch(() => {});
  /* Once the service worker is active the whole app is stored on the device. */
  navigator.serviceWorker.ready.then(() => { const o = $("offline"); o.innerHTML = ic("check") + "<span>App đã lưu vào máy: mở và ghi tiến độ được cả khi không có mạng.</span>"; o.hidden = false; }).catch(() => {});
}
/* Ask the browser not to evict saved data when storage runs low. */
try { navigator.storage?.persist?.(); } catch (e) {}

/* Coming back to the app: re-take the wake lock, and move to the new day after midnight. */
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  N.clear();
  if (Sync.enabled() && !P) Sync.syncNow();
  if (P) return void keepAwake(true);
  const p = L.position(new Date());
  if (iso(p.today) === iso(today)) return;
  ({ today, curW, wNow, dNow, inProg } = p);
  selW = wNow; selI = inProg ? dNow : 0;
  renderAll();
});

/* ================= boot ================= */
$("bDate").value = iso(dNow === 6 ? today : addD(today, 6 - dNow));
try { new ResizeObserver(drawChart).observe($("chartBox")); } catch (e) {}
A.listen();
Sync.init({
  getState: () => st,
  applyState: s => { st = store.normalize(s); store.saveQuiet(st); renderAll(); renderSync(); },
  busy: () => !!P || $("sheet").classList.contains("on"),
  onStatus: () => renderSync()
}, store.setSaveHook);
renderAll(); renderInstall(); renderSync(); renderNotify();
if (Sync.enabled()) Sync.syncNow();
addEventListener("online", () => { if (Sync.enabled()) Sync.syncNow(); });
setInterval(() => { if (document.visibilityState === "visible" && Sync.enabled() && !P) Sync.syncNow(); }, 120000);
/* a link like  …/#join=CODE  connects this device to an existing group (at start-up, or when the app is already open) */
function joinFromHash() {
  const jm = location.hash.match(/^#join=([0-9A-Za-z-]+)$/);
  if (!jm || Sync.enabled()) return;
  try { history.replaceState(null, "", "#prog"); } catch (e) {}
  show("prog");
  confirmSheet("Kết nối đồng bộ?", "Máy này sẽ gộp dữ liệu với nhóm đồng bộ của bạn. Dữ liệu đang có trên máy được giữ lại.", "Kết nối").then(async ok => {
    if (!ok) return;
    syncMsg("Đang kết nối…"); const r = await Sync.join(jm[1]);
    if (r.ok) syncUI.join = false;
    syncMsg(r.ok ? "Đã kết nối. Dữ liệu từ nhóm đã được gộp vào máy này." : r.error, !r.ok);
  });
}
joinFromHash();
addEventListener("hashchange", joinFromHash);
const h0 = location.hash.slice(1);
if (VIEWS.includes(h0) && h0 !== "today") show(h0);
addEventListener("hashchange", () => { const v = location.hash.slice(1); if (VIEWS.includes(v)) show(v); });
if (!save()) toast("Trình duyệt đang chặn lưu dữ liệu (chế độ ẩn danh?). Tiến độ sẽ không được giữ lại.");
