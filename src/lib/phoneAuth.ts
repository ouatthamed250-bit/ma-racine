import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from './firebase';

/**
 * Nettoie un numéro de téléphone : retire espaces/tirets et ajoute le préfixe
 * international +225 (Côte d'Ivoire) par défaut si aucun '+' n'est fourni.
 */
export function normalizePhone(raw: string): string {
  let cleaned = raw.replace(/[\s-]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('0')) cleaned = cleaned.slice(1);
  return '+225' + cleaned;
}

/**
 * Convertit un numéro en email synthétique : '+2250700000000' -> '2250700000000@maracine.app'
 */
export function phoneToSyntheticEmail(phone: string): string {
  return `${normalizePhone(phone).replace('+', '')}@maracine.app`;
}

/** Inscription avec le numéro de téléphone (email synthétique sous le capot). */
export async function signUpWithPhone(phone: string, password: string) {
  return createUserWithEmailAndPassword(auth, phoneToSyntheticEmail(phone), password);
}

/** Connexion avec le numéro de téléphone (email synthétique sous le capot). */
export async function signInWithPhone(phone: string, password: string) {
  return signInWithEmailAndPassword(auth, phoneToSyntheticEmail(phone), password);
}
