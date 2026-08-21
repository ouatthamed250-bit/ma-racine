'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import styles from './admin.module.css';

type Tab = 'overview' | 'users' | 'payments';

type UserRow = {
  uid: string;
  pseudo: string;
  phone: string;
  highestUnlocked: number;
  totalStars: number;
  coins: number;
  createdAt: Date | null;
};

async function fetchUsers(): Promise<UserRow[]> {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map((docSnap) => {
    const data = docSnap.data();
    const levelStars =
      data.levelStars && typeof data.levelStars === 'object' ? data.levelStars : {};
    const totalStars = Object.values(levelStars).reduce(
      (acc: number, v) => acc + (typeof v === 'number' ? v : 0),
      0
    );
    const createdAt =
      data.createdAt && typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate() : null;
    return {
      uid: docSnap.id,
      pseudo: typeof data.pseudo === 'string' && data.pseudo ? data.pseudo : '(sans pseudo)',
      phone: typeof data.phone === 'string' && data.phone ? data.phone : '—',
      highestUnlocked: typeof data.highestUnlocked === 'number' ? data.highestUnlocked : 1,
      totalStars,
      coins: typeof data.coins === 'number' ? data.coins : 0,
      createdAt,
    };
  });
}

export default function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');

  // Accès réservé aux admins : redirection silencieuse dès que isAdmin est
  // connu et faux (on attend la fin du chargement pour ne pas rediriger
  // à tort pendant la résolution du token).
  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace('/jeu');
    }
  }, [loading, isAdmin, router]);

  // Charge la liste des utilisateurs au premier affichage de cet onglet.
  useEffect(() => {
    if (tab !== 'users' || users !== null || !isAdmin) return;
    let cancelled = false;
    setUsersLoading(true);
    setUsersError('');
    fetchUsers()
      .then((rows) => {
        if (cancelled) return;
        setUsers([...rows].sort((a, b) => b.highestUnlocked - a.highestUnlocked));
      })
      .catch((err) => {
        if (cancelled) return;
        const message =
          err?.code === 'permission-denied'
            ? "Accès refusé par les règles Firestore (le claim admin n'est peut-être pas encore reconnu)."
            : err?.message ?? 'Erreur inconnue.';
        setUsersError(message);
      })
      .finally(() => {
        if (!cancelled) setUsersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, users, isAdmin]);

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
            {usersLoading && <p className={styles.emptyState}>Chargement…</p>}
            {!usersLoading && usersError && (
              <p className={styles.emptyState}>{usersError}</p>
            )}
            {!usersLoading && !usersError && users && users.length === 0 && (
              <p className={styles.emptyState}>Aucun utilisateur trouvé.</p>
            )}
            {!usersLoading && !usersError && users && users.length > 0 && (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Pseudo</th>
                      <th>Téléphone</th>
                      <th>Niveau atteint</th>
                      <th>Étoiles</th>
                      <th>Pièces</th>
                      <th>Inscription</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.uid}>
                        <td>{u.pseudo}</td>
                        <td>{u.phone}</td>
                        <td>{u.highestUnlocked}</td>
                        <td>⭐ {u.totalStars}</td>
                        <td>🪙 {u.coins}</td>
                        <td>
                          {u.createdAt
                            ? u.createdAt.toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
