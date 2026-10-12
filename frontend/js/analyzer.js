// Home page: analyzer card, live model metrics, ticker.
import { predict, modelInfo, ApiError } from "./api.js";
import { savePrediction, isConfigured } from "./firebase.js";
import { $, esc, setMood, toast, currentUser, COLORS, FACES } from "./common.js";

const MAX = 1000;
const input = $("txt"), hl = $("hl"), go = $("go"), errBox = $("err"), res = $("res");
let user = null;
window.addEventListener("sentra:user", (e) => { user = e.detail; updateHint(); });
currentUser.then((u) => { user = u; updateHint(); });

// ---- ticker (decorative) ----
const sample = [["😊", "Love it, will buy again"], ["😞", "Arrived late and damaged"], ["😐", "Order shipped on Monday"],
  ["😊", "Best support I have had"], ["😞", "Not worth the price"], ["😐", "Comes in two colours"],
  ["😊", "Five stars, super quality"], ["😞", "Stopped working after a week"]];
$("tk").innerHTML = [...sample, ...sample].map(([e, t]) => `<span data-e="${e}">${t}</span>`).join("");

// ---- input helpers ----
const showText = () => { hl.style.display = "none"; input.style.display = "block"; };
const showError = (m) => { errBox.textContent = m; errBox.style.display = "block"; };
const clearError = () => { errBox.style.display = "none"; };
const count = () => { $("count").textContent = `${input.value.length} / ${MAX}`; };
function updateHint() {
  const h = $("hint");
  if (!h) return;
  if (user) h.innerHTML = "Results are saved to your private history.";
  else h.innerHTML = isConfigured() ? 'Want to keep your results? <a href="login.html">Log in</a> and they are saved to your dashboard.' : "Guest mode: results are not saved.";
}

input.addEventListener("input", () => { count(); clearError(); });
input.addEventListener("keydown", (e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") go.click(); });
hl.addEventListener("click", () => { showText(); input.focus(); });
hl.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); showText(); input.focus(); } });
document.querySelectorAll(".chip").forEach((b) => b.addEventListener("click", () => {
  input.value = b.dataset.s; count(); clearError(); showText(); res.style.display = "none";
}));
$("clr").addEventListener("click", () => {
  input.value = ""; count(); clearError(); showText(); res.style.display = "none"; setMood(null); input.focus();
});

// ---- highlight words that influenced the prediction ----
function highlight(text, keywords) {
  const map = new Map(keywords.map((k) => [k.word, k]));
  let out = "", last = 0;
  for (const m of text.matchAll(/[A-Za-z0-9']+/g)) {
    const k = map.get(m[0].toLowerCase());
    out += esc(text.slice(last, m.index));
    out += k ? `<mark class="${k.sentiment}" title="Leans ${k.sentiment}">${esc(m[0])}</mark>` : esc(m[0]);
    last = m.index + m[0].length;
  }
  return out + esc(text.slice(last));
}

function showResult(text, r) {
  res.style.setProperty("--mc", `var(--${{ Positive: "pos", Negative: "neg", Neutral: "neu" }[r.sentiment]})`);
  res.style.display = "block";
  $("face").textContent = FACES[r.sentiment];
  $("lbl").textContent = r.sentiment;
  $("conf").textContent = `Confidence ${(r.confidence * 100).toFixed(1)}%  ·  ${r.processing_ms} ms`;
  ["Positive", "Neutral", "Negative"].forEach((k) => ($(`bar-${k}`).style.width = "0"));
  requestAnimationFrame(() => requestAnimationFrame(() =>
    ["Positive", "Neutral", "Negative"].forEach((k) => ($(`bar-${k}`).style.width = `${(r.scores[k] * 100).toFixed(1)}%`))));
  $("val-Positive").textContent = `${(r.scores.Positive * 100).toFixed(0)}%`;
  $("val-Neutral").textContent = `${(r.scores.Neutral * 100).toFixed(0)}%`;
  $("val-Negative").textContent = `${(r.scores.Negative * 100).toFixed(0)}%`;
  if (r.keywords.length) { hl.innerHTML = highlight(text, r.keywords); hl.style.display = "block"; input.style.display = "none"; }
  setMood(r.sentiment);
}

go.addEventListener("click", async () => {
  clearError();
  const text = input.value.trim();
  if (text.length < 3) { res.style.display = "none"; return showError("Please enter at least a few words to analyze."); }
  go.disabled = true; go.innerHTML = '<span class="spinner"></span> Analyzing…';
  try {
    const r = await predict(text);
    showResult(text, r);
    if (user) {
      try { await savePrediction(user, { text, sentiment: r.sentiment, confidence: r.confidence, scores: r.scores }); toast("Saved to your history"); }
      catch { toast("Could not save to your history. Check your connection.", "err"); }
    }
  } catch (e) {
    res.style.display = "none";
    showError(e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
  } finally { go.disabled = false; go.textContent = "Analyze sentiment"; }
});

// ---- live model metrics (read from the trained model's metadata) ----
(async () => {
  const box = $("metrics");
  try {
    const info = await modelInfo();
    const m = info.metrics || {};
    const pct = (v) => (typeof v === "number" ? `${(v * 100).toFixed(1)}%` : "n/a");
    box.innerHTML = [["Accuracy", m.accuracy], ["Precision", m.precision_macro], ["Recall", m.recall_macro], ["F1-score", m.f1_macro]]
      .map(([n, v]) => `<div class="glass metric"><small>${n}</small><b>${pct(v)}</b></div>`).join("");
    $("meta").textContent = `Model: ${info.model}. Dataset: ${info.dataset?.name || "n/a"} (${info.sizes?.train?.toLocaleString() || "?"} training texts). Scores are macro-averaged on a held-out test set.`;
  } catch {
    box.innerHTML = '<div class="glass metric" style="grid-column:1/-1"><small>Metrics appear here once the API is running with a trained model.</small></div>';
  }
})();
count(); updateHint();
