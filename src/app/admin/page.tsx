'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from './admin.module.css';

type Tab = 'overview' | 'users' | 'payments';

export default function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');

  // Accès réservé aux admins : redirection silencieuse dès que isAdmin est
  // connu et faux (on attend la fin du chargement pour ne pas rediriger
  // à tort pendant la résolution du token).
  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace('/jeu');
    }
  }, [loading, isAdmin, router]);

  if (loading) {
    return (
      <main className={styles.page}>
        <p className={styles.waiting}>Chargement…</p>
      </main>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div className={styles.logo}>MR</div>
        <h1 className={styles.title}>Tableau de bord Ma Racine</h1>
      </div>

      <nav className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tabBtn} ${tab === 'overview' ? styles.tabBtnActive : ''}`}
          onClick={() => setTab('overview')}
        >
          Vue d&apos;ensemble
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${tab === 'users' ? styles.tabBtnActive : ''}`}
          onClick={() => setTab('users')}
        >
          Utilisateurs
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${tab === 'payments' ? styles.tabBtnActive : ''}`}
          onClick={() => setTab('payments')}
        >
          Paiements
        </button>
      </nav>

      <div className={styles.content}>
        {tab === 'overview' && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Vue d&apos;ensemble</h2>
            <p className={styles.cardBody}>Tableau de bord Ma Racine</p>
          </div>
        )}
        {tab === 'users' && (
          <div className={styles.card}>
            <p className={styles.emptyState}>Bientôt disponible</p>
          </div>
        )}
        {tab === 'payments' && (
          <div className={styles.card}>
            <p className={styles.emptyState}>Bientôt disponible</p>
          </div>
        )}
      </div>
    </main>
  );
}
