import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0] as FirebaseApp;
}

export const db = getFirestore(app);

/**
 * Point Firestore at a local emulator when `NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST`
 * is set (e.g. `127.0.0.1:8080`).
 *
 * Strictly opt-in: with the variable unset — which is every real deployment —
 * this is a no-op and the app talks to the configured project as before.
 *
 * It exists because the Firebase Node SDK auto-honours `FIRESTORE_EMULATOR_HOST`
 * but the BROWSER bundle cannot see server env vars. Without this, an
 * end-to-end run drives a real browser that writes into the production
 * database, which is how the e2e suite used to leave rows behind.
 */
const emulatorHost = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST?.trim();
if (emulatorHost) {
  const [host, portRaw] = emulatorHost.split(":");
  const port = Number(portRaw);
  if (host && Number.isFinite(port)) {
    // `connectFirestoreEmulator` throws if Firestore has already been used, and
    // Next's fast refresh can re-run this module — both are harmless here.
    try {
      connectFirestoreEmulator(db, host, port);
    } catch {
      /* already connected */
    }
  }
}

export const storage = getStorage(app);
export default app;
