// Dashboard: per-user history, stats and charts from Cloud Firestore.
import { loadHistory, deletePrediction, deleteMany, isConfigured } from "./firebase.js";
import { $, esc, toast, currentUser, COLORS } from "./common.js";

const KINDS = ["Positive", "Negative", "Neutral"];
let user = null, all = [], ready = false;

const body = $("content");
const gate = (emoji, title, text, action = "") =>
  (body.innerHTML = `<div class="glass empty"><div class="e">${emoji}</div><h3>${title}</h3><p>${text}</p>${action}</div>`);

async function init() {
  body.innerHTML = '<div class="skel"></div>';
  user = await currentUser;
  ready = true;
  if (!isConfigured()) return gate("🔧", "Firebase is not set up yet", "Add your Firebase keys in frontend/js/firebase-config.js to turn on accounts and history.", '<a class="btn" href="index.html">Back to analyzer</a>');
  if (!user) return gate("🔐", "Log in to see your dashboard", "Your analyses are saved privately to your account.", '<a class="btn" href="login.html">Log in</a>');
  try { all = await loadHistory(user); } catch (e) {
    return gate("⚠️", "Could not load your history", e.code === "permission-denied" ? "Firestore rules blocked the request. Publish firebase/firestore.rules." : "Please check your connection and refresh.");
  }
  all.length ? draw() : gate("📝", "No analyses yet", "Analyze your first review and it will show up here.", '<a class="btn" href="index.html#analyzer">Analyze text</a>');
}

const day = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

function draw() {
  const n = all.length, c = Object.fromEntries(KINDS.map((k) => [k, all.filter((x) => x.sentiment === k).length]));
  const avg = (all.reduce((s, x) => s + (x.confidence || 0), 0) / n) * 100;
  const pct = (k) => (c[k] / n) * 100;

  // donut
  let off = 0;
  const arcs = KINDS.map((k) => { const v = pct(k); const s = `<circle cx="21" cy="21" r="15.9" fill="none" stroke="${COLORS[k]}" stroke-width="5" stroke-dasharray="${v} ${100 - v}" stroke-dashoffset="${-off}"/>`; off += v; return s; }).join("");

  // last 7 days (stacked)
  const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d; });
  const perDay = days.map((d) => { const k = day(d), rows = all.filter((x) => day(x.createdAt) === k); return { d, rows }; });
  const max = Math.max(1, ...perDay.map((p) => p.rows.length));
  const week = perDay.map(({ d, rows }) => {
    const segs = KINDS.map((k) => { const v = rows.filter((x) => x.sentiment === k).length; return v ? `<i style="height:${(v / max) * 120}px;background:${COLORS[k]}" title="${k}: ${v}"></i>` : ""; }).join("");
    return `<div><span>${rows.length || ""}</span><span class="stack">${segs}</span>${d.toLocaleDateString(undefined, { weekday: "short" })}</div>`;
  }).join("");

  body.innerHTML = `
  <div class="stats">
    <div class="glass st"><small>Total analyses</small><b>${n}</b></div>
    <div class="glass st"><small>Positive</small><b style="color:var(--pos)">${c.Positive}</b></div>
    <div class="glass st"><small>Negative</small><b style="color:var(--neg)">${c.Negative}</b></div>
    <div class="glass st"><small>Neutral · avg confidence ${avg.toFixed(0)}%</small><b style="color:var(--neu)">${c.Neutral}</b></div>
  </div>
  <div class="d2">
    <div class="glass pn"><h3>Sentiment distribution</h3>
      <div class="dw"><svg width="170" height="170" viewBox="0 0 42 42" role="img" aria-label="Sentiment distribution">
        <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--ln)" stroke-width="5"/><g transform="rotate(-90 21 21)">${arcs}</g></svg>
        <div class="lg">${KINDS.map((k) => `<div><i style="background:${COLORS[k]}"></i>${k} <b>${pct(k).toFixed(0)}%</b></div>`).join("")}</div></div>
      <h3 style="margin-top:28px">Last 7 days</h3><div class="week">${week}</div>
    </div>
    <div class="glass pn"><h3>History</h3>
      <div class="toolbar">
        <input id="q" type="search" placeholder="Search your texts" aria-label="Search history">
        <select id="f" aria-label="Filter by sentiment"><option value="">All sentiments</option>${KINDS.map((k) => `<option>${k}</option>`).join("")}</select>
        <button class="btn ghost sm" id="csv">Export CSV</button><button class="btn danger sm" id="wipe">Clear all</button>
      </div>
      <div class="tbl"><table><thead><tr><th>Text</th><th>Sentiment</th><th>Confidence</th><th>Date</th><th></th></tr></thead><tbody id="rows"></tbody></table></div>
    </div>
  </div>`;
  $("q").oninput = rows; $("f").onchange = rows; $("csv").onclick = exportCsv; $("wipe").onclick = wipe;
  rows();
}

function rows() {
  const q = $("q").value.trim().toLowerCase(), f = $("f").value;
  const list = all.filter((x) => (!f || x.sentiment === f) && (!q || x.text.toLowerCase().includes(q)));
  $("rows").innerHTML = list.length ? list.map((x) => `<tr>
    <td class="txt">${esc(x.text)}</td><td><span class="tg ${x.sentiment}">${x.sentiment}</span></td>
    <td>${(x.confidence * 100).toFixed(0)}%</td><td class="when">${x.createdAt.toLocaleString()}</td>
    <td><button class="icon-btn" data-id="${x.id}" aria-label="Delete this analysis">🗑</button></td></tr>`).join("")
    : '<tr><td colspan="5" style="color:var(--mu)">No matching analyses.</td></tr>';
  document.querySelectorAll("[data-id]").forEach((b) => (b.onclick = () => remove(b.dataset.id)));
}

async function remove(id) {
  try { await deletePrediction(user, id); all = all.filter((x) => x.id !== id); all.length ? draw() : init(); toast("Deleted"); }
  catch { toast("Could not delete. Try again.", "err"); }
}

async function wipe() {
  if (!confirm("Delete your entire history? This cannot be undone.")) return;
  try { await deleteMany(user, all.map((x) => x.id)); all = []; toast("History cleared"); init(); }
  catch { toast("Could not clear history. Try again.", "err"); }
}

function exportCsv() {
  const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
  const lines = [["date", "sentiment", "confidence", "text"].join(",")]
    .concat(all.map((x) => [q(x.createdAt.toISOString()), x.sentiment, x.confidence, q(x.text)].join(",")));
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" })), download: "sentra-history.csv" });
  a.click(); URL.revokeObjectURL(a.href);
}

window.addEventListener("sentra:user", (e) => { if (ready && e.detail?.uid !== user?.uid) init(); });
init();
