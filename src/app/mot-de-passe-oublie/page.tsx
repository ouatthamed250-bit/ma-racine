'use client';

import Link from 'next/link';
import styles from '../auth.module.css';

const WHATSAPP_NUMBER = '225554233234';

export default function MotDePasseOublie() {
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}`;

  return (
    <main className={styles.page}>
      <div className={styles.bands} />
      <div className={styles.logo}>MR</div>
      <p className={styles.message}>
        Contacte-nous sur WhatsApp avec ton numéro de téléphone, on réinitialise
        ton mot de passe manuellement.
      </p>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.cta}
        style={{
          textAlign: 'center',
          textDecoration: 'none',
          display: 'block',
          width: 'min(100%, 320px)',
        }}
      >
        Ouvrir WhatsApp
      </a>
      <p className={styles.switch}>
        <Link href="/connexion">← Retour à la connexion</Link>
      </p>
    </main>
  );
}
