'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithPhone } from '@/lib/phoneAuth';
import styles from '../auth.module.css';

export default function Connexion() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signInWithPhone(phone, password);
      router.replace('/jeu');
    } catch {
      setError('Numéro ou mot de passe incorrect');
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
          autoComplete="current-password"
          required
        />
        {error && <p className={styles.error}>{error}</p>}
        <button type="submit" className={styles.cta} disabled={submitting}>
          {submitting ? 'Connexion…' : 'Se connecter'}
        </button>
        <Link href="/mot-de-passe-oublie" className={styles.forgot}>
          Mot de passe oublié ?
        </Link>
      </form>
      <p className={styles.switch}>
        Pas encore de compte ? <Link href="/inscription">Créer un compte</Link>
      </p>
    </main>
  );
}
