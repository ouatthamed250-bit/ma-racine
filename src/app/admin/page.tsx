'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, doc, getDocs, increment, updateDoc } from 'firebase/firestore';
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

type PaymentStatus = 'pending' | 'approved' | 'rejected';

type PaymentRow = {
  id: string;
  uid: string;
  pseudo: string;
  phone: string;
  pack: string;
  coinsAmount: number;
  priceFcfa: number;
  method: string;
  reference: string;
  status: PaymentStatus;
  createdAt: Date | null;
};

async function fetchPayments(): Promise<PaymentRow[]> {
  const snap = await getDocs(collection(db, 'paymentRequests'));
  return snap.docs.map((docSnap) => {
    const data = docSnap.data();
    const createdAt =
      data.createdAt && typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate() : null;
    const status: PaymentStatus =
      data.status === 'approved' || data.status === 'rejected' ? data.status : 'pending';
    return {
      id: docSnap.id,
      uid: typeof data.uid === 'string' ? data.uid : '',
      pseudo: typeof data.pseudo === 'string' && data.pseudo ? data.pseudo : '(sans pseudo)',
      phone: typeof data.phone === 'string' && data.phone ? data.phone : '—',
      pack: typeof data.pack === 'string' ? data.pack : '—',
      coinsAmount: typeof data.coinsAmount === 'number' ? data.coinsAmount : 0,
      priceFcfa: typeof data.priceFcfa === 'number' ? data.priceFcfa : 0,
      method: typeof data.method === 'string' ? data.method : '—',
      reference: typeof data.reference === 'string' ? data.reference : '—',
      status,
      createdAt,
    };
  });
}

function formatDate(d: Date | null): string {
  return d
    ? d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
        ' ' +
        d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : '—';
}

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
  const [payments, setPayments] = useState<PaymentRow[] | null>(null);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState('');
  const [paymentActionBusyId, setPaymentActionBusyId] = useState<string | null>(null);
  const [paymentActionError, setPaymentActionError] = useState('');

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

  // Charge la liste des demandes de paiement au premier affichage de cet onglet.
  useEffect(() => {
    if (tab !== 'payments' || payments !== null || !isAdmin) return;
    let cancelled = false;
    setPaymentsLoading(true);
    setPaymentsError('');
    fetchPayments()
      .then((rows) => {
        if (!cancelled) setPayments(rows);
      })
      .catch((err) => {
        if (cancelled) return;
        const message =
          err?.code === 'permission-denied'
            ? "Accès refusé par les règles Firestore (le claim admin n'est peut-être pas encore reconnu)."
            : err?.message ?? 'Erreur inconnue.';
        setPaymentsError(message);
      })
      .finally(() => {
        if (!cancelled) setPaymentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, payments, isAdmin]);

  const approvePayment = async (p: PaymentRow) => {
    setPaymentActionError('');
    setPaymentActionBusyId(p.id);
    try {
      await updateDoc(doc(db, 'users', p.uid), { coins: increment(p.coinsAmount) });
      await updateDoc(doc(db, 'paymentRequests', p.id), { status: 'approved' });
      setPayments((prev) =>
        prev ? prev.map((x) => (x.id === p.id ? { ...x, status: 'approved' } : x)) : prev
      );
    } catch (err: any) {
      setPaymentActionError(err?.message ?? 'Erreur lors de la validation.');
    } finally {
      setPaymentActionBusyId(null);
    }
  };

  const rejectPayment = async (p: PaymentRow) => {
    setPaymentActionError('');
    setPaymentActionBusyId(p.id);
    try {
      await updateDoc(doc(db, 'paymentRequests', p.id), { status: 'rejected' });
      setPayments((prev) =>
        prev ? prev.map((x) => (x.id === p.id ? { ...x, status: 'rejected' } : x)) : prev
      );
    } catch (err: any) {
      setPaymentActionError(err?.message ?? 'Erreur lors du rejet.');
    } finally {
      setPaymentActionBusyId(null);
    }
  };

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

  const pendingPayments = (payments ?? [])
    .filter((p) => p.status === 'pending')
    .sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0));
  const paymentsHistory = (payments ?? [])
    .filter((p) => p.status !== 'pending')
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
    .slice(0, 20);

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
            {paymentsLoading && <p className={styles.emptyState}>Chargement…</p>}
            {!paymentsLoading && paymentsError && (
              <p className={styles.emptyState}>{paymentsError}</p>
            )}
            {!paymentsLoading && !paymentsError && payments && (
              <>
                <h2 className={styles.cardTitle} style={{ fontSize: 15, textAlign: 'left' }}>
                  En attente ({pendingPayments.length})
                </h2>
                {paymentActionError && (
                  <p className={styles.emptyState} style={{ color: '#e0472b' }}>
                    {paymentActionError}
                  </p>
                )}
                {pendingPayments.length === 0 ? (
                  <p className={styles.emptyState}>Aucune demande en attente.</p>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Pseudo</th>
                          <th>Téléphone</th>
                          <th>Pack</th>
                          <th>Montant</th>
                          <th>Méthode</th>
                          <th>Référence</th>
                          <th>Date</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingPayments.map((p) => (
                          <tr key={p.id}>
                            <td>{p.pseudo}</td>
                            <td>{p.phone}</td>
                            <td>{p.pack}</td>
                            <td>
                              🪙 {p.coinsAmount} / {p.priceFcfa} FCFA
                            </td>
                            <td>{p.method}</td>
                            <td>{p.reference}</td>
                            <td>{formatDate(p.createdAt)}</td>
                            <td>
                              <div className={styles.paymentActions}>
                                <button
                                  type="button"
                                  className={styles.approveBtn}
                                  disabled={paymentActionBusyId === p.id}
                                  onClick={() => approvePayment(p)}
                                >
                                  Valider
                                </button>
                                <button
                                  type="button"
                                  className={styles.rejectBtn}
                                  disabled={paymentActionBusyId === p.id}
                                  onClick={() => rejectPayment(p)}
                                >
                                  Rejeter
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <h2
                  className={styles.cardTitle}
                  style={{ fontSize: 15, textAlign: 'left', marginTop: 24 }}
                >
                  Historique (20 dernières)
                </h2>
                {paymentsHistory.length === 0 ? (
                  <p className={styles.emptyState}>Aucune demande traitée pour l&apos;instant.</p>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Pseudo</th>
                          <th>Pack</th>
                          <th>Montant</th>
                          <th>Méthode</th>
                          <th>Référence</th>
                          <th>Date</th>
                          <th>Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentsHistory.map((p) => (
                          <tr key={p.id}>
                            <td>{p.pseudo}</td>
                            <td>{p.pack}</td>
                            <td>
                              🪙 {p.coinsAmount} / {p.priceFcfa} FCFA
                            </td>
                            <td>{p.method}</td>
                            <td>{p.reference}</td>
                            <td>{formatDate(p.createdAt)}</td>
                            <td>
                              <span
                                className={
                                  p.status === 'approved' ? styles.statusApproved : styles.statusRejected
                                }
                              >
                                {p.status === 'approved' ? 'Validé' : 'Rejeté'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
