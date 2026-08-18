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
  lives: 5,
  nextLifeAt: null,
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

export type LivesState = { lives: number; nextLifeAt: number | null };

/** Retourne les vies (0-5) et le timestamp de la prochaine vie (null si plein). */
export async function loadLives(user: User): Promise<LivesState> {
  const snap = await getDoc(userDocRef(user.uid));
  if (snap.exists()) {
    const data = snap.data();
    const lives =
      typeof data.lives === 'number' ? Math.max(0, Math.min(5, Math.floor(data.lives))) : 5;
    const nextLifeAt = typeof data.nextLifeAt === 'number' ? data.nextLifeAt : null;
    return { lives, nextLifeAt };
  }
  return { lives: 5, nextLifeAt: null };
}

/** Sauvegarde les vies et le timestamp de recharge. */
export async function saveLives(uid: string, livesState: LivesState) {
  await updateDoc(userDocRef(uid), {
    lives: livesState.lives,
    nextLifeAt: livesState.nextLifeAt,
  });
}
