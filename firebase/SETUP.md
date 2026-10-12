# Firebase setup (about 10 minutes)

Sentra uses **Firebase Authentication** (email/password + Google) and **Cloud Firestore** (private prediction history).
The Python backend does not need Firebase credentials, so no service-account key is ever required.

## 1. Create the project
1. Go to <https://console.firebase.google.com> and click **Add project**.
2. Open **Build > Authentication > Get started** and enable the providers **Email/Password** and **Google**.
3. Open **Build > Firestore Database > Create database** (production mode, any region near you).

## 2. Register the web app and copy the config
1. **Project settings (gear icon) > Your apps > Web (`</>`)** and register an app called `sentra-web`.
2. Copy the `firebaseConfig` values into `frontend/js/firebase-config.js`.
   These values are public identifiers, not secrets, so committing them is expected by Firebase.

## 3. Publish the security rules
Open **Firestore > Rules**, paste the content of `firebase/firestore.rules` and click **Publish**.
(Or with the CLI: `firebase deploy --only firestore`.)

The rules guarantee that:
- a user can read, create and delete **only** `users/{their own uid}/predictions/*`
- entries are validated (text length, allowed sentiment values, confidence between 0 and 1) and cannot be edited
- every other path is closed

## 4. Authorise your deployed domain
**Authentication > Settings > Authorised domains > Add domain**, then add your Vercel domain
(for example `sentra-yourname.vercel.app`). Google sign-in will not work on the live site without this step.

## 5. Optional hardening
In Google Cloud Console > APIs & Services > Credentials, restrict the browser API key to your Vercel domain
and `localhost`.

## Data model
```
users/{uid}/predictions/{autoId}
  text        string   (1-1000 chars)
  sentiment   string   Positive | Negative | Neutral
  confidence  number   0..1
  scores      map      {Positive, Neutral, Negative}
  createdAt   timestamp (server time)
```
