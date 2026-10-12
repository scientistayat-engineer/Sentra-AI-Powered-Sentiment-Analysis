// Thin wrapper around the Firebase Web SDK (loaded lazily from Google's CDN).
// If Firebase is not configured yet, every helper degrades gracefully and the
// app keeps working in guest mode.
import { firebaseConfig } from "./firebase-config.js";

const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
let ctx = null;
let attempted = false;

export const isConfigured = () => !!firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("YOUR_");

export async function getFirebase() {
  if (attempted) return ctx;
  attempted = true;
  if (!isConfigured()) return null;
  try {
    const [app, A, F] = await Promise.all([
      import(`${SDK}firebase-app.js`), import(`${SDK}firebase-auth.js`), import(`${SDK}firebase-firestore.js`),
    ]);
    const a = app.initializeApp(firebaseConfig);
    ctx = { auth: A.getAuth(a), db: F.getFirestore(a), A, F };
  } catch (err) {
    console.warn("Firebase could not be loaded:", err);
    ctx = null;
  }
  return ctx;
}

export async function onUser(callback) {
  const fb = await getFirebase();
  if (!fb) return callback(null);
  fb.A.onAuthStateChanged(fb.auth, callback);
}

const MESSAGES = {
  "auth/invalid-email": "That email address does not look right.",
  "auth/missing-password": "Please enter your password.",
  "auth/weak-password": "Use a password with at least 6 characters.",
  "auth/email-already-in-use": "An account with this email already exists. Try logging in.",
  "auth/invalid-credential": "Email or password is incorrect.",
  "auth/user-not-found": "No account found for this email.",
  "auth/wrong-password": "Email or password is incorrect.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
  "auth/popup-closed-by-user": "The Google window was closed before finishing.",
  "auth/network-request-failed": "Network problem. Check your connection.",
  "auth/unauthorized-domain": "This domain is not authorised in Firebase. Add it under Authentication > Settings > Authorised domains.",
};
export const friendlyError = (err) => MESSAGES[err?.code] || "Something went wrong. Please try again.";

async function need() {
  const fb = await getFirebase();
  if (!fb) throw Object.assign(new Error("Firebase is not configured."), { code: "app/not-configured" });
  return fb;
}

export async function signUp(email, password) { const f = await need(); return f.A.createUserWithEmailAndPassword(f.auth, email, password); }
export async function logIn(email, password) { const f = await need(); return f.A.signInWithEmailAndPassword(f.auth, email, password); }
export async function googleLogIn() { const f = await need(); return f.A.signInWithPopup(f.auth, new f.A.GoogleAuthProvider()); }
export async function resetPassword(email) { const f = await need(); return f.A.sendPasswordResetEmail(f.auth, email); }
export async function logOut() { const f = await need(); return f.A.signOut(f.auth); }

// ---- Firestore: users/{uid}/predictions/{id} (see firebase/firestore.rules) ----
export async function savePrediction(user, { text, sentiment, confidence, scores }) {
  const f = await need();
  const col = f.F.collection(f.db, "users", user.uid, "predictions");
  return f.F.addDoc(col, { text, sentiment, confidence, scores, createdAt: f.F.serverTimestamp() });
}

export async function loadHistory(user, max = 300) {
  const f = await need();
  const q = f.F.query(f.F.collection(f.db, "users", user.uid, "predictions"), f.F.orderBy("createdAt", "desc"), f.F.limit(max));
  const snap = await f.F.getDocs(q);
  return snap.docs.map((d) => {
    const v = d.data();
    return { id: d.id, ...v, createdAt: v.createdAt?.toDate ? v.createdAt.toDate() : new Date() };
  });
}

export async function deletePrediction(user, id) {
  const f = await need();
  return f.F.deleteDoc(f.F.doc(f.db, "users", user.uid, "predictions", id));
}

export async function deleteMany(user, ids) {
  const f = await need();
  for (let i = 0; i < ids.length; i += 400) {
    const batch = f.F.writeBatch(f.db);
    ids.slice(i, i + 400).forEach((id) => batch.delete(f.F.doc(f.db, "users", user.uid, "predictions", id)));
    await batch.commit();
  }
}
