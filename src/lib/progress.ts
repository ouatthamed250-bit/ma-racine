// Persistance Firestore de la progression du joueur.
// Ne jamais committer de vraies clés : voir .env.local.example.

import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from './firebase';

const DEFAULT_PROGRESS = {
  highestUnlocked: 1,
  bombCount: 1,
  hammerCount: 1,
  boltCount: 1,
  shuffleCount: 1,
  coins: 0,
};

export function userDocRef(uid: string) {
  return doc(db, 'users', uid);
}

// L'email est un email synthétique : 225700000000@maracine.app
export function phoneFromUser(user: User): string {
  return (user.email ?? '').replace('@maracine.app', '') || 'inconnu';
}

/** Crée le document users/{uid} s'il n'existe pas déjà. */
export async function ensureUserDoc(user: User) {
  const ref = userDocRef(user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      phone: phoneFromUser(user),
      createdAt: serverTimestamp(),
      ...DEFAULT_PROGRESS,
    });
  }
}

/** Retourne le highestUnlocked sauvegardé (>= 1). */
export async function loadProgress(user: User): Promise<number> {
  const snap = await getDoc(userDocRef(user.uid));
  if (snap.exists()) {
    const val = snap.data().highestUnlocked;
    if (typeof val === 'number' && Number.isFinite(val)) {
      return Math.max(1, Math.floor(val));
    }
  }
  return 1;
}

/** Sauvegarde le highestUnlocked (appelé uniquement à la victoire). */
export async function saveHighestUnlocked(uid: string, level: number) {
  await updateDoc(userDocRef(uid), { highestUnlocked: level });
}
