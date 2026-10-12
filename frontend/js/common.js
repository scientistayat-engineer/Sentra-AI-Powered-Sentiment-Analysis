// Shared behaviour for every page: theme, navbar auth state, toasts, ambient mood.
import { onUser, logOut, isConfigured } from "./firebase.js";

export const COLORS = { Positive: "#3DF0A5", Negative: "#FF5C7A", Neutral: "#FFC857" };
export const FACES = { Positive: "😊", Negative: "😞", Neutral: "😐" };
export const $ = (id) => document.getElementById(id);
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ---- theme ----
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
                set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } } };
const saved = store.get("sentra-theme");
if (saved) document.documentElement.dataset.theme = saved;

function initTheme() {
  const btn = $("theme");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : !matchMedia("(prefers-color-scheme:light)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    store.set("sentra-theme", root.dataset.theme);
  });
}

// ---- toasts ----
export function toast(message, type = "ok") {
  let box = $("toasts");
  if (!box) { box = document.createElement("div"); box.id = "toasts"; box.className = "toasts"; box.setAttribute("role", "status"); document.body.append(box); }
  const t = document.createElement("div");
  t.className = `toast ${type === "err" ? "err" : ""}`;
  t.textContent = message;
  box.append(t);
  setTimeout(() => t.remove(), 3800);
}

// ---- ambient background mood ----
export function setMood(sentiment) {
  const s = document.body.style;
  if (!sentiment) { ["--b1", "--b2", "--b3"].forEach((v) => s.removeProperty(v)); return; }
  const c = COLORS[sentiment];
  s.setProperty("--b1", c); s.setProperty("--b2", c); s.setProperty("--b3", sentiment === "Neutral" ? "#8B7BFF" : c);
}

// ---- navbar: show Log in / user menu depending on auth state ----
function renderNav(user) {
  const box = $("nav-actions");
  if (!box) return;
  const toggle = `<button class="btn ghost sq" id="theme" aria-label="Toggle light or dark theme">◐</button>`;
  if (user) {
    const initial = (user.displayName || user.email || "?").trim()[0].toUpperCase();
    box.innerHTML = `${toggle}<a class="btn ghost hide-s" href="dashboard.html">Dashboard</a>
      <span class="avatar" title="${esc(user.email || "")}" aria-label="Signed in as ${esc(user.email || "user")}">${esc(initial)}</span>
      <button class="btn sm" id="logout">Log out</button>`;
    $("logout").onclick = async () => { await logOut(); toast("You have been logged out."); if (location.pathname.endsWith("dashboard.html")) location.href = "index.html"; };
  } else {
    box.innerHTML = `${toggle}<a class="btn ghost hide-s" href="login.html">Log in</a><a class="btn" href="login.html?mode=signup">Get started</a>`;
  }
  initTheme();
}

renderNav(null);
export const currentUser = new Promise((resolve) => {
  let first = true;
  onUser((user) => { renderNav(user); window.dispatchEvent(new CustomEvent("sentra:user", { detail: user })); if (first) { first = false; resolve(user); } });
});
export { isConfigured };
