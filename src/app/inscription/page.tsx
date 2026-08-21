'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signUpWithPhone } from '@/lib/phoneAuth';
import styles from '../auth.module.css';

export default function Inscription() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas');
      return;
    }
    setSubmitting(true);
    try {
      await signUpWithPhone(phone, password);
      router.replace('/choix-avatar');
    } catch {
      setError("Impossible de créer le compte. Vérifie tes informations.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.bands} />
      <div className={styles.logo}>MR</div>
      <form className={styles.form} onSubmit={submit}>
        <input
          className={styles.field}
          type="tel"
          placeholder="Numéro de téléphone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
          required
        />
        <input
          className={styles.field}
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
        <input
          className={styles.field}
          type="password"
          placeholder="Confirmer le mot de passe"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
        />
        {error && <p className={styles.error}>{error}</p>}
        <button type="submit" className={styles.cta} disabled={submitting}>
          {submitting ? 'Inscription…' : "S'inscrire"}
        </button>
      </form>
      <p className={styles.switch}>
        Déjà un compte ? <Link href="/connexion">Se connecter</Link>
      </p>
    </main>
  );
}
