// Initialisation Firebase (app + auth) pour "Ma Racine".
// La config est lue depuis les variables d'environnement NEXT_PUBLIC_*.
// Ne jamais committer de vraies clés : voir .env.local.example.

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// getAuth()/getFirestore() exigent un navigateur et des clés valides : on ne
// les appelle jamais au prerender serveur (sinon le build échoue tant que les
// clés NEXT_PUBLIC_FIREBASE_* ne sont pas renseignées dans .env.local). Côté
// serveur on expose des espaces réservés, jamais utilisés (les effets sont client).
let auth: Auth;
let db: Firestore;
if (typeof window !== 'undefined') {
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} else {
  auth = undefined as unknown as Auth;
  db = undefined as unknown as Firestore;
}

export { auth, db };
