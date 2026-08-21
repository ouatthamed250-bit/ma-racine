// Petit gestionnaire audio pour "Ma Racine".
// Effets sonores attendus dans public/sounds/ (match.mp3, combo.mp3, booster.mp3,
// victoire.mp3, echec.mp3, piece.mp3, clic.mp3...) et musique de fond
// (musique-1.mp3 à musique-4.mp3, musique-fetiche.mp3) — tant que ces fichiers
// n'existent pas encore, la lecture échoue silencieusement (try/catch), le jeu
// continue de fonctionner normalement. Effets sonores (isSoundOn/toggleSound)
// et musique (isMusicOn/toggleMusic) sont deux préférences indépendantes.

import { useCallback, useEffect, useState } from 'react';

const SOUND_PREF_KEY = 'maRacineSoundOn';
const MUSIC_PREF_KEY = 'maRacineMusicOn';

/** Playlist de musique de fond, enchaînée en boucle (piste 4 -> piste 1). */
export const MUSIC_TRACKS = [
  '/sounds/musique-1.mp3',
  '/sounds/musique-2.mp3',
  '/sounds/musique-3.mp3',
  '/sounds/musique-4.mp3',
];

/** Piste dédiée aux niveaux à fétiches (obstacles), jouée en boucle sur elle-même. */
export const FETICHE_TRACK = '/sounds/musique-fetiche.mp3';

// Cache d'instances Audio réutilisables : un seul <audio> par fichier, jamais
// recréé à chaque appel de playSound().
const audioCache = new Map<string, HTMLAudioElement>();

function getAudio(file: string): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  let audio = audioCache.get(file);
  if (!audio) {
    try {
      audio = new Audio(`/sounds/${file}`);
      audio.preload = 'auto';
      audioCache.set(file, audio);
    } catch {
      return null;
    }
  }
  return audio;
}

/** Préférence son (activé par défaut), persistée dans localStorage. */
export function isSoundOn(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const val = localStorage.getItem(SOUND_PREF_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

/** Inverse et persiste la préférence son ; retourne le nouvel état. */
export function toggleSound(): boolean {
  const next = !isSoundOn();
  try {
    localStorage.setItem(SOUND_PREF_KEY, String(next));
  } catch {
    // localStorage indisponible (navigation privée...) : on continue sans persister.
  }
  return next;
}

/** Préférence musique (activée par défaut), indépendante de isSoundOn(). */
export function isMusicOn(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const val = localStorage.getItem(MUSIC_PREF_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

/** Inverse et persiste la préférence musique ; retourne le nouvel état. */
export function toggleMusic(): boolean {
  const next = !isMusicOn();
  try {
    localStorage.setItem(MUSIC_PREF_KEY, String(next));
  } catch {
    // localStorage indisponible (navigation privée...) : on continue sans persister.
  }
  return next;
}

/**
 * Joue /public/sounds/<file>. Silencieux si le son est coupé, si le fichier
 * n'existe pas encore, ou si la lecture échoue pour une autre raison.
 */
export function playSound(file: string) {
  if (!isSoundOn()) return;
  const audio = getAudio(file);
  if (!audio) return;
  try {
    audio.currentTime = 0;
    void audio.play()?.catch(() => {});
  } catch {
    // Fichier absent / lecture impossible : on ignore, aucun impact sur le jeu.
  }
}

/** Hook React : expose l'état son courant et un toggle, pour un bouton 🔊/🔇. */
export function useSound() {
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    setSoundOn(isSoundOn());
  }, []);

  const toggle = useCallback(() => {
    setSoundOn(toggleSound());
  }, []);

  return { soundOn, toggle, play: playSound };
}

/** Hook React : expose l'état musique courant et un toggle, pour un bouton 🎵. */
export function useMusic() {
  const [musicOn, setMusicOn] = useState(true);

  useEffect(() => {
    setMusicOn(isMusicOn());
  }, []);

  const toggle = useCallback(() => {
    setMusicOn(toggleMusic());
  }, []);

  return { musicOn, toggle };
}
