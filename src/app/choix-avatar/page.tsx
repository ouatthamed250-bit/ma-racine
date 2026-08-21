'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { saveProfile } from '@/lib/progress';
import styles from '../auth.module.css';

const AVATAR_IDS = Array.from(
  { length: 12 },
  (_, i) => `avatar-${String(i + 1).padStart(2, '0')}`
);

export default function ChoixAvatar() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [pseudo, setPseudo] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/connexion');
    }
  }, [loading, user, router]);

  const trimmedPseudo = pseudo.trim();
  const canContinue = selected !== null && trimmedPseudo.length >= 2 && trimmedPseudo.length <= 20;

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !selected || !canContinue) return;
    setError('');
    setSubmitting(true);
    try {
      await saveProfile(user.uid, { avatarId: selected, pseudo: trimmedPseudo });
      router.replace('/jeu');
    } catch {
      setError("Impossible d'enregistrer ton profil. Réessaie.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.bands} />
      <div className={styles.logo}>MR</div>
      <p className={styles.message}>Choisis ton avatar et ton nom de joueur.</p>
      <form className={styles.form} onSubmit={submit}>
        <div className={styles.avatarGrid}>
          {AVATAR_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className={`${styles.avatarTile} ${
                selected === id ? styles.avatarTileSelected : ''
              }`}
              onClick={() => setSelected(id)}
              aria-label={id}
              aria-pressed={selected === id}
            >
              <img src={`/avatars/${id}.png`} alt="" className={styles.avatarTileImg} />
            </button>
          ))}
        </div>
        <input
          className={styles.field}
          type="text"
          placeholder="Nom de joueur"
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value)}
          minLength={2}
          maxLength={20}
          required
        />
        {error && <p className={styles.error}>{error}</p>}
        <button
          type="submit"
          className={styles.continueBtn}
          disabled={!canContinue || submitting}
        >
          {submitting ? 'Enregistrement…' : 'Continuer'}
        </button>
      </form>
    </main>
  );
}
