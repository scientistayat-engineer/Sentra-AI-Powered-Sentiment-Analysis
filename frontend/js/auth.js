// Login / sign-up page.
import { signUp, logIn, googleLogIn, resetPassword, friendlyError, isConfigured } from "./firebase.js";
import { $, currentUser, toast } from "./common.js";

let mode = new URLSearchParams(location.search).get("mode") === "signup" ? "signup" : "login";
const form = $("form"), msg = $("msg"), submit = $("submit");

function show(text, kind = "err") { msg.className = `alert ${kind}`; msg.textContent = text; msg.style.display = "block"; }
function hide() { msg.style.display = "none"; }

function setMode(m) {
  mode = m;
  $("tab-login").setAttribute("aria-selected", m === "login");
  $("tab-signup").setAttribute("aria-selected", m === "signup");
  $("title").textContent = m === "login" ? "Welcome back" : "Create your account";
  $("sub").textContent = m === "login" ? "Log in to see your saved analyses." : "Save every analysis to your own private dashboard.";
  submit.textContent = m === "login" ? "Log in" : "Create account";
  $("password").autocomplete = m === "login" ? "current-password" : "new-password";
  $("forgot").style.display = m === "login" ? "block" : "none";
  hide();
}
$("tab-login").onclick = () => setMode("login");
$("tab-signup").onclick = () => setMode("signup");
setMode(mode);

if (!isConfigured()) show("Firebase is not configured yet. Add your keys in frontend/js/firebase-config.js (see firebase/SETUP.md).", "info");

currentUser.then((u) => { if (u) location.href = "dashboard.html"; });

function validate(email, password) {
  if (!/^\S+@\S+\.\S+$/.test(email)) return "Please enter a valid email address.";
  if (password.length < 6) return "Your password needs at least 6 characters.";
  return null;
}

async function run(action) {
  hide(); submit.disabled = true;
  try { await action(); toast(mode === "signup" ? "Account created. Welcome!" : "Logged in."); location.href = "dashboard.html"; }
  catch (e) { show(e.code === "app/not-configured" ? "Firebase is not configured yet. See firebase/SETUP.md." : friendlyError(e)); }
  finally { submit.disabled = false; }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = $("email").value.trim(), password = $("password").value;
  const problem = validate(email, password);
  if (problem) return show(problem);
  run(() => (mode === "signup" ? signUp(email, password) : logIn(email, password)));
});
$("google").onclick = () => run(googleLogIn);
$("forgot").onclick = async () => {
  const email = $("email").value.trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) return show("Type your email above first, then press this again.");
  try { await resetPassword(email); show("Password reset email sent. Check your inbox.", "ok"); }
  catch (e) { show(e.code === "app/not-configured" ? "Firebase is not configured yet." : friendlyError(e)); }
};
