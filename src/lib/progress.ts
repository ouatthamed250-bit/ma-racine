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
  levelStars: {},
  avatarId: null,
  pseudo: '',
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

/** Retourne le nombre de pièces sauvegardées (0 par défaut). */
export async function loadCoins(user: User): Promise<number> {
  const snap = await getDoc(userDocRef(user.uid));
  if (snap.exists()) {
    const val = snap.data().coins;
    if (typeof val === 'number' && Number.isFinite(val)) {
      return Math.max(0, Math.floor(val));
    }
  }
  return 0;
}

/** Sauvegarde le nouveau total de pièces (appelé à chaque gain, ex: victoire). */
export async function saveCoins(uid: string, coins: number) {
  await updateDoc(userDocRef(uid), { coins });
}

export type BoosterCounts = {
  bombCount: number;
  hammerCount: number;
  boltCount: number;
  shuffleCount: number;
};

/** Retourne les compteurs de boosters sauvegardés (>= 0, défaut 1 chacun si jamais joué). */
export async function loadBoosters(user: User): Promise<BoosterCounts> {
  const snap = await getDoc(userDocRef(user.uid));
  if (snap.exists()) {
    const data = snap.data();
    const readCount = (val: unknown) =>
      typeof val === 'number' && Number.isFinite(val) ? Math.max(0, Math.floor(val)) : 1;
    return {
      bombCount: readCount(data.bombCount),
      hammerCount: readCount(data.hammerCount),
      boltCount: readCount(data.boltCount),
      shuffleCount: readCount(data.shuffleCount),
    };
  }
  return { bombCount: 1, hammerCount: 1, boltCount: 1, shuffleCount: 1 };
}

/** Sauvegarde les compteurs de boosters (appelé à chaque changement : usage, bonus, achat). */
export async function saveBoosters(uid: string, counts: BoosterCounts) {
  await updateDoc(userDocRef(uid), { ...counts });
}

export type LevelStars = Record<number, 1 | 2 | 3>;

/** Retourne le nombre d'étoiles (1-3) déjà obtenu pour chaque niveau joué. */
export async function loadLevelStars(user: User): Promise<LevelStars> {
  const snap = await getDoc(userDocRef(user.uid));
  if (snap.exists()) {
    const raw = snap.data().levelStars;
    if (raw && typeof raw === 'object') {
      const stars: LevelStars = {};
      for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
        const level = Number(key);
        if (Number.isFinite(level) && (val === 1 || val === 2 || val === 3)) {
          stars[level] = val;
        }
      }
      return stars;
    }
  }
  return {};
}

/** Sauvegarde le nombre d'étoiles d'un niveau (l'appelant garantit qu'on ne diminue jamais). */
export async function saveLevelStars(uid: string, level: number, stars: 1 | 2 | 3) {
  await updateDoc(userDocRef(uid), { [`levelStars.${level}`]: stars });
}

export type Profile = { avatarId: string | null; pseudo: string | null };

/** Retourne l'avatar et le pseudo choisis (null si le joueur n'a jamais fait ce choix). */
export async function loadProfile(user: User): Promise<Profile> {
  const snap = await getDoc(userDocRef(user.uid));
  if (snap.exists()) {
    const data = snap.data();
    const avatarId = typeof data.avatarId === 'string' && data.avatarId ? data.avatarId : null;
    const pseudo = typeof data.pseudo === 'string' && data.pseudo ? data.pseudo : null;
    return { avatarId, pseudo };
  }
  return { avatarId: null, pseudo: null };
}

/** Sauvegarde l'avatar et le pseudo choisis (écran /choix-avatar, une seule fois). */
export async function saveProfile(uid: string, profile: { avatarId: string; pseudo: string }) {
  await updateDoc(userDocRef(uid), { avatarId: profile.avatarId, pseudo: profile.pseudo });
}
