/* UI: four tabs + the full-screen player. All numbers come from the schedule (logic.js) and the saved state (store.js). */
import { S, WEEK, DAYN, LIFT, PH, PL, TESTS, GOALS, WEEKS } from "./data.js";
import * as L from "./logic.js";
import { fmt, iso, addD, dateOf, mmss, incl, effS, phaseOf, lvName } from "./logic.js";
import * as store from "./store.js";
import { ic } from "./icons.js";
import * as N from "./notify.js";
import * as A from "./audio.js";

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
const G = () => window.gsap && !RM();
const dmy = d => d.split("-").reverse().join("/");
const num = n => String(n).replace(".", ",");

const qName = n => n.replace(/\s*\([^)]*\)/g, "").replace(/^EMOM( \d+')?:\s*/, "").replace(" / ", " and ").trim();
const howLinks = n => {
  const q = encodeURIComponent(qName(n));
  return `<div class="how"><a href="https://www.google.com/search?tbm=isch&q=${q}%20exercise" target="_blank" rel="noopener">${ic("target")}Xem hình</a><a href="https://www.youtube.com/results?search_query=${q}%20proper%20form" target="_blank" rel="noopener">${ic("play")}Video mẫu</a></div>`;
};
/* Session identity: its plate colour, and the text colour that reads on it. */
const sty = k => `--c:${S[k].c};--on:var(--on-${k})`;
const WALK = "--c:var(--walk);--on:var(--on-walk)", MINI = "--c:var(--mini);--on:var(--on-mini)";
/* Sets as weight plates: hollow until done. */
const plates = (done, n) => `<span class="plates" role="img" aria-label="${done} trên ${n} set">${Array.from({ length: n }, (_, i) => `<i class="plate${i < done ? " on" : ""}"></i>`).join("")}</span>`;
const rack = (done, tot) => `<div class="rack" aria-hidden="true">${Array.from({ length: tot }, (_, i) => `<i class="${i < done ? "on" : ""}"></i>`).join("")}</div>`;
const mbar = pct => `<div class="mbar" aria-hidden="true"><i style="width:${Math.round(Math.max(0, Math.min(1, pct)) * 100)}%"></i></div>`;
const cap = t => t.charAt(0).toUpperCase() + t.slice(1);

/* ================= Hôm nay ================= */
function renderToday() {
  const d = dayInfo(selW, selI), s = S[d.k], ph = phaseOf(selW), dt = dateOf(selW, selI), isT = iso(dt) === iso(today);
  const isLift = d.L.tot > 0;
  const h = `<header class="vhead"><div><div class="dl">${isT ? DAYN[selI] + ", " + dt.getDate() + " tháng " + (dt.getMonth() + 1) : dt.getDate() + " tháng " + (dt.getMonth() + 1) + ", tuần " + selW}</div><h1>${isT ? "Hôm nay" : DAYN[selI]}</h1></div>${!isT && inProg ? `<button class="pill press" data-today="1">${ic("cl")}Hôm nay</button>` : `<span class="pill">Tuần ${selW}/${WEEKS}</span>`}</header>`;

  /* today at a glance: three numbers, three bars */
  const meters = [
    ["Strength", isLift ? d.L.dn / d.L.tot : 0, isLift ? `${d.L.dn}<small>/${d.L.tot} set</small>` : `<small>Nghỉ</small>`, isLift ? s.c : "var(--ink3)", !isLift],
    ["Incline Walk", d.wt ? d.wm / d.wt : (d.wm ? 1 : 0), d.wt ? `${d.wm}<small>/${d.wt} phút</small>` : (d.wm ? `${d.wm}<small>phút</small>` : `<small>Nghỉ</small>`), "var(--walk)", !d.wt && !d.wm],
    ["Mini Circuit", d.M.tot ? d.M.dn / d.M.tot : 0, `${d.M.dn}<small>/${d.M.tot} set</small>`, "var(--mini)", false]];
  const sum = `<section class="panel meters" aria-label="Tiến độ hôm nay">${meters.map(m => `<div class="meter${m[4] ? " off" : ""}" style="--c:${m[3]}"><span class="ml">${m[0]}</span><b class="mv">${m[2]}</b>${mbar(m[1])}</div>`).join("")}</section>`;

  /* week strip: each day ends with a plate that fills as the day gets done */
  const strip = `<section class="panel wk"><div class="wkh"><div><b>Tuần ${selW}, ${ph.t}</b><span>${fmt(dateOf(selW, 0))} – ${fmt(dateOf(selW, 6))}</span></div><button class="ar press" id="pw" aria-label="Tuần trước" ${selW <= 1 ? "disabled" : ""}>${ic("cl")}</button><button class="ar press" id="nw" aria-label="Tuần sau" ${selW >= WEEKS ? "disabled" : ""}>${ic("cr")}</button></div>
  <div class="days7">${WEEK.map(([n, k], i) => {
    const x = dayInfo(selW, i), pc = x.L.tot ? x.L.dn / x.L.tot : x.wt ? x.wm / x.wt : 0, ok = pc >= 1;
    const t = iso(dateOf(selW, i)) === iso(today);
    return `<button class="dbtn${i === selI ? " sel" : ""}${t ? " today" : ""}" style="--c:${S[k].c}" data-d="${i}" aria-pressed="${i === selI}" aria-label="${DAYN[i]} ${fmt(dateOf(selW, i))}, ${S[k].name}${ok ? ", đã xong" : ""}"><span class="wd">${n}</span><span class="dn">${dateOf(selW, i).getDate()}</span><i class="plate${ok ? " on" : ""}" style="--p:${Math.round(Math.min(1, pc) * 100)}"></i></button>`;
  }).join("")}</div></section>`;

  /* incline walk */
  const walkBlock = main => {
    const pct = d.wt ? Math.min(1, d.wm / d.wt) : 0;
    const ctx = ["push", "pull", "upper"].includes(d.k) ? "sau strength session" : d.k === "stretch" ? "nhẹ nhàng" : d.k === "rest" ? "buổi chính hôm nay" : "";
    const btnTxt = `${d.wm >= d.wt ? "Walk thêm" : d.wm ? "Tiếp tục walk" : "Bắt đầu walk"}, ${Math.max(5, d.wt - d.wm)} phút`;
    const manual = `<label class="manual"><input type="number" id="wMin" min="0" inputmode="numeric" value="${d.wm || ""}" placeholder="0" aria-label="Phút đã đi"><span>phút đã đi, sửa tay nếu cần</span></label>`;
    const trio = `<div class="trio"><div><small>Target</small><b>${d.wt}<em>phút</em></b></div><div><small>Incline</small><b>${incl(selW)}</b></div><div><small>Speed</small><b>4,5–5,5<em>km/h</em></b></div></div>`;
    if (main) return `<section class="panel hero" style="${WALK}"><h2>Incline Walk</h2><p class="hmeta">Ngày nghỉ, đây là buổi chính: ${d.wt} phút</p>${trio}
   <div class="hprog">${mbar(pct)}<div class="hrow"><span>${d.wm}/${d.wt} phút</span><span>Không vịn tay vào máy</span></div></div>
   <button class="cta press" data-walk="1">${ic("play")}${btnTxt}</button>${manual}</section>`;
    return `<section class="panel" style="${WALK}"><div class="bh"><div><h3>Incline Walk</h3><p>${d.wt ? d.wt + " phút " + ctx : "Leg day: không walk"}</p></div>${d.wt ? `<b class="mv">${d.wm}<small>/${d.wt} phút</small></b>` : ""}</div>
   ${d.wt ? `${mbar(pct)}${trio}
   <button class="btn press" data-walk="1">${ic("play")}${btnTxt}</button>` : `<p class="sub" style="margin:0;line-height:1.5">Không walk, hoặc cool-down 10 phút incline thấp.</p>`}${manual}</section>`;
  };

  let colA = sum + strip, colB = "";
  if (isLift) {
    const pct = d.L.dn / d.L.tot, done = d.L.dn >= d.L.tot, ex = liftEx(d.k), sv = st.sets[d.key] || {};
    const note = dl(selW) ? "Tuần deload: đã giảm ½ số set" : selW <= 2 ? "Adaptation: RPE 7, còn 3 reps in reserve" : "";
    colA += `<section class="panel hero" style="${sty(d.k)}"><h2>${s.full}</h2><p class="hmeta">${ex.length} bài, ${d.L.tot} set${ex.some(e => e.ss) ? ", có superset" : ""}, ${s.dur}</p>${note ? `<p class="hnote">${note}</p>` : ""}
   <div class="hprog">${rack(d.L.dn, d.L.tot)}<div class="hrow"><span>${d.L.dn}/${d.L.tot} set</span><span>${Math.round(pct * 100)}%</span></div></div>
   <button class="cta press" data-play="lift">${done ? ic("check") + "Đã xong, xem lại" : ic("play") + (d.L.dn ? `Tiếp tục, set ${d.L.dn + 1}/${d.L.tot}` : "Bắt đầu tập")}</button>${d.L.dn ? `<button class="ghost press" data-reset="lift">Làm lại từ đầu</button>` : ""}</section>`;
    const row = (e, j) => {
      const n = effS(e.s, selW, j), cur = Math.min(sv[j] || 0, n), dn = cur >= n;
      const sub = [e.r.replace(" · ", ", "), e.sec ? "rest " + mmss(e.sec) : ""].filter(Boolean).join(", ");
      const lv = e.pk ? `<span class="lvb${ready(e.pk) ? " rd" : ""}">Level ${e.lv + 1}/${e.lvN}${ready(e.pk) ? ", sẵn sàng lên level" : hitsSince(e.pk).length ? ", đạt top reps " + hitsSince(e.pk).length + "/2" : ""}</span>` : "";
      return `<li class="ex${dn ? " done" : ""}"><span class="num">${dn ? ic("check") : j + 1}</span><div class="exm"><b>${e.n}</b><small>${sub}</small>${lv}</div>${plates(cur, n)}</li>`;
    };
    let li = "", j = 0;
    while (j < ex.length) {
      const e = ex[j], f = ex[j + 1];
      if (e.ss && f && f.ss === e.ss) { li += `<li class="ssg"><div class="ssl">${ic("link")}Superset: làm 2 bài liên tiếp, không rest ở giữa</div><ul>${row(e, j)}${row(f, j + 1)}</ul></li>`; j += 2; }
      else { li += row(e, j); j++; }
    }
    colB += `<div class="sh"><h2>Bài tập</h2><span class="sub">${ex.length} bài, ${s.dur}</span></div><section class="panel" style="${sty(d.k)};padding:0"><ul class="exl">${li}</ul></section>`;
    colB += `<div class="sh"><h2>Thêm hôm nay</h2></div>` + walkBlock(false);
  } else {
    colA += walkBlock(true);
    colB += `<div class="sh"><h2>Thêm hôm nay</h2></div>`;
  }
  const mx = exFor("mini", d.k), mp = d.M.tot ? d.M.dn / d.M.tot : 0;
  colB += `<section class="panel" style="${MINI}"><div class="bh"><div><h3>Mini Circuit</h3><p>10 phút, 3 rounds${d.k === "push" || d.k === "upper" ? ", chỉ core" : ", Push-Up + core"}</p></div><b class="mv mini-val">${d.M.dn}<small>/${d.M.tot} set</small></b></div>${mbar(mp)}
  <ul class="mini-l">${mx.map(m => `<li><span>${m.n}</span><b>3 × ${m.r}</b></li>`).join("")}</ul>
  <button class="btn press" data-play="mini">${d.M.dn >= d.M.tot ? ic("check") + "Đã xong, làm lại" : ic("play") + (d.M.dn ? "Làm tiếp" : "Bắt đầu Mini Circuit")}</button></section>
  <section class="panel note" style="--c:${ph.c}"><div><b>Chặng ${PH.indexOf(ph) + 1}, ${ph.t}</b><p>${ph.p}</p></div></section>`;
  $("v-today").innerHTML = h + `<div class="tgrid"><div class="col">${colA}</div><div class="col">${colB}</div></div>`;
}
/* ================= Lịch ================= */
function renderWeek() {
  $("weekSub").textContent = `Tuần ${wNow}, ${fmt(dateOf(wNow, 0))} – ${fmt(dateOf(wNow, 6))}`;
  $("days").innerHTML = WEEK.map(([n, k], i) => {
    const s = S[k], wt = L.walkT(wNow, k), isT = inProg && i === dNow;
    return `<details class="day${isT ? " today" : ""}" style="${sty(k)}"${isT ? " open" : ""}><summary><div><span class="dn">${DAYN[i]}${isT ? ", hôm nay" : ""}</span><span class="dt">${s.full}</span><span class="dm">${cap([s.dur, wt ? "walk " + wt + " phút" : ""].filter(Boolean).join(", ") || "rest")}</span></div><span class="chev">${ic("cr")}</span></summary><ul class="dlist">${liftEx(k).map((e, j) => `<li><span>${e.ss ? `<span class="ssb">${e.ss}</span>` : ""}${e.n}</span><span class="r">${effS(e.s, wNow, j) > 1 ? effS(e.s, wNow, j) + " × " : ""}${e.r.replace(" · ", ", ")}</span>${e.tip ? `<small>${e.tip}</small>` : ""}${e.n.startsWith("Weigh-in") ? "" : `<small class="hw">${howLinks(e.n)}</small>`}</li>`).join("")}<li><span>Incline Walk</span><span class="r">${wt ? wt + " phút, " + incl(wNow) : "rest"}</span></li><li><span>Mini Circuit</span><span class="r">${k === "push" || k === "upper" ? "chỉ core" : "Push-Up + core"}</span></li></ul></details>`;
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
  $("goals").innerHTML = `<div class="cth"><h3 class="ct">Mục tiêu tuần ${w}</h3><span class="gsum${g.met === 3 ? " all" : ""}">${g.met === 3 ? ic("check") + "Đạt cả 3" : `Đạt ${g.met}/3`}</span></div><p class="cs">${fmt(dateOf(w, 0))} – ${fmt(dateOf(w, 6))}, ${phaseOf(w).t}</p>
  <div class="goals">${rows.map(r => `<div class="goal${r[6] ? " ok" : ""}" style="--c:${r[1]}"><i class="plate lg${r[6] ? " on" : ""}" style="--p:${Math.round(Math.min(1, r[4]) * 100)}" role="img" aria-label="${r[6] ? "Đạt" : "Chưa đạt"}"></i><div class="gm"><b>${r[2]}</b><span>${r[3]}</span><div class="bar"><i style="width:${Math.min(100, r[4] * 100)}%"></i></div></div><div class="gv">${r[5]}</div></div>`).join("")}</div>`;
}

function renderLv() {
  const groups = LIFT.map(k => ({ k, items: S[k].ex.map((_, j) => k + "-" + j).filter(pk => PL[pk]) }));
  const rc = Object.keys(PL).filter(ready).length;
  $("lvCard").innerHTML = `<h3 class="ct">Progression</h3><p class="cs">Mỗi bài có các level từ dễ đến khó. Bấm "đạt top reps" ở set cuối trong lúc tập; đạt 2 buổi là lên level. ${rc ? `<b style="color:var(--legs)">${rc} bài sẵn sàng lên level.</b>` : ""}</p>
 ${groups.map(g => `<div class="lvg"><div class="lvgh" style="--c:${S[g.k].c}"><i></i>${S[g.k].full}</div>${g.items.map(pk => {
    const i = lvOf(pk), Lv = PL[pk], h = hitsSince(pk).length, r = ready(pk), last = i >= Lv.length - 1, hist = (st.lvlH[pk] || []);
    return `<details class="lvi${r ? " rd" : ""}" style="--c:${S[g.k].c}"><summary><div class="lvm"><b>${lvName(pk, i)}</b><span>Level ${i + 1}/${Lv.length}${last ? ", level cao nhất" : r ? ", sẵn sàng!" : `, top reps ${Math.min(h, 2)}/2`}</span><span class="lvd">${Lv.map((_, q) => `<i class="${q < i ? "p" : q === i ? "c" : ""}"></i>`).join("")}</span></div>${last ? "" : `<button class="lvup press${r ? " rd" : ""}" data-up="${pk}">Lên level</button>`}</summary>
  <ol class="lvl">${Lv.map((_, q) => `<li class="${q < i ? "p" : q === i ? "c" : ""}"><span>${q + 1}</span>${lvName(pk, q)}</li>`).join("")}</ol>
  <div class="lvf">${i > 0 ? `<button class="lvdn press" data-down="${pk}">Về level trước</button>` : ""}${hist.length ? `<span>Lên level gần nhất: ${dmy(hist[hist.length - 1].d)}</span>` : ""}</div></details>`;
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
  $("progSub").textContent = inProg ? `Tuần ${curW}/${WEEKS}, ${phaseOf(curW).t}` : curW < 1 ? `Bắt đầu ${fmt(dateOf(1, 0))}/${dateOf(1, 0).getFullYear()}` : `Đã xong ${WEEKS} tuần`;
  $("stats").innerHTML = [[Ls, WEEKS * 4, "buổi tạ", "var(--push)", "", "dumbbell"], [+(W / 60).toFixed(1), WT / 60, "giờ walk", "var(--walk)", "h", "walk"], [M, WEEKS * 7, "ngày mini", "var(--mini)", "", "bolt"]]
    .map(a => `<div class="panel stat" style="--c:${a[3]}"><b class="mv">${num(a[0])}<small>/${Math.round(a[1])}${a[4]}</small></b><span>${a[2]}</span>${mbar(a[1] ? a[0] / a[1] : 0)}</div>`).join("");
  $("tests").innerHTML = TESTS.map(([id, l]) => {
    const t = st.tests[id] || {}, has = v => v !== undefined && v !== "" && v !== null, ok = has(t.a) && has(t.b), df = ok ? t.b - t.a : null;
    return `<tr><td>${l}</td><td class="n"><input type="number" inputmode="numeric" data-t="${id}" data-s="a" value="${t.a ?? ""}" placeholder="–" aria-label="${l} tuần 1"></td><td class="n"><input type="number" inputmode="numeric" data-t="${id}" data-s="b" value="${t.b ?? ""}" placeholder="–" aria-label="${l} tuần 12"></td><td class="n df${df > 0 ? " up" : df < 0 ? " dn" : ""}">${df == null ? "–" : (df > 0 ? "+" : "") + df}</td></tr>`;
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
const ringHTML = (cls = "") => `<div class="ring ${cls}"><svg viewBox="0 0 240 240"><circle cx="120" cy="120" r="104" fill="none" stroke="rgba(240,239,234,.14)" stroke-width="18"/><circle id="rg" class="pg jump" cx="120" cy="120" r="104" fill="none" style="stroke:var(--c)" stroke-width="18" stroke-linecap="butt" stroke-dasharray="${RC.toFixed(1)}" stroke-dashoffset="0"/></svg><div class="in"><div class="rt" id="rt">0:00</div><div class="lb" id="rl"></div></div></div>`;
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
  P = { kind, k: d.k, w: selW, key: d.key, sp, idx, ex: exFor(kind, d.k), c: kind === "mini" ? "var(--mini)" : S[d.k].c, on: `var(--on-${kind === "mini" ? "mini" : d.k})`, t0: Date.now(), title: kind === "mini" ? "Mini Circuit" : S[d.k].full };
  A.wake(); openShell(); showWork();
}
function openWalk() {
  offerNotify();
  const d = dayInfo(selW, selI), target = Math.max(5, d.wt - d.wm);
  P = { kind: "walk", key: d.key, c: "var(--walk)", on: "var(--on-walk)", t0: Date.now(), title: "Incline Walk", target, w: selW };
  A.wake(); openShell(); showWalk();
}
function openShell() {
  pl.style.setProperty("--c", P.c); pl.style.setProperty("--on", P.on); pl.classList.add("on"); document.body.style.overflow = "hidden"; keepAwake(true);
  clearInterval(clockId);
  clockId = setInterval(() => { const c = $("pclock"); if (c && P) c.textContent = mmss(Math.floor((Date.now() - P.t0) / 1000)); }, 500);
  if (G()) gsap.fromTo(pl, { opacity: 0 }, { opacity: 1, duration: .25, clearProps: "opacity" });
}
function closePlay() {
  T = null; P = null; pl.classList.remove("on", "rest"); pl.innerHTML = ""; document.body.style.overflow = ""; keepAwake(false); clearInterval(clockId);
  renderToday(); renderProg();
}
const top = () => {
  const x = P.sp ? P.sp[Math.min(P.idx, P.sp.length - 1)] : null;
  const sub = P.kind === "walk" ? `Target ${P.target} phút` : x && P.idx < P.sp.length ? `Bài ${x.j + 1}/${P.ex.length}, set ${Math.min(P.idx + 1, P.sp.length)}/${P.sp.length}` : `${P.sp.length}/${P.sp.length} set`;
  return `<div class="ptop"><button class="gx press" data-pa="close" aria-label="Đóng">${ic("x")}</button><div class="t"><b>${P.title}</b><span>${sub}</span></div><div class="clock" id="pclockw">${ic("timer")}<span id="pclock">${mmss(Math.floor((Date.now() - P.t0) / 1000))}</span></div></div>${P.sp ? `<div class="segs">${P.sp.map((x, i) => `<i class="${i < P.idx ? "on" : i === P.idx ? "cur" : ""}"></i>`).join("")}</div>` : ""}`;
};
const anim = () => { pl.scrollTop = 0; if (G()) gsap.from("#pl .an", { y: 18, opacity: 0, duration: .45, stagger: .045, ease: "power3.out", clearProps: "transform,opacity" }); };
function nextCard(i, rest) {
  const x = P.sp[i];
  if (!x) return `<div class="next an"><div><small>Tiếp theo</small><b>Hết buổi, bài cuối</b></div></div>`;
  const e = P.ex[x.j];
  return `<div class="next an"><div><small>Tiếp theo, set ${x.q + 1}/${x.n}</small><b>${e.n}</b></div>${rest ? `<span class="rb">${ic("timer")}Rest ${mmss(rest)}</span>` : rest === 0 ? `<span class="rb">No rest</span>` : ""}</div>`;
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
  pl.innerHTML = top() + `<div class="pbody"><div class="pk an"><span class="tag">Bài ${exNo}/${P.ex.length}</span>${e.ss ? `<span class="tag c">${ic("link")}${e.ss}, ${ssTxt}</span>` : ""}${e.emom ? `<span class="tag c">${ic("timer")}EMOM ${e.emom}'</span>` : ""}${e.pk ? `<span class="tag">Level ${e.lv + 1}/${e.lvN}</span>` : ""}</div>
 <div class="pname an">${e.n}</div>
 ${e.emom ? "" : `<div class="setbox an"><div class="setn"><b>${x.q + 1}</b><span>/${x.n}</span></div><div class="setl"><small>Set</small>${dots}</div></div>`}
 <div class="reps an"><div class="rv">${ic("target")}<div><span>${e.r.split(" · ")[0]}</span>${e.r.includes(" · ") ? `<small>${e.r.split(" · ").slice(1).join(" · ")}</small>` : ""}</div></div>${e.tip ? `<div class="tip">${ic("bulb")}<span>${e.tip}</span></div>` : ""}${e.n.startsWith("Weigh-in") ? "" : howLinks(e.n)}</div>${e.pk && x.q === x.n - 1 ? `<button class="hitb press an${(st.hit[e.pk] || []).includes(P.key) ? " on" : ""}" data-pa="hit">${ic("check")}<span>Mọi set đều đạt top reps<small>Bấm khi bạn làm được mức reps cao nhất ở tất cả các set hôm nay. Đạt 2 buổi là lên level.</small></span></button>` : ""}${mid}</div>
 <div class="pfoot">${nextCard(P.idx + 1, x.rest)}
 ${e.emom ? `<button class="pbig press an" data-pa="emom" id="emb">${ic("play")}Bắt đầu EMOM ${e.emom}'</button>` : `<button class="pbig press an" data-pa="done">${ic("check")}Xong set</button>`}${nav}</div>`;
  if (e.emom) { $("rl").textContent = "Minute 1, Pull-Up"; setRing(60, 60, true); }
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
  pl.innerHTML = top() + `<div class="pbody" style="text-align:center">${pe ? `<div class="rest-h an"><span class="tag c">${ic("check")}Xong set ${prev.q + 1}/${prev.n}, ${pe.n.length > 22 ? pe.n.slice(0, 21) + "…" : pe.n}</span></div>` : ""}<div class="an" id="ringw">${ringHTML()}</div>
 <div class="ctrl an"><button class="cb press" data-pa="m15" aria-label="Bớt 15 giây">−15</button><div class="cbl"><button class="cb main press" data-pa="pause" id="pz" aria-label="Tạm dừng">${ic("pause")}</button><span id="pzl">Tạm dừng</span></div><button class="cb press" data-pa="p15" aria-label="Thêm 15 giây">+15</button></div></div>
 <div class="pfoot">${nextCard(P.idx)}<button class="pbig press an" data-pa="go">Vào set luôn${ic("skip")}</button></div>`;
  $("rl").textContent = "rest";
  const nx = P.sp[P.idx], nxe = nx && P.ex[nx.j];
  startT(sec, () => showWork(), l => setRing(l, T ? T.dur : sec, l === sec), N.textFor("rest", { next: nxe && nxe.n, q: nx && nx.q, n: nx && nx.n }));
  anim();
  if (G()) gsap.from("#ringw .ring", { scale: .88, duration: .6, ease: "back.out(1.6)", clearProps: "transform" });
}
function showDone() {
  T = null; pl.classList.remove("rest");
  const mins = Math.max(1, Math.round((Date.now() - P.t0) / 60000)), d = dayInfo(P.w, dayIdx(P.key)), wl = d.wt - d.wm, exN = P.ex.length;
  const toWalk = P.kind === "lift" && wl > 0;
  pl.innerHTML = top() + `<div class="pbody"><div class="badge an" id="badge"><i>${ic("check")}</i></div><div class="done-t an"><h2>Xong ${P.kind === "mini" ? "mini" : "buổi"}!</h2><p>${P.title}, tuần ${P.w}</p></div>
 <div class="dstats an"><div><b>${P.sp.length}</b><span>set</span></div><div><b>${mins}</b><span>phút</span></div><div><b>${exN}</b><span>bài</span></div></div>
 ${toWalk ? `<div class="wsug an">${ic("walk")}<span>Tiếp theo: incline walk <b>${wl} phút</b>, incline ${incl(P.w)}, 4,5–5,5 km/h.</span></div>` : ""}</div>
 <div class="pfoot">${toWalk ? `<button class="pbig walkbtn press an" data-pa="towalk">${ic("walk")}Incline Walk ${wl}' ngay</button>` : ""}<div class="prow one an"><button class="gbtn press" data-pa="close">Về trang chính</button></div></div>`;
  beep(660, .15); setTimeout(() => beep(990, .3), 180); buzz([60, 40, 60]); anim();
  if (G()) gsap.from("#badge", { scale: .4, rotate: -20, duration: .8, ease: "back.out(2)", clearProps: "transform" });
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
      const lb = $("rl"); if (lb) lb.textContent = `Minute ${Math.min(mi, e2.emom)}/${e2.emom}, ${mi % 2 ? "Pull-Up" : "Dip"}`;
    }, N.textFor("emom"));
    return;
  }
  if (a === "towalk") {
    const d = dayInfo(P.w, dayIdx(P.key)), t = Math.max(5, d.wt - d.wm);
    P = { kind: "walk", key: P.key, c: "var(--walk)", on: "var(--on-walk)", t0: Date.now(), title: "Incline Walk", target: t, w: P.w };
    pl.style.setProperty("--c", P.c); pl.style.setProperty("--on", P.on); return showWalk();
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
  const rb = t.closest("[data-reset]"); if (rb) { const d = dayInfo(selW, selI); st.sets[d.key] = {}; save(); return renderToday(); }
  const up = t.closest("[data-up]");
  if (up) {
    e.preventDefault();
    const pk = up.dataset.up, i = lvOf(pk);
    if (i < PL[pk].length - 1) {
      st.lvl[pk] = i + 1; stampLevel(pk); (st.lvlH[pk] = st.lvlH[pk] || []).push({ d: iso(new Date()), to: i + 1 }); save();
      beep(880, .12); setTimeout(() => beep(1175, .25), 130);
      renderProg(); renderToday(); renderWeek();
      if (G()) gsap.from(`[data-up="${pk}"]`, { scale: .6, duration: .4, ease: "back.out(3)" });
    }
    return;
  }
  const dn = t.closest("[data-down]");
  if (dn) { const pk = dn.dataset.down, i = lvOf(pk); if (i > 0) { st.lvl[pk] = i - 1; stampLevel(pk); save(); renderProg(); renderToday(); renderWeek(); } return; }
  const del = t.closest("[data-del]"); if (del) { st.body = st.body.filter(r => r.d !== del.dataset.del); save(); return renderProg(); }
  const da = t.closest("[data-data]"); if (da) return dataAction(da.dataset.data);
});
document.addEventListener("change", e => {
  const t = e.target;
  if (t.id === "wMin") { const d = dayInfo(selW, selI); st.walk[d.key] = t.value === "" ? 0 : Math.max(0, +t.value); save(); renderToday(); renderProg(); }
  if (t.dataset.t) { const o = st.tests[t.dataset.t] = st.tests[t.dataset.t] || {}; o[t.dataset.s] = t.value === "" ? "" : +t.value; save(); renderProg(); }
  if (t.id === "impFile" && t.files[0]) importFile(t.files[0]);
});
$("bodyForm").addEventListener("submit", e => {
  e.preventDefault();
  const d = $("bDate").value; if (!d) return;
  const kg = $("bKg").value, w = $("bWaist").value;
  st.body = st.body.filter(r => r.d !== d); st.body.push({ d, kg: kg === "" ? null : +kg, w: w === "" ? null : +w }); save();
  $("bKg").value = ""; $("bWaist").value = ""; renderProg();
});

/* ================= backup / restore ================= */
const msg = (text, cls = "") => { const m = $("dmsg"); m.textContent = text; m.className = "dmsg " + cls; };
function confirmSheet(title, text, go) {
  const sh = $("sheet");
  sh.innerHTML = `<div role="alertdialog" aria-modal="true" aria-labelledby="shT"><h3 id="shT">${title}</h3><p>${text}</p><div class="row"><button data-sh="no">Huỷ</button><button class="go" data-sh="yes">${go}</button></div></div>`;
  sh.classList.add("on");
  return new Promise(res => { sh.onclick = e => { const b = e.target.closest("[data-sh]"); if (!b && e.target !== sh) return; sh.classList.remove("on"); sh.innerHTML = ""; res(!!b && b.dataset.sh === "yes"); }; });
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
  if (a === "notif-ask") return N.ask().then(renderNotify);
  if (a === "notif-toggle") { N.setWanted(!N.wanted()); N.cancel(); return renderNotify(); }
  if (a === "notif-test") return N.show({ title: "Thông báo hoạt động", body: "Khi hết giờ rest, bạn sẽ thấy thông báo như thế này." }).then(ok => msg(ok ? "Đã gửi thông báo thử." : "Không gửi được thông báo thử. Kiểm tra quyền thông báo của app.", ok ? "ok" : "err"));
  if (a === "wipe") return confirmSheet("Xoá toàn bộ dữ liệu?", "Mọi set, phút walk, level, Max Test và lần đo trên máy này sẽ mất. Nên xuất file sao lưu trước.", "Xoá hết").then(ok => { if (!ok) return; st = store.blank(); save(); renderAll(); msg("Đã xoá toàn bộ dữ liệu.", "ok"); });
}
async function importFile(f) {
  let next;
  try { next = store.importJSON(await f.text()); } catch (e) { $("impFile").value = ""; return msg("File này không phải file sao lưu của app.", "err"); }
  $("impFile").value = "";
  if (!store.isEmpty(st) && !await confirmSheet("Thay dữ liệu hiện tại?", "Dữ liệu đang có trên máy này sẽ được thay bằng nội dung file sao lưu.", "Thay thế")) return;
  st = next; save(); renderAll(); msg("Đã khôi phục dữ liệu từ file.", "ok");
}

/* ================= notifications setting ================= */
function renderNotify() {
  const el = $("notify"), perm = N.permission();
  const snd = N.soundOn(), vib = N.vibOn(), canV = N.canVibrate();
  const fxRow = `<div class="dbtns"><button class="dbtn2 press${snd ? " on" : ""}" data-data="snd" type="button" aria-pressed="${snd}">Chuông: ${snd ? "bật" : "tắt"}</button><button class="dbtn2 press${vib && canV ? " on" : ""}" data-data="vib" type="button" aria-pressed="${vib && canV}" ${canV ? "" : "disabled"}>Rung: ${canV ? (vib ? "bật" : "tắt") : "không hỗ trợ"}</button></div><p class="hint">Chuông và rung dùng cho cả lúc app đang mở và lúc có thông báo.${canV ? "" : " iPhone không cho web app rung; thông báo vẫn có âm."}</p>`;
  const head = `<h4>Chuông, rung &amp; thông báo hết giờ</h4>` + fxRow;
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
  document.querySelectorAll(".tabs button").forEach(b => b.setAttribute("aria-selected", b.dataset.v === v));
  document.querySelectorAll(".view").forEach(s => s.classList.toggle("on", s.id === "v-" + v));
  if (v === "prog") drawChart();
  scrollTo(0, 0);
  try { history.replaceState(null, "", "#" + v); } catch (e) {}
  if (G()) gsap.from("#v-" + v + " .card,#v-" + v + " .hero,#v-" + v + " details,#v-" + v + " .ph", { y: 14, opacity: 0, duration: .4, stagger: .03, ease: "power3.out", clearProps: "transform,opacity" });
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
renderAll(); renderInstall(); renderNotify();
const h0 = location.hash.slice(1);
if (VIEWS.includes(h0) && h0 !== "today") show(h0);
addEventListener("hashchange", () => { const v = location.hash.slice(1); if (VIEWS.includes(v)) show(v); });
if (G()) gsap.from(".app .vhead,.app .card,.app .hero", { y: 18, opacity: 0, duration: .5, stagger: .05, ease: "power3.out", clearProps: "transform,opacity" });
if (!save()) toast("Trình duyệt đang chặn lưu dữ liệu (chế độ ẩn danh?). Tiến độ sẽ không được giữ lại.");
